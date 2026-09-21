import {
  createHash,
} from "crypto";

import {
  neon,
} from "@neondatabase/serverless";

import type {
  DDTRegistrationResult,
  DDTStoredRegistration,
  DDTStructuralDigest,
} from "../types";

import type {
  DDTAtomicRegistrationBuilder,
  DDTRegistrationStore,
} from "./types";

import {
  DDTSourceEventRaceError,
} from "./recordStore";

import type {
  DDTAtomicRecordBundleBuilder,
  DDTRecordStore,
  DDTRegisteredRecordBundle,
} from "./recordStore";

import {
  assertBundleBindings,
  sourceEventKeyFromBundle,
} from "./jsonRecordStore";

import type {
  DDTOfflineArtifactDescriptor,
  DDTOfflineArtifactKind,
  DDTOfflineArtifactStore,
  DDTOfflineStoredArtifact,
} from "./offlineArtifactStore";


function databaseUrl():
  string {
  const value =
    process.env
      .DDT_RECORDER_DATABASE_URL
      ?.trim() ||
    process.env
      .DATABASE_URL
      ?.trim();

  if (!value) {
    throw new Error(
      "Missing required Recorder environment variable: DDT_RECORDER_DATABASE_URL or DATABASE_URL"
    );
  }

  return value;
}


function sqlClient() {
  return neon(
    databaseUrl()
  );
}


let schemaReady:
  Promise<void>
  | undefined;


function ensureSchema():
  Promise<void> {
  if (!schemaReady) {
    schemaReady =
      (async () => {
        const sql =
          sqlClient();

        await sql`
          CREATE TABLE IF NOT EXISTS ddt_recorder_registrations (
            ddt_number TEXT PRIMARY KEY,
            ddt_record_id TEXT NOT NULL UNIQUE,
            sequence_domain TEXT NOT NULL,
            registration_sequence BIGINT NOT NULL,
            payload JSONB NOT NULL,
            UNIQUE (
              sequence_domain,
              registration_sequence
            )
          )
        `;

        await sql`
          CREATE TABLE IF NOT EXISTS ddt_recorder_records (
            ddt_number TEXT PRIMARY KEY,
            ddt_record_id TEXT NOT NULL UNIQUE,
            sequence_domain TEXT NOT NULL,
            registration_sequence BIGINT NOT NULL,
            source_event_key TEXT NOT NULL UNIQUE,
            bundle JSONB NOT NULL,
            UNIQUE (
              sequence_domain,
              registration_sequence
            )
          )
        `;

        await sql`
          CREATE TABLE IF NOT EXISTS ddt_recorder_offline_artifacts (
            ddt_number TEXT NOT NULL,
            run_id TEXT NOT NULL,
            artifact TEXT NOT NULL,
            file_name TEXT NOT NULL,
            media_type TEXT NOT NULL,
            byte_length BIGINT NOT NULL,
            sha256 TEXT NOT NULL,
            content_base64 TEXT NOT NULL,
            PRIMARY KEY (
              ddt_number,
              run_id,
              artifact
            ),
            CHECK (
              artifact IN (
                'archive',
                'verification-result'
              )
            )
          )
        `;
      })();
  }

  return schemaReady;
}


function postgresCode(
  error: unknown
): string {
  if (
    typeof error ===
      "object" &&
    error !== null &&
    "code" in error
  ) {
    return String(
      (
        error as {
          code?: unknown;
        }
      ).code ?? ""
    );
  }

  return "";
}


function sameDigest(
  a: DDTStructuralDigest,
  b: DDTStructuralDigest
): boolean {
  return (
    a.algorithm ===
      b.algorithm &&
    a.value ===
      b.value
  );
}


function numericValue(
  value: unknown
): number {
  const numberValue =
    Number(value);

  if (
    !Number.isSafeInteger(
      numberValue
    ) ||
    numberValue < 0
  ) {
    throw new Error(
      "Invalid PostgreSQL registration sequence value."
    );
  }

  return numberValue;
}


async function nextRegistrationSequence(
  sequenceDomain: string
): Promise<number> {
  await ensureSchema();

  const sql =
    sqlClient();

  const rows =
    await sql`
      SELECT
        COALESCE(
          MAX(registration_sequence),
          0
        )::text AS latest_sequence
      FROM ddt_recorder_registrations
      WHERE sequence_domain =
        ${sequenceDomain}
    `;

  const row =
    rows[0] as
      | {
          latest_sequence?:
            unknown;
        }
      | undefined;

  return (
    numericValue(
      row?.latest_sequence ?? 0
    ) + 1
  );
}


