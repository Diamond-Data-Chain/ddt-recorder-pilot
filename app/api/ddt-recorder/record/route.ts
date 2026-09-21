import { NextResponse } from "next/server";

import type {
  DDTRecorderInput,
} from "@/lib/ddt-recorder/ingest/types";
import {
  ingestRecorderInput,
} from "@/lib/ddt-recorder/ingest/ingest";
import {
  getReferenceRecorderRuntime,
} from "@/lib/ddt-recorder/runtime/referenceRecorderRuntime";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const MAX_REQUEST_BODY_BYTES =
  32 * 1024 * 1024;

class RequestBodyTooLargeError extends Error {
  constructor() {
    super(
      "Request body exceeds the DDT Recorder pilot limit."
    );
    this.name = "RequestBodyTooLargeError";
  }
}

async function readJsonBodyWithLimit(
  request: Request
): Promise<DDTRecorderInput> {
  const declaredLength =
    request.headers.get("content-length");

  if (declaredLength) {
    const parsedLength =
      Number(declaredLength);

    if (
      Number.isFinite(parsedLength) &&
      parsedLength >
        MAX_REQUEST_BODY_BYTES
    ) {
      throw new RequestBodyTooLargeError();
    }
  }

  if (!request.body) {
    throw new SyntaxError(
      "Request body is empty."
    );
  }

  const reader =
    request.body.getReader();

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const {
        done,
        value,
      } = await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      totalBytes +=
        value.byteLength;

      if (
        totalBytes >
        MAX_REQUEST_BODY_BYTES
      ) {
        await reader
          .cancel()
          .catch(() => undefined);

        throw new RequestBodyTooLargeError();
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const text =
    Buffer.concat(chunks)
      .toString("utf8");

  if (!text.trim()) {
    throw new SyntaxError(
      "Request body is empty."
    );
  }

  return JSON.parse(
    text
  ) as DDTRecorderInput;
}

function isObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function hasRecorderInputShape(
  value: unknown
): value is DDTRecorderInput {
  if (!isObject(value)) {
    return false;
  }

  return (
    typeof value.recordType === "string" &&
    isObject(value.publisher) &&
    typeof value.publisher.name === "string" &&
    isObject(value.subject) &&
    typeof value.subject.reference === "string" &&
    isObject(value.source) &&
    typeof value.source.type === "string" &&
    typeof value.source.reference === "string" &&
    typeof value.eventTime === "string" &&
    typeof value.description === "string" &&
    Array.isArray(value.evidence)
  );
}

export async function POST(
  request: Request
) {
  try {
    const contentType =
      request.headers
        .get("content-type")
        ?.toLowerCase() ?? "";

    if (
      !contentType.startsWith(
        "application/json"
      )
    ) {
      return NextResponse.json(
        {
          status: "ERROR",
          error:
            "Content-Type must be application/json.",
        },
        {
          status: 415,
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
            "X-Content-Type-Options":
              "nosniff",
          },
        }
      );
    }

    let input: DDTRecorderInput;

    try {
      input =
        await readJsonBodyWithLimit(
          request
        );
    } catch (error: unknown) {
      if (
        error instanceof
        RequestBodyTooLargeError
      ) {
        return NextResponse.json(
          {
            status: "ERROR",
            error:
              "Request body exceeds the 32 MiB DDT Recorder pilot limit.",
          },
          {
            status: 413,
            headers: {
              "Cache-Control":
                "no-store, max-age=0",
              "X-Content-Type-Options":
                "nosniff",
            },
          }
        );
      }

      return NextResponse.json(
        {
          status: "ERROR",
          error:
            "Request body must be valid JSON.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
            "X-Content-Type-Options":
              "nosniff",
          },
        }
      );
    }

    if (!hasRecorderInputShape(input)) {
      return NextResponse.json(
        {
          status: "ERROR",
          error:
            "Invalid DDT Recorder input structure.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
            "X-Content-Type-Options":
              "nosniff",
          },
        }
      );
    }

    try {
      ingestRecorderInput(input);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Invalid DDT Recorder input.";

      return NextResponse.json(
        {
          status: "ERROR",
          error: message,
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
            "X-Content-Type-Options":
              "nosniff",
          },
        }
      );
    }

    const recorder =
      await getReferenceRecorderRuntime();

    const result =
      await recorder.record(input);

    return NextResponse.json(
      {
        status: "REGISTERED",

        ddtNumber:
          result.ddtNumber,

        registrationSequence:
          result.registrationSequence,

        ddtRecordId:
          result.registrationResult
            .ddtRecordId,

        recordHash:
          result.registrationResult
            .recordHash,

        registrationStatementHash:
          result.registrationResult
            .registrationStatementHash,

        verification: {
          schema:
            result.verification
              .schemaValidation,

          commitments:
            result.verification
              .commitmentValidation,

          proofs:
            result.verification.proofs,
        },

        registrationResult:
          result.registrationResult,
      },
      {
        status: 201,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "";

    console.error(
      "DDT Recorder API error:",
      error
    );

    if (
      message.startsWith(
        "Previous DDT Record not found:"
      )
    ) {
      return NextResponse.json(
        {
          status: "ERROR",
          error: message,
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
            "X-Content-Type-Options":
              "nosniff",
          },
        }
      );
    }

    if (
      message.startsWith(
        "Conflicting source-event replay:"
      )
    ) {
      return NextResponse.json(
        {
          status: "CONFLICT",
          error:
            "The source event is already registered with different committed content.",
        },
        {
          status: 409,
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
            "X-Content-Type-Options":
              "nosniff",
          },
        }
      );
    }

    return NextResponse.json(
      {
        status: "ERROR",
        error:
          "DDT Recorder could not complete the request.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
          "X-Content-Type-Options":
            "nosniff",
        },
      }
    );
  }
}
