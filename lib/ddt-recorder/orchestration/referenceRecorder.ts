import { randomUUID } from "crypto";

import {
  ingestRecorderInput,
} from "../ingest/ingest";
import type {
  DDTRecorderInput,
} from "../ingest/types";
import {
  normalizeRecorderRecord,
  type DDTNormalizedRecord,
} from "../normalize/normalize";
import {
  digestJcs,
  type DDTJsonValue,
} from "../producer/canonical";
import {
  buildConformanceReceiptDraft,
  type DDTReferenceRecorderPreservationContract,
} from "../producer/conformanceReceipt";
import type {
  DDTEvidenceManifestPolicyContext,
} from "../producer/evidenceManifest";
import {
  finalizeDraft5Envelope,
  prepareDraft5RecordCore,
  type DDTRegistrant,
  type DDTRegistrationMechanism,
} from "../producer/recorder";
import {
  DDTReferenceRegistrar,
} from "../registrar/referenceRegistrar";
import {
  createEd25519Proof,
} from "../signing/ed25519";
import {
  DDTSourceEventRaceError,
  previousContextFromBundle,
  type DDTRecordStore,
  type DDTRegisteredRecordBundle,
} from "../storage/recordStore";
import {
  validateReferenceRecorderPreparedRecord,
} from "../validation/referenceRecorderValidator";
import {
  verifyRegistrationResultSchema,
} from "../validation/schemaVerifier";
import {
  verifyRecordBundle,
  type DDTRecordVerificationResult,
  type DDTVerificationKeyring,
} from "../validation/verifyRecord";

export type DDTEvidencePolicyResolver = (
  record: DDTNormalizedRecord
) =>
  | DDTEvidenceManifestPolicyContext
  | Promise<DDTEvidenceManifestPolicyContext>;

export type DDTReferenceRecorderOrchestratorConfig = {
  subjectNamespace: string;

  preservationContract:
    DDTReferenceRecorderPreservationContract;

  evidencePolicyResolver:
    DDTEvidencePolicyResolver;

  registrant:
    DDTRegistrant;

  registrationMechanism:
    DDTRegistrationMechanism;

  privateKeyPem:
    string | Buffer;

  verificationMethod:
    string;

  verificationKeyring:
    DDTVerificationKeyring;

  registrar:
    DDTReferenceRegistrar;

  recordStore:
    DDTRecordStore;

  ddtRoot?: string;

  now?: () => Date;
};

export type DDTReferenceRecorderResult = {
  ddtNumber: string;
  registrationSequence: number;

  envelope: DDTJsonValue;
  conformanceReceipt: DDTJsonValue;
  registrationResult:
    DDTRegisteredRecordBundle["registrationResult"];

  verification:
    DDTRecordVerificationResult;
};

function uuidUrn(): string {
  return `urn:uuid:${randomUUID()}`;
}

function proofId(
  prefix: string,
  recordId: string
): string {
  const suffix = recordId.startsWith(
    "urn:uuid:"
  )
    ? recordId.slice("urn:uuid:".length)
    : recordId;

  return `${prefix}-${suffix}`;
}

function completeReceiptCommitment(
  receipt: DDTJsonValue
) {
  const object =
    receipt as Record<
      string,
      DDTJsonValue
    >;

  return digestJcs({
    specification:
      object.specification,
    receiptCore:
      object.receiptCore,
    receiptCoreHash:
      object.receiptCoreHash,
    proofs:
      object.proofs,
  });
}


function sourceEventKey(
  subjectNamespace: string,
  sourceType: string,
  sourceId: string,
  sourceRecordId: string | undefined,
  sourceRef: string
): string {
  return JSON.stringify([
    subjectNamespace,
    sourceType,
    sourceId,
    sourceRecordId ?? null,
    sourceRef,
  ]);
}

function sourceEventKeyFromIngested(
  ingested: ReturnType<
    typeof ingestRecorderInput
  >,
  subjectNamespace: string
): string {
  const systemName =
    ingested.source.systemName?.trim();

  return sourceEventKey(
    subjectNamespace.trim(),
    ingested.source.type,
    systemName ||
      ingested.source.reference,
    systemName
      ? ingested.source.reference
      : undefined,
    ingested.source.reference
  );
}