async function nextRecordSequence(
  sequenceDomain: string
): Promise<number> {
  await ensureSchema();

  const sql =
    sqlClient();

  const rows =
    await sql`
      SELECT
        COALESCE(
          MAX(registration_sequence),
          0
        )::text AS latest_sequence
      FROM ddt_recorder_records
      WHERE sequence_domain =
        ${sequenceDomain}
    `;

  const row =
    rows[0] as
      | {
          latest_sequence?:
            unknown;
        }
      | undefined;

  return (
    numericValue(
      row?.latest_sequence ?? 0
    ) + 1
  );
}


function registrationFromRow(
  row: unknown
):
  DDTStoredRegistration
  | null {
  if (
    !row ||
    typeof row !==
      "object"
  ) {
    return null;
  }

  const payload =
    (
      row as {
        payload?: unknown;
      }
    ).payload;

  if (
    !payload ||
    typeof payload !==
      "object"
  ) {
    return null;
  }

  return payload as
    DDTStoredRegistration;
}


function bundleFromRow(
  row: unknown
):
  DDTRegisteredRecordBundle
  | null {
  if (
    !row ||
    typeof row !==
      "object"
  ) {
    return null;
  }

  const bundle =
    (
      row as {
        bundle?: unknown;
      }
    ).bundle;

  if (
    !bundle ||
    typeof bundle !==
      "object"
  ) {
    return null;
  }

  const typed =
    bundle as
      DDTRegisteredRecordBundle;

  assertBundleBindings(
    typed
  );

  return typed;
}


export class PostgresDDTRegistrationStore
implements DDTRegistrationStore {
  async getByDDTNumber(
    ddtNumber: string
  ):
    Promise<
      DDTStoredRegistration
      | null
    > {
    await ensureSchema();

    const sql =
      sqlClient();

    const rows =
      await sql`
        SELECT payload
        FROM ddt_recorder_registrations
        WHERE ddt_number =
          ${ddtNumber}
        LIMIT 1
      `;

    return registrationFromRow(
      rows[0]
    );
  }


  async getByRecordId(
    ddtRecordId: string
  ):
    Promise<
      DDTStoredRegistration
      | null
    > {
    await ensureSchema();

    const sql =
      sqlClient();

    const rows =
      await sql`
        SELECT payload
        FROM ddt_recorder_registrations
        WHERE ddt_record_id =
          ${ddtRecordId}
        LIMIT 1
      `;

    return registrationFromRow(
      rows[0]
    );
  }


  async getBySequence(
    sequenceDomain: string,
    registrationSequence:
      number
  ):
    Promise<
      DDTStoredRegistration
      | null
    > {
    await ensureSchema();

    const sql =
      sqlClient();

    const rows =
      await sql`
        SELECT payload
        FROM ddt_recorder_registrations
        WHERE sequence_domain =
          ${sequenceDomain}
          AND registration_sequence =
          ${registrationSequence}
        LIMIT 1
      `;

    return registrationFromRow(
      rows[0]
    );
  }


  async registerAtomically(
    sequenceDomain: string,
    buildRegistration:
      DDTAtomicRegistrationBuilder
  ):
    Promise<
      DDTStoredRegistration
    > {
    await ensureSchema();

    for (
      let attempt = 0;
      attempt < 32;
      attempt += 1
    ) {
      const nextSequence =
        await nextRegistrationSequence(
          sequenceDomain
        );

      const registration =
        buildRegistration(
          nextSequence
        );

      if (
        registration
          .result
          .sequenceDomain !==
        sequenceDomain
      ) {
        throw new Error(
          "Registration sequenceDomain mismatch."
        );
      }

      if (
        registration
          .result
          .registrationSequence !==
        nextSequence
      ) {
        throw new Error(
          "Registration sequence allocation mismatch."
        );
      }

      const sql =
        sqlClient();

      try {
        await sql`
          INSERT INTO ddt_recorder_registrations (
            ddt_number,
            ddt_record_id,
            sequence_domain,
            registration_sequence,
            payload
          )
          VALUES (
            ${
              registration
                .result
                .ddtNumber
            },
            ${
              registration
                .result
                .ddtRecordId
            },
            ${sequenceDomain},
            ${nextSequence},
            ${
              JSON.stringify(
                registration
              )
            }::jsonb
          )
        `;

        return registration;
      } catch (
        error: unknown
      ) {
        if (
          postgresCode(
            error
          ) !== "23505"
        ) {
          throw error;
        }

        const byRecordId =
          await this
            .getByRecordId(
              registration
                .result
                .ddtRecordId
            );

        if (byRecordId) {
          throw new Error(
            "ddtRecordId is already registered."
          );
        }

        /*
         * If ddtRecordId is still unused, the UNIQUE conflict
         * was the sequence/DDT Number being won by another
         * concurrent registration. Nothing from this attempt
         * was committed, so retry with the next sequence.
         */
      }
    }

    throw new Error(
      "DDT PostgreSQL registration sequence could not be allocated."
    );
  }


  async listRegistered():
    Promise<
      DDTRegistrationResult[]
    > {
    await ensureSchema();

    const sql =
      sqlClient();

    const rows =
      await sql`
        SELECT payload
        FROM ddt_recorder_registrations
        ORDER BY
          sequence_domain,
          registration_sequence
      `;

    return rows.map(
      row => {
        const registration =
          registrationFromRow(
            row
          );

        if (!registration) {
          throw new Error(
            "Invalid PostgreSQL DDT registration payload."
          );
        }

        return registration.result;
      }
    );
  }
}


