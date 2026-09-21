import type { DDTStructuralDigest } from "../types";
import type { DDTJsonValue } from "./canonical";
import { digestJcs } from "./canonical";
import type { DDTArtifactReference } from "./evidenceManifest";
import type { DDTPreparedDraft5Record } from "./recorder";

const CONFORMANCE_RECEIPT_SPECIFICATION = {
  standard: "DDT-CONFORMANCE-RECEIPT",
  version: "0.3.0-draft.1",
} as const;

const REFERENCE_DERIVATION_PROFILE: DDTArtifactReference = {
  artifactId: "DDT-CONFORMANCE-RESULT-DERIVATION-PROFILE-0.1-DRAFT.1",
  version: "0.1.0-draft.1",
  digest: {
    algorithm: "SHA-256",
    value: "31f0f96ddf7d59d6e524cd67eb339d3265fe6fd2cf94f1f0d2f822232ff46504",
  },
  immutableRef:
    "profiles/ddt-conformance-result-derivation-profile-v0.1.json",
  mediaType: "application/json",
};

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

export type DDTArtifactEvaluation = {
  artifact: DDTArtifactReference;
  availability: "AVAILABLE" | "UNAVAILABLE";
  integrity: "PASS" | "FAIL" | "UNAVAILABLE" | "NOT_EVALUATED";
  reasonCodes: string[];
  ruleResultRef: string;
};

export type DDTDirectArtifactEvaluations = Record<
  (typeof DIRECT_ARTIFACT_KEYS)[number],
  DDTArtifactEvaluation
>;

export type DDTEvidenceEvaluation = {
  evaluationId: string;
  evidenceRef: string;
  commitment?: DDTStructuralDigest;
  availabilityAtValidation: "PRESENTED" | "UNAVAILABLE" | "NOT_REQUIRED";
  integrity:
    | "PASS"
    | "FAIL"
    | "UNAVAILABLE"
    | "NOT_EVALUATED"
    | "NOT_APPLICABLE";
  reasonCodes: string[];
  ruleResultRefs: string[];
};

export type DDTRuleResult = {
  resultId: string;
  sourceType:
    | "CORE_REQUIREMENT"
    | "SCHEMA_RULE"
    | "PROFILE_RULE"
    | "CONTRACT_OBLIGATION"
    | "EXTENSION_RULE";
  sourceId: string;
  originTemplateId?: string;
  contractFailureBinding?: {
    failureCode: string;
    failureAxis: string;
  };
  requirement: "REQUIRED" | "CONDITIONAL" | "OPTIONAL";
  conditionResultRef?: string;
  applicability: "APPLICABLE" | "NOT_APPLICABLE" | "UNRESOLVED";
  status: "PASS" | "FAIL" | "INDETERMINATE" | "NOT_APPLICABLE";
  reasonCodes: string[];
  targetRefs: string[];
  evidenceRefs: string[];
};

export type DDTCapabilityResult = {
  contractRequirement: "REQUIRED" | "CONDITIONAL" | "NOT_APPLICABLE";
  profile?: DDTArtifactReference;
  conditionRuleId?: string;
  conditionResultRef?: string;
  notApplicableReasonCode?: string;
  applicability: "APPLICABLE" | "NOT_APPLICABLE" | "UNRESOLVED";
  status: "PASS" | "FAIL" | "INDETERMINATE" | "NOT_APPLICABLE";
  reasonCodes: string[];
  ruleResultRefs: string[];
  evidenceRefs: string[];
};

export type DDTCapabilityResults = Record<
  (typeof CAPABILITY_KEYS)[number],
  DDTCapabilityResult
>;

export type DDTReferenceRecorderPreservationContract = {
  artifacts: Record<
    (typeof DIRECT_ARTIFACT_KEYS)[number],
    DDTArtifactReference
  >;
  normativeDependencies: {
    artifacts: DDTArtifactReference[];
    closureDigest: DDTStructuralDigest;
  };
  capabilities: Record<
    (typeof CAPABILITY_KEYS)[number],
    {
      requirement: "REQUIRED" | "CONDITIONAL" | "NOT_APPLICABLE";
      profile?: DDTArtifactReference;
      conditionRuleId?: string;
      notApplicableReasonCode?: string;
    }
  >;
  validator: {
    validatorId: string;
    version: string;
    digest: DDTStructuralDigest;
    immutableRef?: string;
  };
};

