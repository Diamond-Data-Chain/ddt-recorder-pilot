import {
  createHash,
} from "crypto";

import {
  promises as fs,
} from "fs";

import path from "path";

import type {
  DDTJsonValue,
} from "../producer/canonical";

import type {
  DDTRecordStore,
} from "../storage/recordStore";

import {
  assembleOfflinePackageFromRecordStore,
} from "./offlinePackageAssembler";

type JsonObject =
  Record<string, DDTJsonValue>;

type ArtifactReference = {
  artifactId: string;
  version: string;
  digest: {
    algorithm: "SHA-256";
    value: string;
  };
  immutableRef: string;
  mediaType: string;
};

type ManifestFileEntry = {
  path: string;
  mediaType: string;
  role: string;
  byteLength: number;
  digest: {
    algorithm: "SHA-256";
    value: string;
  };
  requiredForPlan: boolean;
  appliesTo: string[];
};

export type DDTOfflinePackageBuildPreparation = {
  ddtNumber: string;
  sourceDir: string;
  templatePath: string;
  packageId: string;
  familyMembers: number;
  fileCount: number;
  normativeDependencies: number;
  rootArtifacts: number;
};

export type PrepareOfflinePackageOptions = {
  recordStore: DDTRecordStore;

  ddtNumber: string;

  ddtRoot?: string;

  outputDir: string;

  verificationMethod: string;

  publicKeyBase64url: string;

  createdAtClaim?: string;

  packageVersion?: string;

  maxFamilyDepth?: number;
};

const ZERO_SHA256 =
  "0".repeat(64);

const ROOT_ARTIFACT_IDS = [
  "DDT-ENVELOPE-SCHEMA-0.3-DRAFT.5",

  "DDT-ENTERPRISE-REFERENCE-RECORDER-PROFILE-0.2-DRAFT.2",

  "DDT-ENTERPRISE-REFERENCE-RECORDER-VALIDATION-RULESET-0.1-DRAFT.1",

  "DDT-CANONICALIZATION-PROFILE-ARTIFACT-0.1-DRAFT.1",

  "DDT-STRUCTURAL-COMMITMENT-PROFILE-ARTIFACT-0.1-DRAFT.1",

  "DDT-IDENTIFIER-PROFILE-ARTIFACT-0.1-DRAFT.1",

  "DDT-EVIDENCE-MANIFEST-PROFILE-ARTIFACT-0.1-DRAFT.1",

  "DDT-BASE-RELATIONSHIP-VOCABULARY-0.1-DRAFT.1",

  "DDT-ED25519-SIGNATURE-PROFILE-0.2-DRAFT.1",

  "DDT-REFERENCE-RECORDER-CONFORMANCE-RECEIPT-PROFILE-0.1-DRAFT.1",

  "DDT-VERIFICATION-RESULT-0.2-DRAFT.1",

  "DDT-VERIFICATION-AXIS-REGISTRY-0.2-DRAFT.1",

  "DDT-VERIFICATION-REASON-CODE-REGISTRY-0.2-DRAFT.1",
] as const;

function asObject(
  value: DDTJsonValue | undefined,
  label: string
): JsonObject {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(
      `${label} must be an object.`
    );
  }

  return value;
}

function asArray(
  value: DDTJsonValue | undefined,
  label: string
): DDTJsonValue[] {
  if (!Array.isArray(value)) {
    throw new Error(
      `${label} must be an array.`
    );
  }

  return value;
}

function asString(
  value: DDTJsonValue | undefined,
  label: string
): string {
  if (
    typeof value !== "string" ||
    value.length === 0
  ) {
    throw new Error(
      `${label} must be a non-empty string.`
    );
  }

  return value;
}

function sha256Hex(
  bytes: Buffer
): string {
  return createHash("sha256")
    .update(bytes)
    .digest("hex");
}

function jsonBytes(
  value: unknown
): Buffer {
  return Buffer.from(
    `${JSON.stringify(
      value,
      null,
      2
    )}\n`,
    "utf8"
  );
}

function normalizeRelativePath(
  value: string
): string {
  const normalized =
    value
      .replace(/\\/g, "/")
      .normalize("NFC");

  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:\//.test(
      normalized
    )
  ) {
    throw new Error(
      `Invalid package-relative path: ${value}`
    );
  }

  const parts =
    normalized.split("/");

  if (
    parts.some(
      part =>
        part === "" ||
        part === "." ||
        part === ".."
    )
  ) {
    throw new Error(
      `Unsafe package-relative path: ${value}`
    );
  }

  return normalized;
}