function sourceEventKeyFromBundle(
  bundle: DDTRegisteredRecordBundle
): string {
  const envelope =
    bundle.envelope as any;

  const source =
    envelope?.upstream?.source;

  const eventTime =
    envelope?.upstream?.event?.eventTime;

  if (
    !source ||
    typeof source.sourceType !== "string" ||
    typeof source.sourceId !== "string" ||
    (
      source.sourceRecordId !== undefined &&
      typeof source.sourceRecordId !== "string"
    ) ||
    !eventTime ||
    typeof eventTime.sourceRef !== "string"
  ) {
    throw new Error(
      `Stored DDT Record ${bundle.ddtNumber} has an invalid upstream source-event coordinate.`
    );
  }

  return sourceEventKey(
    bundle.subjectNamespace,
    source.sourceType,
    source.sourceId,
    source.sourceRecordId,
    eventTime.sourceRef
  );
}

function sameStructuralDigest(
  a: {
    algorithm: string;
    value: string;
  },
  b: {
    algorithm: string;
    value: string;
  }
): boolean {
  return (
    a.algorithm === b.algorithm &&
    a.value === b.value
  );
}

export class DDTReferenceRecorderOrchestrator {
  private readonly config:
    DDTReferenceRecorderOrchestratorConfig;

  constructor(
    config:
      DDTReferenceRecorderOrchestratorConfig
  ) {
    this.config = config;
  }

  private now(): Date {
    return (
      this.config.now?.() ??
      new Date()
    );
  }