export type DDTConformanceReceiptBuildInput = {
  prepared: DDTPreparedDraft5Record;
  preservationContract: DDTReferenceRecorderPreservationContract;

  receiptId: string;
  executionId: string;
  validatorInstanceIdentityRef?: string;

  artifactEvaluations: DDTDirectArtifactEvaluations;
  normativeDependencyEvaluations: DDTArtifactEvaluation[];
  evidenceEvaluations: DDTEvidenceEvaluation[];
  ruleResults: DDTRuleResult[];
  capabilityResults: DDTCapabilityResults;

  validationStartedAt?: string;
  validationCompletedAt?: string;
};

export type DDTUnsignedConformanceReceipt = {
  specification: typeof CONFORMANCE_RECEIPT_SPECIFICATION;
  receiptCore: {
    receiptId: string;
    recordHash: DDTStructuralDigest;
    preservationContractCommitment: DDTStructuralDigest;

    validator: {
      validatorId: string;
      version: string;
      digest: DDTStructuralDigest;
      immutableRef?: string;
      executionId: string;
      instanceIdentityRef?: string;
    };

    validationInput: {
      recordHash: DDTStructuralDigest;
      preservationContractCommitment: DDTStructuralDigest;
      preservationContractDependencyClosureDigest: DDTStructuralDigest;
      evaluatedArtifactSetHash: DDTStructuralDigest;
      evaluatedNormativeDependencySetHash: DDTStructuralDigest;
      evaluatedEvidenceSetHash: DDTStructuralDigest;
      inputManifestHash: DDTStructuralDigest;
    };

    artifactEvaluations: DDTDirectArtifactEvaluations;
    normativeDependencyEvaluations: DDTArtifactEvaluation[];
    evidenceEvaluations: DDTEvidenceEvaluation[];
    ruleResults: DDTRuleResult[];
    capabilityResults: DDTCapabilityResults;

    overallResult: {
      status: "PASS" | "FAIL" | "INDETERMINATE";
      derivationProfile: DDTArtifactReference;
      ruleResultSetHash: DDTStructuralDigest;
      capabilityResultSetHash: DDTStructuralDigest;
      ruleCounts: DDTResultCounts;
      capabilityCounts: DDTResultCounts;
      reasonCodes: string[];
    };

    claimBoundary: {
      substantiveTruth: "NOT_EVALUATED";
      legalValidity: "NOT_EVALUATED";
      recordIntegrity: "SEPARATE_AXIS";
      documentAvailability: "SEPARATE_AXIS";
      documentIntegrity: "SEPARATE_AXIS";
      registrantAuthority: "SEPARATE_AXIS";
      independentTime: "SEPARATE_AXIS";
      networkFinality: "SEPARATE_AXIS";
      eventHistoryCompleteness: "SEPARATE_AXIS";
      historicalSemanticResolution: "SEPARATE_AXIS";
      contractApplicability: "SEPARATE_AXIS";
    };

    validationTimeClaims: {
      startedAt?: string;
      completedAt?: string;
    };
  };

  receiptCoreHash: DDTStructuralDigest;
  proofs: DDTJsonValue[];
};

type DDTResultCounts = {
  pass: number;
  fail: number;
  indeterminate: number;
  notApplicable: number;
};

function digest(value: unknown): DDTStructuralDigest {
  return digestJcs(value as DDTJsonValue);
}

function sameArtifact(
  a: DDTArtifactReference,
  b: DDTArtifactReference
): boolean {
  return digest(a).value === digest(b).value;
}

function assertDirectArtifactCoverage(
  contract: DDTReferenceRecorderPreservationContract,
  evaluations: DDTDirectArtifactEvaluations
): void {
  for (const key of DIRECT_ARTIFACT_KEYS) {
    if (!evaluations[key]) {
      throw new Error(`Missing direct artifact evaluation: ${key}`);
    }

    if (!sameArtifact(evaluations[key].artifact, contract.artifacts[key])) {
      throw new Error(
        `Direct artifact evaluation does not match Preservation Contract: ${key}`
      );
    }
  }
}

