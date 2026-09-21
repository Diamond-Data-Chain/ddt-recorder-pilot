import { promises as fs } from "fs";
import path from "path";

import {
  DDTReferenceRecorderOrchestrator,
} from "../orchestration/referenceRecorder";
import type {
  DDTReferenceRecorderPreservationContract,
} from "../producer/conformanceReceipt";
import {
  DDTReferenceRegistrar,
} from "../registrar/referenceRegistrar";
import {
  getReferenceRecorderStores,
} from "../storage/runtimeStores";

const REGISTRATION_MECHANISM_ARTIFACT_ID =
  "DDT-REGISTRATION-MECHANISM-PROFILE-ARTIFACT-0.1-DRAFT.1";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required Recorder environment variable: ${name}`
    );
  }

  return value;
}

function privateKeyPemFromEnv(): string {
  return requireEnv(
    "DDT_RECORDER_PRIVATE_KEY_PEM"
  ).replace(/\\n/g, "\n");
}

function publicKeyBase64urlFromEnv(): string {
  const value = requireEnv(
    "DDT_RECORDER_PUBLIC_KEY_BASE64URL"
  );

  if (!/^[A-Za-z0-9_-]{43}$/.test(value)) {
    throw new Error(
      "DDT_RECORDER_PUBLIC_KEY_BASE64URL must be a canonical 32-byte Ed25519 public key."
    );
  }

  return value;
}

async function buildRuntime() {
  const ddtRoot = path.join(
    process.cwd(),
    "docs",
    "ddt"
  );

  const contractPath = path.join(
    ddtRoot,
    "profiles",
    "ddt-reference-recorder-preservation-contract-v0.3-draft.2.json"
  );

  const contract = JSON.parse(
    await fs.readFile(
      contractPath,
      "utf8"
    )
  ) as DDTReferenceRecorderPreservationContract;

  const registrationMechanismProfile =
    contract.normativeDependencies.artifacts.find(
      (artifact) =>
        artifact.artifactId ===
        REGISTRATION_MECHANISM_ARTIFACT_ID
    );

  if (!registrationMechanismProfile) {
    throw new Error(
      "Registration Mechanism Profile is missing from the active Preservation Contract."
    );
  }

  const verificationMethod =
    requireEnv(
      "DDT_RECORDER_VERIFICATION_METHOD"
    );

  const registrantIdentityRef =
    requireEnv(
      "DDT_RECORDER_REGISTRANT_IDENTITY_REF"
    );

  const subjectNamespace =
    process.env
      .DDT_RECORDER_SUBJECT_NAMESPACE
      ?.trim() ||
    "urn:ddt:subject:reference-recorder";

  const {
    registrationStore,
    recordStore,
  } =
    getReferenceRecorderStores();

  const registrar =
    new DDTReferenceRegistrar(
      registrationStore
    );

  return new DDTReferenceRecorderOrchestrator({
    subjectNamespace,

    preservationContract:
      contract,

    evidencePolicyResolver:
      async (record) => ({
        entries:
          record.evidence.map(
            (item, index) => ({
              role:
                item.role ??
                (item.bindings?.includes(
                  "ACTOR_AUTHORITY"
                )
                  ? "AUTHORITY_EVIDENCE"
                  : item.bindings?.includes(
                        "SEMANTIC_CONTEXT"
                      )
                    ? "SEMANTIC_DEPENDENCY"
                    : "SUPPORTING_EVIDENCE"),

              evidenceClass:
                item.evidenceClass ??
                (item.bindings?.includes(
                  "ACTOR_AUTHORITY"
                )
                  ? "authority.evidence"
                  : item.bindings?.includes(
                        "SEMANTIC_CONTEXT"
                      )
                    ? "semantic.context"
                    : "REFERENCE_RECORDER_EVIDENCE"),

              declaredIdentity: {
                namespace:
                  "urn:ddt:evidence:reference-recorder",

                objectId:
                  `${record.ddtRecordId}:evidence:${index + 1}`,

                versionEvidenceRefs:
                  [],
              },

              custody: {
                mode:
                  "OWNER_CONTROLLED",
                retrievalRefs:
                  [],
              },

              confidentiality: {
                classification:
                  "PUBLIC",
                publicCommitmentRisk:
                  "LOW",
                redactionPermitted:
                  false,
              },

              preservationObligationRefs:
                [],

              provenance: {
                assertedBy: {
                  identityRef:
                    registrantIdentityRef,
                  layer:
                    "REGISTRANT",
                },

                sourceSystemRef:
                  record.source.reference,

                capturedAtClaim:
                  record.eventTime,

                signatureProofRefs:
                  [],

                authorityEvidenceRefs:
                  [],
              },

              semanticScope: {
                historicallyLoadBearing:
                  item.bindings?.includes(
                    "SEMANTIC_CONTEXT"
                  ) ?? false,

                ...(item.bindings?.includes(
                  "SEMANTIC_CONTEXT"
                )
                  ? {
                      dependencyClass:
                        "SEMANTIC_CONTEXT",
                    }
                  : {}),

                reconstructionScopes:
                  item.bindings?.includes(
                    "SEMANTIC_CONTEXT"
                  )
                    ? [
                        "UPSTREAM_SEMANTIC_CONTEXT",
                      ]
                    : [],

                unresolvedResult:
                  item.bindings?.includes(
                    "SEMANTIC_CONTEXT"
                  )
                    ? "UNAVAILABLE"
                    : "NOT_APPLICABLE",
              },

              description:
                `Reference Recorder evidence: ${item.name}`,
            })
          ),
      }),

    registrant: {
      identityRef:
        registrantIdentityRef,

      identityType:
        "ORGANIZATION_SERVICE",
    },

    registrationMechanism: {
      profile:
        registrationMechanismProfile,
    },

    privateKeyPem:
      privateKeyPemFromEnv(),

    verificationMethod,

    verificationKeyring: {
      keys: [
        {
          verificationMethod,

          publicKeyBase64url:
            publicKeyBase64urlFromEnv(),
        },
      ],
    },

    registrar,
    recordStore,
    ddtRoot,
  });
}

let runtimePromise:
  ReturnType<typeof buildRuntime>
  | undefined;

export function getReferenceRecorderRuntime() {
  runtimePromise ??=
    buildRuntime();

  return runtimePromise;
}
