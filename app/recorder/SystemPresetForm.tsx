"use client";

import {
  useState,
} from "react";

import type {
  DDTRecorderEvidenceInput,
  DDTRecorderInput,
  DDTRecorderSourceType,
} from "@/lib/ddt-recorder/ingest/types";

import EvidenceEditor, {
  mergeRecorderEvidence,
} from "./EvidenceEditor";

import RecorderPreview from "./RecorderPreview";


type PresetField = {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
};


type PresetDefinition = {
  label: string;
  sourceType: DDTRecorderSourceType;
  description: string;
  fields: PresetField[];
};


const PRESETS: Record<
  string,
  PresetDefinition
> = {
  ERP: {
    label: "ERP",
    sourceType: "SYSTEM",
    description:
      "Record a business transaction, approval, order or other consequential ERP event.",
    fields: [
      {
        key: "transactionReference",
        label: "Order / transaction",
        placeholder: "PO-2026-00192",
      },
      {
        key: "businessEvent",
        label: "Business event",
        placeholder: "PURCHASE_ORDER_APPROVED",
      },
      {
        key: "ruleApproval",
        label: "Rule / approval",
        placeholder: "Approval policy or business rule",
        multiline: true,
      },
      {
        key: "decision",
        label: "Decision",
        placeholder: "APPROVED",
      },
      {
        key: "execution",
        label: "Execution",
        placeholder: "Order released to supplier",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder: "SUCCESS",
      },
    ],
  },

  MES: {
    label: "MES",
    sourceType: "SYSTEM",
    description:
      "Record a manufacturing execution event, work order, process decision or production result.",
    fields: [
      {
        key: "workOrder",
        label: "Work order / batch",
        placeholder: "WO-2026-031",
      },
      {
        key: "processEvent",
        label: "Process event",
        placeholder: "BATCH_COMPLETED",
      },
      {
        key: "machine",
        label: "Machine / line",
        placeholder: "LINE-4 / CNC-02",
      },
      {
        key: "measuredResult",
        label: "Measured result",
        placeholder: "Temperature, tolerance, quantity...",
        multiline: true,
      },
      {
        key: "decision",
        label: "Decision",
        placeholder: "ACCEPT / HOLD / REJECT",
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder: "Batch released",
      },
    ],
  },

  SIEM: {
    label: "SIEM",
    sourceType: "SYSTEM",
    description:
      "Record a selected security alert, rule evaluation, response and outcome.",
    fields: [
      {
        key: "alertId",
        label: "Alert ID",
        placeholder: "ALERT-884102",
      },
      {
        key: "rule",
        label: "Rule",
        placeholder: "Impossible travel / privilege escalation...",
      },
      {
        key: "severity",
        label: "Severity",
        placeholder: "HIGH",
      },
      {
        key: "observedEvent",
        label: "Observed event",
        placeholder: "Describe what the SIEM observed",
        multiline: true,
      },
      {
        key: "decision",
        label: "Decision",
        placeholder: "ESCALATE / BLOCK / IGNORE",
      },
      {
        key: "response",
        label: "Response / action",
        placeholder: "Account disabled, ticket created...",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder: "CONTAINED",
      },
    ],
  },

  QMS: {
    label: "QMS",
    sourceType: "SYSTEM",
    description:
      "Record an inspection, non-conformance, quality decision or corrective action.",
    fields: [
      {
        key: "qualityRecord",
        label: "Quality record",
        placeholder: "NCR-2026-011",
      },
      {
        key: "inspection",
        label: "Inspection / check",
        placeholder: "Final product inspection",
      },
      {
        key: "requirement",
        label: "Requirement / specification",
        placeholder: "QMS rule, tolerance or procedure",
        multiline: true,
      },
      {
        key: "finding",
        label: "Finding",
        placeholder: "Observed condition",
        multiline: true,
      },
      {
        key: "decision",
        label: "Decision",
        placeholder: "ACCEPT / REWORK / REJECT",
      },
      {
        key: "correctiveAction",
        label: "Corrective action",
        placeholder: "Action taken",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder: "CLOSED",
      },
    ],
  },

  "AI / Model": {
    label: "AI / Model",
    sourceType: "MODEL",
    description:
      "Record an AI/model input, recommendation, decision context, execution and outcome.",
    fields: [
      {
        key: "inputContext",
        label: "Input / context",
        placeholder: "What did the model receive?",
        multiline: true,
      },
      {
        key: "recommendation",
        label: "Recommendation / output",
        placeholder: "APPROVE / REJECT / ESCALATE...",
        multiline: true,
      },
      {
        key: "confidence",
        label: "Confidence / score",
        placeholder: "0.91",
      },
      {
        key: "humanReview",
        label: "Human review",
        placeholder: "Reviewer decision or N/A",
        multiline: true,
      },
      {
        key: "execution",
        label: "Execution / action",
        placeholder: "What was actually executed?",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder: "SUCCESS / FAILED / PENDING",
      },
    ],
  },

  "API / Application": {
    label: "API / Application",
    sourceType: "SYSTEM",
    description:
      "Record a consequential API or application request, response, decision and outcome.",
    fields: [
      {
        key: "endpoint",
        label: "Endpoint / operation",
        placeholder: "/v1/approve",
      },
      {
        key: "method",
        label: "Method",
        placeholder: "POST",
      },
      {
        key: "requestReference",
        label: "Request reference",
        placeholder: "req-88291",
      },
      {
        key: "inputContext",
        label: "Input / context",
        placeholder: "Relevant request data",
        multiline: true,
      },
      {
        key: "response",
        label: "Response / output",
        placeholder: "Relevant response data",
        multiline: true,
      },
      {
        key: "decision",
        label: "Decision",
        placeholder: "APPROVED",
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder: "SUCCESS",
      },
    ],
  },

  "IoT / Sensor": {
    label: "IoT / Sensor",
    sourceType: "SENSOR",
    description:
      "Record a selected sensor/device event, threshold evaluation, action and outcome.",
    fields: [
      {
        key: "deviceId",
        label: "Device / sensor ID",
        placeholder: "sensor-plant-04",
      },
      {
        key: "measurement",
        label: "Measurement / event",
        placeholder: "TEMPERATURE",
      },
      {
        key: "value",
        label: "Observed value",
        placeholder: "91.4 C",
      },
      {
        key: "threshold",
        label: "Threshold / rule",
        placeholder: "> 90 C",
      },
      {
        key: "action",
        label: "Action",
        placeholder: "Cooling system activated",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder: "Temperature normalized",
        multiline: true,
      },
    ],
  },

  "SCADA / Industrial": {
    label: "SCADA / Industrial",
    sourceType: "SYSTEM",
    description:
      "Record an industrial control event, measured state, rule, operator/system action and result.",
    fields: [
      {
        key: "asset",
        label: "Site / asset",
        placeholder: "Substation-04",
      },
      {
        key: "tag",
        label: "Tag / signal",
        placeholder: "PRESSURE.P-104",
      },
      {
        key: "observedValue",
        label: "Observed value",
        placeholder: "8.7 bar",
      },
      {
        key: "threshold",
        label: "Threshold / rule",
        placeholder: "Maximum 8.0 bar",
      },
      {
        key: "action",
        label: "Operator / system action",
        placeholder: "Valve opened",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder: "Pressure restored",
      },
    ],
  },

  "EHR / Healthcare": {
    label: "EHR / Healthcare",
    sourceType: "SYSTEM",
    description:
      "Record a selected healthcare-system event without changing the generic DDT Recorder protocol.",
    fields: [
      {
        key: "caseReference",
        label: "Case / reference",
        placeholder: "CASE-2026-001",
      },
      {
        key: "procedure",
        label: "Event / procedure",
        placeholder: "Procedure or clinical workflow event",
      },
      {
        key: "observation",
        label: "Observation",
        placeholder: "Relevant recorded observation",
        multiline: true,
      },
      {
        key: "protocol",
        label: "Applicable protocol",
        placeholder: "Protocol / policy reference",
        multiline: true,
      },
      {
        key: "decision",
        label: "Decision",
        placeholder: "Recorded decision",
        multiline: true,
      },
      {
        key: "action",
        label: "Action",
        placeholder: "Recorded action",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder: "Recorded outcome",
        multiline: true,
      },
    ],
  },

  "Other / Custom Source": {
    label: "Other / Custom Source",
    sourceType: "OTHER",
    description:
      "Technical fallback for a source that does not fit one of the named presets.",
    fields: [
      {
        key: "sourceCategory",
        label: "Source category",
        placeholder: "Custom platform / external process...",
      },
      {
        key: "context",
        label: "Context",
        placeholder: "Relevant input or context",
        multiline: true,
      },
      {
        key: "decision",
        label: "Decision / output",
        placeholder: "Result produced by the source",
        multiline: true,
      },
      {
        key: "action",
        label: "Action",
        placeholder: "Action taken",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder: "Final observed outcome",
        multiline: true,
      },
    ],
  },
};


