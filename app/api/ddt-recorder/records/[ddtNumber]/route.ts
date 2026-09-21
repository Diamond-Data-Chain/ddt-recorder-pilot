import { NextResponse } from "next/server";

import type {
  DDTVerificationKeyring,
} from "@/lib/ddt-recorder/validation/verifyRecord";
import {
  verifyRecordBundle,
} from "@/lib/ddt-recorder/validation/verifyRecord";
import {
  getReferenceRecorderRecordStore,
} from "@/lib/ddt-recorder/runtime/referenceRecorderRecordStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function verificationKeyringFromEnv():
  DDTVerificationKeyring {
  const verificationMethod =
    process.env
      .DDT_RECORDER_VERIFICATION_METHOD
      ?.trim();

  const publicKeyBase64url =
    process.env
      .DDT_RECORDER_PUBLIC_KEY_BASE64URL
      ?.trim();

  if (!verificationMethod) {
    throw new Error(
      "Missing required Recorder environment variable: DDT_RECORDER_VERIFICATION_METHOD"
    );
  }

  if (!publicKeyBase64url) {
    throw new Error(
      "Missing required Recorder environment variable: DDT_RECORDER_PUBLIC_KEY_BASE64URL"
    );
  }

  const legacyVerificationMethod =
    "urn:ddt:local:recorder:key:1";

  return {
    keys: [
      {
        verificationMethod,
        publicKeyBase64url,
      },
      ...(verificationMethod !==
      legacyVerificationMethod
        ? [
            {
              verificationMethod:
                legacyVerificationMethod,
              publicKeyBase64url,
            },
          ]
        : []),
    ],
  };
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: {
      ddtNumber: string;
    };
  }
) {
  try {
    const ddtNumber =
      decodeURIComponent(
        params.ddtNumber
      ).trim();

    if (
      !/^DDT-[0-9]{8}$/.test(
        ddtNumber
      )
    ) {
      return NextResponse.json(
        {
          status: "ERROR",
          error:
            "Invalid DDT Number.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
          },
        }
      );
    }

    const recordStore =
      getReferenceRecorderRecordStore();

    const bundle =
      await recordStore
        .getByDDTNumber(
          ddtNumber
        );

    if (!bundle) {
      return NextResponse.json(
        {
          status: "NOT_FOUND",
          ddtNumber,
        },
        {
          status: 404,
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
          },
        }
      );
    }

    const verification =
      await verifyRecordBundle(
        bundle.envelope,
        bundle.conformanceReceipt,
        verificationKeyringFromEnv(),
        "docs/ddt"
      );

    const envelope =
      bundle.envelope as Record<
        string,
        any
      >;

    return NextResponse.json(
      {
        status: "VERIFIED",

        ddtNumber:
          bundle.ddtNumber,

        ddtRecordId:
          bundle.ddtRecordId,

        ddtFamilyId:
          bundle.ddtFamilyId,

        subjectNamespace:
          bundle.subjectNamespace,

        recordHash:
          bundle.recordHash,

        registrationResult:
          bundle.registrationResult,

        reconstruction: {
          identity:
            envelope.identity,

          upstream:
            envelope.upstream,

          evidenceManifest:
            envelope.evidenceManifest,

          relationships:
            envelope.relationships,

          evidence:
            bundle.evidence.map(
              (evidence) => ({
                name:
                  evidence.name,

                mediaType:
                  evidence.mediaType,

                byteLength:
                  Buffer.from(
                    evidence.contentBase64,
                    "base64"
                  ).length,
              })
            ),

          storedAt:
            bundle.storedAt,
        },

        verification: {
          schema:
            verification.schemaValidation,

          commitments:
            verification.commitmentValidation,

          proofs:
            verification.proofs,

          registeredUpstreamCommitment:
            verification.registeredUpstreamCommitment,

          evidenceManifestCommitment:
            verification.evidenceManifestCommitment,

          preservationContractCommitment:
            verification.preservationContractCommitment,

          registrationStatementHash:
            verification.registrationStatementHash,

          receiptCoreHash:
            verification.receiptCoreHash,

          conformanceReceiptCommitment:
            verification.conformanceReceiptCommitment,
        },
      },
      {
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
        : "Unable to retrieve DDT Record.";

    console.error(
      "DDT Recorder retrieval API error:",
      error
    );

    return NextResponse.json(
      {
        status: "ERROR",
        error: message,
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      }
    );
  }
}
