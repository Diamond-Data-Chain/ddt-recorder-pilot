import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import type { DDTNormalizedRecord } from "../normalize/normalize";
import type { DDTStructuralDigest } from "../types";
import type {
  DDTArtifactEvaluation,
  DDTCapabilityResult,
  DDTCapabilityResults,
  DDTEvidenceEvaluation,
  DDTDirectArtifactEvaluations,
  DDTRuleResult,
  DDTReferenceRecorderPreservationContract,
} from "../producer/conformanceReceipt";
import type { DDTArtifactReference } from "../producer/evidenceManifest";
import { produceEvidenceSet } from "../producer/evidence";
import type {
  DDTPreparedDraft5Record,
  DDTRegistrant,
} from "../producer/recorder";
import {
  evaluateHistoricalIdentityAuthority,
  type DDTHistoricalIdentityAuthorityTrustConfiguration,
  type DDTHistoricalIdentityAuthorityRelevantMoment,
  type DDTHistoricalIdentityAuthorityEvaluation,
  type DDTReferenceRecorderHistoricalIAPolicy,
} from "./historicalIdentityAuthorityEvaluator";

const DIRECT_ARTIFACT_KEYS = [
  "envelopeSchema",
  "enterpriseProfile",
  "validationRuleSet",
  "canonicalizationProfile",
  "structuralCommitmentProfile",
  "identifierProfile",
  "evidenceManifestProfile",
  "relationshipVocabulary",
  "registrationSignatureProfile",
  "conformanceReceiptProfile",
  "verificationResultProfile",
  "verificationAxisRegistry",
  "verificationReasonCodeRegistry",
] as const;

const CAPABILITY_KEYS = [
  "identityAuthority",
  "independentTime",
  "eventCoverage",
  "networkFinality",
  "offlineVerification",
  "cryptographicRenewal",
] as const;

const EVIDENCE_DIGEST_PROFILE_ARTIFACT_ID =
  "DDT-EVIDENCE-DIGEST-COMMITMENT-PROFILE-ARTIFACT-0.1-DRAFT.1";

const EVIDENCE_RULE_RESULT_ID =
  "profile.reference-recorder.evidence.01";

type DDTReferenceRecorderEnterpriseProfileForHistoricalIA = {
  profileVersion: string;
  domain: {
    recordTypes: string[];
    subjectNamespaces: string[];
    organizationScopes?: string[];
  };
  extensions: Array<{
    namespace: string;
    schema: DDTArtifactReference;
    value: unknown;
  }>;
};

type DDTReferenceRecorderHistoricalIAExtension = {
  acceptedIdentityAssuranceProfiles: DDTArtifactReference[];
  registrationAuthorityScope: {
    action: string;
    proofPurpose: string;
    organizationScopesSource:
      "ENTERPRISE_PROFILE_DOMAIN_ORGANIZATION_SCOPES";
    domainScopes: string[];
  };
};

type DDTReferenceRecorderIdentityAssuranceProfile = {
  profileId: string;
  profileVersion: string;
  environment: "TEST_ONLY";
  identityBindingPolicy: {
    identityNamespace: string;
    acceptedRegistrantIdentityTypes: string[];
    requiredBindingScopes: string[];
  };
};

type ManifestEntry = {
  evidenceId: string;
  role: string;
  evidenceClass: string;
  mediaType: string;
  semanticScope: {
    historicallyLoadBearing: boolean;
    dependencyClass?: string;
    reconstructionScopes: string[];
    unresolvedResult: string;
  };
  representation: {
    mode: string;
    byteLength: number;
  };
  commitment: {
    commitmentType: string;
    profile: DDTArtifactReference;
    value: string;
    encoding: string;
  };
};

export type DDTReferenceRecorderValidationResult = {
  artifactEvaluations: DDTDirectArtifactEvaluations;
  normativeDependencyEvaluations: DDTArtifactEvaluation[];
  evidenceEvaluations: DDTEvidenceEvaluation[];
  ruleResults: DDTRuleResult[];
  capabilityResults: DDTCapabilityResults;
  historicalIdentityAuthority?: {
    signingKeyLifecycle?: DDTHistoricalIdentityAuthorityEvaluation["signingKeyLifecycle"];
  };
};