function utf8ToBase64(
  value: string
): string {
  const bytes =
    new TextEncoder()
      .encode(value);

  let binary = "";

  for (
    const byte
    of bytes
  ) {
    binary +=
      String.fromCharCode(
        byte
      );
  }

  return btoa(binary);
}


function required(
  value: string,
  label: string
): string {
  const normalized =
    value.trim();

  if (!normalized) {
    throw new Error(
      `${label} is required.`
    );
  }

  return normalized;
}


export function buildPresetRecorderInput(
  presetName: string,
  values: {
    systemName: string;
    version: string;
    eventType: string;
    eventId: string;
    eventTime: string;
    actor: string;
    role: string;
    description: string;
    previousDDTNumber: string;
    fields: Record<
      string,
      string
    >;
  }
): DDTRecorderInput {
  const preset =
    PRESETS[presetName];

  if (!preset) {
    throw new Error(
      `Unsupported system preset: ${presetName}`
    );
  }

  const systemName =
    required(
      values.systemName,
      "System name"
    );

  const eventType =
    required(
      values.eventType,
      "Event type"
    );

  const eventId =
    required(
      values.eventId,
      "Event ID"
    );

  const description =
    required(
      values.description,
      "Event description"
    );

  const rawTime =
    required(
      values.eventTime,
      "Event time"
    );

  const parsedTime =
    new Date(rawTime);

  if (
    Number.isNaN(
      parsedTime.getTime()
    )
  ) {
    throw new Error(
      "Event time is invalid."
    );
  }

  const payload:
    Record<string, string> = {
      preset:
        preset.label,
  };

  for (
    const field
    of preset.fields
  ) {
    const value =
      values.fields[
        field.key
      ]?.trim();

    if (value) {
      payload[field.key] =
        value;
    }
  }

  const archivedSource = {
    preset:
      preset.label,

    sourceType:
      preset.sourceType,

    systemName,

    version:
      values.version.trim() ||
      null,

    eventType,

    eventId,

    eventTime:
      parsedTime.toISOString(),

    actor:
      values.actor.trim() ||
      null,

    role:
      values.role.trim() ||
      null,

    description,

    payload,
  };

  return {
    recordType:
      eventType,

    publisher: {
      name:
        systemName,
    },

    subject: {
      reference:
        eventId,
    },

    source: {
      type:
        preset.sourceType,

      reference:
        eventId,

      systemName,

      ...(values.version.trim()
        ? {
            version:
              values.version.trim(),
          }
        : {}),
    },

    eventTime:
      parsedTime.toISOString(),

    ...(
      values.actor.trim() ||
      values.role.trim()
        ? {
            actor: {
              ...(values.actor.trim()
                ? {
                    identityRef:
                      values.actor.trim(),
                  }
                : {}),

              ...(values.role.trim()
                ? {
                    role:
                      values.role.trim(),
                  }
                : {}),
            },
          }
        : {}
    ),

    description,

    payload,

    evidence: [
      {
        name:
          `${preset.label
            .toLowerCase()
            .replace(
              /[^a-z0-9]+/g,
              "-"
            )}-event.json`,

        mediaType:
          "application/json",

        contentBase64:
          utf8ToBase64(
            JSON.stringify(
              archivedSource
            )
          ),

        role:
          "SOURCE_PAYLOAD",

        evidenceClass:
          `system-preset.${preset.label
            .toLowerCase()
            .replace(
              /[^a-z0-9]+/g,
              "-"
            )}`,
      },
    ],

    ...(values
      .previousDDTNumber
      .trim()
      ? {
          previousDDTNumber:
            values
              .previousDDTNumber
              .trim(),
        }
      : {}),
  };
}


