"use client";

import {
  useState,
} from "react";


type Digest = {
  algorithm: string;
  value: string;
};


type VerifiedProof = {
  proofId: string;
  profile: string;
  signature: string;
};


type StoredEvidence = {
  name: string;
  mediaType: string;
  byteLength: number;
};


type RetrieveVerifiedResponse = {
  status: "VERIFIED";

  ddtNumber: string;
  ddtRecordId: string;
  ddtFamilyId: string;
  subjectNamespace: string;

  recordHash: Digest;

  registrationResult:
    Record<string, unknown>;

  reconstruction: {
    identity:
      Record<string, any>;

    upstream:
      Record<string, any>;

    evidenceManifest:
      Record<string, any>;

    relationships:
      Record<string, any>;

    evidence:
      StoredEvidence[];

    storedAt: string;
  };

  verification: {
    schema: "PASS";
    commitments: "PASS";

    proofs:
      VerifiedProof[];

    registeredUpstreamCommitment:
      Digest;

    evidenceManifestCommitment:
      Digest;

    preservationContractCommitment:
      Digest;

    registrationStatementHash:
      Digest;

    receiptCoreHash:
      Digest;

    conformanceReceiptCommitment:
      Digest;
  };
};


type RetrieveErrorResponse = {
  status:
    | "ERROR"
    | "NOT_FOUND";

  error?: string;
  ddtNumber?: string;
};


type OfflinePackageResponse = {
  status: "PASS";
  profileStatus: "TEST_ONLY";

  ddtNumber: string;
  runId: string;

  package: {
    sha256: string;
    manifestCoreHash: string;
    listedFiles: number;
    verifiedEntries: number;
    schemaValidation: string;
    proofProfile: string;
    signature: string;
  };

  verificationResult: {
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


type OfflineErrorResponse = {
  status:
    | "ERROR"
    | "DISABLED"
    | "NOT_FOUND";

  error?: string;
};


type OfflineState =
  | "IDLE"
  | "BUILDING"
  | "PASS"
  | "ERROR";


type RetrieveState =
  | "IDLE"
  | "LOADING"
  | "VERIFIED"
  | "ERROR";


function formatDigest(
  value: unknown
): string {
  if (
    typeof value ===
      "object" &&
    value !== null &&
    !Array.isArray(value)
  ) {
    const objectValue =
      value as
        Record<
          string,
          unknown
        >;

    if (
      typeof objectValue.algorithm ===
        "string" &&
      typeof objectValue.value ===
        "string"
    ) {
      return `${objectValue.algorithm}:${objectValue.value}`;
    }
  }

  if (
    typeof value ===
    "string"
  ) {
    return value;
  }

  return "—";
}


function decodedByteLength(
  base64: string
): number {
  if (!base64) {
    return 0;
  }

  const padding =
    base64.endsWith("==")
      ? 2
      : base64.endsWith("=")
        ? 1
        : 0;

  return Math.max(
    0,
    Math.floor(
      base64.length *
        3 /
        4
    ) -
      padding
  );
}


function humanBytes(
  bytes: number
): string {
  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }

  return `${(
    bytes /
    1024
  ).toFixed(1)} KB`;
}


function textValue(
  value: unknown
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "—";
  }

  if (
    typeof value ===
      "string" ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    return String(
      value
    );
  }

  return JSON.stringify(
    value,
    null,
    2
  );
}


