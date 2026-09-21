import {
  createHash,
} from "crypto";

import {
  promises as fs,
} from "fs";

import path from "path";

import type {
  DDTOfflineArtifactDescriptor,
  DDTOfflineArtifactKind,
  DDTOfflineArtifactStore,
  DDTOfflineStoredArtifact,
} from "./offlineArtifactStore";

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
  artifact: DDTOfflineArtifactKind
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

export class LocalFileDDTOfflineArtifactStore
implements DDTOfflineArtifactStore {
  constructor(
    private readonly rootDir:
      string
  ) {}

  private artifactPath(
    ddtNumber: string,
    runId: string,
    artifact:
      DDTOfflineArtifactKind
  ) {
    validateDDTNumber(
      ddtNumber
    );

    validateRunId(
      runId
    );

    const {
      fileName,
    } =
      artifactMetadata(
        ddtNumber,
        artifact
      );

    return path.join(
      this.rootDir,
      ddtNumber,
      runId,
      fileName
    );
  }

  private descriptor(
    ddtNumber: string,
    runId: string,
    artifact:
      DDTOfflineArtifactKind,
    bytes: Buffer
  ):
    DDTOfflineArtifactDescriptor {
    const metadata =
      artifactMetadata(
        ddtNumber,
        artifact
      );

    return {
      ddtNumber,
      runId,
      artifact,

      fileName:
        metadata.fileName,

      mediaType:
        metadata.mediaType,

      byteLength:
        bytes.length,

      sha256:
        sha256Hex(
          bytes
        ),
    };
  }

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
    const artifactPath =
      this.artifactPath(
        input.ddtNumber,
        input.runId,
        input.artifact
      );

    const directory =
      path.dirname(
        artifactPath
      );

    await fs.mkdir(
      directory,
      {
        recursive: true,
      }
    );

    try {
      const existing =
        await fs.readFile(
          artifactPath
        );

      const existingHash =
        sha256Hex(
          existing
        );

      const incomingHash =
        sha256Hex(
          input.bytes
        );

      if (
        existingHash !==
        incomingHash
      ) {
        throw new Error(
          "Offline artifact immutability conflict."
        );
      }

      return this.descriptor(
        input.ddtNumber,
        input.runId,
        input.artifact,
        existing
      );
    } catch (
      error: unknown
    ) {
      const code =
        typeof error ===
          "object" &&
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
        code !== "ENOENT"
      ) {
        throw error;
      }
    }

    const tempPath =
      `${artifactPath}.${process.pid}.${Date.now()}.tmp`;

    await fs.writeFile(
      tempPath,
      input.bytes,
      {
        flag: "wx",
        mode: 0o600,
      }
    );

    try {
      await fs.rename(
        tempPath,
        artifactPath
      );
    } catch (error) {
      await fs.unlink(
        tempPath
      ).catch(
        () => undefined
      );

      throw error;
    }

    return this.descriptor(
      input.ddtNumber,
      input.runId,
      input.artifact,
      input.bytes
    );
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
    const artifactPath =
      this.artifactPath(
        input.ddtNumber,
        input.runId,
        input.artifact
      );

    try {
      const bytes =
        await fs.readFile(
          artifactPath
        );

      return {
        descriptor:
          this.descriptor(
            input.ddtNumber,
            input.runId,
            input.artifact,
            bytes
          ),

        bytes,
      };
    } catch (
      error: unknown
    ) {
      const code =
        typeof error ===
          "object" &&
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
        return null;
      }

      throw error;
    }
  }
}
