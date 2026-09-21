import {
  generateKeyPairSync,
} from "crypto";

import {
  promises as fs,
} from "fs";

import path from "path";

import type {
  DDTRecorderInput,
} from "../lib/ddt-recorder/ingest/types";


function fail(
  message: string
): never {
  throw new Error(
    `POINT 8 FAIL: ${message}`
  );
}


function base64Json(
  value: unknown
): string {
  return Buffer.from(
    JSON.stringify(value),
    "utf8"
  ).toString(
    "base64"
  );
}


function sameDigest(
  a:
    | {
        algorithm: string;
        value: string;
      }
    | undefined,

  b:
    | {
        algorithm: string;
        value: string;
      }
    | undefined
): boolean {
  return Boolean(
    a &&
    b &&
    a.algorithm ===
      b.algorithm &&
    a.value ===
      b.value
  );
}


async function main() {
  const stateDir =
    "/tmp/ddt-point8-state";

  await fs.rm(
    stateDir,
    {
      recursive: true,
      force: true,
    }
  );

  const {
    privateKey,
    publicKey,
  } =
    generateKeyPairSync(
      "ed25519"
    );

  const privateKeyPem =
    privateKey.export({
      format: "pem",
      type: "pkcs8",
    }).toString();

  const publicJwk =
    publicKey.export({
      format: "jwk",
    }) as {
      x?: string;
    };

  if (!publicJwk.x) {
    fail(
      "temporary Ed25519 public key export failed"
    );
  }

  process.env
    .DDT_RECORDER_PRIVATE_KEY_PEM =
      privateKeyPem;

  process.env
    .DDT_RECORDER_PUBLIC_KEY_BASE64URL =
      publicJwk.x;

  process.env
    .DDT_RECORDER_VERIFICATION_METHOD =
      "urn:ddt:test:key:point8";

  process.env
    .DDT_RECORDER_REGISTRANT_IDENTITY_REF =
      "urn:ddt:test:registrant:point8";

  process.env
    .DDT_RECORDER_SUBJECT_NAMESPACE =
      "urn:ddt:test:point8";

  process.env
    .DDT_RECORDER_STATE_DIR =
      stateDir;

  process.env
    .DDT_RECORDER_OFFLINE_DIR =
      path.join(
        stateDir,
        "offline"
      );

  process.env
    .DDT_OFFLINE_PYTHON =
      path.join(
        process.cwd(),
        "docs",
        "ddt",
        "reference",
        ".venv",
        "bin",
        "python"
      );

  const {
    getReferenceRecorderRuntime,
  } =
    await import(
      "../lib/ddt-recorder/runtime/referenceRecorderRuntime"
    );

  const {
    getReferenceRecorderRecordStore,
  } =
    await import(
      "../lib/ddt-recorder/storage/runtimeStores"
    );

  const {
    buildOfflinePackageForDDT,
  } =
    await import(
      "../lib/ddt-recorder/runtime/offlinePackageRuntime"
    );

  const recorder =
    await getReferenceRecorderRuntime();

  const recordStore =
    getReferenceRecorderRecordStore();


  console.log(
    "===== CASE 1: CREATE FAMILY ROOT ====="
  );

  const rootInput:
    DDTRecorderInput = {
      recordType:
        "DECISION_PROPOSED",

      publisher: {
        name:
          "Point 8 Source",

        identifier:
          "POINT8-PUBLISHER",
      },

      subject: {
        reference:
          "CASE-POINT8-001",
      },

      source: {
        type:
          "SYSTEM",

        systemName:
          "urn:ddt:test:system:point8",

        reference:
          "POINT8-EVENT-001",

        version:
          "2.0",
      },

      eventTime:
        "2026-09-16T16:00:00.000Z",

      actor: {
        identityRef:
          "urn:ddt:test:actor:point8",

        role:
          "AUTHORIZED_OPERATOR",
      },

      description:
        "Initial consequential decision event.",

      payload: {
        taskId:
          "TASK-POINT8-001",

        proposal:
          "RELEASE_ORDER",

        verdict:
          "PENDING",

        outcome:
          "AWAITING_EXECUTION",
      },

      evidence: [
        {
          name:
            "policy.json",

          mediaType:
            "application/json",

          contentBase64:
            base64Json({
              policyId:
                "POINT8-POLICY",
              version:
                "1",
            }),

          role:
            "POLICY_OR_RULEBOOK",

          evidenceClass:
            "policy.rulebook",

          bindings: [
            "SEMANTIC_CONTEXT",
          ],
        },

        {
          name:
            "authority.json",

          mediaType:
            "application/json",

          contentBase64:
            base64Json({
              actor:
                "urn:ddt:test:actor:point8",
              authority:
                "RELEASE_ORDER",
            }),

          role:
            "AUTHORITY_EVIDENCE",

          evidenceClass:
            "authority.evidence",

          bindings: [
            "ACTOR_AUTHORITY",
          ],
        },

        {
          name:
            "source-record.json",

          mediaType:
            "application/json",

          contentBase64:
            base64Json({
              orderId:
                "ORDER-POINT8-001",
              state:
                "PROPOSED",
            }),

          role:
            "SUPPORTING_EVIDENCE",

          evidenceClass:
            "source.business-record",
        },
      ],
    };

  const root =
    await recorder.record(
      rootInput
    );

  if (
    root.ddtNumber !==
      "DDT-00000001" ||
    root.registrationSequence !==
      1
  ) {
    fail(
      "family root did not receive DDT-00000001 / sequence 1"
    );
  }

  const rootBundle =
    await recordStore
      .getByDDTNumber(
        root.ddtNumber
      );

  if (!rootBundle) {
    fail(
      "family root not retrievable"
    );
  }

  console.log(
    "root registration: PASS"
  );

  console.log(
    "root retrieval by DDT Number: PASS"
  );


  console.log();
  console.log(
    "===== CASE 2: CREATE SUCCESSOR ====="
  );

  const successorInput:
    DDTRecorderInput = {
      recordType:
        "DECISION_EXECUTED",

      publisher: {
        name:
          "Point 8 Source",

        identifier:
          "POINT8-PUBLISHER",
      },

      subject: {
        reference:
          "CASE-POINT8-001",
      },

      source: {
        type:
          "SYSTEM",

        systemName:
          "urn:ddt:test:system:point8",

        reference:
          "POINT8-EVENT-002",

        version:
          "2.0",
      },

      eventTime:
        "2026-09-16T16:05:00.000Z",

      actor: {
        identityRef:
          "urn:ddt:test:actor:point8",

        role:
          "AUTHORIZED_OPERATOR",
      },

      description:
        "Execution and outcome of the recorded decision.",

      payload: {
        taskId:
          "TASK-POINT8-001",

        proposal:
          "RELEASE_ORDER",

        verdict:
          "APPROVED",

        execution:
          "ORDER_RELEASED",

        artifactRef:
          "ORDER-POINT8-001",

        outcome:
          "SUCCESS",
      },

      evidence: [
        {
          name:
            "policy.json",

          mediaType:
            "application/json",

          contentBase64:
            base64Json({
              policyId:
                "POINT8-POLICY",
              version:
                "1",
            }),

          role:
            "POLICY_OR_RULEBOOK",

          evidenceClass:
            "policy.rulebook",

          bindings: [
            "SEMANTIC_CONTEXT",
          ],
        },

        {
          name:
            "authority.json",

          mediaType:
            "application/json",

          contentBase64:
            base64Json({
              actor:
                "urn:ddt:test:actor:point8",
              authority:
                "RELEASE_ORDER",
            }),

          role:
            "AUTHORITY_EVIDENCE",

          evidenceClass:
            "authority.evidence",

          bindings: [
            "ACTOR_AUTHORITY",
          ],
        },

        {
          name:
            "execution-result.json",

          mediaType:
            "application/json",

          contentBase64:
            base64Json({
              orderId:
                "ORDER-POINT8-001",
              state:
                "RELEASED",
              result:
                "SUCCESS",
            }),

          role:
            "SUPPORTING_EVIDENCE",

          evidenceClass:
            "source.execution-result",
        },
      ],

      previousDDTNumber:
        root.ddtNumber,
    };

  const successor =
    await recorder.record(
      successorInput
    );

  if (
    successor.ddtNumber !==
      "DDT-00000002" ||
    successor.registrationSequence !==
      2
  ) {
    fail(
      "successor did not receive DDT-00000002 / sequence 2"
    );
  }

  const successorBundle =
    await recordStore
      .getByDDTNumber(
        successor.ddtNumber
      );

  if (!successorBundle) {
    fail(
      "successor not retrievable by DDT Number"
    );
  }

  console.log(
    "successor registration: PASS"
  );

  console.log(
    "successor retrieval by DDT Number: PASS"
  );


  console.log();
  console.log(
    "===== CASE 3: FAMILY / PREDECESSOR BINDING ====="
  );

  if (
    successorBundle
      .ddtFamilyId !==
    rootBundle
      .ddtFamilyId
  ) {
    fail(
      "successor ddtFamilyId differs from root"
    );
  }

  const successorEnvelope:
    any =
      successorBundle.envelope;

  const previous =
    successorEnvelope
      ?.relationships
      ?.previousRecordInFamily;

  if (!previous) {
    fail(
      "successor has no previousRecordInFamily"
    );
  }

  const previousId =
    previous.ddtRecordId ??
    previous.recordId ??
    previous.targetId;

  const previousHash =
    previous.recordHash ??
    previous.commitment ??
    previous.targetCommitment;

  if (
    previousId !==
    rootBundle.ddtRecordId
  ) {
    fail(
      "previousRecordInFamily ddtRecordId mismatch"
    );
  }

  if (
    !sameDigest(
      previousHash,
      rootBundle.recordHash
    )
  ) {
    fail(
      "previousRecordInFamily recordHash mismatch"
    );
  }

  console.log(
    "same DDT family: PASS"
  );

  console.log(
    "predecessor ID/hash binding: PASS"
  );


  console.log();
  console.log(
    "===== CASE 4: BUILD + VERIFY OFFLINE PACKAGE ====="
  );

  const offline =
    await buildOfflinePackageForDDT(
      successor.ddtNumber
    );

  if (
    offline.status !==
    "PASS"
  ) {
    fail(
      "offline package runtime did not return PASS"
    );
  }

  if (
    offline.ddtNumber !==
    successor.ddtNumber
  ) {
    fail(
      "offline package target DDT Number mismatch"
    );
  }

  const packageStat =
    await fs.stat(
      offline.package.path
    );

  const verificationStat =
    await fs.stat(
      offline
        .verificationResult
        .path
    );

  if (
    !packageStat.isFile() ||
    packageStat.size <= 0
  ) {
    fail(
      "offline ZIP was not created"
    );
  }

  if (
    !verificationStat.isFile() ||
    verificationStat.size <= 0
  ) {
    fail(
      "formal Verification Result was not created"
    );
  }

  if (
    !/^[0-9a-f]{64}$/.test(
      offline.package.sha256
    ) ||
    !/^[0-9a-f]{64}$/.test(
      offline
        .package
        .manifestCoreHash
    ) ||
    !/^[0-9a-f]{64}$/.test(
      offline
        .verificationResult
        .sha256
    ) ||
    !/^[0-9a-f]{64}$/.test(
      offline
        .verificationResult
        .resultCoreHash
    )
  ) {
    fail(
      "offline artifact/hash format invalid"
    );
  }

  console.log(
    "offline ZIP created: PASS"
  );

  console.log(
    "package SHA-256 + manifestCoreHash: PASS"
  );

  console.log(
    "formal Verification Result created: PASS"
  );


  console.log();
  console.log(
    "===== CASE 5: PACKAGE / PROOF VERIFICATION ====="
  );

  if (
    offline.package
      .schemaValidation !==
      "PASS"
  ) {
    fail(
      `package schema validation = ${offline.package.schemaValidation}`
    );
  }

  if (
    offline.package
      .proofProfile !==
      "MATCH"
  ) {
    fail(
      `package proof profile = ${offline.package.proofProfile}`
    );
  }

  if (
    offline.package
      .signature !==
      "VALID"
  ) {
    fail(
      `package signature = ${offline.package.signature}`
    );
  }

  if (
    offline.package
      .listedFiles <= 0 ||
    offline.package
      .verifiedEntries <= 1
  ) {
    fail(
      "offline package contains no meaningful verified file set"
    );
  }

  console.log(
    "offline package schema: PASS"
  );

  console.log(
    "offline package proof profile: MATCH"
  );

  console.log(
    "offline package signature: VALID"
  );

  console.log(
    "package file integrity verification: PASS"
  );


  console.log();
  console.log(
    "===== CASE 6: FORMAL INDEPENDENT VERIFICATION ====="
  );

  const formal =
    offline.verificationResult;

  if (
    formal.summaryStatus !==
      "PASS" ||
    formal.requiredAxes !==
      9 ||
    formal.axisResults !==
      9 ||
    formal.positiveAxes !==
      9 ||
    formal.failingAxes !==
      0 ||
    formal.unresolvedAxes !==
      0
  ) {
    fail(
      `formal verification baseline mismatch: ${JSON.stringify(formal)}`
    );
  }

  if (
    typeof formal
      .proofPurpose !==
      "string" ||
    formal.proofPurpose
      .length === 0 ||
    typeof formal
      .signedObjectType !==
      "string" ||
    formal.signedObjectType
      .length === 0
  ) {
    fail(
      "formal Verification Result proof binding missing"
    );
  }

  console.log(
    "formal summary PASS: PASS"
  );

  console.log(
    "9/9 required verification axes positive: PASS"
  );

  console.log(
    "0 failing / 0 unresolved axes: PASS"
  );

  console.log(
    "Verification Result proof binding present: PASS"
  );


  console.log();
  console.log(
    "===== CASE 7: HISTORICAL RECONSTRUCTION / REPLAY ====="
  );

  const internal =
    offline
      .internalVerification;

  if (
    internal.requiredChecks !==
      12 ||
    internal.pass !==
      12 ||
    internal.fail !==
      0 ||
    internal.indeterminate !==
      0
  ) {
    fail(
      `internal offline checks mismatch: ${JSON.stringify(internal)}`
    );
  }

  if (
    internal.replayExecuted !==
      true ||
    internal.replayMatch !==
      true
  ) {
    fail(
      "offline historical replay/reconstruction did not reproduce the primary result"
    );
  }

  if (
    typeof internal
      .primaryProjectionSha256 !==
      "string" ||
    typeof internal
      .replayProjectionSha256 !==
      "string" ||
    !/^[0-9a-f]{64}$/.test(
      internal
        .primaryProjectionSha256
    ) ||
    !/^[0-9a-f]{64}$/.test(
      internal
        .replayProjectionSha256
    ) ||
    internal
      .primaryProjectionSha256 !==
    internal
      .replayProjectionSha256
  ) {
    fail(
      "primary/replay reconstruction projections do not match"
    );
  }

  console.log(
    "12/12 required offline checks PASS: PASS"
  );

  console.log(
    "replay executed: PASS"
  );

  console.log(
    "replay match: PASS"
  );

  console.log(
    "primary/replay reconstruction SHA-256 identical: PASS"
  );


  console.log();
  console.log(
    "===== CASE 8: FINAL RECORD STORE / RETRIEVAL CHECK ====="
  );

  const records =
    await recordStore
      .listRegistered();

  if (
    records.length !==
    2
  ) {
    fail(
      `expected exactly 2 registered family records, got ${records.length}`
    );
  }

  const retrievedAgain =
    await recordStore
      .getByDDTNumber(
        "DDT-00000002"
      );

  if (
    !retrievedAgain ||
    retrievedAgain
      .ddtRecordId !==
    successorBundle
      .ddtRecordId ||
    !sameDigest(
      retrievedAgain.recordHash,
      successorBundle.recordHash
    )
  ) {
    fail(
      "post-offline retrieval no longer matches registered successor"
    );
  }

  console.log(
    "Record Store count = 2: PASS"
  );

  console.log(
    "DDT-00000002 remains retrievable and immutable: PASS"
  );


  console.log();
  console.log(
    "===== POINT 8 POST-REGISTRATION E2E PASS ====="
  );

  console.log(
    "===== DDT REFERENCE RECORDER LOCAL CORE COMPLETE ====="
  );
}


main().catch(
  (error) => {
    console.error(error);
    throw error;
  }
);
