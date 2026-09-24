"use client";

import {
  useMemo,
  useState,
} from "react";

import type {
  DDTRecorderInput,
  DDTRecorderSourceType,
} from "@/lib/ddt-recorder/ingest/types";

import type {
  DDTJsonValue,
} from "@/lib/ddt-recorder/producer/canonical";

import RecorderPreview from "./RecorderPreview";

type ExtractedDocument = {
  name: string;
  mediaType: string;
  byteLength: number;
  kind:
    | "pdf"
    | "docx"
    | "text"
    | "json";
};

type ExtractionResult = {
  status: "EXTRACTED";
  document: ExtractedDocument;
  extraction: {
    text: string;
    characterCount: number;
  };
};

type DocumentDraft = {
  recordType: string;
  publisherName: string;
  subjectReference: string;
  sourceType: DDTRecorderSourceType;
  sourceReference: string;
  systemName: string;
  version: string;
  eventTime: string;
  actorIdentityRef: string;
  actorRole: string;
  description: string;
  previousDDTNumber: string;
};

const initialDraft: DocumentDraft = {
  recordType: "",
  publisherName: "",
  subjectReference: "",
  sourceType: "OTHER",
  sourceReference: "",
  systemName: "",
  version: "",
  eventTime: "",
  actorIdentityRef: "",
  actorRole: "",
  description: "",
  previousDDTNumber: "",
};

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-blue-400";

function normalizeKey(
  value: string
): string {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      ""
    );
}

function flattenJson(
  value: unknown,
  result:
    Map<string, string>,
  prefix = ""
) {
  if (
    value === null ||
    value === undefined
  ) {
    return;
  }

  if (
    typeof value ===
      "string" ||
    typeof value ===
      "number" ||
    typeof value ===
      "boolean"
  ) {
    if (prefix) {
      result.set(
        normalizeKey(prefix),
        String(value)
      );

      const last =
        prefix
          .split(".")
          .pop();

      if (last) {
        const normalizedLast =
          normalizeKey(last);

        if (
          !result.has(
            normalizedLast
          )
        ) {
          result.set(
            normalizedLast,
            String(value)
          );
        }
      }
    }

    return;
  }

  if (
    Array.isArray(value)
  ) {
    value.forEach(
      (child, index) => {
        flattenJson(
          child,
          result,
          prefix
            ? `${prefix}.${index}`
            : String(index)
        );
      }
    );

    return;
  }

  if (
    typeof value ===
    "object"
  ) {
    for (
      const [
        key,
        child,
      ] of Object.entries(
        value as Record<
          string,
          unknown
        >
      )
    ) {
      flattenJson(
        child,
        result,
        prefix
          ? `${prefix}.${key}`
          : key
      );
    }
  }
}

function collectLabeledValues(
  text: string,
  kind:
    ExtractedDocument["kind"]
): Map<string, string> {
  const result =
    new Map<
      string,
      string
    >();

  if (
    kind === "json"
  ) {
    try {
      flattenJson(
        JSON.parse(text),
        result
      );
    } catch {
      // Extraction endpoint already validates JSON.
    }
  }

  for (
    const line
    of text.split("\n")
  ) {
    const match =
      line.match(
        /^\s*([A-Za-z][A-Za-z0-9 _./()-]{1,50})\s*[:=]\s*(.+?)\s*$/
      );

    if (!match) {
      continue;
    }

    const key =
      normalizeKey(
        match[1]
      );

    const value =
      match[2].trim();

    if (
      key &&
      value &&
      !result.has(key)
    ) {
      result.set(
        key,
        value
      );
    }
  }

  return result;
}

function pick(
  values:
    Map<string, string>,
  keys: string[]
): string {
  for (
    const key
    of keys
  ) {
    const value =
      values.get(
        normalizeKey(key)
      );

    if (
      value?.trim()
    ) {
      return value.trim();
    }
  }

  return "";
}

function firstMeaningfulText(
  text: string
): string {
  const paragraph =
    text
      .split(/\n\s*\n/)
      .map(
        value =>
          value
            .replace(
              /\s+/g,
              " "
            )
            .trim()
      )
      .find(
        value =>
          value.length >= 20
      ) ??
    text
      .replace(
        /\s+/g,
        " "
      )
      .trim();

  return paragraph
    .slice(
      0,
      700
    )
    .trim();
}

