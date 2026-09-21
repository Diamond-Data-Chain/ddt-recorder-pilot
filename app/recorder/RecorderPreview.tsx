"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  DDTRecorderInput,
} from "@/lib/ddt-recorder/ingest/types";


type RawStatus =
  | "MATCH"
  | "MODIFIED"
  | "INVALID";


type RecorderProofResult = {
  proofId: string;
  profile: "MATCH";
  signature: "VALID";
};


type RecorderDigest = {
  algorithm: "SHA-256";
  value: string;
};


type RecorderRegisteredResponse = {
  status: "REGISTERED";

  ddtNumber: string;
  registrationSequence: number;
  ddtRecordId: string;

  recordHash: RecorderDigest;
  registrationStatementHash: RecorderDigest;

  verification: {
    schema: "PASS";
    commitments: "PASS";
    proofs:
      RecorderProofResult[];
  };

  registrationResult:
    unknown;
};


type RecorderErrorResponse = {
  status: "ERROR";
  error: string;
};


type RecordState =
  | "IDLE"
  | "SUBMITTING"
  | "REGISTERED"
  | "ERROR";


function normalizeJson(
  value: unknown
): unknown {
  if (
    Array.isArray(value)
  ) {
    return value.map(
      normalizeJson
    );
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    const objectValue =
      value as
        Record<
          string,
          unknown
        >;

    return Object.fromEntries(
      Object.keys(
        objectValue
      )
        .sort()
        .map(
          key => [
            key,
            normalizeJson(
              objectValue[key]
            ),
          ]
        )
    );
  }

  return value;
}