function assertNormativeDependencyCoverage(
  contract: DDTReferenceRecorderPreservationContract,
  evaluations: DDTArtifactEvaluation[]
): void {
  const expected = contract.normativeDependencies.artifacts;

  if (evaluations.length !== expected.length) {
    throw new Error(
      `Normative dependency coverage mismatch: expected ${expected.length}, got ${evaluations.length}`
    );
  }

  for (let i = 0; i < expected.length; i += 1) {
    if (!sameArtifact(evaluations[i].artifact, expected[i])) {
      throw new Error(
        `Normative dependency coverage differs from Preservation Contract at index ${i}`
      );
    }
  }
}

function assertCapabilityBinding(
  contract: DDTReferenceRecorderPreservationContract,
  results: DDTCapabilityResults
): void {
  for (const key of CAPABILITY_KEYS) {
    const expected = contract.capabilities[key];
    const actual = results[key];

    if (!actual) {
      throw new Error(`Missing capability result: ${key}`);
    }

    if (actual.contractRequirement !== expected.requirement) {
      throw new Error(
        `Capability requirement mismatch for ${key}: expected ${expected.requirement}, got ${actual.contractRequirement}`
      );
    }

    if (expected.profile) {
      if (!actual.profile || !sameArtifact(actual.profile, expected.profile)) {
        throw new Error(`Capability profile mismatch for ${key}`);
      }
    }

    if (
      expected.requirement === "NOT_APPLICABLE" &&
      actual.notApplicableReasonCode !== expected.notApplicableReasonCode
    ) {
      throw new Error(`Capability NOT_APPLICABLE reason mismatch for ${key}`);
    }
  }
}

function countResults(
  statuses: Array<"PASS" | "FAIL" | "INDETERMINATE" | "NOT_APPLICABLE">
): DDTResultCounts {
  return {
    pass: statuses.filter((x) => x === "PASS").length,
    fail: statuses.filter((x) => x === "FAIL").length,
    indeterminate: statuses.filter((x) => x === "INDETERMINATE").length,
    notApplicable: statuses.filter((x) => x === "NOT_APPLICABLE").length,
  };
}

function deriveOverallResult(
  ruleResults: DDTRuleResult[],
  capabilityResults: DDTCapabilityResults
): {
  status: "PASS" | "FAIL" | "INDETERMINATE";
  reasonCodes: string[];
} {
  const mandatoryRules = ruleResults.filter(
    (r) => r.requirement === "REQUIRED" || r.requirement === "CONDITIONAL"
  );

  const capabilities = CAPABILITY_KEYS.map((key) => capabilityResults[key]);

  const mandatoryCapabilities = capabilities.filter(
    (c) =>
      c.contractRequirement === "REQUIRED" ||
      c.contractRequirement === "CONDITIONAL"
  );

  const failedRule = mandatoryRules.find(
    (r) => r.applicability === "APPLICABLE" && r.status === "FAIL"
  );

  const failedCapability = mandatoryCapabilities.find(
    (c) => c.applicability === "APPLICABLE" && c.status === "FAIL"
  );

  if (failedRule || failedCapability) {
    return {
      status: "FAIL",
      reasonCodes: Array.from(
        new Set([
          ...(failedRule?.reasonCodes ?? []),
          ...(failedCapability?.reasonCodes ?? []),
        ])
      ).sort(),
    };
  }

  const unresolvedRule = mandatoryRules.find(
    (r) =>
      r.applicability === "UNRESOLVED" ||
      r.status === "INDETERMINATE"
  );

  const unresolvedCapability = mandatoryCapabilities.find(
    (c) =>
      c.applicability === "UNRESOLVED" ||
      c.status === "INDETERMINATE"
  );

  if (unresolvedRule || unresolvedCapability) {
    const reasons = Array.from(
      new Set([
        ...(unresolvedRule?.reasonCodes ?? []),
        ...(unresolvedCapability?.reasonCodes ?? []),
      ])
    ).sort();

    return {
      status: "INDETERMINATE",
      reasonCodes:
        reasons.length > 0
          ? reasons
          : ["MANDATORY_RESULT_UNRESOLVED"],
    };
  }

  return {
    status: "PASS",
    reasonCodes: [],
  };
}

