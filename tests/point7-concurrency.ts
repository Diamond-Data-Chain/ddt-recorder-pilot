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
    `POINT 7 CONCURRENCY FAIL: ${message}`
  );
}

async function main() {
  const stateDir =
    "/tmp/ddt-point7-concurrency-state";

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
      "urn:ddt:test:key:point7-concurrency";

  process.env
    .DDT_RECORDER_REGISTRANT_IDENTITY_REF =
      "urn:ddt:test:registrant:point7-concurrency";

  process.env
    .DDT_RECORDER_SUBJECT_NAMESPACE =
      "urn:ddt:test:point7-concurrency";

  process.env
    .DDT_RECORDER_STATE_DIR =
      stateDir;

  process.env
    .DDT_RECORDER_OFFLINE_DIR =
      path.join(
        stateDir,
        "offline"
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

  const recorder =
    await getReferenceRecorderRuntime();

  const recordStore =
    getReferenceRecorderRecordStore();

  const input:
    DDTRecorderInput = {
      recordType:
        "CONCURRENT_SOURCE_EVENT",

      publisher: {
        name:
          "Point 7 Concurrency Test",
      },

      subject: {
        reference:
          "CONCURRENT-SUBJECT-001",
      },

      source: {
        type:
          "SYSTEM",

        systemName:
          "urn:ddt:test:system:concurrency",

        reference:
          "SOURCE-EVENT-000001",

        version:
          "1.0",
      },

      eventTime:
        "2026-09-16T14:00:00.000Z",

      description:
        "Exactly the same stable source event submitted concurrently.",

      payload: {
        decision:
          "APPROVED",

        amount:
          100,
      },

      evidence: [
        {
          name:
            "evidence.json",

          mediaType:
            "application/json",

          contentBase64:
            Buffer.from(
              JSON.stringify({
                decision:
                  "APPROVED",
                amount:
                  100,
              }),
              "utf8"
            ).toString(
              "base64"
            ),
        },
      ],
    };

  console.log(
    "===== CONCURRENT SAME-SOURCE SUBMISSIONS ====="
  );

  const attempts = 8;

  const results =
    await Promise.allSettled(
      Array.from(
        {
          length:
            attempts,
        },
        () =>
          recorder.record(
            input
          )
      )
    );

  const fulfilled =
    results.filter(
      (
        result
      ): result is PromiseFulfilledResult<
        Awaited<
          ReturnType<
            typeof recorder.record
          >
        >
      > =>
        result.status ===
        "fulfilled"
    );

  const rejected =
    results.filter(
      (
        result
      ): result is PromiseRejectedResult =>
        result.status ===
        "rejected"
    );

  console.log(
    "attempts:",
    attempts
  );

  console.log(
    "fulfilled:",
    fulfilled.length
  );

  console.log(
    "rejected:",
    rejected.length
  );

  for (
    const result of
    rejected
  ) {
    console.log(
      "rejection:",
      result.reason instanceof Error
        ? result.reason.message
        : String(
            result.reason
          )
    );
  }

  const records =
    await recordStore
      .listRegistered();

  console.log(
    "Record Store count:",
    records.length
  );

  console.log(
    "DDT Numbers:",
    records
      .map(
        (record) =>
          record.ddtNumber
      )
      .join(", ")
  );

  console.log(
    "Record IDs:",
    records
      .map(
        (record) =>
          record.ddtRecordId
      )
      .join(", ")
  );

  const resultNumbers =
    new Set(
      fulfilled.map(
        (result) =>
          result.value
            .ddtNumber
      )
    );

  const resultRecordIds =
    new Set(
      fulfilled.map(
        (result) =>
          result.value
            .registrationResult
            .ddtRecordId
      )
    );

  console.log(
    "unique returned DDT Numbers:",
    resultNumbers.size
  );

  console.log(
    "unique returned record IDs:",
    resultRecordIds.size
  );

  console.log();

  if (
    records.length === 1 &&
    resultNumbers.size === 1 &&
    resultRecordIds.size === 1
  ) {
    console.log(
      "===== CONCURRENT IDEMPOTENCE PASS ====="
    );
  } else {
    console.log(
      "===== CONCURRENT IDEMPOTENCE BUG CONFIRMED ====="
    );

    fail(
      `same source-event produced ${records.length} committed records`
    );
  }
}

main().catch(
  (error) => {
    console.error(error);
    throw error;
  }
);