export class PostgresDDTRecordStore
implements DDTRecordStore {
  async getByDDTNumber(
    ddtNumber: string
  ):
    Promise<
      DDTRegisteredRecordBundle
      | null
    > {
    await ensureSchema();

    const sql =
      sqlClient();

    const rows =
      await sql`
        SELECT bundle
        FROM ddt_recorder_records
        WHERE ddt_number =
          ${ddtNumber}
        LIMIT 1
      `;

    return bundleFromRow(
      rows[0]
    );
  }


  async getByRecordId(
    ddtRecordId: string
  ):
    Promise<
      DDTRegisteredRecordBundle
      | null
    > {
    await ensureSchema();

    const sql =
      sqlClient();

    const rows =
      await sql`
        SELECT bundle
        FROM ddt_recorder_records
        WHERE ddt_record_id =
          ${ddtRecordId}
        LIMIT 1
      `;

    return bundleFromRow(
      rows[0]
    );
  }


  async saveRegistered(
    bundle:
      DDTRegisteredRecordBundle
  ):
    Promise<
      DDTRegisteredRecordBundle
    > {
    assertBundleBindings(
      bundle
    );

    await ensureSchema();

    const result =
      bundle.registrationResult;

    const sql =
      sqlClient();

    try {
      await sql`
        INSERT INTO ddt_recorder_records (
          ddt_number,
          ddt_record_id,
          sequence_domain,
          registration_sequence,
          source_event_key,
          bundle
        )
        VALUES (
          ${bundle.ddtNumber},
          ${bundle.ddtRecordId},
          ${
            result.sequenceDomain
          },
          ${
            result
              .registrationSequence
          },
          ${
            sourceEventKeyFromBundle(
              bundle
            )
          },
          ${
            JSON.stringify(
              bundle
            )
          }::jsonb
        )
      `;

      return bundle;
    } catch (
      error: unknown
    ) {
      if (
        postgresCode(
          error
        ) !== "23505"
      ) {
        throw error;
      }

      const existing =
        (
          await this
            .getByDDTNumber(
              bundle.ddtNumber
            )
        ) ??
        (
          await this
            .getByRecordId(
              bundle.ddtRecordId
            )
        );

      if (
        existing &&
        existing.ddtNumber ===
          bundle.ddtNumber &&
        existing.ddtRecordId ===
          bundle.ddtRecordId &&
        sameDigest(
          existing.recordHash,
          bundle.recordHash
        )
      ) {
        return existing;
      }

      throw new Error(
        "Conflicting registered DDT record already exists."
      );
    }
  }


  async registerBundleAtomically(
    sequenceDomain: string,
    buildBundle:
      DDTAtomicRecordBundleBuilder
  ):
    Promise<
      DDTRegisteredRecordBundle
    > {
    await ensureSchema();

    for (
      let attempt = 0;
      attempt < 32;
      attempt += 1
    ) {
      const nextSequence =
        await nextRecordSequence(
          sequenceDomain
        );

      /*
       * Nothing has been committed yet. If buildBundle()
       * throws, this sequence remains available.
       */
      const bundle =
        await buildBundle(
          nextSequence
        );

      assertBundleBindings(
        bundle
      );

      const result =
        bundle.registrationResult;

      if (
        result.sequenceDomain !==
        sequenceDomain
      ) {
        throw new Error(
          "Registration sequenceDomain mismatch."
        );
      }

      if (
        result
          .registrationSequence !==
        nextSequence
      ) {
        throw new Error(
          "Registration sequence allocation mismatch."
        );
      }

      const sourceEventKey =
        sourceEventKeyFromBundle(
          bundle
        );

      const sql =
        sqlClient();

      try {
        await sql`
          INSERT INTO ddt_recorder_records (
            ddt_number,
            ddt_record_id,
            sequence_domain,
            registration_sequence,
            source_event_key,
            bundle
          )
          VALUES (
            ${bundle.ddtNumber},
            ${bundle.ddtRecordId},
            ${sequenceDomain},
            ${nextSequence},
            ${sourceEventKey},
            ${
              JSON.stringify(
                bundle
              )
            }::jsonb
          )
        `;

        return bundle;
      } catch (
        error: unknown
      ) {
        if (
          postgresCode(
            error
          ) !== "23505"
        ) {
          throw error;
        }

        const sourceRows =
          await sql`
            SELECT ddt_number
            FROM ddt_recorder_records
            WHERE source_event_key =
              ${sourceEventKey}
            LIMIT 1
          `;

        const sourceRow =
          sourceRows[0] as
            | {
                ddt_number?:
                  unknown;
              }
            | undefined;

        if (
          typeof sourceRow
            ?.ddt_number ===
          "string"
        ) {
          throw new DDTSourceEventRaceError(
            sourceRow.ddt_number
          );
        }

        if (
          await this
            .getByRecordId(
              bundle.ddtRecordId
            )
        ) {
          throw new Error(
            "ddtRecordId is already registered."
          );
        }

        /*
         * If neither source-event nor ddtRecordId collided,
         * the UNIQUE conflict was only the sequence/DDT Number
         * being won by another concurrent registration.
         * Retry without consuming anything from this attempt.
         */
      }
    }

    throw new Error(
      "DDT PostgreSQL record sequence could not be allocated."
    );
  }


  async listRegistered():
    Promise<
      DDTRegisteredRecordBundle[]
    > {
    await ensureSchema();

    const sql =
      sqlClient();

    const rows =
      await sql`
        SELECT bundle
        FROM ddt_recorder_records
        ORDER BY
          sequence_domain,
          registration_sequence
      `;

    return rows.map(
      row => {
        const bundle =
          bundleFromRow(
            row
          );

        if (!bundle) {
          throw new Error(
            "Invalid PostgreSQL DDT Record bundle."
          );
        }

        return bundle;
      }
    );
  }
}