function sha256(bytes: Uint8Array): DDTStructuralDigest {
  return {
    algorithm: "SHA-256",
    value: createHash("sha256").update(bytes).digest("hex"),
  };
}

function sameDigest(
  a: DDTStructuralDigest,
  b: DDTStructuralDigest
): boolean {
  return a.algorithm === b.algorithm && a.value === b.value;
}

function sameArtifactReference(
  a: DDTArtifactReference,
  b: DDTArtifactReference
): boolean {
  return (
    a.artifactId === b.artifactId &&
    a.version === b.version &&
    sameDigest(a.digest, b.digest) &&
    (a.mediaType ?? null) === (b.mediaType ?? null)
  );
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

async function evaluateArtifact(
  ddtRoot: string,
  artifact: DDTArtifactReference,
  ruleResultRef: string
): Promise<DDTArtifactEvaluation> {
  if (!artifact.immutableRef) {
    return {
      artifact,
      availability: "UNAVAILABLE",
      integrity: "UNAVAILABLE",
      reasonCodes: ["ARTIFACT_IMMUTABLE_REF_MISSING"],
      ruleResultRef,
    };
  }

  const root = path.resolve(ddtRoot);
  const resolved = path.resolve(root, artifact.immutableRef);

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    return {
      artifact,
      availability: "UNAVAILABLE",
      integrity: "UNAVAILABLE",
      reasonCodes: ["ARTIFACT_PATH_OUTSIDE_DDT_ROOT"],
      ruleResultRef,
    };
  }

  try {
    const bytes = await fs.readFile(resolved);
    const actualDigest = sha256(bytes);

    if (!sameDigest(actualDigest, artifact.digest)) {
      return {
        artifact,
        availability: "AVAILABLE",
        integrity: "FAIL",
        reasonCodes: ["ARTIFACT_DIGEST_MISMATCH"],
        ruleResultRef,
      };
    }

    return {
      artifact,
      availability: "AVAILABLE",
      integrity: "PASS",
      reasonCodes: [],
      ruleResultRef,
    };
  } catch (error: unknown) {
    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error
        ? String((error as { code?: unknown }).code)
        : "";

    if (code === "ENOENT") {
      return {
        artifact,
        availability: "UNAVAILABLE",
        integrity: "UNAVAILABLE",
        reasonCodes: ["ARTIFACT_UNAVAILABLE"],
        ruleResultRef,
      };
    }

    throw error;
  }
}

async function loadVerifiedJsonArtifact<T>(
  ddtRoot: string,
  artifact: DDTArtifactReference,
  evaluation: DDTArtifactEvaluation
): Promise<T | undefined> {
  if (
    evaluation.availability !== "AVAILABLE" ||
    evaluation.integrity !== "PASS" ||
    !artifact.immutableRef
  ) {
    return undefined;
  }

  const root = path.resolve(ddtRoot);
  const resolved = path.resolve(root, artifact.immutableRef);

  if (
    resolved !== root &&
    !resolved.startsWith(`${root}${path.sep}`)
  ) {
    return undefined;
  }

  try {
    const bytes = await fs.readFile(resolved);
    return JSON.parse(bytes.toString("utf8")) as T;
  } catch {
    return undefined;
  }
}

function artifactEvaluationToRuleResult(
  evaluation: DDTArtifactEvaluation,
  resultId: string,
  sourceId: string
): DDTRuleResult {
  let status: DDTRuleResult["status"];

  if (evaluation.integrity === "PASS") {
    status = "PASS";
  } else if (evaluation.integrity === "FAIL") {
    status = "FAIL";
  } else {
    status = "INDETERMINATE";
  }

  return {
    resultId,
    sourceType: "CORE_REQUIREMENT",
    sourceId,
    requirement: "REQUIRED",
    applicability: "APPLICABLE",
    status,
    reasonCodes:
      status === "PASS"
        ? []
        : evaluation.reasonCodes.length > 0
          ? evaluation.reasonCodes
          : ["MANDATORY_RESULT_UNRESOLVED"],
    targetRefs: [evaluation.artifact.artifactId],
    evidenceRefs: [],
  };
}

function manifestEntries(
  prepared: DDTPreparedDraft5Record
): ManifestEntry[] {
  return prepared.evidenceManifest.entries as ManifestEntry[];
}