  async record(
    input: DDTRecorderInput
  ): Promise<DDTReferenceRecorderResult> {
    const ddtRoot =
      this.config.ddtRoot ??
      "docs/ddt";

    const ingested =
      ingestRecorderInput(input);

    let previous:
      ReturnType<
        typeof previousContextFromBundle
      >
      | undefined;

    if (ingested.previousDDTNumber) {
      const previousBundle =
        await this.config.recordStore
          .getByDDTNumber(
            ingested.previousDDTNumber
          );

      if (!previousBundle) {
        throw new Error(
          `Previous DDT Record not found: ${ingested.previousDDTNumber}`
        );
      }

      previous =
        previousContextFromBundle(
          previousBundle
        );
    }

    const initiallyNormalized =
      normalizeRecorderRecord(
        ingested,
        {
          subjectNamespace:
            this.config
              .subjectNamespace,
        },
        previous
      );

    /*
     * Operational replay identity is the stable upstream
     * source-event coordinate, not a global payload hash.
     *
     * Different source events may legitimately carry
     * identical business payloads and must remain distinct.
     */
    const incomingSourceEventKey =
      sourceEventKeyFromIngested(
        ingested,
        initiallyNormalized
          .subject.namespace
      );

    const registeredBundles =
      await this.config.recordStore
        .listRegistered();

    const sourceMatches =
      registeredBundles.filter(
        (bundle) =>
          sourceEventKeyFromBundle(
            bundle
          ) ===
          incomingSourceEventKey
      );

    if (sourceMatches.length > 1) {
      throw new Error(
        "Source-event replay integrity failure: more than one registered DDT Record is already bound to the same source-event coordinate."
      );
    }

    const existingSourceBundle =
      sourceMatches[0];

    /*
     * For an existing source event, rebuild the candidate
     * canonical core using the already registered record
     * identity. This makes recordHash an exact content
     * comparison without reusing one ddtRecordId for two
     * different immutable records.
     */
    const normalized:
      DDTNormalizedRecord =
      existingSourceBundle
        ? {
            ...initiallyNormalized,

            ddtRecordId:
              existingSourceBundle
                .ddtRecordId,

            ddtFamilyId:
              existingSourceBundle
                .ddtFamilyId,
          }
        : initiallyNormalized;

    const evidencePolicy =
      await this.config
        .evidencePolicyResolver(
          normalized
        );

    const prepared =
      prepareDraft5RecordCore(
        normalized,
        evidencePolicy,
        this.config
          .preservationContract as unknown as DDTJsonValue
      );

    if (existingSourceBundle) {
      if (
        !sameStructuralDigest(
          prepared.commitments
            .recordHash,
          existingSourceBundle
            .recordHash
        )
      ) {
        throw new Error(
          "Conflicting source-event replay: the source-event coordinate is already registered with different committed content."
        );
      }

      /*
       * Exact replay: never create a second Receipt,
       * signature, registration sequence or DDT Number.
       * Independently verify the preserved bundle before
       * returning it.
       */
      const replayVerification =
        await verifyRecordBundle(
          existingSourceBundle
            .envelope,
          existingSourceBundle
            .conformanceReceipt,
          this.config
            .verificationKeyring,
          ddtRoot
        );

      if (
        replayVerification
          .schemaValidation !==
          "PASS" ||
        replayVerification
          .commitmentValidation !==
          "PASS" ||
        replayVerification
          .proofs.length < 2 ||
        replayVerification
          .proofs.some(
            (result) =>
              result.profile !==
                "MATCH" ||
              result.signature !==
                "VALID"
          )
      ) {
        throw new Error(
          "Existing source-event replay bundle did not produce full independent verification PASS."
        );
      }

      return {
        ddtNumber:
          existingSourceBundle
            .ddtNumber,

        registrationSequence:
          existingSourceBundle
            .registrationResult
            .registrationSequence,

        envelope:
          existingSourceBundle
            .envelope,

        conformanceReceipt:
          existingSourceBundle
            .conformanceReceipt,

        registrationResult:
          existingSourceBundle
            .registrationResult,

        verification:
          replayVerification,
      };
    }

    const validation =
      await validateReferenceRecorderPreparedRecord(
        normalized,
        prepared,
        this.config
          .preservationContract,
        ddtRoot
      );

    const validationStartedAt =
      this.now().toISOString();

    const validationCompletedAt =
      this.now().toISOString();

    const receiptDraft =
      buildConformanceReceiptDraft({
        prepared,
        preservationContract:
          this.config
            .preservationContract,

        receiptId:
          uuidUrn(),

        executionId:
          uuidUrn(),

        artifactEvaluations:
          validation.artifactEvaluations,

        normativeDependencyEvaluations:
          validation
            .normativeDependencyEvaluations,

        evidenceEvaluations:
          validation.evidenceEvaluations,

        ruleResults:
          validation.ruleResults,

        capabilityResults:
          validation.capabilityResults,

        validationStartedAt,
        validationCompletedAt,
      });

    if (
      receiptDraft.receiptCore
        .overallResult.status !==
      "PASS"
    ) {
      throw new Error(
        `Reference Recorder validation result is ${receiptDraft.receiptCore.overallResult.status}; registration is blocked.`
      );
    }

    const receiptProof =
      await createEd25519Proof({
        proofId:
          proofId(
            "receipt-proof",
            normalized.ddtRecordId
          ),

        purpose:
          "CONFORMANCE_ATTESTATION",

        targetDigest:
          receiptDraft.receiptCoreHash,

        verificationMethod:
          this.config
            .verificationMethod,

        privateKeyPem:
          this.config.privateKeyPem,

        createdAtClaim:
          this.now().toISOString(),

        ddtRoot,
      });

    const receipt = {
      ...receiptDraft,
      proofs: [
        receiptProof,
      ],
    } as unknown as DDTJsonValue;

    const receiptCommitment =
      completeReceiptCommitment(
        receipt
      );

    const registrationTimeClaim =
      this.now().toISOString();

    const unsignedEnvelopeInput = {
      conformanceReceiptCommitment:
        receiptCommitment,

      registrant:
        this.config.registrant,

      registrationMechanism:
        this.config
          .registrationMechanism,

      timeProofs:
        [] as DDTJsonValue[],

      registrationTimeClaim,
    };

    const {
      prepareDraft5EnvelopeForSigning,
    } = await import(
      "../producer/recorder"
    );

    const unsignedEnvelope =
      prepareDraft5EnvelopeForSigning(
        prepared,
        unsignedEnvelopeInput
      );

    const registrationProof =
      await createEd25519Proof({
        proofId:
          proofId(
            "registration-proof",
            normalized.ddtRecordId
          ),

        purpose:
          "DDT_REGISTRATION",

        targetDigest:
          unsignedEnvelope
            .registration
            .registrationStatementHash,

        verificationMethod:
          this.config
            .verificationMethod,

        privateKeyPem:
          this.config.privateKeyPem,

        createdAtClaim:
          this.now().toISOString(),

        ddtRoot,
      });

    const envelope =
      finalizeDraft5Envelope(
        prepared,
        {
          ...unsignedEnvelopeInput,
          signatureProofs: [
            registrationProof as unknown as DDTJsonValue,
          ],
        }
      ) as unknown as DDTJsonValue;

    const verification =
      await verifyRecordBundle(
        envelope,
        receipt,
        this.config
          .verificationKeyring,
        ddtRoot
      );

    if (
      verification.schemaValidation !==
        "PASS" ||
      verification
        .commitmentValidation !==
        "PASS" ||
      verification.proofs.length < 2 ||
      verification.proofs.some(
        (result) =>
          result.profile !==
            "MATCH" ||
          result.signature !==
            "VALID"
      )
    ) {
      throw new Error(
        "Independent record verification did not produce full PASS."
      );
    }

    let atomicBundle:
      DDTRegisteredRecordBundle;

    try {
      atomicBundle =
        await this.config.registrar
        .registerBundleAtomically(
          {
          ddtRecordId:
            normalized.ddtRecordId,

          recordHash:
            verification.recordHash,

          registrationStatementHash:
            verification
              .registrationStatementHash,

          verificationDisposition:
            "PASS",
        },
          this.config.recordStore,
          async (atomicRegistration) => {
            const registrationSchema =
              await verifyRegistrationResultSchema(
                atomicRegistration.result,
                ddtRoot
              );

            if (
              registrationSchema.status !==
              "PASS"
            ) {
              throw new Error(
                `Registration Result schema validation failed after registration: ${registrationSchema.errors.join("; ")}`
              );
            }

          const bundle:
                DDTRegisteredRecordBundle = {
            version: 1,

            ddtNumber:
              atomicRegistration.result
                .ddtNumber,

            ddtRecordId:
              normalized.ddtRecordId,

            ddtFamilyId:
              normalized.ddtFamilyId,

            subjectNamespace:
              normalized.subject.namespace,

            recordHash:
              verification.recordHash,

            envelope,

            conformanceReceipt:
              receipt,

            registrationResult:
              atomicRegistration.result,

            evidence:
              normalized.evidence.map(
                (item) => ({
                  name: item.name,
                  mediaType:
                    item.mediaType,
                  contentBase64:
                    Buffer.from(
                      item.bytes
                    ).toString(
                      "base64"
                    ),
                })
              ),

            storedAt:
              this.now().toISOString(),
          };


          return bundle;
        }
      );
    } catch (error) {
      if (
        error instanceof
        DDTSourceEventRaceError
      ) {
        /*
         * Another concurrent submission committed this
         * source event while this call was being prepared.
         *
         * Re-enter the normal replay path. It rebuilds the
         * candidate with the already registered immutable
         * identity and therefore distinguishes:
         *
         * exact same content -> existing DDT
         * conflicting content -> replay conflict
         */
        return this.record(input);
      }

      throw error;
    }



    return {
      ddtNumber:
        atomicBundle.registrationResult
          .ddtNumber,

      registrationSequence:
        atomicBundle.registrationResult
          .registrationSequence,

      envelope:
        atomicBundle.envelope,

      conformanceReceipt:
        atomicBundle.conformanceReceipt,

      registrationResult:
        atomicBundle.registrationResult,

      verification,
    };
  }
}