function validateDDTNumber(
  ddtNumber: string
) {
  if (
    !/^DDT-[0-9]{8}$/.test(
      ddtNumber
    )
  ) {
    throw new Error(
      "Invalid DDT Number."
    );
  }
}


function validateRunId(
  runId: string
) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      runId
    )
  ) {
    throw new Error(
      "Invalid Offline Package run ID."
    );
  }
}


function artifactMetadata(
  ddtNumber: string,
  artifact:
    DDTOfflineArtifactKind
) {
  switch (artifact) {
    case "archive":
      return {
        fileName:
          `${ddtNumber}-offline.zip`,
        mediaType:
          "application/zip",
      };

    case "verification-result":
      return {
        fileName:
          `${ddtNumber}-verification-result.json`,
        mediaType:
          "application/json",
      };
  }
}


function sha256Hex(
  bytes: Buffer
): string {
  return createHash(
    "sha256"
  )
    .update(bytes)
    .digest("hex");
}


function descriptorForArtifact(
  input: {
    ddtNumber: string;
    runId: string;
    artifact:
      DDTOfflineArtifactKind;
    bytes: Buffer;
  }
):
  DDTOfflineArtifactDescriptor {
  const metadata =
    artifactMetadata(
      input.ddtNumber,
      input.artifact
    );

  return {
    ddtNumber:
      input.ddtNumber,

    runId:
      input.runId,

    artifact:
      input.artifact,

    fileName:
      metadata.fileName,

    mediaType:
      metadata.mediaType,

    byteLength:
      input.bytes.length,

    sha256:
      sha256Hex(
        input.bytes
      ),
  };
}