function stableJson(
  value: unknown
): string {
  return JSON.stringify(
    normalizeJson(
      value
    )
  );
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


function formatDigest(
  digest: RecorderDigest
): string {
  return `${digest.algorithm}:${digest.value}`;
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

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes /
      1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(2)} MB`;
}


export default function RecorderPreview({
  input,
}: {
  input:
    DDTRecorderInput |
    null;
}) {
  const [
    showRaw,
    setShowRaw,
  ] =
    useState(false);

  const [
    rawJson,
    setRawJson,
  ] =
    useState("");


  const [
    recordState,
    setRecordState,
  ] =
    useState<RecordState>(
      "IDLE"
    );

  const [
    recordResult,
    setRecordResult,
  ] =
    useState<
      RecorderRegisteredResponse |
      null
    >(null);

  const [
    recordError,
    setRecordError,
  ] =
    useState("");


  useEffect(
    () => {
      setRecordState(
        "IDLE"
      );

      setRecordResult(
        null
      );

      setRecordError(
        ""
      );

      if (!input) {
        setRawJson("");
        setShowRaw(
          false
        );

        return;
      }

      setRawJson(
        JSON.stringify(
          input,
          null,
          2
        )
      );
    },
    [input]
  );


  const rawStatus =
    useMemo<
      RawStatus
    >(
      () => {
        if (
          !input
        ) {
          return "INVALID";
        }

        try {
          const parsed =
            JSON.parse(
              rawJson
            );

          return stableJson(
            parsed
          ) ===
            stableJson(
              input
            )
            ? "MATCH"
            : "MODIFIED";
        } catch {
          return "INVALID";
        }
      },
      [
        input,
        rawJson,
      ]
    );


  async function registerRecord() {
    if (
      !input ||
      recordState ===
        "SUBMITTING"
    ) {
      return;
    }

    if (
      rawStatus !==
      "MATCH"
    ) {
      setRecordState(
        "ERROR"
      );

      setRecordError(
        "Raw JSON does not match the validated form request. Reset it to the form request before registration."
      );

      return;
    }

    setRecordState(
      "SUBMITTING"
    );

    setRecordResult(
      null
    );

    setRecordError(
      ""
    );

    try {
      const response =
        await fetch(
          "/api/ddt-recorder/record",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                input
              ),

            cache:
              "no-store",
          }
        );

      const payload =
        (await response.json()) as
          | RecorderRegisteredResponse
          | RecorderErrorResponse;

      if (
        !response.ok ||
        payload.status !==
          "REGISTERED"
      ) {
        const message =
          payload.status ===
          "ERROR"
            ? payload.error
            : `Recorder API returned HTTP ${response.status}.`;

        throw new Error(
          message
        );
      }

      setRecordResult(
        payload
      );

      setRecordState(
        "REGISTERED"
      );
    } catch (
      error: unknown
    ) {
      setRecordResult(
        null
      );

      setRecordState(
        "ERROR"
      );

      setRecordError(
        error instanceof Error
          ? error.message
          : "DDT Record registration failed."
      );
    }
  }


  if (!input) {
    return null;
  }


  const sourceLabel = [
    input.source.type,
    input.source
      .systemName,
    input.source.version,
  ]
    .filter(Boolean)
    .join(" · ");


  return (
    <section className="mt-8 rounded-3xl border border-slate-700/80 bg-slate-950/85 p-6 shadow-xl shadow-black/15 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">
            Preview DDT Record
          </div>

          <h4 className="mt-2 text-xl font-bold tracking-tight text-amber-200">
            Final Recorder request
          </h4>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
            This is the DDTRecorderInput produced by the form,
            including automatic source evidence and all additional
            evidence. No record is submitted in Step 16.
          </p>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
          MAPPING VALID
        </div>
      </div>


      <div className="mt-7 grid gap-4 md:grid-cols-2">
        <PreviewItem
          label="Record type"
          value={
            input.recordType
          }
        />

        <PreviewItem
          label="Subject / reference"
          value={
            input.subject
              .reference
          }
        />

        <PreviewItem
          label="Publisher"
          value={
            input.publisher
              .identifier
              ? `${input.publisher.name} · ${input.publisher.identifier}`
              : input.publisher.name
          }
        />

        <PreviewItem
          label="Source"
          value={
            sourceLabel ||
            input.source
              .reference
          }
        />

        <PreviewItem
          label="Source reference"
          value={
            input.source
              .reference
          }
        />

        <PreviewItem
          label="Event time"
          value={
            input.eventTime
          }
        />

        <PreviewItem
          label="Actor"
          value={
            input.actor
              ?.identityRef ||
            "—"
          }
        />

        <PreviewItem
          label="Actor role"
          value={
            input.actor
              ?.role ||
            "—"
          }
        />

        <PreviewItem
          label="Previous DDT"
          value={
            input
              .previousDDTNumber ||
            "—"
          }
        />

        <PreviewItem
          label="Evidence items"
          value={
            String(
              input.evidence
                .length
            )
          }
        />
      </div>


      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-amber-200/70">
          Description
        </div>

        <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
          {input.description}
        </div>
      </div>


      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-amber-200/70">
          Payload
        </div>

        <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-xs leading-relaxed text-slate-300">
          {JSON.stringify(
            input.payload ??
              null,
            null,
            2
          )}
        </pre>
      </div>


      <div className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-slate-200">
              Evidence manifest input
            </div>

            <div className="mt-1 text-xs text-slate-500">
              {input.evidence.length} item
              {input.evidence.length ===
              1
                ? ""
                : "s"}{" "}
              will enter Recorder processing.
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {input.evidence.map(
            (
              evidence,
              index
            ) => (
              <div
                key={
                  `${evidence.name}-${index}`
                }
                className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="font-medium text-slate-200">
                      {index + 1}.{" "}
                      {evidence.name}
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {evidence.mediaType}
                      {" · "}
                      {humanBytes(
                        decodedByteLength(
                          evidence.contentBase64
                        )
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-300">
                    {evidence.role}
                  </div>
                </div>

                {(evidence
                  .evidenceClass ||
                  evidence
                    .bindings
                    ?.length) && (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {evidence
                      .evidenceClass && (
                      <span className="rounded-lg border border-slate-700 px-2.5 py-1 text-slate-400">
                        class:{" "}
                        {
                          evidence
                            .evidenceClass
                        }
                      </span>
                    )}

                    {evidence
                      .bindings
                      ?.map(
                        binding => (
                          <span
                            key={
                              binding
                            }
                            className="rounded-lg border border-blue-500/25 bg-blue-500/5 px-2.5 py-1 text-blue-300"
                          >
                            {binding}
                          </span>
                        )
                      )}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>


      <div className="mt-8 rounded-2xl border border-slate-700/70 bg-slate-900/35 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="font-semibold text-slate-100">
              Advanced / Raw JSON
            </div>

            <div className="mt-1 text-sm leading-relaxed text-slate-400">
              Inspect the exact request produced by the form.
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowRaw(
                current =>
                  !current
              )
            }
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-blue-500 hover:text-blue-300"
          >
            {showRaw
              ? "Hide Raw JSON"
              : "Show Raw JSON"}
          </button>
        </div>


        {showRaw && (
          <div className="mt-5">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <div
                className={
                  rawStatus ===
                  "MATCH"
                    ? "rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300"
                    : rawStatus ===
                        "MODIFIED"
                      ? "rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300"
                      : "rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300"
                }
              >
                {rawStatus ===
                "MATCH"
                  ? "EXACT MATCH WITH FORM"
                  : rawStatus ===
                      "MODIFIED"
                    ? "MODIFIED PREVIEW JSON"
                    : "INVALID JSON"}
              </div>

              <button
                type="button"
                onClick={() =>
                  setRawJson(
                    JSON.stringify(
                      input,
                      null,
                      2
                    )
                  )
                }
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                Reset to form request
              </button>
            </div>

            <textarea
              rows={24}
              spellCheck={false}
              value={
                rawJson
              }
              onChange={
                event =>
                  setRawJson(
                    event.target
                      .value
                  )
              }
              className="w-full rounded-2xl border border-slate-700 bg-black/40 p-4 font-mono text-xs leading-relaxed text-slate-300 outline-none focus:border-blue-500"
            />

            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              Raw JSON editing remains preview-only. Registration
              always uses the exact validated form request.
              Use “Reset to form request” to restore the exact
              form-generated request.
            </p>
          </div>
        )}
      </div>


      <div className="mt-8 rounded-2xl border border-slate-700/70 bg-slate-900/35 p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">
              Record DDT
            </div>

            <h4 className="mt-2 text-xl font-bold tracking-tight text-amber-200">
              Register validated DDT Record
            </h4>

            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
              Submit this exact validated form request to the existing
              DDT Recorder registration API.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              void registerRecord()
            }
            disabled={
              recordState ===
                "SUBMITTING" ||
              recordState ===
                "REGISTERED" ||
              rawStatus !==
                "MATCH"
            }
            className="shrink-0 rounded-xl border border-blue-400/70 bg-blue-500/25 px-6 py-3 font-bold text-blue-100 shadow-lg shadow-blue-950/30 transition hover:border-blue-300 hover:bg-blue-500/35 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {recordState ===
            "SUBMITTING"
              ? "Registering..."
              : recordState ===
                  "REGISTERED"
                ? "Registered"
                : "Register DDT Record"}
          </button>
        </div>


        {rawStatus !==
          "MATCH" &&
          recordState !==
            "REGISTERED" && (
            <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
              Registration is disabled because Raw JSON does not
              exactly match the validated form request. Reset Raw JSON
              to the form request first.
            </div>
          )}


        {recordState ===
          "SUBMITTING" && (
          <div className="mt-5 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-300">
            Recorder is processing, validating and registering the
            DDT Record.
          </div>
        )}


        {recordState ===
          "ERROR" && (
          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            <div className="font-semibold">
              Registration failed
            </div>

            <div className="mt-1 break-words">
              {recordError}
            </div>
          </div>
        )}


        {recordState ===
          "REGISTERED" &&
          recordResult && (
            <div className="mt-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-5 md:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
                    Registration result
                  </div>

                  <h5 className="mt-2 text-2xl font-semibold text-slate-100">
                    {recordResult.ddtNumber}
                  </h5>
                </div>

                <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-300">
                  REGISTERED
                </div>
              </div>


              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <PreviewItem
                  label="DDT Number"
                  value={
                    recordResult.ddtNumber
                  }
                />

                <PreviewItem
                  label="Registration sequence"
                  value={
                    String(
                      recordResult
                        .registrationSequence
                    )
                  }
                />

                <PreviewItem
                  label="DDT Record ID"
                  value={
                    recordResult.ddtRecordId
                  }
                />

                <PreviewItem
                  label="Record hash"
                  value={
                    formatDigest(
                      recordResult.recordHash
                    )
                  }
                />

                <div className="md:col-span-2">
                  <PreviewItem
                    label="Registration statement hash"
                    value={
                      formatDigest(
                        recordResult
                          .registrationStatementHash
                      )
                    }
                  />
                </div>
              </div>


              <div className="mt-6">
                <div className="text-sm font-semibold text-slate-200">
                  Verification
                </div>

                <div className="mt-3 flex flex-wrap gap-3">
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
                    Schema{" "}
                    <strong>
                      {
                        recordResult
                          .verification
                          .schema
                      }
                    </strong>
                  </div>

                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">
                    Commitments{" "}
                    <strong>
                      {
                        recordResult
                          .verification
                          .commitments
                      }
                    </strong>
                  </div>

                  <div
                    className={
                      recordResult
                        .verification
                        .proofs.length >
                        0 &&
                      recordResult
                        .verification
                        .proofs
                        .every(
                          proof =>
                            proof.profile ===
                              "MATCH" &&
                            proof.signature ===
                              "VALID"
                        )
                        ? "rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300"
                        : "rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300"
                    }
                  >
                    Proofs{" "}
                    <strong>
                      {recordResult
                        .verification
                        .proofs.length >
                        0 &&
                      recordResult
                        .verification
                        .proofs
                        .every(
                          proof =>
                            proof.profile ===
                              "MATCH" &&
                            proof.signature ===
                              "VALID"
                        )
                        ? "VALID"
                        : "NONE"}
                    </strong>
                  </div>
                </div>
              </div>


              <div className="mt-6">
                <div className="text-sm font-semibold text-slate-200">
                  Proof results
                </div>

                {recordResult
                  .verification
                  .proofs.length ===
                0 ? (
                  <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
                    No proof results were returned by the Recorder.
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    {recordResult
                      .verification
                      .proofs
                      .map(
                        (
                          proof,
                          index
                        ) => (
                          <div
                            key={
                              proof.proofId
                            }
                            className="rounded-2xl border border-slate-700/70 bg-slate-950/75 p-4"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div className="min-w-0">
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
                              </div>

                              <div className="flex shrink-0 gap-2">
                                <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                                  PROFILE{" "}
                                  {
                                    proof.profile
                                  }
                                </span>

                                <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                                  SIGNATURE{" "}
                                  {
                                    proof.signature
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                  </div>
                )}
              </div>
            </div>
          )}
      </div>
    </section>
  );
}


function PreviewItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-amber-200/70">
        {label}
      </div>

      <div className="mt-2 break-words text-sm text-slate-200">
        {value}
      </div>
    </div>
  );
}