function artifactReference(
  value: DDTJsonValue,
  label: string
): ArtifactReference {
  const object =
    asObject(
      value,
      label
    );

  const digest =
    asObject(
      object.digest,
      `${label}.digest`
    );

  const algorithm =
    asString(
      digest.algorithm,
      `${label}.digest.algorithm`
    );

  if (
    algorithm !== "SHA-256"
  ) {
    throw new Error(
      `${label}.digest.algorithm must be SHA-256.`
    );
  }

  const digestValue =
    asString(
      digest.value,
      `${label}.digest.value`
    );

  if (
    !/^[0-9a-f]{64}$/.test(
      digestValue
    )
  ) {
    throw new Error(
      `${label}.digest.value must be SHA-256 lowercase hex.`
    );
  }

  return {
    artifactId:
      asString(
        object.artifactId,
        `${label}.artifactId`
      ),

    version:
      asString(
        object.version,
        `${label}.version`
      ),

    digest: {
      algorithm: "SHA-256",
      value: digestValue,
    },

    immutableRef:
      normalizeRelativePath(
        asString(
          object.immutableRef,
          `${label}.immutableRef`
        )
      ),

    mediaType:
      asString(
        object.mediaType,
        `${label}.mediaType`
      ),
  };
}

function fileRoleForArtifact(
  ref: ArtifactReference
): string {
  const rel =
    ref.immutableRef;

  if (
    rel.startsWith(
      "schemas/"
    )
  ) {
    return "SCHEMA";
  }

  if (
    rel.includes(
      "/rules/"
    )
  ) {
    return "RULESET";
  }

  if (
    rel.startsWith(
      "profiles/"
    )
  ) {
    return "PROFILE";
  }

  if (
    rel.startsWith(
      "specs/"
    )
  ) {
    return "DOCUMENTATION";
  }

  return "OTHER";
}

function schemaRoleForAssemblerRole(
  role: string
): string {
  switch (role) {
    case "REGISTRATION_RESULT":
      return "OTHER";

    default:
      return role;
  }
}

function uniqueStrings(
  values: string[]
): string[] {
  return [
    ...new Set(values),
  ];
}

function extractRegistrationStatement(
  envelope: JsonObject
): JsonObject {
  const registration =
    asObject(
      envelope.registration,
      "envelope.registration"
    );

  return asObject(
    registration.statement,
    "envelope.registration.statement"
  );
}

function isoNow(): string {
  return new Date()
    .toISOString()
    .replace(
      /\.\d{3}Z$/,
      "Z"
    );
}