export class PostgresDDTOfflineArtifactStore
implements DDTOfflineArtifactStore {
  async put(
    input: {
      ddtNumber: string;
      runId: string;
      artifact:
        DDTOfflineArtifactKind;
      bytes: Buffer;
    }
  ):
    Promise<
      DDTOfflineArtifactDescriptor
    > {
    validateDDTNumber(
      input.ddtNumber
    );

    validateRunId(
      input.runId
    );

    await ensureSchema();

    const descriptor =
      descriptorForArtifact(
        input
      );

    const sql =
      sqlClient();

    const rows =
      await sql`
        INSERT INTO ddt_recorder_offline_artifacts (
          ddt_number,
          run_id,
          artifact,
          file_name,
          media_type,
          byte_length,
          sha256,
          content_base64
        )
        VALUES (
          ${descriptor.ddtNumber},
          ${descriptor.runId},
          ${descriptor.artifact},
          ${descriptor.fileName},
          ${descriptor.mediaType},
          ${descriptor.byteLength},
          ${descriptor.sha256},
          ${
            input.bytes
              .toString(
                "base64"
              )
          }
        )
        ON CONFLICT (
          ddt_number,
          run_id,
          artifact
        )
        DO NOTHING
        RETURNING sha256
      `;

    if (
      rows.length > 0
    ) {
      return descriptor;
    }

    const existing =
      await this.get({
        ddtNumber:
          input.ddtNumber,

        runId:
          input.runId,

        artifact:
          input.artifact,
      });

    if (!existing) {
      throw new Error(
        "Offline artifact write conflict could not be resolved."
      );
    }

    if (
      existing
        .descriptor
        .sha256 !==
      descriptor.sha256
    ) {
      throw new Error(
        "Offline artifact immutability conflict."
      );
    }

    return existing.descriptor;
  }


  async get(
    input: {
      ddtNumber: string;
      runId: string;
      artifact:
        DDTOfflineArtifactKind;
    }
  ):
    Promise<
      DDTOfflineStoredArtifact
      | null
    > {
    validateDDTNumber(
      input.ddtNumber
    );

    validateRunId(
      input.runId
    );

    await ensureSchema();

    const sql =
      sqlClient();

    const rows =
      await sql`
        SELECT
          file_name,
          media_type,
          byte_length::text
            AS byte_length,
          sha256,
          content_base64
        FROM ddt_recorder_offline_artifacts
        WHERE ddt_number =
          ${input.ddtNumber}
          AND run_id =
          ${input.runId}
          AND artifact =
          ${input.artifact}
        LIMIT 1
      `;

    const row =
      rows[0] as
        | {
            file_name?:
              unknown;
            media_type?:
              unknown;
            byte_length?:
              unknown;
            sha256?:
              unknown;
            content_base64?:
              unknown;
          }
        | undefined;

    if (!row) {
      return null;
    }

    if (
      typeof row.file_name !==
        "string" ||
      typeof row.media_type !==
        "string" ||
      typeof row.sha256 !==
        "string" ||
      typeof row.content_base64 !==
        "string"
    ) {
      throw new Error(
        "Invalid PostgreSQL Offline Package artifact."
      );
    }

    const bytes =
      Buffer.from(
        row.content_base64,
        "base64"
      );

    const byteLength =
      numericValue(
        row.byte_length
      );

    if (
      bytes.length !==
      byteLength ||
      sha256Hex(
        bytes
      ) !==
      row.sha256
    ) {
      throw new Error(
        "Stored Offline Package artifact integrity check failed."
      );
    }

    return {
      descriptor: {
        ddtNumber:
          input.ddtNumber,

        runId:
          input.runId,

        artifact:
          input.artifact,

        fileName:
          row.file_name,

        mediaType:
          row.media_type,

        byteLength,

        sha256:
          row.sha256,
      },

      bytes,
    };
  }
}