function normalizeEventTime(
  value: string
): string {
  if (!value.trim()) {
    return "";
  }

  const parsed =
    new Date(value);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return "";
  }

  const pad = (
    part: number
  ) =>
    String(part)
      .padStart(2, "0");

  return [
    parsed.getFullYear(),
    "-",
    pad(
      parsed.getMonth() + 1
    ),
    "-",
    pad(
      parsed.getDate()
    ),
    "T",
    pad(
      parsed.getHours()
    ),
    ":",
    pad(
      parsed.getMinutes()
    ),
    ":",
    pad(
      parsed.getSeconds()
    ),
  ].join("");
}

function suggestDraft(
  result:
    ExtractionResult
): DocumentDraft {
  const {
    document,
    extraction,
  } = result;

  const values =
    collectLabeledValues(
      extraction.text,
      document.kind
    );

  const eventId =
    pick(
      values,
      [
        "eventId",
        "event id",
        "recordId",
        "record id",
        "documentId",
        "document id",
        "caseId",
        "case id",
        "ticketId",
        "ticket id",
        "reference",
      ]
    );

  const targetReference =
    pick(
      values,
      [
        "resultCore.target.targetId",
        "target.targetId",
        "targetId",
      ]
    );

  const resultReference =
    pick(
      values,
      [
        "resultCore.resultId",
        "resultId",
        "verificationRequest.requestId",
        "requestId",
      ]
    );

  const publisher =
    pick(
      values,
      [
        "publisher.name",
        "publisher",
        "publisher name",
        "organization",
        "organisation",
        "company",
        "project",
        "project name",
        "system",
        "system name",
      ]
    );

  const sourceReference =
    pick(
      values,
      [
        "sourceReference",
        "source reference",
        "sourceId",
        "source id",
      ]
    ) ||
    resultReference ||
    eventId;

  const standard =
    pick(
      values,
      [
        "specification.standard",
        "standard",
      ]
    );

  const summaryStatus =
    pick(
      values,
      [
        "resultCore.summary.status",
        "summary.status",
        "status",
      ]
    );

  const explicitDescription =
    pick(
      values,
      [
        "description",
        "title",
      ]
    );

  const structuredDescription =
    document.kind === "json"
      ? [
          standard,
          summaryStatus
            ? `status ${summaryStatus}`
            : "",
          targetReference
            ? `target ${targetReference}`
            : "",
        ]
          .filter(Boolean)
          .join(" · ")
      : "";

  const description =
    explicitDescription ||
    structuredDescription ||
    firstMeaningfulText(
      extraction.text
    );

  const systemName =
    pick(
      values,
      [
        "systemName",
        "system name",
        "source.systemName",
        "resultCore.verifier.implementation.artifactId",
        "verifier.implementation.artifactId",
      ]
    ) ||
    publisher ||
    document.name;

  return {
    recordType:
      pick(
        values,
        [
          "recordType",
          "record type",
          "eventType",
          "event type",
          "specification.standard",
          "standard",
        ]
      ) ||
      "document_record",

    publisherName:
      publisher ||
      document.name,

    subjectReference:
      targetReference ||
      eventId ||
      document.name,

    sourceType:
      "OTHER",

    sourceReference:
      sourceReference ||
      document.name,

    systemName,

    version:
      pick(
        values,
        [
          "specification.version",
          "resultCore.verifier.implementation.version",
          "sourceVersion",
          "source version",
          "version",
        ]
      ),

    eventTime:
      normalizeEventTime(
        pick(
          values,
          [
            "resultCore.evaluatedAtClaim",
            "evaluatedAtClaim",
            "proofs.0.createdAtClaim",
            "createdAtClaim",
            "eventTime",
            "event time",
            "timestamp",
            "createdAt",
            "created at",
            "occurredAt",
            "occurred at",
            "date",
          ]
        )
      ),

    actorIdentityRef:
      pick(
        values,
        [
          "actor.identityRef",
          "actor",
          "actorId",
          "actor id",
          "user",
          "userId",
          "user id",
          "agent",
          "agentId",
          "agent id",
          "operator",
          "author",
          "approver",
        ]
      ),

    actorRole:
      pick(
        values,
        [
          "actor.role",
          "actorRole",
          "actor role",
          "role",
        ]
      ),

    description,

    previousDDTNumber:
      pick(
        values,
        [
          "previousDDTNumber",
          "previous ddt number",
        ]
      ),
  };
}

