import {
  NextResponse,
} from "next/server";

import {
  buildOfflinePackageForDDT,
} from "@/lib/ddt-recorder/runtime/offlinePackageRuntime";

import {
  getReferenceRecorderRecordStore,
} from "@/lib/ddt-recorder/runtime/referenceRecorderRecordStore";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

export const runtime =
  "nodejs";

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store, max-age=0",
  };
}

function apiEnabled():
  boolean {
  return (
    process.env
      .DDT_OFFLINE_PACKAGE_API_ENABLED
      ?.trim()
      .toLowerCase() ===
    "true"
  );
}

export async function POST(
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
    if (!apiEnabled()) {
      return NextResponse.json(
        {
          status:
            "DISABLED",

          error:
            "DDT Offline Package API is disabled.",
        },
        {
          status: 503,
          headers:
            noStoreHeaders(),
        }
      );
    }

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
          status:
            "ERROR",

          error:
            "Invalid DDT Number.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        }
      );
    }

    const store =
      getReferenceRecorderRecordStore();

    const existing =
      await store
        .getByDDTNumber(
          ddtNumber
        );

    if (!existing) {
      return NextResponse.json(
        {
          status:
            "NOT_FOUND",

          ddtNumber,
        },
        {
          status: 404,
          headers:
            noStoreHeaders(),
        }
      );
    }

    const result =
      await buildOfflinePackageForDDT(
        ddtNumber
      );

    return NextResponse.json(
      {
        status:
          result.status,

        profileStatus:
          "TEST_ONLY",

        ddtNumber:
          result.ddtNumber,

        runId:
          result.runId,

        package: {
          sha256:
            result.package.sha256,

          manifestCoreHash:
            result.package
              .manifestCoreHash,

          listedFiles:
            result.package
              .listedFiles,

          verifiedEntries:
            result.package
              .verifiedEntries,

          schemaValidation:
            result.package
              .schemaValidation,

          proofProfile:
            result.package
              .proofProfile,

          signature:
            result.package
              .signature,
        },

        verificationResult: {
          sha256:
            result
              .verificationResult
              .sha256,

          resultCoreHash:
            result
              .verificationResult
              .resultCoreHash,

          summaryStatus:
            result
              .verificationResult
              .summaryStatus,

          proofPurpose:
            result
              .verificationResult
              .proofPurpose,

          signedObjectType:
            result
              .verificationResult
              .signedObjectType,

          requiredAxes:
            result
              .verificationResult
              .requiredAxes,

          axisResults:
            result
              .verificationResult
              .axisResults,

          positiveAxes:
            result
              .verificationResult
              .positiveAxes,

          failingAxes:
            result
              .verificationResult
              .failingAxes,

          unresolvedAxes:
            result
              .verificationResult
              .unresolvedAxes,
        },

        internalVerification: {
          requiredChecks:
            result
              .internalVerification
              .requiredChecks,

          pass:
            result
              .internalVerification
              .pass,

          fail:
            result
              .internalVerification
              .fail,

          indeterminate:
            result
              .internalVerification
              .indeterminate,

          replayExecuted:
            result
              .internalVerification
              .replayExecuted,

          replayMatch:
            result
              .internalVerification
              .replayMatch,

          primaryProjectionSha256:
            result
              .internalVerification
              .primaryProjectionSha256,

          replayProjectionSha256:
            result
              .internalVerification
              .replayProjectionSha256,
        },
      },
      {
        status: 201,
        headers:
          noStoreHeaders(),
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to build DDT Offline Verification Package.";

    console.error(
      "DDT Offline Package API error:",
      error
    );

    const configurationError =
      message.startsWith(
        "Missing required Recorder environment variable:"
      ) ||
      message.includes(
        "public key"
      ) ||
      message.includes(
        "Private key"
      ) ||
      message.includes(
        "ENOENT"
      );

    return NextResponse.json(
      {
        status:
          "ERROR",

        error:
          message,
      },
      {
        status:
          configurationError
            ? 500
            : 400,

        headers:
          noStoreHeaders(),
      }
    );
  }
}