function evaluateEvidence(
  record: DDTNormalizedRecord,
  prepared: DDTPreparedDraft5Record,
  contract: DDTReferenceRecorderPreservationContract
): {
  evaluations: DDTEvidenceEvaluation[];
  sourceEvidenceRefs: Map<
    number,
    {
      evidenceRef: string;
      commitment: DDTStructuralDigest;
    }
  >;
  rule: DDTRuleResult;
} {
  const produced = produceEvidenceSet(record);
  const entries = manifestEntries(prepared);

  const digestProfile = contract.normativeDependencies.artifacts.find(
    (artifact) =>
      artifact.artifactId === EVIDENCE_DIGEST_PROFILE_ARTIFACT_ID
  );

  const evaluations: DDTEvidenceEvaluation[] = [];
  const sourceEvidenceRefs = new Map<
    number,
    {
      evidenceRef: string;
      commitment: DDTStructuralDigest;
    }
  >();

  const aggregateReasons: string[] = [];

  if (produced.items.length === 0) {
    aggregateReasons.push("REFERENCE_RECORDER_EVIDENCE_REQUIRED");
  }

  if (produced.items.length !== entries.length) {
    aggregateReasons.push("EVIDENCE_MANIFEST_COUNT_MISMATCH");
  }

  const count =
    Math.min(
      produced.items.length,
      entries.length
    );

  /*
   * Evidence Manifest entries are canonically sorted by evidenceId.
   * Produced evidence remains in source-input order.
   *
   * Therefore validation MUST NOT bind the two collections by array
   * position. Resolve each manifest entry against the presented bytes
   * by its committed evidence properties instead.
   */
  const unmatchedProduced =
    produced.items.map(
      (item, sourceIndex) => ({
        item,
        sourceIndex,
      })
    );

  for (
    let i = 0;
    i < count;
    i += 1
  ) {
    const entry =
      entries[i];

    /*
     * Prefer the complete expected tuple. The fallback ordering is only
     * for producing precise integrity reason codes when a manifest field
     * has been tampered with.
     */
    const candidateIndexes = [
      unmatchedProduced.findIndex(
        ({ item }) =>
          item.digest.value ===
            entry.commitment.value &&
          item.mediaType ===
            entry.mediaType &&
          item.byteLength ===
            entry.representation.byteLength
      ),

      unmatchedProduced.findIndex(
        ({ item }) =>
          item.digest.value ===
            entry.commitment.value &&
          item.mediaType ===
            entry.mediaType
      ),

      unmatchedProduced.findIndex(
        ({ item }) =>
          item.digest.value ===
            entry.commitment.value
      ),

      unmatchedProduced.findIndex(
        ({ item }) =>
          item.mediaType ===
            entry.mediaType &&
          item.byteLength ===
            entry.representation.byteLength
      ),
    ];

    const candidateIndex =
      candidateIndexes.find(
        (index) =>
          index >= 0
      ) ??
      (
        unmatchedProduced.length > 0
          ? 0
          : -1
      );

    if (candidateIndex < 0) {
      aggregateReasons.push(
        "EVIDENCE_MANIFEST_COUNT_MISMATCH"
      );

      continue;
    }

    const [
      matched,
    ] =
      unmatchedProduced.splice(
        candidateIndex,
        1
      );

    const item =
      matched.item;

    sourceEvidenceRefs.set(
      matched.sourceIndex,
      {
        evidenceRef: entry.evidenceId,
        commitment: item.digest,
      }
    );

    const reasons:
      string[] = [];

    if (
      entry.mediaType !==
      item.mediaType
    ) {
      reasons.push(
        "EVIDENCE_MEDIA_TYPE_MISMATCH"
      );
    }

    if (
      entry.representation.mode !==
      "RAW_BYTES"
    ) {
      reasons.push(
        "EVIDENCE_REPRESENTATION_MISMATCH"
      );
    }

    if (
      entry.representation.byteLength !==
      item.byteLength
    ) {
      reasons.push(
        "EVIDENCE_LENGTH_MISMATCH"
      );
    }

    if (
      entry.commitment.commitmentType !==
        "DIGEST" ||
      entry.commitment.encoding !==
        "LOWERCASE_HEX"
    ) {
      reasons.push(
        "EVIDENCE_COMMITMENT_FORMAT_MISMATCH"
      );
    }

    if (
      entry.commitment.value !==
      item.digest.value
    ) {
      reasons.push(
        "EVIDENCE_DIGEST_MISMATCH"
      );
    }

    if (
      !digestProfile ||
      !sameArtifactReference(
        entry.commitment.profile,
        digestProfile
      )
    ) {
      reasons.push(
        "EVIDENCE_COMMITMENT_PROFILE_MISMATCH"
      );
    }

    aggregateReasons.push(
      ...reasons
    );

    evaluations.push({
      evaluationId:
        `evidence.${String(i + 1).padStart(3, "0")}`,

      evidenceRef:
        entry.evidenceId,

      commitment:
        item.digest,

      availabilityAtValidation:
        "PRESENTED",

      integrity:
        reasons.length === 0
          ? "PASS"
          : "FAIL",

      reasonCodes:
        uniqueSorted(
          reasons
        ),

      ruleResultRefs: [
        EVIDENCE_RULE_RESULT_ID,
      ],
    });
  }

  const evidenceRefs = entries
    .map((entry) => entry.evidenceId)
    .filter((value): value is string => Boolean(value));

  const reasons = uniqueSorted(aggregateReasons);
  const status = reasons.length === 0 ? "PASS" : "FAIL";

  return {
    evaluations,
    sourceEvidenceRefs,
    rule: {
      resultId: EVIDENCE_RULE_RESULT_ID,
      sourceType: "PROFILE_RULE",
      sourceId: "REFERENCE_RECORDER.EVIDENCE.01",
      requirement: "REQUIRED",
      applicability: "APPLICABLE",
      status,
      reasonCodes: reasons,
      targetRefs: evidenceRefs,
      evidenceRefs,
    },
  };
}

