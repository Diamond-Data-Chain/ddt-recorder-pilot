import { digestJcs, type DDTJsonValue } from "./canonical";

import type { DDTNormalizedRecord } from "../normalize/normalize";
import { produceEvidenceSet } from "./evidence";

export type DDTArtifactReference = {
  artifactId: string;
  version: string;
  digest: {
    algorithm: "SHA-256";
    value: string;
  };
  immutableRef?: string;
  mediaType?: string;
};

export type DDTEvidenceManifestEntryPolicy = {
  role:
    | "SOURCE_PAYLOAD"
    | "SUPPORTING_EVIDENCE"
    | "SEMANTIC_DEPENDENCY"
    | "POLICY_OR_RULEBOOK"
    | "FRAMEWORK_OR_DEFINITION"
    | "AUTHORITY_EVIDENCE"
    | "IDENTITY_OR_KEY_EVIDENCE"
    | "PROVENANCE_EVIDENCE"
    | "TIME_OR_ORDERING_EVIDENCE"
    | "VALIDATION_ARTIFACT"
    | "PROFILE_DEFINED";

  evidenceClass: string;

  declaredIdentity: {
    namespace: string;
    objectId: string;
    objectVersion?: string;
    issuerRef?: string;
    versionEvidenceRefs: string[];
  };

  custody: {
    mode:
      | "OWNER_CONTROLLED"
      | "ENTERPRISE_CONTROLLED"
      | "THIRD_PARTY_REPOSITORY"
      | "PUBLIC_IMMUTABLE_REPOSITORY"
      | "DISTRIBUTED_CONTENT_ADDRESSING"
      | "PROFILE_DEFINED";
    custodianRef?: string;
    retrievalRefs: Array<{
      referenceId: string;
      referenceType:
        | "IMMUTABLE_URI"
        | "CONTENT_ADDRESS"
        | "OWNER_CONTROLLED_REFERENCE"
        | "PUBLICATION_REFERENCE"
        | "PROFILE_DEFINED";
      value: string;
      accessMode:
        | "PUBLIC"
        | "AUTHORIZED_REQUEST"
        | "PRIVATE_RESOLUTION"
        | "PROFILE_DEFINED";
      immutable: boolean;
    }>;
  };

  confidentiality: {
    classification:
      | "PUBLIC"
      | "RESTRICTED"
      | "CONFIDENTIAL"
      | "SECRET"
      | "PROFILE_DEFINED";
    publicCommitmentRisk:
      | "LOW"
      | "REVIEWED"
      | "HIGH"
      | "UNRESOLVED";
    disclosureProfile?: DDTArtifactReference;
    redactionPermitted: boolean;
  };

  preservationObligationRefs: string[];

  provenance: {
    assertedBy: {
      identityRef: string;
      layer: "UPSTREAM" | "REGISTRANT" | "CUSTODIAN";
    };
    sourceSystemRef?: string;
    capturedAtClaim?: string;
    signatureProofRefs: string[];
    authorityEvidenceRefs: string[];
  };

  semanticScope: {
    historicallyLoadBearing: boolean;
    dependencyClass?: string;
    reconstructionScopes: string[];
    unresolvedResult:
      | "PARTIAL"
      | "AMBIGUOUS"
      | "UNKNOWN"
      | "UNAVAILABLE"
      | "FAIL"
      | "NOT_APPLICABLE";
  };

  relatedEvidence?: Array<{
    relationshipType: string;
    targetEvidenceId: string;
    targetCommitment?: {
      commitmentType:
        | "DIGEST"
        | "RANDOMIZED_COMMITMENT"
        | "KEYED_COMMITMENT"
        | "ZERO_KNOWLEDGE_PROOF_COMMITMENT"
        | "PROFILE_DEFINED";
      profile: DDTArtifactReference;
      value: string;
      encoding:
        | "LOWERCASE_HEX"
        | "BASE64URL"
        | "MULTIBASE"
        | "PROFILE_DEFINED";
    };
    evidenceRefs: string[];
  }>;

  description?: string;
};

export type DDTEvidenceManifestPolicyContext = {
  entries: DDTEvidenceManifestEntryPolicy[];
};

export type DDTEvidenceManifest = {
  specification: {
    standard: "DDT-EVIDENCE-MANIFEST";
    version: "0.1.0-draft.1";
  };
  manifestId: string;
  entries: unknown[];
  extensions: [];
};

