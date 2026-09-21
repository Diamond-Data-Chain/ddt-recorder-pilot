"use client";

import {
  useState,
} from "react";

import type {
  DDTRecorderEvidenceBinding,
  DDTRecorderEvidenceInput,
  DDTRecorderEvidenceRole,
  DDTRecorderInput,
} from "@/lib/ddt-recorder/ingest/types";


type EvidenceMode =
  | "FILE"
  | "TEXT"
  | "JSON";


type EvidenceDraft = {
  id: string;
  mode: EvidenceMode;

  name: string;
  mediaType: string;

  role:
    DDTRecorderEvidenceRole;

  evidenceClass: string;

  semanticContext: boolean;
  actorAuthority: boolean;

  textContent: string;
  contentBase64: string;

  status:
    | "EMPTY"
    | "READY"
    | "ERROR";

  error: string;
};


const roles: {
  value:
    DDTRecorderEvidenceRole;
  label: string;
}[] = [
  {
    value:
      "SUPPORTING_EVIDENCE",
    label:
      "Supporting evidence",
  },
  {
    value:
      "POLICY_OR_RULEBOOK",
    label:
      "Policy / Rulebook",
  },
  {
    value:
      "AUTHORITY_EVIDENCE",
    label:
      "Authority evidence",
  },
  {
    value:
      "SEMANTIC_DEPENDENCY",
    label:
      "Semantic dependency",
  },
  {
    value:
      "FRAMEWORK_OR_DEFINITION",
    label:
      "Framework / definition",
  },
  {
    value:
      "IDENTITY_OR_KEY_EVIDENCE",
    label:
      "Identity / key evidence",
  },
  {
    value:
      "PROVENANCE_EVIDENCE",
    label:
      "Provenance evidence",
  },
  {
    value:
      "TIME_OR_ORDERING_EVIDENCE",
    label:
      "Time / ordering evidence",
  },
  {
    value:
      "VALIDATION_ARTIFACT",
    label:
      "Validation artifact",
  },
  {
    value:
      "PROFILE_DEFINED",
    label:
      "Profile-defined",
  },
];


function newDraft():
  EvidenceDraft {
  return {
    id:
      `${Date.now()}-${Math.random()}`,

    mode:
      "FILE",

    name: "",
    mediaType:
      "application/octet-stream",

    role:
      "SUPPORTING_EVIDENCE",

    evidenceClass: "",

    semanticContext:
      false,

    actorAuthority:
      false,

    textContent: "",
    contentBase64: "",

    status:
      "EMPTY",

    error: "",
  };
}


function bytesToBase64(
  bytes: Uint8Array
): string {
  let binary = "";

  const chunkSize =
    0x8000;

  for (
    let offset = 0;
    offset < bytes.length;
    offset += chunkSize
  ) {
    const chunk =
      bytes.subarray(
        offset,
        Math.min(
          offset +
            chunkSize,
          bytes.length
        )
      );

    binary +=
      String.fromCharCode(
        ...chunk
      );
  }

  return btoa(
    binary
  );
}


function textToBase64(
  text: string
): string {
  return bytesToBase64(
    new TextEncoder()
      .encode(text)
  );
}


function bindingsFor(
  draft: EvidenceDraft
):
  DDTRecorderEvidenceBinding[] |
  undefined {
  const bindings:
    DDTRecorderEvidenceBinding[] =
      [];

  if (
    draft.semanticContext
  ) {
    bindings.push(
      "SEMANTIC_CONTEXT"
    );
  }

  if (
    draft.actorAuthority
  ) {
    bindings.push(
      "ACTOR_AUTHORITY"
    );
  }

  return bindings.length
    ? bindings
    : undefined;
}


function toRecorderEvidence(
  draft: EvidenceDraft
):
  DDTRecorderEvidenceInput |
  null {
  if (
    draft.status !==
      "READY" ||
    !draft.name.trim() ||
    !draft.mediaType.trim() ||
    !draft.contentBase64
  ) {
    return null;
  }

  return {
    name:
      draft.name.trim(),

    mediaType:
      draft.mediaType.trim(),

    contentBase64:
      draft.contentBase64,

    role:
      draft.role,

    ...(draft
      .evidenceClass
      .trim()
      ? {
          evidenceClass:
            draft
              .evidenceClass
              .trim(),
        }
      : {}),

    ...(bindingsFor(
      draft
    )
      ? {
          bindings:
            bindingsFor(
              draft
            ),
        }
      : {}),
  };
}


export function mergeRecorderEvidence(
  input:
    DDTRecorderInput,

  additionalEvidence:
    DDTRecorderEvidenceInput[]
): DDTRecorderInput {
  const evidence = [
    ...input.evidence,
    ...additionalEvidence,
  ];

  if (
    evidence.length >
    20
  ) {
    throw new Error(
      "A Recorder submission may contain at most 20 evidence items."
    );
  }

  return {
    ...input,
    evidence,
  };
}