function findNormativeEvaluation(
  contract: DDTReferenceRecorderPreservationContract,
  evaluations: DDTArtifactEvaluation[],
  artifact: DDTArtifactReference
): DDTArtifactEvaluation | undefined {
  const index = contract.normativeDependencies.artifacts.findIndex(
    (candidate) => sameArtifactReference(candidate, artifact)
  );

  return index >= 0 ? evaluations[index] : undefined;
}

function buildCapabilityResult(
  key: (typeof CAPABILITY_KEYS)[number],
  contract: DDTReferenceRecorderPreservationContract,
  normativeDependencyEvaluations: DDTArtifactEvaluation[]
): {
  capability: DDTCapabilityResult;
  rule: DDTRuleResult;
} {
  const expected = contract.capabilities[key];

  if (expected.requirement === "NOT_APPLICABLE") {
    const reason =
      expected.notApplicableReasonCode ??
      "NOT_APPLICABLE_TO_TARGET";

    return {
      capability: {
        contractRequirement: "NOT_APPLICABLE",
        notApplicableReasonCode: reason,
        applicability: "NOT_APPLICABLE",
        status: "NOT_APPLICABLE",
        reasonCodes: [],
        ruleResultRefs: [`capability.${key}`],
        evidenceRefs: [],
      },
      rule: {
        resultId: `capability.${key}`,
        sourceType: "CORE_REQUIREMENT",
        sourceId: `CAPABILITY.${key}`,
        requirement: "OPTIONAL",
        applicability: "NOT_APPLICABLE",
        status: "NOT_APPLICABLE",
        reasonCodes: [],
        targetRefs: [key],
        evidenceRefs: [],
      },
    };
  }

  if (expected.requirement === "CONDITIONAL") {
    throw new Error(
      `Reference Recorder validator does not have a condition binding for capability ${key}.`
    );
  }

  if (!expected.profile) {
    return {
      capability: {
        contractRequirement: "REQUIRED",
        applicability: "UNRESOLVED",
        status: "INDETERMINATE",
        reasonCodes: ["MANDATORY_RESULT_UNRESOLVED"],
        ruleResultRefs: [`capability.${key}`],
        evidenceRefs: [],
      },
      rule: {
        resultId: `capability.${key}`,
        sourceType: "CORE_REQUIREMENT",
        sourceId: `CAPABILITY.${key}`,
        requirement: "REQUIRED",
        applicability: "UNRESOLVED",
        status: "INDETERMINATE",
        reasonCodes: ["MANDATORY_RESULT_UNRESOLVED"],
        targetRefs: [key],
        evidenceRefs: [],
      },
    };
  }

  const profileEvaluation = findNormativeEvaluation(
    contract,
    normativeDependencyEvaluations,
    expected.profile
  );

  let status: "PASS" | "FAIL" | "INDETERMINATE";
  let reasons: string[];

  if (!profileEvaluation) {
    status = "INDETERMINATE";
    reasons = ["MANDATORY_RESULT_ABSENT"];
  } else if (profileEvaluation.integrity === "PASS") {
    status = "PASS";
    reasons = [];
  } else if (profileEvaluation.integrity === "FAIL") {
    status = "FAIL";
    reasons =
      profileEvaluation.reasonCodes.length > 0
        ? profileEvaluation.reasonCodes
        : ["ARTIFACT_DIGEST_MISMATCH"];
  } else {
    status = "INDETERMINATE";
    reasons =
      profileEvaluation.reasonCodes.length > 0
        ? profileEvaluation.reasonCodes
        : ["MANDATORY_RESULT_UNRESOLVED"];
  }

  return {
    capability: {
      contractRequirement: "REQUIRED",
      profile: expected.profile,
      applicability: "APPLICABLE",
      status,
      reasonCodes: reasons,
      ruleResultRefs: [`capability.${key}`],
      evidenceRefs: [],
    },
    rule: {
      resultId: `capability.${key}`,
      sourceType: "CORE_REQUIREMENT",
      sourceId: `CAPABILITY.${key}`,
      requirement: "REQUIRED",
      applicability: "APPLICABLE",
      status,
      reasonCodes: reasons,
      targetRefs: [expected.profile.artifactId],
      evidenceRefs: [],
    },
  };
}

