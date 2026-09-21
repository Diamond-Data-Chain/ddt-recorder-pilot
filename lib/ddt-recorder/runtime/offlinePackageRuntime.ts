import {
  createHash,
  randomUUID,
} from "crypto";

import {
  promises as fs,
} from "fs";

import os from "os";
import path from "path";

import {
  spawn,
} from "child_process";

import {
  prepareOfflinePackageFromRecordStore,
} from "../offline/offlinePackageBuilder";

import {
  getReferenceRecorderRecordStore,
} from "./referenceRecorderRecordStore";

import {
  getReferenceRecorderOfflineArtifactStore,
} from "../storage/runtimeStores";

type JsonObject =
  Record<string, any>;

export type DDTOfflinePackageRuntimeResult = {
  status: "PASS";

  ddtNumber: string;

  runId: string;

  runDirectory: string;

  package: {
    path: string;
    sha256: string;

    manifestCoreHash: string;

    listedFiles: number;
    verifiedEntries: number;

    schemaValidation: string;
    proofProfile: string;
    signature: string;
  };

  verificationResult: {
    path: string;
    sha256: string;

    resultCoreHash: string;

    summaryStatus: string;

    proofPurpose: string;
    signedObjectType: string;

    requiredAxes: number;
    axisResults: number;
    positiveAxes: number;

    failingAxes: number;
    unresolvedAxes: number;
  };

  internalVerification: {
    requiredChecks: number;
    pass: number;
    fail: number;
    indeterminate: number;

    replayExecuted: boolean;
    replayMatch: boolean;

    primaryProjectionSha256:
      string | null;

    replayProjectionSha256:
      string | null;
  };
};