const RAW_SHA256_COMMITMENT_PROFILE: DDTArtifactReference = {
  artifactId:
    "DDT-EVIDENCE-DIGEST-COMMITMENT-PROFILE-ARTIFACT-0.1-DRAFT.1",
  version: "0.1.0-draft.1",
  digest: {
    algorithm: "SHA-256",
    value:
      "d0408be2633164aff62e5341064e971644e07105fd85abbdbb9b081d55b056e8",
  },
  immutableRef:
    "../profiles/ddt-evidence-digest-commitment-profile-v0.1.json",
  mediaType: "application/json",
};

function deterministicEvidenceId(
  record: DDTNormalizedRecord,
  item: {
    name: string;
    mediaType: string;
    byteLength: number;
    digest: {
      algorithm: "SHA-256";
      value: string;
    };
  },
  policy: DDTEvidenceManifestEntryPolicy
): string {
  const seed: DDTJsonValue = {
    domain: "DDT-EVIDENCE-ID-0.1",
    ddtRecordId: record.ddtRecordId,
    name: item.name,
    mediaType: item.mediaType,
    byteLength: item.byteLength,
    digest: {
      algorithm: item.digest.algorithm,
      value: item.digest.value,
    },
    role: policy.role,
    evidenceClass: policy.evidenceClass,
    declaredIdentity: {
      namespace: policy.declaredIdentity.namespace,
      objectId: policy.declaredIdentity.objectId,
      objectVersion: policy.declaredIdentity.objectVersion ?? null,
      issuerRef: policy.declaredIdentity.issuerRef ?? null,
    },
  };

  return `urn:ddt:evidence:sha256:${digestJcs(seed).value}`;
}

export function evidenceIdsFor(
  record: DDTNormalizedRecord,
  policyContext: DDTEvidenceManifestPolicyContext
): string[] {
  if (
    record.evidence.length !==
    policyContext.entries.length
  ) {
    throw new Error(
      "Evidence count and materialized evidence-policy count must match exactly."
    );
  }

  const evidenceSet = produceEvidenceSet(record);

  return evidenceSet.items.map(
    (item, index) =>
      deterministicEvidenceId(
        record,
        item,
        policyContext.entries[index]
      )
  );
}

function deterministicManifestId(
  entries: unknown[]
): string {
  const seed: DDTJsonValue = {
    domain: "DDT-EVIDENCE-MANIFEST-ID-0.1",
    specification: {
      standard: "DDT-EVIDENCE-MANIFEST",
      version: "0.1.0-draft.1",
    },
    entries: entries as DDTJsonValue[],
    extensions: [],
  };

  return `urn:ddt:evidence-manifest:sha256:${digestJcs(seed).value}`;
}

function compareUnicodeCodePoints(a: string, b: string): number {
  const aa = Array.from(a, (c) => c.codePointAt(0)!);
  const bb = Array.from(b, (c) => c.codePointAt(0)!);
  const n = Math.min(aa.length, bb.length);

  for (let i = 0; i < n; i++) {
    if (aa[i] !== bb[i]) {
      return aa[i] < bb[i] ? -1 : 1;
    }
  }

  return aa.length === bb.length
    ? 0
    : aa.length < bb.length
      ? -1
      : 1;
}

function uniqueSortedStrings(
  values: string[],
  label: string
): string[] {
  const sorted = [...values].sort(compareUnicodeCodePoints);

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1]) {
      throw new Error(`Duplicate ${label}: ${sorted[i]}`);
    }
  }

  return sorted;
}

function validateSemanticScope(
  policy: DDTEvidenceManifestEntryPolicy
): void {
  const scope = policy.semanticScope;

  if (scope.historicallyLoadBearing) {
    if (!scope.dependencyClass) {
      throw new Error(
        "Historically load-bearing evidence requires dependencyClass."
      );
    }

    if (scope.reconstructionScopes.length === 0) {
      throw new Error(
        "Historically load-bearing evidence requires at least one reconstruction scope."
      );
    }

    if (scope.unresolvedResult === "NOT_APPLICABLE") {
      throw new Error(
        "Historically load-bearing evidence cannot use NOT_APPLICABLE unresolvedResult."
      );
    }
  } else {
    if (scope.dependencyClass !== undefined) {
      throw new Error(
        "Non-load-bearing evidence must not declare dependencyClass."
      );
    }

    if (scope.unresolvedResult !== "NOT_APPLICABLE") {
      throw new Error(
        "Non-load-bearing evidence must use NOT_APPLICABLE unresolvedResult."
      );
    }
  }
}