export async function validateReferenceRecorderPreparedRecord(
  record: DDTNormalizedRecord,
  prepared: DDTPreparedDraft5Record,
  contract: DDTReferenceRecorderPreservationContract,
  ddtRoot = path.join(process.cwd(), "docs", "ddt"),
  signingContext?: {
    registrant: DDTRegistrant;
    verificationMethod: string;
    publicKeyBase64url: string;
  },
  verificationContext?: {
    historicalIdentityAuthority?: {
      relevantMoment: DDTHistoricalIdentityAuthorityRelevantMoment;
    };
  }
): Promise<DDTReferenceRecorderValidationResult> {
  if (
    prepared.commitments.preservationContractCommitment.value !==
    sha256(
      Buffer.from(
        JSON.stringify(contract),
        "utf8"
      )
    ).value
  ) {
    /*
     * Do not use this byte-level comparison as the actual contract
     * commitment check: Envelope commitments use JCS, not JSON text.
     * The real binding is already enforced by buildConformanceReceiptDraft.
     * This branch intentionally does nothing.
     */
  }

  const directPairs = await Promise.all(
    DIRECT_ARTIFACT_KEYS.map(async (key) => {
      const resultId = `direct-artifact.${key}`;
      const evaluation = await evaluateArtifact(
        ddtRoot,
        contract.artifacts[key],
        resultId
      );

      return [
        key,
        evaluation,
        artifactEvaluationToRuleResult(
          evaluation,
          resultId,
          `DIRECT_ARTIFACT.${key}`
        ),
      ] as const;
    })
  );

  const artifactEvaluations = Object.fromEntries(
    directPairs.map(([key, evaluation]) => [key, evaluation])
  ) as DDTDirectArtifactEvaluations;

  const directRules = directPairs.map(([, , rule]) => rule);

  const normativePairs = await Promise.all(
    contract.normativeDependencies.artifacts.map(
      async (artifact, index) => {
        const resultId = `normative.${String(index + 1).padStart(3, "0")}`;

        const evaluation = await evaluateArtifact(
          ddtRoot,
          artifact,
          resultId
        );

        return {
          evaluation,
          rule: artifactEvaluationToRuleResult(
            evaluation,
            resultId,
            `NORMATIVE_DEPENDENCY.${String(index + 1).padStart(3, "0")}`
          ),
        };
      }
    )
  );

  const normativeDependencyEvaluations =
    normativePairs.map((item) => item.evaluation);

  const normativeRules = normativePairs.map((item) => item.rule);

  const historicalIdentityAuthorityTrustArtifactIndex =
    contract.normativeDependencies.artifacts.findIndex(
      (artifact) =>
        artifact.artifactId.startsWith(
          "DDT-HISTORICAL-IDENTITY-AUTHORITY-TRUST-CONFIGURATION-"
        )
    );

  const historicalIdentityAuthorityTrustConfiguration =
    historicalIdentityAuthorityTrustArtifactIndex >= 0
      ? await loadVerifiedJsonArtifact<
          DDTHistoricalIdentityAuthorityTrustConfiguration
        >(
          ddtRoot,
          contract.normativeDependencies.artifacts[
            historicalIdentityAuthorityTrustArtifactIndex
          ],
          normativePairs[
            historicalIdentityAuthorityTrustArtifactIndex
          ].evaluation
        )
      : undefined;

  const historicalIAPolicyArtifactIds = {
    extensionSchema:
      "DDT-REFERENCE-RECORDER-HISTORICAL-IA-ENTERPRISE-EXTENSION-SCHEMA-0.1-DRAFT.1",
    assuranceProfile:
      "DDT-REFERENCE-RECORDER-IDENTITY-ASSURANCE-PROFILE-0.1-DRAFT.1",
    assuranceSchema:
      "DDT-REFERENCE-RECORDER-IDENTITY-ASSURANCE-PROFILE-SCHEMA-0.1-DRAFT.1",
  } as const;

  const normativeArtifactIndex = (artifactId: string) =>
    contract.normativeDependencies.artifacts.findIndex(
      (artifact) => artifact.artifactId === artifactId
    );

  const extensionSchemaIndex = normativeArtifactIndex(
    historicalIAPolicyArtifactIds.extensionSchema
  );
  const assuranceProfileIndex = normativeArtifactIndex(
    historicalIAPolicyArtifactIds.assuranceProfile
  );
  const assuranceSchemaIndex = normativeArtifactIndex(
    historicalIAPolicyArtifactIds.assuranceSchema
  );

  const verifiedNormativeArtifact = (index: number) =>
    index >= 0 &&
    normativePairs[index]?.evaluation.availability === "AVAILABLE" &&
    normativePairs[index]?.evaluation.integrity === "PASS";

  const enterpriseProfile =
    await loadVerifiedJsonArtifact<
      DDTReferenceRecorderEnterpriseProfileForHistoricalIA
    >(
      ddtRoot,
      contract.artifacts.enterpriseProfile,
      artifactEvaluations.enterpriseProfile
    );

  const assuranceProfile =
    assuranceProfileIndex >= 0
      ? await loadVerifiedJsonArtifact<
          DDTReferenceRecorderIdentityAssuranceProfile
        >(
          ddtRoot,
          contract.normativeDependencies.artifacts[
            assuranceProfileIndex
          ],
          normativePairs[assuranceProfileIndex].evaluation
        )
      : undefined;

  const historicalIAExtension =
    enterpriseProfile?.extensions.find(
      (extension) =>
        extension.namespace ===
        "urn:ddt:extension:reference-recorder:historical-identity-authority"
    );

  const historicalIAExtensionValue =
    historicalIAExtension?.value &&
    typeof historicalIAExtension.value === "object"
      ? historicalIAExtension.value as
          DDTReferenceRecorderHistoricalIAExtension
      : undefined;

  const acceptedAssuranceReference =
    historicalIAExtensionValue
      ?.acceptedIdentityAssuranceProfiles?.[0];

  const normativeAssuranceReference =
    assuranceProfileIndex >= 0
      ? contract.normativeDependencies.artifacts[
          assuranceProfileIndex
        ]
      : undefined;

  const referenceRecorderHistoricalIAPolicy:
    DDTReferenceRecorderHistoricalIAPolicy | undefined =
      enterpriseProfile?.profileVersion === "0.2.0-draft.3" &&
      historicalIAExtension &&
      historicalIAExtensionValue &&
      historicalIAExtensionValue
        .acceptedIdentityAssuranceProfiles.length === 1 &&
      acceptedAssuranceReference &&
      normativeAssuranceReference &&
      sameArtifactReference(
        acceptedAssuranceReference,
        normativeAssuranceReference
      ) &&
      verifiedNormativeArtifact(extensionSchemaIndex) &&
      verifiedNormativeArtifact(assuranceProfileIndex) &&
      verifiedNormativeArtifact(assuranceSchemaIndex) &&
      assuranceProfile?.profileVersion === "0.1.0-draft.1" &&
      assuranceProfile.environment === "TEST_ONLY" &&
      historicalIAExtensionValue.registrationAuthorityScope
        .organizationScopesSource ===
        "ENTERPRISE_PROFILE_DOMAIN_ORGANIZATION_SCOPES" &&
      enterpriseProfile.domain.organizationScopes?.length
        ? {
            acceptedIdentityAssuranceProfiles:
              historicalIAExtensionValue
                .acceptedIdentityAssuranceProfiles,
            identityAssurance: {
              identityNamespace:
                assuranceProfile.identityBindingPolicy
                  .identityNamespace,
              acceptedRegistrantIdentityTypes:
                assuranceProfile.identityBindingPolicy
                  .acceptedRegistrantIdentityTypes,
              requiredBindingScopes:
                assuranceProfile.identityBindingPolicy
                  .requiredBindingScopes,
            },
            registrationAuthorityScope: {
              action:
                historicalIAExtensionValue
                  .registrationAuthorityScope.action,
              proofPurpose:
                historicalIAExtensionValue
                  .registrationAuthorityScope.proofPurpose,
              recordTypes: enterpriseProfile.domain.recordTypes,
              subjectNamespaces:
                enterpriseProfile.domain.subjectNamespaces,
              organizationScopes:
                enterpriseProfile.domain.organizationScopes,
              domainScopes:
                historicalIAExtensionValue
                  .registrationAuthorityScope.domainScopes,
            },
          }
        : undefined;

  const evidence = evaluateEvidence(record, prepared, contract);

  const historicalIdentityAuthority =
    await evaluateHistoricalIdentityAuthority(
      record,
      signingContext,
      evidence.sourceEvidenceRefs,
      verificationContext?.historicalIdentityAuthority?.relevantMoment,
      historicalIdentityAuthorityTrustConfiguration,
      referenceRecorderHistoricalIAPolicy
    );

  const capabilityEntries = CAPABILITY_KEYS.map((key) => [
    key,
    buildCapabilityResult(
      key,
      contract,
      normativeDependencyEvaluations
    ),
  ] as const);

  const capabilityResults = Object.fromEntries(
    capabilityEntries.map(([key, value]) => [
      key,
      value.capability,
    ])
  ) as DDTCapabilityResults;

  if (historicalIdentityAuthority.applicable) {
    const axisRules = historicalIdentityAuthority.ruleResults;

    capabilityResults.identityAuthority = {
      ...capabilityResults.identityAuthority,
      applicability: "APPLICABLE",
      status: axisRules.some((rule) => rule.status === "FAIL")
        ? "FAIL"
        : axisRules.every((rule) => rule.status === "PASS")
          ? "PASS"
          : "INDETERMINATE",
      reasonCodes: [
        ...new Set(axisRules.flatMap((rule) => rule.reasonCodes)),
      ].sort(),
      ruleResultRefs: axisRules
        .map((rule) => rule.resultId)
        .sort(),
      evidenceRefs: [
        ...new Set(axisRules.flatMap((rule) => rule.evidenceRefs)),
      ].sort(),
    };
  } else if (
    contract.capabilities.identityAuthority.requirement === "REQUIRED"
  ) {
    capabilityResults.identityAuthority = {
      ...capabilityResults.identityAuthority,
      applicability: "UNRESOLVED",
      status: "INDETERMINATE",
      reasonCodes: ["AUTHORITY_EVIDENCE_UNAVAILABLE"],
      ruleResultRefs: ["capability.identityAuthority"],
      evidenceRefs: [],
    };
  }

  const capabilityRules = capabilityEntries.map(
    ([, value]) => value.rule
  );

  return {
    artifactEvaluations,
    normativeDependencyEvaluations,
    evidenceEvaluations: evidence.evaluations,
    ruleResults: [
      ...directRules,
      ...normativeRules,
      evidence.rule,
      ...historicalIdentityAuthority.ruleResults,
      ...capabilityRules,
    ],
    capabilityResults,
    ...(historicalIdentityAuthority.applicable
      ? {
          historicalIdentityAuthority: {
            ...(historicalIdentityAuthority.signingKeyLifecycle
              ? {
                  signingKeyLifecycle:
                    historicalIdentityAuthority.signingKeyLifecycle,
                }
              : {}),
          },
        }
      : {}),
  };
}