export default function SystemPresetForm({
  presetName,
}: {
  presetName: string;
}) {
  const preset =
    PRESETS[presetName];

  const [
    values,
    setValues,
  ] =
    useState({
      systemName: "",
      version: "",
      eventType: "",
      eventId: "",
      eventTime: "",
      actor: "",
      role: "",
      description: "",
      previousDDTNumber: "",
      fields: {} as Record<
        string,
        string
      >,
    });

  const [
    additionalEvidence,
    setAdditionalEvidence,
  ] =
    useState<
      DDTRecorderEvidenceInput[]
    >([]);


  const [
    previewInput,
    setPreviewInput,
  ] =
    useState<
      DDTRecorderInput |
      null
    >(null);


  const [
    result,
    setResult,
  ] =
    useState<
      | {
          ok: boolean;
          message: string;
        }
      | null
    >(null);


  if (!preset) {
    return null;
  }


  function setCommon(
    key:
      | "systemName"
      | "version"
      | "eventType"
      | "eventId"
      | "eventTime"
      | "actor"
      | "role"
      | "description"
      | "previousDDTNumber",
    value: string
  ) {
    setValues(
      current => ({
        ...current,
        [key]:
          value,
      })
    );

    setResult(null);
  }


  function setPresetField(
    key: string,
    value: string
  ) {
    setValues(
      current => ({
        ...current,
        fields: {
          ...current.fields,
          [key]:
            value,
        },
      })
    );

    setResult(null);
  }


  function useCurrentTime() {
    const now =
      new Date();

    const local =
      new Date(
        now.getTime() -
        now.getTimezoneOffset() *
          60_000
      )
        .toISOString()
        .slice(
          0,
          16
        );

    setCommon(
      "eventTime",
      local
    );
  }


  function validate() {
    try {
      const input =
        mergeRecorderEvidence(
          buildPresetRecorderInput(
            presetName,
            values
          ),
          additionalEvidence
        );

      if (
        !input.evidence.some(
          evidence =>
            evidence.role ===
            "SOURCE_PAYLOAD"
        )
      ) {
        throw new Error(
          "Preset did not produce the required source evidence."
        );
      }

      setPreviewInput(
        input
      );

      setResult({
        ok: true,
        message:
          `${preset.label} preset maps successfully to the existing DDT Recorder core.`,
      });
    } catch (
      error: unknown
    ) {
      setPreviewInput(
        null
      );

      setResult({
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to validate preset mapping.",
      });
    }
  }


  return (
    <div className="mt-8 rounded-3xl border border-slate-700/80 bg-slate-950/80 p-6 shadow-xl shadow-black/15 md:p-8">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">
          System preset
        </div>

        <h3 className="mt-2 text-2xl font-bold tracking-tight text-amber-200">
          {preset.label}
        </h3>

        <p className="mt-3 max-w-4xl leading-relaxed text-slate-300">
          {preset.description}
        </p>
      </div>


      <div className="mt-8 grid gap-5 rounded-2xl border border-slate-700/70 bg-slate-900/35 p-5 md:grid-cols-2">
        <Field label="System name">
          <input
            value={
              values.systemName
            }
            onChange={
              event =>
                setCommon(
                  "systemName",
                  event.target.value
                )
            }
            placeholder="Source system name"
            className={inputClass}
          />
        </Field>

        <Field label="System version">
          <input
            value={
              values.version
            }
            onChange={
              event =>
                setCommon(
                  "version",
                  event.target.value
                )
            }
            placeholder="Optional"
            className={inputClass}
          />
        </Field>

        <Field label="Event type">
          <input
            value={
              values.eventType
            }
            onChange={
              event =>
                setCommon(
                  "eventType",
                  event.target.value
                )
            }
            placeholder="Example: EVENT_APPROVED"
            className={inputClass}
          />
        </Field>

        <Field label="Event ID">
          <input
            value={
              values.eventId
            }
            onChange={
              event =>
                setCommon(
                  "eventId",
                  event.target.value
                )
            }
            placeholder="Unique source event reference"
            className={inputClass}
          />
        </Field>

        <Field label="Event time">
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={
                values.eventTime
              }
              onChange={
                event =>
                  setCommon(
                    "eventTime",
                    event.currentTarget.value
                  )
              }
              onInput={
                event =>
                  setCommon(
                    "eventTime",
                    event.currentTarget.value
                  )
              }
              className={inputClass}
            />

            <button
              type="button"
              onClick={
                useCurrentTime
              }
              className="shrink-0 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300 hover:border-blue-500 hover:text-blue-300"
            >
              Use current time
            </button>
          </div>
        </Field>

        <Field label="Previous DDT Number">
          <input
            value={
              values.previousDDTNumber
            }
            onChange={
              event =>
                setCommon(
                  "previousDDTNumber",
                  event.target.value
                )
            }
            placeholder="Optional: DDT-00000001"
            className={inputClass}
          />
        </Field>

        <Field label="Actor / component">
          <input
            value={
              values.actor
            }
            onChange={
              event =>
                setCommon(
                  "actor",
                  event.target.value
                )
            }
            placeholder="Operator, service, model, device..."
            className={inputClass}
          />
        </Field>

        <Field label="Role">
          <input
            value={
              values.role
            }
            onChange={
              event =>
                setCommon(
                  "role",
                  event.target.value
                )
            }
            placeholder="APPROVER, ENGINE, SENSOR..."
            className={inputClass}
          />
        </Field>

        <div className="md:col-span-2">
          <Field label="Event description">
            <textarea
              rows={3}
              value={
                values.description
              }
              onChange={
                event =>
                  setCommon(
                    "description",
                    event.target.value
                  )
              }
              placeholder="Describe this specific consequential event."
              className={inputClass}
            />
          </Field>
        </div>
      </div>


      <div className="mt-8 rounded-2xl border border-slate-700/70 bg-slate-900/35 p-5">
        <h4 className="text-lg font-bold tracking-wide text-amber-200">
          {preset.label} event data
        </h4>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {preset.fields.map(
            field => (
              <Field
                key={
                  field.key
                }
                label={
                  field.label
                }
              >
                {field.multiline
                  ? (
                    <textarea
                      rows={3}
                      value={
                        values.fields[
                          field.key
                        ] ?? ""
                      }
                      onChange={
                        event =>
                          setPresetField(
                            field.key,
                            event.target.value
                          )
                      }
                      placeholder={
                        field.placeholder
                      }
                      className={inputClass}
                    />
                  )
                  : (
                    <input
                      value={
                        values.fields[
                          field.key
                        ] ?? ""
                      }
                      onChange={
                        event =>
                          setPresetField(
                            field.key,
                            event.target.value
                          )
                      }
                      placeholder={
                        field.placeholder
                      }
                      className={inputClass}
                    />
                  )}
              </Field>
            )
          )}
        </div>
      </div>


      <EvidenceEditor
        value={
          additionalEvidence
        }
        onChange={
          setAdditionalEvidence
        }
      />


      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <button
          type="button"
          onClick={
            validate
          }
          className="rounded-xl border border-blue-400/60 bg-blue-500/15 px-5 py-3 font-semibold text-blue-200 shadow-lg shadow-blue-950/20 transition hover:border-blue-300 hover:bg-blue-500/25 hover:text-blue-100"
        >
          Validate {preset.label} Mapping
        </button>

        {result && (
          <div
            className={
              result.ok
                ? "mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
                : "mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
            }
          >
            {result.message}
          </div>
        )}
      </div>
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