async function fileToBase64(
  file: File
): Promise<string> {
  const bytes =
    new Uint8Array(
      await file.arrayBuffer()
    );

  let binary = "";

  const chunkSize =
    0x8000;

  for (
    let offset = 0;
    offset < bytes.length;
    offset += chunkSize
  ) {
    binary +=
      String.fromCharCode(
        ...bytes.subarray(
          offset,
          Math.min(
            offset +
              chunkSize,
            bytes.length
          )
        )
      );
  }

  return btoa(binary);
}

function requireText(
  value: string,
  label: string
): string {
  const trimmed =
    value.trim();

  if (!trimmed) {
    throw new Error(
      `${label} is required.`
    );
  }

  return trimmed;
}

export default function DocumentUploadForm() {
  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    extraction,
    setExtraction,
  ] =
    useState<
      ExtractionResult |
      null
    >(null);

  const [
    draft,
    setDraft,
  ] =
    useState<DocumentDraft>(
      initialDraft
    );

  const [
    previewInput,
    setPreviewInput,
  ] =
    useState<
      DDTRecorderInput |
      null
    >(null);

  const [
    status,
    setStatus,
  ] =
    useState<
      | {
          ok: true;
          message: string;
        }
      | {
          ok: false;
          message: string;
        }
      | null
    >(null);

  const [
    reading,
    setReading,
  ] =
    useState(false);

  const requiredComplete =
    useMemo(
      () =>
        Boolean(
          file &&
          extraction &&
          draft.recordType
            .trim() &&
          draft.publisherName
            .trim() &&
          draft.subjectReference
            .trim() &&
          draft.sourceReference
            .trim() &&
          draft.eventTime
            .trim() &&
          draft.description
            .trim()
        ),
      [
        file,
        extraction,
        draft,
      ]
    );

  function update<
    K extends keyof DocumentDraft
  >(
    field: K,
    value:
      DocumentDraft[K]
  ) {
    setDraft(
      current => ({
        ...current,
        [field]:
          value,
      })
    );

    setPreviewInput(
      null
    );

    setStatus(
      null
    );
  }

  async function readDocument() {
    if (!file) {
      setStatus({
        ok: false,
        message:
          "Choose a document first.",
      });
      return;
    }

    setReading(true);
    setStatus(null);
    setPreviewInput(null);

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file
      );

      const response =
        await fetch(
          "/api/ddt-recorder/document",
          {
            method:
              "POST",
            body:
              formData,
          }
        );

      const body =
        await response.json() as
          | ExtractionResult
          | {
              status:
                "ERROR";
              error:
                string;
            };

      if (
        !response.ok ||
        body.status !==
          "EXTRACTED"
      ) {
        throw new Error(
          "error" in body
            ? body.error
            : "Document extraction failed."
        );
      }

      setExtraction(body);

      setDraft(
        suggestDraft(
          body
        )
      );

      setStatus({
        ok: true,
        message:
          "Document read successfully. Review the suggested mapping before creating the DDT Record.",
      });
    } catch (
      error: unknown
    ) {
      setExtraction(
        null
      );

      setDraft(
        initialDraft
      );

      setStatus({
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to read this document.",
      });
    } finally {
      setReading(
        false
      );
    }
  }

  async function buildPreview() {
    try {
      if (
        !file ||
        !extraction
      ) {
        throw new Error(
          "Read the document before creating the Recorder mapping."
        );
      }

      const eventTime =
        requireText(
          draft.eventTime,
          "Event time"
        );

      const parsedTime =
        new Date(
          eventTime
        );

      if (
        Number.isNaN(
          parsedTime.getTime()
        )
      ) {
        throw new Error(
          "Event time is invalid."
        );
      }

      const payload: Record<
        string,
        DDTJsonValue
      > = {
        document: {
          name:
            extraction
              .document.name,

          mediaType:
            extraction
              .document
              .mediaType,

          byteLength:
            extraction
              .document
              .byteLength,

          kind:
            extraction
              .document.kind,

          extractedCharacterCount:
            extraction
              .extraction
              .characterCount,
        },
      };

      if (
        extraction
          .document.kind ===
        "json"
      ) {
        try {
          payload.documentContent =
            JSON.parse(
              extraction
                .extraction
                .text
            ) as DDTJsonValue;
        } catch {
          // Server already validated JSON;
          // keep metadata-only payload if parsing unexpectedly fails.
        }
      }

      const request:
        DDTRecorderInput = {
          recordType:
            requireText(
              draft.recordType,
              "Record type"
            ),

          publisher: {
            name:
              requireText(
                draft.publisherName,
                "Publisher"
              ),
          },

          subject: {
            reference:
              requireText(
                draft.subjectReference,
                "Subject reference"
              ),
          },

          source: {
            type:
              draft.sourceType,

            reference:
              requireText(
                draft.sourceReference,
                "Source reference"
              ),

            ...(draft
              .systemName
              .trim()
              ? {
                  systemName:
                    draft
                      .systemName
                      .trim(),
                }
              : {}),

            ...(draft
              .version
              .trim()
              ? {
                  version:
                    draft
                      .version
                      .trim(),
                }
              : {}),
          },

          eventTime:
            parsedTime
              .toISOString(),

          ...(draft
            .actorIdentityRef
            .trim() ||
          draft
            .actorRole
            .trim()
            ? {
                actor: {
                  ...(draft
                    .actorIdentityRef
                    .trim()
                    ? {
                        identityRef:
                          draft
                            .actorIdentityRef
                            .trim(),
                      }
                    : {}),

                  ...(draft
                    .actorRole
                    .trim()
                    ? {
                        role:
                          draft
                            .actorRole
                            .trim(),
                      }
                    : {}),
                },
              }
            : {}),

          description:
            requireText(
              draft.description,
              "Description"
            ),

          payload,

          evidence: [
            {
              name:
                file.name,

              mediaType:
                file.type ||
                extraction
                  .document
                  .mediaType ||
                "application/octet-stream",

              contentBase64:
                await fileToBase64(
                  file
                ),

              role:
                "SOURCE_PAYLOAD",

              evidenceClass:
                "document.upload",
            },
          ],

          ...(draft
            .previousDDTNumber
            .trim()
            ? {
                previousDDTNumber:
                  draft
                    .previousDDTNumber
                    .trim(),
              }
            : {}),
        };

      setPreviewInput(
        request
      );

      setStatus({
        ok: true,
        message:
          "Document mapping is ready. Review the Recorder Preview before registration.",
      });
    } catch (
      error: unknown
    ) {
      setPreviewInput(
        null
      );

      setStatus({
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to create Recorder mapping.",
      });
    }
  }

  return (
    <div className="mt-8 rounded-3xl border border-slate-700/80 bg-slate-950/80 p-6 shadow-xl shadow-black/15 md:p-8">
      <div className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">
          Document ingestion pilot
        </div>

        <h3 className="mt-2 text-2xl font-bold tracking-tight text-amber-200">
          Upload Your Document
        </h3>

        <p className="mt-3 max-w-4xl leading-relaxed text-slate-300">
          Upload an existing PDF, DOCX, TXT, MD, CSV or JSON document.
          The Recorder reads the document, proposes a DDT mapping and
          preserves the original file as cryptographically bound evidence.
        </p>

        <p className="mt-2 max-w-4xl text-sm leading-relaxed text-slate-400">
          Suggested values are not treated as truth. Review and correct
          the mapping before registration.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-900/55 p-5">
        <label className="block text-sm font-semibold text-slate-200">
          Document
        </label>

        <input
          type="file"
          accept=".pdf,.docx,.txt,.md,.markdown,.csv,.json,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/*,application/json"
          onChange={
            event => {
              const next =
                event.target
                  .files?.[0] ??
                null;

              setFile(next);
              setExtraction(null);
              setDraft(initialDraft);
              setPreviewInput(null);
              setStatus(null);
            }
          }
          className="mt-3 block w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-500/15 file:px-4 file:py-2 file:font-semibold file:text-blue-200"
        />

        {file && (
          <div className="mt-3 text-sm text-slate-400">
            {file.name}
            {" · "}
            {file.type ||
              "unknown media type"}
            {" · "}
            {file.size.toLocaleString()}
            {" bytes"}
          </div>
        )}

        <button
          type="button"
          disabled={
            !file ||
            reading
          }
          onClick={
            readDocument
          }
          className="mt-5 rounded-xl border border-blue-400/60 bg-blue-500/15 px-5 py-3 font-semibold text-blue-200 transition hover:border-blue-300 hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {reading
            ? "Reading document..."
            : "Read Document"}
        </button>
      </div>

      {extraction && (
        <>
          <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/45 p-5">
            <div className="font-semibold text-slate-100">
              Extracted source text
            </div>

            <div className="mt-1 text-sm text-slate-400">
              {
                extraction
                  .extraction
                  .characterCount
              }{" "}
              characters extracted from the uploaded source.
            </div>

            <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-slate-800 bg-black/30 p-4 text-xs leading-relaxed text-slate-300">
              {
                extraction
                  .extraction
                  .text
              }
            </pre>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-900/45 p-5">
            <div className="mb-5">
              <div className="font-semibold text-slate-100">
                Suggested Recorder mapping
              </div>

              <div className="mt-1 text-sm leading-relaxed text-slate-400">
                Values found explicitly in the document are used where
                possible. Review every field before registration.
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Record type"
                required
              >
                <input
                  value={
                    draft.recordType
                  }
                  onChange={
                    event =>
                      update(
                        "recordType",
                        event.target.value
                      )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field
                label="Publisher / organization"
                required
              >
                <input
                  value={
                    draft.publisherName
                  }
                  onChange={
                    event =>
                      update(
                        "publisherName",
                        event.target.value
                      )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field
                label="Subject reference"
                required
              >
                <input
                  value={
                    draft.subjectReference
                  }
                  onChange={
                    event =>
                      update(
                        "subjectReference",
                        event.target.value
                      )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field
                label="Source reference"
                required
              >
                <input
                  value={
                    draft.sourceReference
                  }
                  onChange={
                    event =>
                      update(
                        "sourceReference",
                        event.target.value
                      )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field
                label="Source class"
                required
              >
                <select
                  value={
                    draft.sourceType
                  }
                  onChange={
                    event =>
                      update(
                        "sourceType",
                        event.target.value as
                          DDTRecorderSourceType
                      )
                  }
                  className={
                    inputClass
                  }
                >
                  {[
                    "HUMAN",
                    "SYSTEM",
                    "DEVICE",
                    "SENSOR",
                    "MODEL",
                    "BLOCKCHAIN_NATIVE",
                    "VERIFIED_EXTERNAL",
                    "ORACLE",
                    "OTHER",
                  ].map(
                    value => (
                      <option
                        key={
                          value
                        }
                        value={
                          value
                        }
                      >
                        {value}
                      </option>
                    )
                  )}
                </select>
              </Field>

              <Field
                label="Event time"
                required
              >
                <input
                  type="datetime-local"
                  step="1"
                  value={
                    draft.eventTime
                  }
                  onChange={
                    event =>
                      update(
                        "eventTime",
                        event.target.value
                      )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="System / source name">
                <input
                  value={
                    draft.systemName
                  }
                  onChange={
                    event =>
                      update(
                        "systemName",
                        event.target.value
                      )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Version">
                <input
                  value={
                    draft.version
                  }
                  onChange={
                    event =>
                      update(
                        "version",
                        event.target.value
                      )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Actor identity">
                <input
                  value={
                    draft.actorIdentityRef
                  }
                  onChange={
                    event =>
                      update(
                        "actorIdentityRef",
                        event.target.value
                      )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Actor role">
                <input
                  value={
                    draft.actorRole
                  }
                  onChange={
                    event =>
                      update(
                        "actorRole",
                        event.target.value
                      )
                  }
                  className={
                    inputClass
                  }
                />
              </Field>

              <Field label="Previous DDT Number">
                <input
                  value={
                    draft.previousDDTNumber
                  }
                  onChange={
                    event =>
                      update(
                        "previousDDTNumber",
                        event.target.value
                      )
                  }
                  placeholder="DDT-00000003"
                  className={
                    inputClass
                  }
                />
              </Field>

              <div className="md:col-span-2">
                <Field
                  label="Description"
                  required
                >
                  <textarea
                    rows={5}
                    value={
                      draft.description
                    }
                    onChange={
                      event =>
                        update(
                          "description",
                          event.target.value
                        )
                    }
                    className={
                      inputClass
                    }
                  />
                </Field>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-100">
              <strong>Public Pilot:</strong>{" "}
              Do not upload confidential, personal, secret or regulated
              documents. The original uploaded document becomes
              cryptographically bound evidence and may be included in the
              downloadable Offline Verification Package.
            </div>

            <button
              type="button"
              disabled={
                !requiredComplete
              }
              onClick={
                buildPreview
              }
              className="mt-6 rounded-xl border border-emerald-400/60 bg-emerald-500/15 px-5 py-3 font-semibold text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Create Recorder Preview
            </button>
          </div>
        </>
      )}

      {status && (
        <div
          className={
            status.ok
              ? "mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
              : "mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
          }
        >
          {status.message}
        </div>
      )}

      <RecorderPreview
        input={
          previewInput
        }
      />
    </div>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children:
    React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-300">
      {label}
      {required && (
        <span className="ml-1 text-amber-300">
          *
        </span>
      )}

      {children}
    </label>
  );
}