export async function prepareOfflinePackageFromRecordStore(
  options: PrepareOfflinePackageOptions
): Promise<DDTOfflinePackageBuildPreparation> {
  const ddtRoot =
    options.ddtRoot ??
    path.join(
      process.cwd(),
      "docs",
      "ddt"
    );

  const outputDir =
    path.resolve(
      options.outputDir
    );

  const sourceDir =
    path.join(
      outputDir,
      "source"
    );

  const templatePath =
    path.join(
      outputDir,
      "manifest-template.json"
    );

  if (
    !/^[A-Za-z0-9_-]{43}$/.test(
      options.publicKeyBase64url
    )
  ) {
    throw new Error(
      "publicKeyBase64url must be a canonical 32-byte Ed25519 base64url key."
    );
  }

  if (
    options.verificationMethod.trim()
      .length === 0
  ) {
    throw new Error(
      "verificationMethod is required."
    );
  }

  const assembly =
    await assembleOfflinePackageFromRecordStore({
      recordStore:
        options.recordStore,

      ddtNumber:
        options.ddtNumber,

      maxFamilyDepth:
        options.maxFamilyDepth,
    });

  const targetBundle =
    await options.recordStore
      .getByDDTNumber(
        options.ddtNumber
      );

  if (!targetBundle) {
    throw new Error(
      `DDT Record disappeared from Record Store: ${options.ddtNumber}`
    );
  }

  const envelope =
    asObject(
      targetBundle.envelope,
      "target envelope"
    );

  const preservationContract =
    asObject(
      envelope.preservationContract,
      "envelope.preservationContract"
    );

  const evidenceManifest =
    asObject(
      envelope.evidenceManifest,
      "envelope.evidenceManifest"
    );

  const registrationStatement =
    extractRegistrationStatement(
      envelope
    );

  const normativeDependenciesObject =
    asObject(
      preservationContract
        .normativeDependencies,
      "preservationContract.normativeDependencies"
    );

  const dependencyValues =
    asArray(
      normativeDependenciesObject
        .artifacts,
      "preservationContract.normativeDependencies.artifacts"
    );

  const dependencyClosure =
    dependencyValues.map(
      (
        value,
        index
      ) =>
        artifactReference(
          value,
          `normativeDependencies.artifacts[${index}]`
        )
    );

  const duplicateArtifactIds =
    dependencyClosure
      .map(
        ref =>
          ref.artifactId
      )
      .filter(
        (
          value,
          index,
          all
        ) =>
          all.indexOf(
            value
          ) !== index
      );

  if (
    duplicateArtifactIds.length >
    0
  ) {
    throw new Error(
      `Duplicate normative artifact IDs: ` +
      `${uniqueStrings(
        duplicateArtifactIds
      ).join(", ")}`
    );
  }

  const dependencyById =
    new Map(
      dependencyClosure.map(
        ref => [
          ref.artifactId,
          ref,
        ] as const
      )
    );

  const rootArtifacts =
    ROOT_ARTIFACT_IDS.map(
      artifactId => {
        const ref =
          dependencyById.get(
            artifactId
          );

        if (!ref) {
          throw new Error(
            `Required root artifact is absent from target Preservation Contract: ${artifactId}`
          );
        }

        return ref;
      }
    );

  const offlineProfilePath =
    path.join(
      ddtRoot,
      "profiles",
      "ddt-reference-recorder-offline-verification-profile-v0.1.json"
    );

  const offlineProfile =
    JSON.parse(
      await fs.readFile(
        offlineProfilePath,
        "utf8"
      )
    ) as JsonObject;

  const requiredChecks =
    asArray(
      offlineProfile.requiredChecks,
      "offlineProfile.requiredChecks"
    ).map(
      (
        value,
        index
      ) =>
        asString(
          value,
          `offlineProfile.requiredChecks[${index}]`
        )
    );

  const profilePackageSpecification =
    artifactReference(
      offlineProfile
        .packageSpecification as DDTJsonValue,
      "offlineProfile.packageSpecification"
    );

  const verificationResultModel =
    artifactReference(
      offlineProfile
        .verificationResultModel as DDTJsonValue,
      "offlineProfile.verificationResultModel"
    );

  const profileId =
    asString(
      offlineProfile.profileId,
      "offlineProfile.profileId"
    );

  const verificationPlanPolicy =
    asObject(
      offlineProfile
        .verificationPlanPolicy,
      "offlineProfile.verificationPlanPolicy"
    );

  const networkAccess =
    asString(
      verificationPlanPolicy
        .networkAccess,
      "offlineProfile.verificationPlanPolicy.networkAccess"
    );

  const missingArtifactPolicy =
    asString(
      verificationPlanPolicy
        .missingArtifactPolicy,
      "offlineProfile.verificationPlanPolicy.missingArtifactPolicy"
    );

  const deterministicResultRequired =
    verificationPlanPolicy
      .deterministicResultRequired;

  if (
    typeof deterministicResultRequired !==
    "boolean"
  ) {
    throw new Error(
      "offlineProfile.verificationPlanPolicy.deterministicResultRequired must be boolean."
    );
  }

  const resourceLimits =
    asObject(
      offlineProfile.resourceLimits,
      "offlineProfile.resourceLimits"
    );

  await fs.rm(
    outputDir,
    {
      recursive: true,
      force: true,
    }
  );

  await fs.mkdir(
    sourceDir,
    {
      recursive: true,
    }
  );

  const manifestFiles:
    ManifestFileEntry[] = [];

  const seenPaths =
    new Set<string>();

  async function addBytes(
    relativePath: string,
    bytes: Buffer,
    mediaType: string,
    role: string,
    appliesTo: string[]
  ): Promise<void> {
    const rel =
      normalizeRelativePath(
        relativePath
      );

    if (
      seenPaths.has(
        rel
      )
    ) {
      return;
    }

    seenPaths.add(
      rel
    );

    const destination =
      path.join(
        sourceDir,
        rel
      );

    await fs.mkdir(
      path.dirname(
        destination
      ),
      {
        recursive: true,
      }
    );

    await fs.writeFile(
      destination,
      bytes
    );

    manifestFiles.push({
      path: rel,

      mediaType,

      role,

      byteLength: 0,

      digest: {
        algorithm: "SHA-256",
        value: ZERO_SHA256,
      },

      requiredForPlan: true,

      appliesTo:
        uniqueStrings(
          appliesTo
        ),
    });
  }

  async function addRepoArtifact(
    ref: ArtifactReference
  ): Promise<void> {
    const source =
      path.join(
        ddtRoot,
        ref.immutableRef
      );

    const bytes =
      await fs.readFile(
        source
      );

    const actualDigest =
      sha256Hex(
        bytes
      );

    if (
      actualDigest !==
      ref.digest.value
    ) {
      throw new Error(
        `${ref.artifactId}: repository bytes do not match historical digest. ` +
        `expected=${ref.digest.value} actual=${actualDigest}`
      );
    }

    await addBytes(
      ref.immutableRef,
      bytes,
      ref.mediaType,
      fileRoleForArtifact(
        ref
      ),
      [
        assembly.target
          .ddtRecordId,

        ref.artifactId,
      ]
    );
  }

  for (
    const file
    of assembly.files
  ) {
    await addBytes(
      file.path,

      file.bytes,

      file.mediaType,

      schemaRoleForAssemblerRole(
        file.role
      ),

      file.appliesTo
    );
  }

  await addBytes(
    "record/evidence-manifest.json",

    jsonBytes(
      evidenceManifest
    ),

    "application/json",

    "EVIDENCE_MANIFEST",

    [
      assembly.target
        .ddtRecordId,
    ]
  );

  await addBytes(
    "record/preservation-contract.json",

    jsonBytes(
      preservationContract
    ),

    "application/json",

    "PRESERVATION_CONTRACT",

    [
      assembly.target
        .ddtRecordId,
    ]
  );

  await addBytes(
    "record/registration-statement.json",

    jsonBytes(
      registrationStatement
    ),

    "application/json",

    "DDT_REGISTRATION_STATEMENT",

    [
      assembly.target
        .ddtRecordId,
    ]
  );

  for (
    const ref
    of dependencyClosure
  ) {
    await addRepoArtifact(
      ref
    );
  }

  const summaryProfileRel =
    "profiles/ddt-verification-result-summary-derivation-profile-v0.1.json";

  await addBytes(
    summaryProfileRel,

    await fs.readFile(
      path.join(
        ddtRoot,
        summaryProfileRel
      )
    ),

    "application/json",

    "PROFILE",

    [
      assembly.target
        .ddtRecordId,

      "DDT-VERIFICATION-RESULT-SUMMARY-DERIVATION-PROFILE-0.1-DRAFT.1",
    ]
  );

  const verifierSourceRoot =
    path.join(
      ddtRoot,
      "reference",
      "v0.2",
      "ddt_ref"
    );

  const verifierEntries =
    (
      await fs.readdir(
        verifierSourceRoot,
        {
          withFileTypes: true,
        }
      )
    )
      .filter(
        entry =>
          entry.isFile() &&
          (
            entry.name.endsWith(
              ".py"
            ) ||
            entry.name ===
              "jcs_node.js"
          )
      )
      .sort(
        (
          a,
          b
        ) =>
          a.name.localeCompare(
            b.name,
            "en"
          )
      );

  const verifierFiles: {
    path: string;
    byteLength: number;
    sha256: string;
  }[] = [];

  for (
    const entry
    of verifierEntries
  ) {
    const source =
      path.join(
        verifierSourceRoot,
        entry.name
      );

    const bytes =
      await fs.readFile(
        source
      );

    const relative =
      `verifier/ddt_ref/${entry.name}`;

    verifierFiles.push({
      path:
        `ddt_ref/${entry.name}`,

      byteLength:
        bytes.length,

      sha256:
        sha256Hex(
          bytes
        ),
    });

    await addBytes(
      relative,

      bytes,

      entry.name.endsWith(
        ".js"
      )
        ? "text/javascript"
        : "text/x-python",

      "VERIFIER_SOURCE",

      [
        assembly.target
          .ddtRecordId,

        "DDT-REFERENCE-OFFLINE-VERIFIER-0.1-DRAFT.1",
      ]
    );
  }

  const verifierDescriptor = {
    specification: {
      standard:
        "DDT-REFERENCE-OFFLINE-VERIFIER-DESCRIPTOR",

      version:
        "0.1.0-draft.1",
    },

    implementationId:
      "DDT-REFERENCE-OFFLINE-VERIFIER-0.1-DRAFT.1",

    validatorId:
      "ddt.reference.offline.python-node",

    version:
      "0.1.0-draft.1",

    lifecycleStatus:
      "DRAFT",

    claimStatus:
      "TEST_ONLY_REFERENCE_ONLY_NOT_PRODUCTION_CONFORMANCE",

    entryPoint:
      "ddt_ref.offline_reference",

    runtimeRequirements: [
      "Python 3",
      "Node.js",
    ],

    files:
      verifierFiles,

    claimBoundary: {
      substantiveTruth:
        "NOT_ESTABLISHED",

      signerAuthority:
        "NOT_ESTABLISHED",

      independentTime:
        "NOT_ESTABLISHED",

      networkFinality:
        "NOT_ESTABLISHED",

      eventHistoryCompleteness:
        "NOT_ESTABLISHED",
    },
  };

  await addBytes(
    "verifier/DDT_REFERENCE_OFFLINE_VERIFIER_V0.1_DRAFT.json",

    jsonBytes(
      verifierDescriptor
    ),

    "application/json",

    "VERIFIER_SOURCE",

    [
      assembly.target
        .ddtRecordId,

      "DDT-REFERENCE-OFFLINE-VERIFIER-0.1-DRAFT.1",
    ]
  );

  await addBytes(
    "verification/keyring.json",

    jsonBytes({
      keys: [
        {
          verificationMethod:
            options
              .verificationMethod,

          publicKeyBase64url:
            options
              .publicKeyBase64url,
        },
      ],
    }),

    "application/json",

    "OTHER",

    [
      assembly.target
        .ddtRecordId,

      options
        .verificationMethod,
    ]
  );

  manifestFiles.sort(
    (
      a,
      b
    ) =>
      a.path.localeCompare(
        b.path,
        "en"
      )
  );

  const packageSchema =
    JSON.parse(
      await fs.readFile(
        path.join(
          ddtRoot,
          "schemas",
          "ddt-offline-verification-package-v0.2.schema.json"
        ),
        "utf8"
      )
    ) as {
      $defs?: {
        specification?: {
          properties?: {
            standard?: {
              const?: string;
            };
            version?: {
              const?: string;
            };
          };
        };
      };
    };

  const manifestStandard =
    packageSchema
      .$defs
      ?.specification
      ?.properties
      ?.standard
      ?.const;

  const manifestVersion =
    packageSchema
      .$defs
      ?.specification
      ?.properties
      ?.version
      ?.const;

  if (
    !manifestStandard ||
    !manifestVersion
  ) {
    throw new Error(
      "Offline package schema does not expose specification constants."
    );
  }

  const packageId =
    `urn:ddt:offline-package:` +
    `${assembly.target.ddtNumber}:` +
    `test-only:record-store-v1`;

  const manifestTemplate = {
    specification: {
      standard:
        manifestStandard,

      version:
        manifestVersion,
    },

    manifestCore: {
      domain:
        "DDT_OFFLINE_VERIFICATION_PACKAGE_MANIFEST_V1",

      packageId,

      packageVersion:
        options.packageVersion ??
        "1.0.0-test.1",

      createdAtClaim:
        options.createdAtClaim ??
        isoNow(),

      packageSpecification:
        profilePackageSpecification,

      target: {
        targetType:
          "DDT_RECORD",

        targetId:
          assembly.target
            .ddtRecordId,

        targetCommitment:
          assembly.target
            .recordHash,
      },

      rootArtifacts,

      files:
        manifestFiles,

      externalDependencies:
        [],

      dependencyClosure,

      verificationPlan: {
        planId:
          `${profileId}:${assembly.target.ddtNumber}`,

        checks:
          requiredChecks,

        networkAccess,

        missingArtifactPolicy,

        resultProfile:
          verificationResultModel,

        deterministicResultRequired,
      },

      resourceLimits,

      predecessorPackages:
        [],

      claimBoundary: {
        packageIntegrityImpliesSubstantiveTruth:
          false,

        packageIntegrityImpliesSignerAuthority:
          false,

        packageIntegrityImpliesIndependentTime:
          false,

        packageIntegrityImpliesNetworkFinality:
          false,

        packageIntegrityImpliesEventCompleteness:
          false,

        packageIntegrityImpliesHistoricalConformance:
          false,
      },
    },

    manifestCoreHash: {
      algorithm:
        "SHA-256",

      value:
        ZERO_SHA256,
    },

    manifestProofs:
      [],
  };

  await fs.mkdir(
    path.dirname(
      templatePath
    ),
    {
      recursive: true,
    }
  );

  await fs.writeFile(
    templatePath,

    jsonBytes(
      manifestTemplate
    )
  );

  return {
    ddtNumber:
      assembly.target
        .ddtNumber,

    sourceDir,

    templatePath,

    packageId,

    familyMembers:
      assembly.familyChain
        .length,

    fileCount:
      manifestFiles.length,

    normativeDependencies:
      dependencyClosure.length,

    rootArtifacts:
      rootArtifacts.length,
  };
}