function validateConfidentiality(
  policy: DDTEvidenceManifestEntryPolicy
): void {
  const c = policy.confidentiality;

  const disclosureProfileRequired =
    c.classification !== "PUBLIC" || c.redactionPermitted;

  if (disclosureProfileRequired && !c.disclosureProfile) {
    throw new Error(
      "Non-public or redactable evidence requires an exact disclosureProfile."
    );
  }

  if (
    (c.publicCommitmentRisk === "HIGH" ||
      c.publicCommitmentRisk === "UNRESOLVED")
  ) {
    throw new Error(
      `Raw public SHA-256 commitment blocked because publicCommitmentRisk=${c.publicCommitmentRisk}.`
    );
  }
}

export function produceEvidenceManifest(
  record: DDTNormalizedRecord,
  policyContext: DDTEvidenceManifestPolicyContext
): DDTEvidenceManifest {
  if (record.evidence.length !== policyContext.entries.length) {
    throw new Error(
      "Evidence count and materialized evidence-policy count must match exactly."
    );
  }

  const evidenceSet = produceEvidenceSet(record);

  const entries = evidenceSet.items.map((item, index) => {
    const policy = policyContext.entries[index];

    validateSemanticScope(policy);
    validateConfidentiality(policy);

    return {
      evidenceId: deterministicEvidenceId(
        record,
        item,
        policy
      ),
      role: policy.role,
      evidenceClass: policy.evidenceClass,
      mediaType: item.mediaType,

      representation: {
        mode: "RAW_BYTES" as const,
        byteLength: item.byteLength,
      },

      commitment: {
        commitmentType: "DIGEST" as const,
        profile: RAW_SHA256_COMMITMENT_PROFILE,
        value: item.digest.value,
        encoding: "LOWERCASE_HEX" as const,
      },

      declaredIdentity: policy.declaredIdentity,

      custody: {
        ...policy.custody,
        retrievalRefs: [...policy.custody.retrievalRefs]
          .sort((a, b) =>
            compareUnicodeCodePoints(
              a.referenceId,
              b.referenceId
            )
          )
          .map((ref, index, all) => {
            if (
              index > 0 &&
              ref.referenceId ===
                all[index - 1].referenceId
            ) {
              throw new Error(
                `Duplicate retrieval referenceId: ${ref.referenceId}`
              );
            }
            return ref;
          }),
      },

      confidentiality: policy.confidentiality,

      preservationObligationRefs:
        uniqueSortedStrings(
          policy.preservationObligationRefs,
          "preservationObligationRef"
        ),

      provenance: {
        ...policy.provenance,
        signatureProofRefs: uniqueSortedStrings(
          policy.provenance.signatureProofRefs,
          "signatureProofRef"
        ),
        authorityEvidenceRefs: uniqueSortedStrings(
          policy.provenance.authorityEvidenceRefs,
          "authorityEvidenceRef"
        ),
      },

      semanticScope: {
        ...policy.semanticScope,
        reconstructionScopes: uniqueSortedStrings(
          policy.semanticScope.reconstructionScopes,
          "reconstructionScope"
        ),
      },

      relatedEvidence: [...(policy.relatedEvidence ?? [])]
        .map((relationship) => ({
          ...relationship,
          evidenceRefs: uniqueSortedStrings(
            relationship.evidenceRefs,
            "relatedEvidence evidenceRef"
          ),
        }))
        .sort((a, b) => {
          const typeOrder = compareUnicodeCodePoints(
            a.relationshipType,
            b.relationshipType
          );
          if (typeOrder !== 0) return typeOrder;

          return compareUnicodeCodePoints(
            a.targetEvidenceId,
            b.targetEvidenceId
          );
        })
        .map((relationship, index, all) => {
          if (
            index > 0 &&
            relationship.relationshipType ===
              all[index - 1].relationshipType &&
            relationship.targetEvidenceId ===
              all[index - 1].targetEvidenceId
          ) {
            throw new Error(
              `Duplicate related-evidence tuple: ${relationship.relationshipType}/${relationship.targetEvidenceId}`
            );
          }
          return relationship;
        }),

      ...(policy.description !== undefined
        ? { description: policy.description }
        : {}),
    };
  });

  entries.sort((a, b) =>
    compareUnicodeCodePoints(
      String(a.evidenceId),
      String(b.evidenceId)
    )
  );

  for (let i = 1; i < entries.length; i++) {
    if (entries[i].evidenceId === entries[i - 1].evidenceId) {
      throw new Error(
        `Duplicate evidenceId: ${entries[i].evidenceId}`
      );
    }
  }

  return {
    specification: {
      standard: "DDT-EVIDENCE-MANIFEST",
      version: "0.1.0-draft.1",
    },
    manifestId: deterministicManifestId(entries),
    entries,
    extensions: [],
  };
}