function requireEnv(
  name: string
): string {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing required Recorder environment variable: ${name}`
    );
  }

  return value;
}

function privateKeyPemFromEnv():
  string {
  return requireEnv(
    "DDT_RECORDER_PRIVATE_KEY_PEM"
  ).replace(
    /\\n/g,
    "\n"
  );
}

function publicKeyBase64urlFromEnv():
  string {
  const value =
    requireEnv(
      "DDT_RECORDER_PUBLIC_KEY_BASE64URL"
    );

  if (
    !/^[A-Za-z0-9_-]{43}$/.test(
      value
    )
  ) {
    throw new Error(
      "DDT_RECORDER_PUBLIC_KEY_BASE64URL must be a canonical 32-byte Ed25519 public key."
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

async function sha256File(
  filePath: string
): Promise<string> {
  return sha256Hex(
    await fs.readFile(
      filePath
    )
  );
}

function recorderStateDir():
  string {
  return (
    process.env
      .DDT_RECORDER_STATE_DIR
      ?.trim() ||
    path.join(
      process.cwd(),
      ".ddc-state",
      "ddt-recorder"
    )
  );
}

function offlineOutputRoot():
  string {
  return (
    process.env
      .DDT_RECORDER_OFFLINE_DIR
      ?.trim() ||
    path.join(
      recorderStateDir(),
      "offline-packages"
    )
  );
}

function pythonExecutable():
  string {
  return (
    process.env
      .DDT_OFFLINE_PYTHON
      ?.trim() ||
    path.join(
      process.cwd(),
      "docs",
      "ddt",
      "reference",
      ".venv",
      "bin",
      "python"
    )
  );
}

function ddtRoot():
  string {
  return path.join(
    process.cwd(),
    "docs",
    "ddt"
  );
}

function referencePythonPath():
  string {
  return path.join(
    ddtRoot(),
    "reference",
    "v0.2"
  );
}

function isoNowSeconds():
  string {
  return new Date()
    .toISOString()
    .replace(
      /\.\d{3}Z$/,
      "Z"
    );
}

async function runProcess(
  command: string,
  args: string[],
  options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
  }
): Promise<{
  stdout: string;
  stderr: string;
}> {
  return new Promise(
    (
      resolve,
      reject
    ) => {
      const child =
        spawn(
          command,
          args,
          {
            cwd:
              options?.cwd ??
              process.cwd(),

            env:
              options?.env ??
              process.env,

            shell: false,

            stdio: [
              "ignore",
              "pipe",
              "pipe",
            ],
          }
        );

      const stdout:
        Buffer[] = [];

      const stderr:
        Buffer[] = [];

      child.stdout.on(
        "data",
        (chunk: Buffer) => {
          stdout.push(
            Buffer.from(chunk)
          );
        }
      );

      child.stderr.on(
        "data",
        (chunk: Buffer) => {
          stderr.push(
            Buffer.from(chunk)
          );
        }
      );

      child.on(
        "error",
        reject
      );

      child.on(
        "close",
        code => {
          const out =
            Buffer.concat(
              stdout
            ).toString(
              "utf8"
            );

          const err =
            Buffer.concat(
              stderr
            ).toString(
              "utf8"
            );

          if (code !== 0) {
            reject(
              new Error(
                [
                  `Process failed with code ${code}:`,
                  command,
                  ...args,
                  out.trim(),
                  err.trim(),
                ]
                  .filter(Boolean)
                  .join("\n")
              )
            );

            return;
          }

          resolve({
            stdout: out,
            stderr: err,
          });
        }
      );
    }
  );
}

function parseJsonOutput(
  raw: string,
  label: string
): JsonObject {
  try {
    return JSON.parse(
      raw.trim()
    ) as JsonObject;
  } catch {
    throw new Error(
      `${label} did not return valid JSON.\n${raw}`
    );
  }
}

function detailObject(
  axis: JsonObject
): JsonObject {
  if (
    typeof axis.detail !==
    "string"
  ) {
    throw new Error(
      `${axis.axisId}.detail is not serialized JSON.`
    );
  }

  return parseJsonOutput(
    axis.detail,
    `${axis.axisId}.detail`
  );
}

export async function buildOfflinePackageForDDT(
  ddtNumber: string
): Promise<DDTOfflinePackageRuntimeResult> {
  if (
    !/^DDT-[0-9]{8}$/.test(
      ddtNumber
    )
  ) {
    throw new Error(
      "Invalid DDT Number."
    );
  }

  const verificationMethod =
    requireEnv(
      "DDT_RECORDER_VERIFICATION_METHOD"
    );

  const publicKeyBase64url =
    publicKeyBase64urlFromEnv();

  const privateKeyPem =
    privateKeyPemFromEnv();

  const runId =
    randomUUID();

  const runDirectory =
    path.join(
      offlineOutputRoot(),
      ddtNumber,
      runId
    );

  const preparedDir =
    path.join(
      runDirectory,
      "prepared"
    );

  const extractedDir =
    path.join(
      runDirectory,
      "extracted"
    );

  const packagePath =
    path.join(
      runDirectory,
      `${ddtNumber}-offline.zip`
    );

  const verificationResultPath =
    path.join(
      runDirectory,
      `${ddtNumber}-verification-result.json`
    );

  const privateKeyPath =
    path.join(
      runDirectory,
      `.signing-key-${randomUUID()}.pem`
    );

  const verificationKeyringPath =
    path.join(
      runDirectory,
      `.verification-keyring-${randomUUID()}.json`
    );

  await fs.mkdir(
    runDirectory,
    {
      recursive: true,
    }
  );

  try {
    await fs.writeFile(
      privateKeyPath,
      privateKeyPem,
      {
        encoding: "utf8",
        mode: 0o600,
        flag: "wx",
      }
    );

    await fs.writeFile(
      verificationKeyringPath,
      `${JSON.stringify(
        {
          keys: [
            {
              verificationMethod,
              publicKeyBase64url,
            },
          ],
        },
        null,
        2
      )}\n`,
      {
        encoding: "utf8",
        mode: 0o600,
        flag: "wx",
      }
    );

    const prepared =
      await prepareOfflinePackageFromRecordStore({
        recordStore:
          getReferenceRecorderRecordStore(),

        ddtNumber,

        ddtRoot:
          ddtRoot(),

        outputDir:
          preparedDir,

        verificationMethod,

        publicKeyBase64url,

        createdAtClaim:
          isoNowSeconds(),

        packageVersion:
          "1.0.0-test.1",
      });

    const python =
      pythonExecutable();

    const basePythonEnv: NodeJS.ProcessEnv = {
      ...process.env,

      PYTHONPATH:
        referencePythonPath(),
    };

    const build =
      await runProcess(
        python,
        [
          "-m",
          "ddt_ref.cli",

          "build-offline",

          prepared.templatePath,

          prepared.sourceDir,

          packagePath,

          "--private-key",
          privateKeyPath,

          "--verification-method",
          verificationMethod,

          "--proof-id",
          `offline-package-proof-${ddtNumber}-${runId}`,

          "--created-at-claim",
          isoNowSeconds(),

          "--ddt-root",
          ddtRoot(),
        ],
        {
          env:
            basePythonEnv,
        }
      );

    const buildResult =
      parseJsonOutput(
        build.stdout,
        "build-offline"
      );

    const verify =
      await runProcess(
        python,
        [
          "-m",
          "ddt_ref.cli",

          "verify-offline",

          packagePath,

          "--extract-to",
          extractedDir,

          "--ddt-root",
          ddtRoot(),

          "--keyring",
          verificationKeyringPath,
        ],
        {
          env:
            basePythonEnv,
        }
      );

    const verifyResult =
      parseJsonOutput(
        verify.stdout,
        "verify-offline"
      );

    const packagedVerifierRoot =
      path.join(
        extractedDir,
        "verifier"
      );

    await runProcess(
      python,
      [
        "-m",
        "ddt_ref.offline_reference",

        packagePath,

        "--private-key",
        privateKeyPath,

        "--verification-method",
        verificationMethod,

        "--output",
        verificationResultPath,
      ],
      {
        env: {
          ...process.env,

          PYTHONPATH:
            packagedVerifierRoot,
        },
      }
    );

    const formal =
      JSON.parse(
        await fs.readFile(
          verificationResultPath,
          "utf8"
        )
      ) as JsonObject;

    const core =
      formal.resultCore as JsonObject;

    if (!core) {
      throw new Error(
        "Formal Verification Result has no resultCore."
      );
    }

    const axisResults =
      core.axisResults as
        JsonObject[];

    if (
      !Array.isArray(
        axisResults
      )
    ) {
      throw new Error(
        "Formal Verification Result has no axisResults."
      );
    }

    const requiredAxes =
      (
        core.verificationRequest as
          JsonObject
      )?.requiredAxes;

    if (
      !Array.isArray(
        requiredAxes
      )
    ) {
      throw new Error(
        "Formal Verification Result has no requiredAxes."
      );
    }

    const summary =
      core.summary as
        JsonObject;

    if (!summary) {
      throw new Error(
        "Formal Verification Result has no summary."
      );
    }

    const reproducibilityAxis =
      axisResults.find(
        axis =>
          axis.axisId ===
          "OFFLINE_VERIFICATION_REPRODUCIBILITY"
      );

    if (!reproducibilityAxis) {
      throw new Error(
        "OFFLINE_VERIFICATION_REPRODUCIBILITY axis is missing."
      );
    }

    const reproducibilityDetail =
      detailObject(
        reproducibilityAxis
      );

    const checks =
      reproducibilityDetail
        .requiredChecks as
        Record<
          string,
          JsonObject
        >;

    if (
      !checks ||
      typeof checks !==
        "object"
    ) {
      throw new Error(
        "Reproducibility axis does not expose requiredChecks."
      );
    }

    const checkValues =
      Object.values(
        checks
      );

    const internalPass =
      checkValues.filter(
        check =>
          check.status ===
          "PASS"
      ).length;

    const internalFail =
      checkValues.filter(
        check =>
          check.status ===
          "FAIL"
      ).length;

    const internalIndeterminate =
      checkValues.filter(
        check =>
          check.status ===
          "INDETERMINATE"
      ).length;

    const positiveStatuses =
      new Set([
        "PASS",
        "VALID",
        "BOUND",
        "AVAILABLE",
        "NOT_REQUIRED",
        "MATCH",
      ]);

    const positiveAxes =
      axisResults.filter(
        axis =>
          positiveStatuses.has(
            String(
              axis.status
            )
          )
      ).length;

    const proofs =
      formal.proofs as
        JsonObject[];

    if (
      !Array.isArray(proofs) ||
      proofs.length === 0
    ) {
      throw new Error(
        "Formal Verification Result has no proof."
      );
    }

    const proof =
      proofs[0];

    const resultCoreHash =
      (
        formal.resultCoreHash as
          JsonObject
      )?.value;

    if (
      typeof resultCoreHash !==
      "string"
    ) {
      throw new Error(
        "Formal Verification Result has no resultCoreHash."
      );
    }

    if (
      summary.status !== "PASS" ||
      requiredAxes.length !== 9 ||
      axisResults.length !== 9 ||
      positiveAxes !== 9 ||
      checkValues.length !== 12 ||
      internalPass !== 12 ||
      internalFail !== 0 ||
      internalIndeterminate !== 0 ||
      reproducibilityAxis.status !==
        "MATCH" ||
      reproducibilityDetail
        .replayExecuted !== true ||
      reproducibilityDetail
        .replayMatch !== true
    ) {
      throw new Error(
        "Offline package verification did not satisfy the Reference Recorder TEST_ONLY PASS baseline."
      );
    }

    const manifestCoreHash =
      (
        verifyResult
          .manifestCoreHash as
          JsonObject
      )?.value;

    if (
      typeof manifestCoreHash !==
      "string"
    ) {
      throw new Error(
        "verify-offline did not return manifestCoreHash."
      );
    }

    const packageProof =
      Array.isArray(
        verifyResult.proofs
      )
        ? verifyResult.proofs[0]
        : undefined;

    if (!packageProof) {
      throw new Error(
        "verify-offline returned no package proof result."
      );
    }

    const artifactStore =
      getReferenceRecorderOfflineArtifactStore();

    const persistedPackage =
      await artifactStore.put({
        ddtNumber,
        runId,
        artifact:
          "archive",
        bytes:
          await fs.readFile(
            packagePath
          ),
      });

    const persistedVerificationResult =
      await artifactStore.put({
        ddtNumber,
        runId,
        artifact:
          "verification-result",
        bytes:
          await fs.readFile(
            verificationResultPath
          ),
      });

    return {
      status: "PASS",

      ddtNumber,

      runId,

      runDirectory,

      package: {
        path:
          packagePath,

        sha256:
          persistedPackage
            .sha256,

        manifestCoreHash,

        listedFiles:
          Number(
            buildResult
              .listedFiles
          ),

        verifiedEntries:
          Number(
            verifyResult
              .entries
          ),

        schemaValidation:
          String(
            verifyResult
              .schemaValidation
          ),

        proofProfile:
          String(
            packageProof
              .profile
          ),

        signature:
          String(
            packageProof
              .signature
          ),
      },

      verificationResult: {
        path:
          verificationResultPath,

        sha256:
          persistedVerificationResult
            .sha256,

        resultCoreHash,

        summaryStatus:
          String(
            summary.status
          ),

        proofPurpose:
          String(
            proof.proofPurpose
          ),

        signedObjectType:
          String(
            (
              proof.signedObject as
                JsonObject
            )?.type
          ),

        requiredAxes:
          requiredAxes.length,

        axisResults:
          axisResults.length,

        positiveAxes,

        failingAxes:
          Array.isArray(
            summary
              .failingAxisResultRefs
          )
            ? summary
                .failingAxisResultRefs
                .length
            : -1,

        unresolvedAxes:
          Array.isArray(
            summary
              .unresolvedAxisResultRefs
          )
            ? summary
                .unresolvedAxisResultRefs
                .length
            : -1,
      },

      internalVerification: {
        requiredChecks:
          checkValues.length,

        pass:
          internalPass,

        fail:
          internalFail,

        indeterminate:
          internalIndeterminate,

        replayExecuted:
          reproducibilityDetail
            .replayExecuted ===
          true,

        replayMatch:
          reproducibilityDetail
            .replayMatch ===
          true,

        primaryProjectionSha256:
          typeof reproducibilityDetail
            .primaryProjectionSha256 ===
          "string"
            ? reproducibilityDetail
                .primaryProjectionSha256
            : null,

        replayProjectionSha256:
          typeof reproducibilityDetail
            .replayProjectionSha256 ===
          "string"
            ? reproducibilityDetail
                .replayProjectionSha256
            : null,
      },
    };
  } finally {
    await fs
      .unlink(
        privateKeyPath
      )
      .catch(
        () => undefined
      );

    await fs
      .unlink(
        verificationKeyringPath
      )
      .catch(
        () => undefined
      );
  }
}

export type DDTOfflinePackageArtifactKind =
  | "archive"
  | "verification-result";

export type DDTOfflinePackageArtifact = {
  bytes: Buffer;
  fileName: string;
  mediaType: string;
  sha256: string;
};

export async function readOfflinePackageArtifact(
  ddtNumber: string,
  runId: string,
  artifact: DDTOfflinePackageArtifactKind
): Promise<DDTOfflinePackageArtifact> {
  if (
    !/^DDT-[0-9]{8}$/.test(
      ddtNumber
    )
  ) {
    throw new Error(
      "Invalid DDT Number."
    );
  }

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      runId
    )
  ) {
    throw new Error(
      "Invalid Offline Package run ID."
    );
  }

  if (
    artifact !== "archive" &&
    artifact !== "verification-result"
  ) {
    throw new Error(
      "Invalid Offline Package artifact."
    );
  }

  const stored =
    await getReferenceRecorderOfflineArtifactStore()
      .get({
        ddtNumber,
        runId,
        artifact,
      });

  if (!stored) {
    const error =
      new Error(
        "Offline Package artifact not found."
      ) as NodeJS.ErrnoException;

    error.code =
      "ENOENT";

    throw error;
  }

  return {
    bytes:
      stored.bytes,

    fileName:
      stored.descriptor
        .fileName,

    mediaType:
      stored.descriptor
        .mediaType,

    sha256:
      stored.descriptor
        .sha256,
  };
}
