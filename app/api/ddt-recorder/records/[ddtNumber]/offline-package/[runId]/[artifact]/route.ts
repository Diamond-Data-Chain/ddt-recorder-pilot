import {
  readOfflinePackageArtifact,
  type DDTOfflinePackageArtifactKind,
} from "@/lib/ddt-recorder/runtime/offlinePackageRuntime";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

export const runtime =
  "nodejs";

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

function jsonResponse(
  body: unknown,
  status: number
): Response {
  return new Response(
    JSON.stringify(
      body
    ),
    {
      status,

      headers: {
        "Content-Type":
          "application/json",

        "Cache-Control":
          "no-store, max-age=0",
      },
    }
  );
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: {
      ddtNumber: string;
      runId: string;
      artifact: string;
    };
  }
) {
  try {
    if (!apiEnabled()) {
      return jsonResponse(
        {
          status:
            "DISABLED",

          error:
            "DDT Offline Package API is disabled.",
        },
        503
      );
    }

    const ddtNumber =
      decodeURIComponent(
        params.ddtNumber
      ).trim();

    const runId =
      decodeURIComponent(
        params.runId
      ).trim();

    const artifact =
      decodeURIComponent(
        params.artifact
      ).trim();

    if (
      artifact !== "archive" &&
      artifact !==
        "verification-result"
    ) {
      return jsonResponse(
        {
          status:
            "ERROR",

          error:
            "Artifact must be archive or verification-result.",
        },
        400
      );
    }

    const result =
      await readOfflinePackageArtifact(
        ddtNumber,
        runId,
        artifact as
          DDTOfflinePackageArtifactKind
      );

    const responseBody =
      new ArrayBuffer(
        result.bytes.byteLength
      );

    new Uint8Array(
      responseBody
    ).set(
      result.bytes
    );

    return new Response(
      responseBody,
      {
        status: 200,

        headers: {
          "Content-Type":
            result.mediaType,

          "Content-Disposition":
            `attachment; filename="${result.fileName}"`,

          "Content-Length":
            String(
              result.bytes.length
            ),

          "Cache-Control":
            "no-store, max-age=0",

          "X-DDT-SHA256":
            result.sha256,

          "X-DDT-Profile-Status":
            "TEST_ONLY",

          "X-Content-Type-Options":
            "nosniff",
        },
      }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to retrieve Offline Package artifact.";

    const code =
      typeof error === "object" &&
      error !== null &&
      "code" in error
        ? String(
            (
              error as {
                code?: unknown;
              }
            ).code
          )
        : "";

    if (
      code === "ENOENT"
    ) {
      return jsonResponse(
        {
          status:
            "NOT_FOUND",
        },
        404
      );
    }

    console.error(
      "DDT Offline Package artifact API error:",
      error
    );

    return jsonResponse(
      {
        status:
          "ERROR",

        error:
          message,
      },
      400
    );
  }
}