export function buildConformanceReceiptDraft(
  input: DDTConformanceReceiptBuildInput
): DDTUnsignedConformanceReceipt {
  assertDirectArtifactCoverage(
    input.preservationContract,
    input.artifactEvaluations
  );

  assertNormativeDependencyCoverage(
    input.preservationContract,
    input.normativeDependencyEvaluations
  );

  assertCapabilityBinding(
    input.preservationContract,
    input.capabilityResults
  );

  const recordHash = input.prepared.commitments.recordHash;
  const preservationContractCommitment =
    input.prepared.commitments.preservationContractCommitment;

  if (
    digest(input.preservationContract).value !==
    preservationContractCommitment.value
  ) {
    throw new Error(
      "Preservation Contract object does not match prepared Envelope commitment."
    );
  }

  const normativeDependencyEvaluations =
    [...input.normativeDependencyEvaluations];

  const evidenceEvaluations = [...input.evidenceEvaluations].sort((a, b) =>
    a.evaluationId.localeCompare(b.evaluationId)
  );

  const evaluatedArtifactSetHash = digest(input.artifactEvaluations);

  const evaluatedNormativeDependencySetHash = digest(
    normativeDependencyEvaluations
  );

  const evaluatedEvidenceSetHash = digest(evidenceEvaluations);

  const preservationContractDependencyClosureDigest =
    input.preservationContract.normativeDependencies.closureDigest;

  const inputManifestHash = digest({
    recordHash,
    preservationContractCommitment,
    preservationContractDependencyClosureDigest,
    evaluatedArtifactSetHash,
    evaluatedNormativeDependencySetHash,
    evaluatedEvidenceSetHash,
  });

  const derived = deriveOverallResult(
    input.ruleResults,
    input.capabilityResults
  );

  const ruleCounts = countResults(
    input.ruleResults.map((r) => r.status)
  );

  const capabilityCounts = countResults(
    CAPABILITY_KEYS.map((key) => input.capabilityResults[key].status)
  );

  const ruleResultSetHash = digest(input.ruleResults);
  const capabilityResultSetHash = digest(input.capabilityResults);

  const receiptCore: DDTUnsignedConformanceReceipt["receiptCore"] = {
    receiptId: input.receiptId,
    recordHash,
    preservationContractCommitment,

    validator: {
      ...input.preservationContract.validator,
      executionId: input.executionId,
      ...(input.validatorInstanceIdentityRef
        ? { instanceIdentityRef: input.validatorInstanceIdentityRef }
        : {}),
    },

    validationInput: {
      recordHash,
      preservationContractCommitment,
      preservationContractDependencyClosureDigest,
      evaluatedArtifactSetHash,
      evaluatedNormativeDependencySetHash,
      evaluatedEvidenceSetHash,
      inputManifestHash,
    },

    artifactEvaluations: input.artifactEvaluations,
    normativeDependencyEvaluations,
    evidenceEvaluations,
    ruleResults: input.ruleResults,
    capabilityResults: input.capabilityResults,

    overallResult: {
      status: derived.status,
      derivationProfile: REFERENCE_DERIVATION_PROFILE,
      ruleResultSetHash,
      capabilityResultSetHash,
      ruleCounts,
      capabilityCounts,
      reasonCodes: derived.reasonCodes,
    },

    claimBoundary: {
      substantiveTruth: "NOT_EVALUATED",
      legalValidity: "NOT_EVALUATED",
      recordIntegrity: "SEPARATE_AXIS",
      documentAvailability: "SEPARATE_AXIS",
      documentIntegrity: "SEPARATE_AXIS",
      registrantAuthority: "SEPARATE_AXIS",
      independentTime: "SEPARATE_AXIS",
      networkFinality: "SEPARATE_AXIS",
      eventHistoryCompleteness: "SEPARATE_AXIS",
      historicalSemanticResolution: "SEPARATE_AXIS",
      contractApplicability: "SEPARATE_AXIS",
    },

    validationTimeClaims: {
      ...(input.validationStartedAt
        ? { startedAt: input.validationStartedAt }
        : {}),
      ...(input.validationCompletedAt
        ? { completedAt: input.validationCompletedAt }
        : {}),
    },
  };

  const receiptCoreHash = digest(receiptCore);

  return {
    specification: CONFORMANCE_RECEIPT_SPECIFICATION,
    receiptCore,
    receiptCoreHash,
    proofs: [],
  };
}