export default function EvidenceEditor({
  value,
  onChange,
}: {
  value:
    DDTRecorderEvidenceInput[];

  onChange: (
    evidence:
      DDTRecorderEvidenceInput[]
  ) => void;
}) {
  const [
    drafts,
    setDrafts,
  ] =
    useState<
      EvidenceDraft[]
    >([]);


  function publish(
    next:
      EvidenceDraft[]
  ) {
    setDrafts(
      next
    );

    onChange(
      next
        .map(
          toRecorderEvidence
        )
        .filter(
          (
            item
          ): item is
            DDTRecorderEvidenceInput =>
              item !== null
        )
    );
  }


  function updateDraft(
    index: number,
    patch:
      Partial<EvidenceDraft>
  ) {
    const next =
      drafts.map(
        (
          item,
          itemIndex
        ) =>
          itemIndex ===
          index
            ? {
                ...item,
                ...patch,
              }
            : item
      );

    publish(
      next
    );
  }


  function addEvidence() {
    if (
      drafts.length >=
      19
    ) {
      return;
    }

    publish([
      ...drafts,
      newDraft(),
    ]);
  }


  function removeEvidence(
    index: number
  ) {
    publish(
      drafts.filter(
        (
          _item,
          itemIndex
        ) =>
          itemIndex !==
          index
      )
    );
  }


  function changeMode(
    index: number,
    mode: EvidenceMode
  ) {
    updateDraft(
      index,
      {
        mode,

        mediaType:
          mode === "JSON"
            ? "application/json"
            : mode ===
                "TEXT"
              ? "text/plain"
              : "application/octet-stream",

        textContent: "",
        contentBase64: "",
        status:
          "EMPTY",
        error: "",
      }
    );
  }


  function updateTextContent(
    index: number,
    value: string,
    mode: EvidenceMode
  ) {
    if (!value) {
      updateDraft(
        index,
        {
          textContent:
            value,
          contentBase64:
            "",
          status:
            "EMPTY",
          error:
            "",
        }
      );

      return;
    }

    if (
      mode === "JSON"
    ) {
      try {
        JSON.parse(
          value
        );
      } catch {
        updateDraft(
          index,
          {
            textContent:
              value,
            contentBase64:
              "",
            status:
              "ERROR",
            error:
              "JSON content is not valid JSON.",
          }
        );

        return;
      }
    }

    updateDraft(
      index,
      {
        textContent:
          value,

        contentBase64:
          textToBase64(
            value
          ),

        status:
          "READY",

        error:
          "",
      }
    );
  }


  async function loadFile(
    index: number,
    file:
      File |
      undefined
  ) {
    if (!file) {
      return;
    }

    try {
      if (
        file.size >
        5 *
          1024 *
          1024
      ) {
        throw new Error(
          "File exceeds the current 5 MB demo evidence limit."
        );
      }

      const bytes =
        new Uint8Array(
          await file
            .arrayBuffer()
        );

      if (
        bytes.length ===
        0
      ) {
        throw new Error(
          "Evidence file is empty."
        );
      }

      updateDraft(
        index,
        {
          name:
            file.name,

          mediaType:
            file.type ||
            "application/octet-stream",

          contentBase64:
            bytesToBase64(
              bytes
            ),

          status:
            "READY",

          error:
            "",
        }
      );
    } catch (
      error: unknown
    ) {
      updateDraft(
        index,
        {
          contentBase64:
            "",

          status:
            "ERROR",

          error:
            error instanceof Error
              ? error.message
              : "Unable to read evidence file.",
        }
      );
    }
  }


  return (
    <section className="mt-8 rounded-2xl border border-slate-700/70 bg-slate-900/35 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-lg font-bold tracking-wide text-amber-200">
            Evidence
          </h4>

          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-300">
            Add files, text or JSON that should be cryptographically
            bound to this DDT Record. The browser converts evidence
            bytes to the Recorder Base64 format automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={
            addEvidence
          }
          disabled={
            drafts.length >=
            19
          }
          className="shrink-0 rounded-xl border border-blue-400/45 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-200 transition hover:border-blue-300 hover:bg-blue-500/20 hover:text-blue-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Add evidence
        </button>
      </div>


      <div className="mt-3 text-xs text-slate-600">
        {value.length} additional evidence item
        {value.length === 1
          ? ""
          : "s"} ready · maximum 19 additional items
      </div>


      {drafts.length ===
      0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-600 bg-slate-950/50 p-5 text-sm leading-relaxed text-slate-400">
          No additional evidence. The form already creates its
          source-submission evidence automatically.
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {drafts.map(
            (
              draft,
              index
            ) => (
              <div
                key={
                  draft.id
                }
                className="rounded-2xl border border-slate-700/80 bg-slate-950/75 p-5 shadow-lg shadow-black/10"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-slate-200">
                      Evidence {index + 1}
                    </div>

                    <div
                      className={
                        draft.status ===
                        "READY"
                          ? "mt-1 text-xs text-emerald-400"
                          : draft.status ===
                              "ERROR"
                            ? "mt-1 text-xs text-red-400"
                            : "mt-1 text-xs text-slate-600"
                      }
                    >
                      {draft.status ===
                      "READY"
                        ? "READY"
                        : draft.status ===
                            "ERROR"
                          ? draft.error
                          : "Waiting for content"}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeEvidence(
                        index
                      )
                    }
                    className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                </div>


                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <Field label="Evidence input">
                    <select
                      value={
                        draft.mode
                      }
                      onChange={
                        event =>
                          changeMode(
                            index,
                            event.target
                              .value as
                              EvidenceMode
                          )
                      }
                      className={inputClass}
                    >
                      <option value="FILE">
                        File
                      </option>

                      <option value="TEXT">
                        Text
                      </option>

                      <option value="JSON">
                        JSON
                      </option>
                    </select>
                  </Field>


                  <Field label="Role">
                    <select
                      value={
                        draft.role
                      }
                      onChange={
                        event =>
                          updateDraft(
                            index,
                            {
                              role:
                                event
                                  .target
                                  .value as
                                  DDTRecorderEvidenceRole,
                            }
                          )
                      }
                      className={inputClass}
                    >
                      {roles.map(
                        role => (
                          <option
                            key={
                              role.value
                            }
                            value={
                              role.value
                            }
                          >
                            {role.label}
                          </option>
                        )
                      )}
                    </select>
                  </Field>


                  {draft.mode ===
                  "FILE" ? (
                    <div className="md:col-span-2">
                      <Field label="File">
                        <input
                          type="file"
                          onChange={
                            event =>
                              void loadFile(
                                index,
                                event.target
                                  .files?.[0]
                              )
                          }
                          className="block w-full rounded-xl border border-slate-600 bg-slate-900/90 px-4 py-3 text-sm text-slate-200 shadow-inner shadow-black/20 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-500/15 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-300 hover:border-slate-500"
                        />
                      </Field>
                    </div>
                  ) : (
                    <div className="md:col-span-2">
                      <Field
                        label={
                          draft.mode ===
                          "JSON"
                            ? "JSON content"
                            : "Text content"
                        }
                      >
                        <textarea
                          rows={6}
                          value={
                            draft.textContent
                          }
                          onChange={
                            event =>
                              updateTextContent(
                                index,
                                event.target
                                  .value,
                                draft.mode
                              )
                          }
                          placeholder={
                            draft.mode ===
                            "JSON"
                              ? '{"example":"value"}'
                              : "Evidence text..."
                          }
                          className={`${inputClass} font-mono text-sm`}
                        />
                      </Field>
                    </div>
                  )}


                  <Field label="Name">
                    <input
                      value={
                        draft.name
                      }
                      onChange={
                        event =>
                          updateDraft(
                            index,
                            {
                              name:
                                event
                                  .target
                                  .value,
                            }
                          )
                      }
                      placeholder="policy.json, report.pdf, observation.txt..."
                      className={inputClass}
                    />
                  </Field>


                  <Field label="Media type">
                    <input
                      value={
                        draft.mediaType
                      }
                      onChange={
                        event =>
                          updateDraft(
                            index,
                            {
                              mediaType:
                                event
                                  .target
                                  .value,
                            }
                          )
                      }
                      placeholder="application/json"
                      className={inputClass}
                    />
                  </Field>


                  <Field label="Evidence class">
                    <input
                      value={
                        draft.evidenceClass
                      }
                      onChange={
                        event =>
                          updateDraft(
                            index,
                            {
                              evidenceClass:
                                event
                                  .target
                                  .value,
                            }
                          )
                      }
                      placeholder="policy.rulebook, source.document..."
                      className={inputClass}
                    />
                  </Field>


                  <div>
                    <div className="mb-2 text-sm font-semibold tracking-wide text-amber-200/90">
                      Bindings
                    </div>

                    <div className="space-y-2 rounded-xl border border-slate-600 bg-slate-900/90 px-4 py-3 shadow-inner shadow-black/20">
                      <label className="flex items-center gap-3 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={
                            draft
                              .semanticContext
                          }
                          onChange={
                            event =>
                              updateDraft(
                                index,
                                {
                                  semanticContext:
                                    event.target
                                      .checked,
                                }
                              )
                          }
                        />

                        Semantic context
                      </label>

                      <label className="flex items-center gap-3 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={
                            draft
                              .actorAuthority
                          }
                          onChange={
                            event =>
                              updateDraft(
                                index,
                                {
                                  actorAuthority:
                                    event.target
                                      .checked,
                                }
                              )
                          }
                        />

                        Actor authority
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </section>
  );
}


function Field({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-semibold tracking-wide text-amber-200/90">
        {label}
      </div>

      {children}
    </label>
  );
}


const inputClass =
  "w-full rounded-xl border border-slate-600 bg-slate-900/90 px-4 py-3 font-medium text-slate-50 shadow-inner shadow-black/20 outline-none transition-all placeholder:font-normal placeholder:text-slate-500 hover:border-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20";