export default function RetrieveVerifyPanel() {
  const [
    ddtNumber,
    setDdtNumber,
  ] =
    useState("");

  const [
    state,
    setState,
  ] =
    useState<RetrieveState>(
      "IDLE"
    );

  const [
    result,
    setResult,
  ] =
    useState<
      RetrieveVerifiedResponse |
      null
    >(null);

  const [
    error,
    setError,
  ] =
    useState("");


  const [
    offlineState,
    setOfflineState,
  ] =
    useState<OfflineState>(
      "IDLE"
    );

  const [
    offlineResult,
    setOfflineResult,
  ] =
    useState<
      OfflinePackageResponse |
      null
    >(null);

  const [
    offlineError,
    setOfflineError,
  ] =
    useState("");


  async function retrieve() {
    const normalized =
      ddtNumber
        .trim()
        .toUpperCase();

    setDdtNumber(
      normalized
    );

    setResult(
      null
    );

    setError(
      ""
    );

    setOfflineState(
      "IDLE"
    );

    setOfflineResult(
      null
    );

    setOfflineError(
      ""
    );

    if (
      !/^DDT-[0-9]{8}$/.test(
        normalized
      )
    ) {
      setState(
        "ERROR"
      );

      setError(
        "DDT Number must use format DDT-00000001."
      );

      return;
    }

    setState(
      "LOADING"
    );

    try {
      const response =
        await fetch(
          `/api/ddt-recorder/records/${encodeURIComponent(
            normalized
          )}`,
          {
            method:
              "GET",

            cache:
              "no-store",
          }
        );

      const payload =
        (await response.json()) as
          | RetrieveVerifiedResponse
          | RetrieveErrorResponse;

      if (
        !response.ok ||
        payload.status !==
          "VERIFIED"
      ) {
        if (
          payload.status ===
          "NOT_FOUND"
        ) {
          throw new Error(
            `${normalized} was not found in the Recorder store.`
          );
        }

        throw new Error(
          payload.status ===
            "ERROR"
            ? payload.error ||
              "Unable to retrieve DDT Record."
            : `Retrieval failed with HTTP ${response.status}.`
        );
      }

      setResult(
        payload
      );

      setState(
        "VERIFIED"
      );
    } catch (
      caught: unknown
    ) {
      setState(
        "ERROR"
      );

      setResult(
        null
      );

      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to retrieve DDT Record."
      );
    }
  }


  async function buildOfflinePackage() {
    if (
      !result ||
      offlineState ===
        "BUILDING"
    ) {
      return;
    }

    setOfflineState(
      "BUILDING"
    );

    setOfflineResult(
      null
    );

    setOfflineError(
      ""
    );

    try {
      const response =
        await fetch(
          `/api/ddt-recorder/records/${encodeURIComponent(
            result.ddtNumber
          )}/offline-package`,
          {
            method:
              "POST",

            cache:
              "no-store",
          }
        );

      const payload =
        (await response.json()) as
          | OfflinePackageResponse
          | OfflineErrorResponse;

      if (
        !response.ok ||
        payload.status !==
          "PASS"
      ) {
        throw new Error(
          "error" in payload &&
          payload.error
            ? payload.error
            : `Offline verification failed with HTTP ${response.status}.`
        );
      }

      setOfflineResult(
        payload
      );

      setOfflineState(
        "PASS"
      );
    } catch (
      caught: unknown
    ) {
      setOfflineResult(
        null
      );

      setOfflineState(
        "ERROR"
      );

      setOfflineError(
        caught instanceof Error
          ? caught.message
          : "Unable to build Offline Verification Package."
      );
    }
  }


  const identity =
    result?.reconstruction
      .identity ?? {};

  const upstream =
    result?.reconstruction
      .upstream ?? {};

  const source =
    upstream.source ?? {};

  const event =
    upstream.event ?? {};

  const payload =
    upstream.payload ?? {};

  const payloadContent =
    payload.content ?? {};

  const manifest =
    result?.reconstruction
      .evidenceManifest ?? {};

  const manifestEntries =
    Array.isArray(
      manifest.entries
    )
      ? manifest.entries
      : [];

  const relationships =
    result?.reconstruction
      .relationships ?? {};

  const previousRecordInFamily =
    relationships
      .previousRecordInFamily &&
    typeof relationships
      .previousRecordInFamily ===
      "object" &&
    !Array.isArray(
      relationships
        .previousRecordInFamily
    )
      ? relationships
          .previousRecordInFamily
      : null;

  const relatedRecords =
    Array.isArray(
      relationships
        .relatedRecords
    )
      ? relationships
          .relatedRecords
      : [];

  const proofs =
    result?.verification
      .proofs ?? [];

  const allProofsValid =
    proofs.length >
      0 &&
    proofs.every(
      proof =>
        proof.profile ===
          "MATCH" &&
        proof.signature ===
          "VALID"
    );


  return (
    <section className="rounded-3xl border border-slate-700/80 bg-slate-900/75 p-6 shadow-xl shadow-black/15 md:p-8">
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">
          Registered DDT Record
        </div>

        <h2 className="mt-2 text-2xl font-bold tracking-tight text-amber-200">
          Retrieve / Verify
        </h2>

        <p className="mt-2 max-w-3xl leading-relaxed text-slate-300">
          Retrieve an existing DDT Record by its DDT Number,
          reconstruct its recorded context and independently rerun
          the Recorder verification checks.
        </p>
      </div>


      <div className="mt-8 max-w-2xl">
        <label className="mb-2 block text-sm font-semibold tracking-wide text-amber-200/90">
          DDT Number
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={
              ddtNumber
            }
            onChange={
              event =>
                setDdtNumber(
                  event.target
                    .value
                )
            }
            onKeyDown={
              event => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  void retrieve();
                }
              }
            }
            placeholder="DDT-00000002"
            className="min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-900/90 px-4 py-3 font-mono font-medium text-slate-50 shadow-inner shadow-black/20 outline-none transition-all placeholder:text-slate-500 hover:border-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
          />

          <button
            type="button"
            onClick={() =>
              void retrieve()
            }
            disabled={
              state ===
              "LOADING"
            }
            className="rounded-xl border border-blue-400/70 bg-blue-500/25 px-6 py-3 font-bold text-blue-100 shadow-lg shadow-blue-950/30 transition hover:border-blue-300 hover:bg-blue-500/35 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {state ===
            "LOADING"
              ? "Retrieving..."
              : "Retrieve & Verify"}
          </button>
        </div>
      </div>


      {state ===
        "ERROR" && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
          <div className="font-semibold">
            Retrieval / verification failed
          </div>

          <div className="mt-1 break-words">
            {error}
          </div>
        </div>
      )}


      {state ===
        "VERIFIED" &&
        result && (
          <div className="mt-8 space-y-6">
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
                    Retrieval result
                  </div>

                  <div className="mt-2 text-2xl font-semibold text-slate-100">
                    {result.ddtNumber}
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-300">
                  VERIFIED
                </div>
              </div>


              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Info
                  label="DDT Record ID"
                  value={
                    result.ddtRecordId
                  }
                />

                <Info
                  label="DDT Family ID"
                  value={
                    result.ddtFamilyId
                  }
                />

                <Info
                  label="Subject namespace"
                  value={
                    result.subjectNamespace
                  }
                />

                <Info
                  label="Record hash"
                  value={
                    formatDigest(
                      result.recordHash
                    )
                  }
                />

                <Info
                  label="Stored at"
                  value={
                    result.reconstruction
                      .storedAt
                  }
                />

                <Info
                  label="Registration sequence"
                  value={
                    textValue(
                      result
                        .registrationResult
                        .registrationSequence
                    )
                  }
                />
              </div>
            </div>


            <Panel
              title="Record identity"
              description="Canonical identity reconstructed from the registered envelope."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Info
                  label="Record type"
                  value={
                    textValue(
                      identity.recordType
                    )
                  }
                />

                <Info
                  label="Subject reference"
                  value={
                    textValue(
                      identity.subject
                        ?.reference
                    )
                  }
                />

                <Info
                  label="DDT Record ID"
                  value={
                    textValue(
                      identity.ddtRecordId
                    )
                  }
                />

                <Info
                  label="DDT Family ID"
                  value={
                    textValue(
                      identity.ddtFamilyId
                    )
                  }
                />
              </div>
            </Panel>


            <Panel
              title="Source / event"
              description="Recorded upstream source and event coordinates."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Info
                  label="Source ID"
                  value={
                    textValue(
                      source.sourceId
                    )
                  }
                />

                <Info
                  label="Source type"
                  value={
                    textValue(
                      source.sourceType
                    )
                  }
                />

                <Info
                  label="Source record ID"
                  value={
                    textValue(
                      source.sourceRecordId
                    )
                  }
                />

                <Info
                  label="Event type"
                  value={
                    textValue(
                      event.eventType
                    )
                  }
                />

                <Info
                  label="Event time"
                  value={
                    textValue(
                      event.eventTime
                        ?.value
                    )
                  }
                />

                <Info
                  label="Time basis"
                  value={
                    textValue(
                      event.eventTime
                        ?.basis
                    )
                  }
                />
              </div>


              {upstream.actor && (
                <JsonBlock
                  title="Actor / model / component"
                  value={
                    upstream.actor
                  }
                />
              )}
            </Panel>


            <Panel
              title="Recorded payload"
              description="Content preserved in the registered upstream payload."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Info
                  label="Payload mode"
                  value={
                    textValue(
                      payload.mode
                    )
                  }
                />

                <Info
                  label="Media type"
                  value={
                    textValue(
                      payload.mediaType
                    )
                  }
                />

                <Info
                  label="Publisher"
                  value={
                    textValue(
                      payloadContent
                        .publisher
                        ?.name
                    )
                  }
                />

                <Info
                  label="Description"
                  value={
                    textValue(
                      payloadContent
                        .description
                    )
                  }
                />
              </div>

              <JsonBlock
                title="Payload data"
                value={
                  payloadContent
                    .data ??
                  null
                }
              />
            </Panel>


            <Panel
              title="Evidence"
              description={`${manifestEntries.length} manifest item${
                manifestEntries.length === 1
                  ? ""
                  : "s"
              } reconstructed and bound to this record.`}
            >
              {manifestEntries.length ===
              0 ? (
                <div className="text-sm text-slate-500">
                  No Evidence Manifest entries.
                </div>
              ) : (
                <div className="space-y-4">
                  {manifestEntries.map(
                    (
                      entry: any,
                      index: number
                    ) => (
                      <div
                        key={
                          entry.evidenceId ??
                          index
                        }
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-200">
                              Evidence{" "}
                              {index +
                                1}
                            </div>

                            <div className="mt-1 break-all font-mono text-xs text-slate-500">
                              {textValue(
                                entry.evidenceId
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Badge
                              value={
                                textValue(
                                  entry.role
                                )
                              }
                            />

                            {entry
                              .evidenceClass && (
                              <Badge
                                value={
                                  textValue(
                                    entry.evidenceClass
                                  )
                                }
                              />
                            )}
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <Info
                            label="Media type"
                            value={
                              textValue(
                                entry.mediaType
                              )
                            }
                          />

                          <Info
                            label="Representation"
                            value={
                              `${textValue(
                                entry
                                  .representation
                                  ?.mode
                              )} · ${textValue(
                                entry
                                  .representation
                                  ?.byteLength
                              )} bytes`
                            }
                          />

                          <Info
                            label="Evidence commitment"
                            value={
                              textValue(
                                entry.commitment
                                  ?.value
                              )
                            }
                          />

                          <Info
                            label="Commitment encoding"
                            value={
                              textValue(
                                entry.commitment
                                  ?.encoding
                              )
                            }
                          />
                        </div>

                        {entry
                          .provenance && (
                          <JsonBlock
                            title="Provenance"
                            value={
                              entry.provenance
                            }
                          />
                        )}

                        {entry
                          .semanticScope && (
                          <JsonBlock
                            title="Semantic scope"
                            value={
                              entry
                                .semanticScope
                            }
                          />
                        )}
                      </div>
                    )
                  )}
                </div>
              )}


              <div className="mt-6">
                <div className="mb-3 text-sm font-semibold text-slate-200">
                  Stored evidence
                </div>

                <div className="space-y-3">
                  {result.reconstruction
                    .evidence
                    .map(
                      (
                        evidence,
                        index
                      ) => (
                        <div
                          key={
                            `${evidence.name}-${index}`
                          }
                          className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                        >
                          <div className="font-medium text-slate-200">
                            {
                              evidence.name
                            }
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {
                              evidence.mediaType
                            }
                            {" · "}
                            {humanBytes(
                              evidence.byteLength
                            )}
                          </div>
                        </div>
                      )
                    )}
                </div>
              </div>
            </Panel>


            <Panel
              title="Relationships"
              description="Recorded links to predecessor or related DDT Records."
            >
              <div className="space-y-4">
                {previousRecordInFamily ? (
                  <JsonBlock
                    title="Previous record in family"
                    value={
                      previousRecordInFamily
                    }
                  />
                ) : (
                  <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm leading-relaxed text-slate-400">
                    No previous record in family.
                  </div>
                )}

                {relatedRecords.length ===
                0 ? (
                  <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm leading-relaxed text-slate-400">
                    No additional related records.
                  </div>
                ) : (
                  <JsonBlock
                    title="Additional related records"
                    value={
                      relatedRecords
                    }
                  />
                )}
              </div>
            </Panel>


            <Panel
              title="Verification"
              description="Verification rerun against the retrieved registered bundle."
            >
              <div className="flex flex-wrap gap-3">
                <StatusBadge
                  label="Schema"
                  value={
                    result.verification
                      .schema
                  }
                />

                <StatusBadge
                  label="Commitments"
                  value={
                    result.verification
                      .commitments
                  }
                />

                <StatusBadge
                  label="Proofs"
                  value={
                    allProofsValid
                      ? "VALID"
                      : proofs.length ===
                          0
                        ? "NONE"
                        : "CHECK"
                  }
                />
              </div>


              <div className="mt-6 grid gap-4">
                <Info
                  label="Registered upstream commitment"
                  value={
                    formatDigest(
                      result.verification
                        .registeredUpstreamCommitment
                    )
                  }
                />

                <Info
                  label="Evidence Manifest commitment"
                  value={
                    formatDigest(
                      result.verification
                        .evidenceManifestCommitment
                    )
                  }
                />

                <Info
                  label="Preservation Contract commitment"
                  value={
                    formatDigest(
                      result.verification
                        .preservationContractCommitment
                    )
                  }
                />

                <Info
                  label="Registration statement hash"
                  value={
                    formatDigest(
                      result.verification
                        .registrationStatementHash
                    )
                  }
                />

                <Info
                  label="Receipt core hash"
                  value={
                    formatDigest(
                      result.verification
                        .receiptCoreHash
                    )
                  }
                />

                <Info
                  label="Conformance Receipt commitment"
                  value={
                    formatDigest(
                      result.verification
                        .conformanceReceiptCommitment
                    )
                  }
                />
              </div>


              <div className="mt-6">
                <div className="mb-3 text-sm font-semibold text-slate-200">
                  Proof results
                </div>

                <div className="space-y-3">
                  {proofs.map(
                    (
                      proof,
                      index
                    ) => (
                      <div
                        key={
                          proof.proofId
                        }
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                      >
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          Proof{" "}
                          {index +
                            1}
                        </div>

                        <div className="mt-1 break-all font-mono text-xs text-slate-300">
                          {
                            proof.proofId
                          }
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <StatusBadge
                            label="Profile"
                            value={
                              proof.profile
                            }
                          />

                          <StatusBadge
                            label="Signature"
                            value={
                              proof.signature
                            }
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </Panel>


            <Panel
              title="Offline Independent Verification"
              description="Build a portable verification package, run the formal verifier, run all internal checks and replay the reconstructed record."
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-sm leading-relaxed text-slate-300">
                    This process creates a separate offline package for{" "}
                    <span className="font-mono text-slate-200">
                      {result.ddtNumber}
                    </span>
                    {" "}and verifies it independently from the normal retrieval view.
                  </div>

                  <div className="mt-2 text-xs text-slate-600">
                    Local Reference Recorder profile status: TEST_ONLY
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void buildOfflinePackage()
                  }
                  disabled={
                    offlineState ===
                    "BUILDING"
                  }
                  className="shrink-0 rounded-xl border border-blue-400/70 bg-blue-500/25 px-5 py-3 font-bold text-blue-100 shadow-lg shadow-blue-950/30 transition hover:border-blue-300 hover:bg-blue-500/35 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {offlineState ===
                  "BUILDING"
                    ? "Building & verifying..."
                    : "Build Offline Package"}
                </button>
              </div>


              {offlineState ===
                "BUILDING" && (
                <div className="mt-5 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-300">
                  Building package, running formal verification and
                  executing reconstruction replay.
                </div>
              )}


              {offlineState ===
                "ERROR" && (
                <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  <div className="font-semibold">
                    Offline verification failed
                  </div>

                  <div className="mt-1 break-words">
                    {offlineError}
                  </div>
                </div>
              )}


              {offlineState ===
                "PASS" &&
                offlineResult && (
                  <div className="mt-6 space-y-6">
                    <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
                            Offline verification result
                          </div>

                          <div className="mt-2 text-xl font-semibold text-slate-100">
                            {offlineResult.ddtNumber}
                          </div>

                          <div className="mt-1 font-mono text-xs text-slate-500">
                            Run ID: {offlineResult.runId}
                          </div>
                        </div>

                        <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-300">
                          PASS
                        </div>
                      </div>
                    </div>


                    <div>
                      <div className="mb-3 text-sm font-semibold text-slate-200">
                        Offline package
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Info
                          label="Package SHA-256"
                          value={
                            offlineResult
                              .package
                              .sha256
                          }
                        />

                        <Info
                          label="Manifest Core Hash"
                          value={
                            offlineResult
                              .package
                              .manifestCoreHash
                          }
                        />

                        <Info
                          label="Listed files"
                          value={
                            String(
                              offlineResult
                                .package
                                .listedFiles
                            )
                          }
                        />

                        <Info
                          label="Verified entries"
                          value={
                            String(
                              offlineResult
                                .package
                                .verifiedEntries
                            )
                          }
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <StatusBadge
                          label="Schema"
                          value={
                            offlineResult
                              .package
                              .schemaValidation
                          }
                        />

                        <StatusBadge
                          label="Proof profile"
                          value={
                            offlineResult
                              .package
                              .proofProfile
                          }
                        />

                        <StatusBadge
                          label="Package signature"
                          value={
                            offlineResult
                              .package
                              .signature
                          }
                        />
                      </div>
                    </div>


                    <div>
                      <div className="mb-3 text-sm font-semibold text-slate-200">
                        Formal Verification Result
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <Info
                          label="Required axes"
                          value={
                            String(
                              offlineResult
                                .verificationResult
                                .requiredAxes
                            )
                          }
                        />

                        <Info
                          label="Axis results"
                          value={
                            String(
                              offlineResult
                                .verificationResult
                                .axisResults
                            )
                          }
                        />

                        <Info
                          label="Positive axes"
                          value={
                            String(
                              offlineResult
                                .verificationResult
                                .positiveAxes
                            )
                          }
                        />

                        <Info
                          label="Failing axes"
                          value={
                            String(
                              offlineResult
                                .verificationResult
                                .failingAxes
                            )
                          }
                        />

                        <Info
                          label="Unresolved axes"
                          value={
                            String(
                              offlineResult
                                .verificationResult
                                .unresolvedAxes
                            )
                          }
                        />

                        <Info
                          label="Summary"
                          value={
                            offlineResult
                              .verificationResult
                              .summaryStatus
                          }
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <StatusBadge
                          label="Axes"
                          value={
                            offlineResult
                              .verificationResult
                              .requiredAxes ===
                              offlineResult
                                .verificationResult
                                .positiveAxes &&
                            offlineResult
                              .verificationResult
                              .failingAxes ===
                              0 &&
                            offlineResult
                              .verificationResult
                              .unresolvedAxes ===
                              0
                              ? `${offlineResult.verificationResult.positiveAxes}/${offlineResult.verificationResult.requiredAxes} PASS`
                              : "CHECK"
                          }
                        />
                      </div>

                      <div className="mt-4 grid gap-4">
                        <Info
                          label="Verification Result SHA-256"
                          value={
                            offlineResult
                              .verificationResult
                              .sha256
                          }
                        />

                        <Info
                          label="Result Core Hash"
                          value={
                            offlineResult
                              .verificationResult
                              .resultCoreHash
                          }
                        />

                        <Info
                          label="Proof purpose"
                          value={
                            offlineResult
                              .verificationResult
                              .proofPurpose
                          }
                        />

                        <Info
                          label="Signed object type"
                          value={
                            offlineResult
                              .verificationResult
                              .signedObjectType
                          }
                        />
                      </div>
                    </div>


                    <div>
                      <div className="mb-3 text-sm font-semibold text-slate-200">
                        Internal verification
                      </div>

                      <div className="grid gap-4 md:grid-cols-4">
                        <Info
                          label="Required checks"
                          value={
                            String(
                              offlineResult
                                .internalVerification
                                .requiredChecks
                            )
                          }
                        />

                        <Info
                          label="PASS"
                          value={
                            String(
                              offlineResult
                                .internalVerification
                                .pass
                            )
                          }
                        />

                        <Info
                          label="FAIL"
                          value={
                            String(
                              offlineResult
                                .internalVerification
                                .fail
                            )
                          }
                        />

                        <Info
                          label="Indeterminate"
                          value={
                            String(
                              offlineResult
                                .internalVerification
                                .indeterminate
                            )
                          }
                        />
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        <StatusBadge
                          label="Checks"
                          value={
                            offlineResult
                              .internalVerification
                              .requiredChecks ===
                              offlineResult
                                .internalVerification
                                .pass &&
                            offlineResult
                              .internalVerification
                              .fail ===
                              0 &&
                            offlineResult
                              .internalVerification
                              .indeterminate ===
                              0
                              ? `${offlineResult.internalVerification.pass}/${offlineResult.internalVerification.requiredChecks} PASS`
                              : "CHECK"
                          }
                        />

                        <StatusBadge
                          label="Replay executed"
                          value={
                            offlineResult
                              .internalVerification
                              .replayExecuted
                              ? "YES"
                              : "NO"
                          }
                        />

                        <StatusBadge
                          label="Replay match"
                          value={
                            offlineResult
                              .internalVerification
                              .replayMatch
                              ? "MATCH"
                              : "MISMATCH"
                          }
                        />
                      </div>

                      <div className="mt-4 grid gap-4">
                        <Info
                          label="Primary projection SHA-256"
                          value={
                            offlineResult
                              .internalVerification
                              .primaryProjectionSha256 ??
                            "—"
                          }
                        />

                        <Info
                          label="Replay projection SHA-256"
                          value={
                            offlineResult
                              .internalVerification
                              .replayProjectionSha256 ??
                            "—"
                          }
                        />
                      </div>
                    </div>


                    <div className="border-t border-slate-800 pt-5">
                      <div className="mb-3 text-sm font-semibold text-slate-200">
                        Download verified artifacts
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <a
                          href={`/api/ddt-recorder/records/${encodeURIComponent(
                            offlineResult.ddtNumber
                          )}/offline-package/${encodeURIComponent(
                            offlineResult.runId
                          )}/archive`}
                          className="rounded-xl border border-blue-400/50 bg-blue-500/12 px-5 py-3 text-sm font-semibold text-blue-200 transition hover:border-blue-300 hover:bg-blue-500/22 hover:text-blue-100"
                        >
                          Download Offline ZIP
                        </a>

                        <a
                          href={`/api/ddt-recorder/records/${encodeURIComponent(
                            offlineResult.ddtNumber
                          )}/offline-package/${encodeURIComponent(
                            offlineResult.runId
                          )}/verification-result`}
                          className="rounded-xl border border-slate-700 bg-slate-950 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-blue-500 hover:text-blue-300"
                        >
                          Download Verification Result
                        </a>
                      </div>
                    </div>
                  </div>
                )}
            </Panel>


            <details className="rounded-3xl border border-slate-700/70 bg-slate-950/75 p-5">
              <summary className="cursor-pointer font-semibold text-slate-200">
                Advanced / Raw reconstruction
              </summary>

              <pre className="mt-5 max-h-[40rem] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-black/30 p-4 text-xs leading-relaxed text-slate-400">
                {JSON.stringify(
                  result.reconstruction,
                  null,
                  2
                )}
              </pre>
            </details>
          </div>
        )}
    </section>
  );
}


function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-700/80 bg-slate-900/65 p-5 shadow-lg shadow-black/10 md:p-6">
      <h3 className="text-lg font-bold tracking-wide text-amber-200">
        {title}
      </h3>

      <p className="mt-1 text-sm leading-relaxed text-slate-400">
        {description}
      </p>

      <div className="mt-5">
        {children}
      </div>
    </section>
  );
}


function Info({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-amber-200/70">
        {label}
      </div>

      <div className="mt-2 whitespace-pre-wrap break-all text-sm text-slate-200">
        {value}
      </div>
    </div>
  );
}


function JsonBlock({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>

      <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs leading-relaxed text-slate-300">
        {JSON.stringify(
          value,
          null,
          2
        )}
      </pre>
    </div>
  );
}


function Badge({
  value,
}: {
  value: string;
}) {
  return (
    <span className="rounded-lg border border-blue-500/25 bg-blue-500/5 px-2.5 py-1 text-xs text-blue-300">
      {value}
    </span>
  );
}


function StatusBadge({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const positive =
    value === "PASS" ||
    value === "VALID" ||
    value === "MATCH" ||
    value === "VERIFIED" ||
    value === "YES" ||
    value.endsWith(" PASS");

  return (
    <span
      className={
        positive
          ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300"
          : "rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300"
      }
    >
      {label}{" "}
      <strong>
        {value}
      </strong>
    </span>
  );
}
