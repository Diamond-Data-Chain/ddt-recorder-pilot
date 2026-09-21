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


type TemplateField = {
  key: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
};


type TemplateDefinition = {
  label: string;
  description: string;
  defaultSourceType: DDTRecorderSourceType;
  fields: TemplateField[];
};


const TEMPLATES: Record<
  string,
  TemplateDefinition
> = {
  "General Enterprise": {
    label:
      "General Enterprise",

    description:
      "Record a consequential enterprise event without forcing it into a specific industry model.",

    defaultSourceType:
      "SYSTEM",

    fields: [
      {
        key: "businessContext",
        label: "Business context",
        placeholder:
          "Relevant business context",
        multiline: true,
      },
      {
        key: "ruleOrPolicy",
        label: "Rule / policy",
        placeholder:
          "Applicable rule, policy or procedure",
        multiline: true,
      },
      {
        key: "decision",
        label: "Decision",
        placeholder:
          "Decision or determination",
        multiline: true,
      },
      {
        key: "action",
        label: "Action / execution",
        placeholder:
          "What action was taken?",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder:
          "Observed result or outcome",
        multiline: true,
      },
    ],
  },


  "AI Decision": {
    label:
      "AI Decision",

    description:
      "Record an AI or model-assisted decision, its context, human review, execution and outcome.",

    defaultSourceType:
      "MODEL",

    fields: [
      {
        key: "inputContext",
        label: "Input / context",
        placeholder:
          "What information did the model receive?",
        multiline: true,
      },
      {
        key: "recommendation",
        label: "Recommendation / output",
        placeholder:
          "Model recommendation or output",
        multiline: true,
      },
      {
        key: "confidence",
        label: "Confidence / score",
        placeholder:
          "0.91",
      },
      {
        key: "policy",
        label: "Policy / decision rule",
        placeholder:
          "Applicable policy or decision rule",
        multiline: true,
      },
      {
        key: "humanReview",
        label: "Human review",
        placeholder:
          "Reviewer decision, override or N/A",
        multiline: true,
      },
      {
        key: "execution",
        label: "Execution / action",
        placeholder:
          "What was actually executed?",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder:
          "Observed outcome",
        multiline: true,
      },
    ],
  },


  "Healthcare": {
    label:
      "Healthcare",

    description:
      "Record a selected healthcare event, observation, applicable protocol, decision, action and outcome.",

    defaultSourceType:
      "SYSTEM",

    fields: [
      {
        key: "caseReference",
        label: "Case / reference",
        placeholder:
          "CASE-2026-001",
      },
      {
        key: "procedure",
        label: "Event / procedure",
        placeholder:
          "Procedure or workflow event",
      },
      {
        key: "observation",
        label: "Observation",
        placeholder:
          "Relevant recorded observation",
        multiline: true,
      },
      {
        key: "protocol",
        label: "Applicable protocol",
        placeholder:
          "Protocol, policy or procedure",
        multiline: true,
      },
      {
        key: "decision",
        label: "Decision",
        placeholder:
          "Recorded decision",
        multiline: true,
      },
      {
        key: "action",
        label: "Action",
        placeholder:
          "Recorded action",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder:
          "Recorded outcome",
        multiline: true,
      },
    ],
  },


  "Energy": {
    label:
      "Energy",

    description:
      "Record an energy-system event involving a site, asset, measurement, rule, decision, action and result.",

    defaultSourceType:
      "DEVICE",

    fields: [
      {
        key: "siteAsset",
        label: "Site / asset",
        placeholder:
          "Substation-04 / Turbine-2",
      },
      {
        key: "deviceMeter",
        label: "Device / meter",
        placeholder:
          "METER-104",
      },
      {
        key: "measurementEvent",
        label: "Measurement / event",
        placeholder:
          "VOLTAGE_THRESHOLD_EXCEEDED",
      },
      {
        key: "observedValue",
        label: "Observed value",
        placeholder:
          "253 V",
      },
      {
        key: "thresholdRule",
        label: "Threshold / rule",
        placeholder:
          "Maximum 250 V",
        multiline: true,
      },
      {
        key: "decision",
        label: "Decision",
        placeholder:
          "ISOLATE / CONTINUE / ESCALATE",
      },
      {
        key: "action",
        label: "Action",
        placeholder:
          "Action executed",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder:
          "Observed result",
        multiline: true,
      },
    ],
  },


  "Manufacturing": {
    label:
      "Manufacturing",

    description:
      "Record a manufacturing process event, measured values, quality rule, decision and production outcome.",

    defaultSourceType:
      "SYSTEM",

    fields: [
      {
        key: "plantLine",
        label: "Plant / line / machine",
        placeholder:
          "Plant-1 / Line-4 / CNC-02",
      },
      {
        key: "workOrderBatch",
        label: "Work order / batch",
        placeholder:
          "BATCH-2026-991",
      },
      {
        key: "processEvent",
        label: "Process event",
        placeholder:
          "FINAL_INSPECTION",
      },
      {
        key: "measuredValues",
        label: "Measured values",
        placeholder:
          "Tolerance, temperature, quantity...",
        multiline: true,
      },
      {
        key: "qualityRule",
        label: "Quality rule",
        placeholder:
          "Applicable specification or quality rule",
        multiline: true,
      },
      {
        key: "decision",
        label: "Decision",
        placeholder:
          "ACCEPT / REWORK / REJECT",
      },
      {
        key: "action",
        label: "Action",
        placeholder:
          "Action taken",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder:
          "Final production result",
      },
    ],
  },


  "Finance": {
    label:
      "Finance",

    description:
      "Record a selected financial transaction, risk assessment, applicable rule, decision and outcome.",

    defaultSourceType:
      "SYSTEM",

    fields: [
      {
        key: "accountCase",
        label: "Account / case",
        placeholder:
          "CASE-FIN-001",
      },
      {
        key: "transaction",
        label: "Transaction / request",
        placeholder:
          "Payment, loan, transfer...",
        multiline: true,
      },
      {
        key: "riskAssessment",
        label: "Risk assessment",
        placeholder:
          "Relevant risk assessment",
        multiline: true,
      },
      {
        key: "applicableRule",
        label: "Applicable rule / policy",
        placeholder:
          "Rule, policy or control",
        multiline: true,
      },
      {
        key: "decision",
        label: "Decision",
        placeholder:
          "APPROVE / REJECT / ESCALATE",
      },
      {
        key: "action",
        label: "Action",
        placeholder:
          "Executed action",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder:
          "Observed outcome",
      },
    ],
  },


  "Governance / Compliance": {
    label:
      "Governance / Compliance",

    description:
      "Record a governance or compliance assessment, applicable obligation, decision, remediation and outcome.",

    defaultSourceType:
      "HUMAN",

    fields: [
      {
        key: "obligation",
        label: "Requirement / obligation",
        placeholder:
          "Control, regulation, policy...",
        multiline: true,
      },
      {
        key: "assessment",
        label: "Assessment / finding",
        placeholder:
          "Observed compliance state",
        multiline: true,
      },
      {
        key: "authorityPolicy",
        label: "Authority / policy",
        placeholder:
          "Applicable authority or policy",
        multiline: true,
      },
      {
        key: "decision",
        label: "Decision",
        placeholder:
          "COMPLIANT / NON_COMPLIANT / REVIEW",
      },
      {
        key: "remediation",
        label: "Remediation / action",
        placeholder:
          "Required or executed action",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder:
          "Final state",
      },
    ],
  },


  "Incident": {
    label:
      "Incident",

    description:
      "Record a consequential incident, detected condition, response decision, action and resolution.",

    defaultSourceType:
      "SYSTEM",

    fields: [
      {
        key: "incidentReference",
        label: "Incident reference",
        placeholder:
          "INC-2026-001",
      },
      {
        key: "severity",
        label: "Severity",
        placeholder:
          "LOW / MEDIUM / HIGH / CRITICAL",
      },
      {
        key: "detectedCondition",
        label: "Detected condition",
        placeholder:
          "What happened?",
        multiline: true,
      },
      {
        key: "impact",
        label: "Impact",
        placeholder:
          "Observed or potential impact",
        multiline: true,
      },
      {
        key: "decision",
        label: "Response decision",
        placeholder:
          "Decision taken",
        multiline: true,
      },
      {
        key: "response",
        label: "Response / action",
        placeholder:
          "Response executed",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome / resolution",
        placeholder:
          "Resolved, contained, pending...",
        multiline: true,
      },
    ],
  },


  "Maintenance / Asset": {
    label:
      "Maintenance / Asset",

    description:
      "Record an asset condition, service event, maintenance decision, work performed and result.",

    defaultSourceType:
      "DEVICE",

    fields: [
      {
        key: "asset",
        label: "Asset / equipment",
        placeholder:
          "COMPRESSOR-04",
      },
      {
        key: "serviceEvent",
        label: "Service / maintenance event",
        placeholder:
          "SCHEDULED_SERVICE",
      },
      {
        key: "condition",
        label: "Observed condition",
        placeholder:
          "Condition before maintenance",
        multiline: true,
      },
      {
        key: "maintenanceRule",
        label: "Maintenance rule / schedule",
        placeholder:
          "Service interval or maintenance rule",
        multiline: true,
      },
      {
        key: "decision",
        label: "Decision",
        placeholder:
          "SERVICE / REPLACE / MONITOR",
      },
      {
        key: "action",
        label: "Work performed",
        placeholder:
          "Maintenance work performed",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder:
          "Asset returned to service",
        multiline: true,
      },
    ],
  },


  "Approval / Decision": {
    label:
      "Approval / Decision",

    description:
      "Record a proposal or request, applicable criteria, verdict, execution and final outcome.",

    defaultSourceType:
      "HUMAN",

    fields: [
      {
        key: "request",
        label: "Request / proposal",
        placeholder:
          "What required a decision?",
        multiline: true,
      },
      {
        key: "criteria",
        label: "Criteria / policy",
        placeholder:
          "Applicable decision criteria",
        multiline: true,
      },
      {
        key: "assessment",
        label: "Assessment",
        placeholder:
          "Relevant evaluation",
        multiline: true,
      },
      {
        key: "verdict",
        label: "Verdict",
        placeholder:
          "APPROVED / REJECTED / DEFERRED",
      },
      {
        key: "execution",
        label: "Execution",
        placeholder:
          "What happened after the verdict?",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder:
          "Final observed outcome",
        multiline: true,
      },
    ],
  },


  "Custom": {
    label:
      "Custom",

    description:
      "Generic enterprise record for a case that does not fit a predefined template. Arbitrary custom fields are added in Step 14.",

    defaultSourceType:
      "OTHER",

    fields: [
      {
        key: "context",
        label: "Context",
        placeholder:
          "Relevant context",
        multiline: true,
      },
      {
        key: "decision",
        label: "Decision / output",
        placeholder:
          "Decision or output",
        multiline: true,
      },
      {
        key: "action",
        label: "Action / execution",
        placeholder:
          "Action taken",
        multiline: true,
      },
      {
        key: "outcome",
        label: "Outcome",
        placeholder:
          "Observed result",
        multiline: true,
      },
    ],
  },
};


export const ENTERPRISE_TEMPLATE_NAMES =
  Object.keys(
    TEMPLATES
  );


const sourceTypes: {
  value: DDTRecorderSourceType;
  label: string;
}[] = [
  {
    value: "HUMAN",
    label: "Human",
  },
  {
    value: "SYSTEM",
    label: "System / application",
  },
  {
    value: "MODEL",
    label: "AI / model",
  },
  {
    value: "DEVICE",
    label: "Device",
  },
  {
    value: "SENSOR",
    label: "Sensor / IoT",
  },
  {
    value: "VERIFIED_EXTERNAL",
    label: "Verified external",
  },
  {
    value: "ORACLE",
    label: "Oracle",
  },
  {
    value: "BLOCKCHAIN_NATIVE",
    label: "Blockchain-native",
  },
  {
    value: "OTHER",
    label: "Other",
  },
];


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


export type EnterpriseCustomField = {
  name: string;
  value: string;
};


export type EnterpriseTemplateValues = {
  sourceType:
    DDTRecorderSourceType;

  sourceName:
    string;

  version:
    string;

  recordType:
    string;

  recordReference:
    string;

  eventTime:
    string;

  actor:
    string;

  role:
    string;

  description:
    string;

  previousDDTNumber:
    string;

  fields:
    Record<string, string>;

  customFields:
    EnterpriseCustomField[];
};


export function buildEnterpriseRecorderInput(
  templateName: string,
  values:
    EnterpriseTemplateValues
): DDTRecorderInput {
  const template =
    TEMPLATES[
      templateName
    ];

  if (!template) {
    throw new Error(
      `Unsupported enterprise template: ${templateName}`
    );
  }

  const sourceName =
    required(
      values.sourceName,
      "Source / organization"
    );

  const recordType =
    required(
      values.recordType,
      "Record / event type"
    );

  const recordReference =
    required(
      values.recordReference,
      "Record reference"
    );

  const description =
    required(
      values.description,
      "Description"
    );

  const rawTime =
    required(
      values.eventTime,
      "Event time"
    );

  const parsedTime =
    new Date(
      rawTime
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

  const payload:
    Record<string, string> = {
      template:
        template.label,
  };

  for (
    const field
    of template.fields
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

  /*
   * Flexible enterprise fields deliberately remain UI-level
   * extensions of the generic payload. They do not create a
   * new Recorder schema or protocol.
   */
  const usedPayloadKeys =
    new Set(
      Object.keys(
        payload
      ).map(
        key =>
          key.toLowerCase()
      )
    );

  for (
    const customField
    of values.customFields
  ) {
    const name =
      customField.name.trim();

    const value =
      customField.value.trim();

    if (
      !name &&
      !value
    ) {
      continue;
    }

    if (!name) {
      throw new Error(
        "Custom field name is required when a value is provided."
      );
    }

    if (!value) {
      throw new Error(
        `Custom field "${name}" requires a value.`
      );
    }

    const normalizedName =
      name.toLowerCase();

    if (
      usedPayloadKeys.has(
        normalizedName
      )
    ) {
      throw new Error(
        `Custom field "${name}" duplicates an existing payload field.`
      );
    }

    payload[name] =
      value;

    usedPayloadKeys.add(
      normalizedName
    );
  }

  const archivedSubmission = {
    template:
      template.label,

    sourceType:
      values.sourceType,

    sourceName,

    version:
      values.version.trim() ||
      null,

    recordType,

    recordReference,

    eventTime:
      parsedTime
        .toISOString(),

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
    recordType,

    publisher: {
      name:
        sourceName,
    },

    subject: {
      reference:
        recordReference,
    },

    source: {
      type:
        values.sourceType,

      reference:
        recordReference,

      systemName:
        sourceName,

      ...(values.version.trim()
        ? {
            version:
              values.version
                .trim(),
          }
        : {}),
    },

    eventTime:
      parsedTime
        .toISOString(),

    ...(
      values.actor.trim() ||
      values.role.trim()
        ? {
            actor: {
              ...(values.actor
                .trim()
                ? {
                    identityRef:
                      values.actor
                        .trim(),
                  }
                : {}),

              ...(values.role
                .trim()
                ? {
                    role:
                      values.role
                        .trim(),
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
          `${template.label
            .toLowerCase()
            .replace(
              /[^a-z0-9]+/g,
              "-"
            )}-record.json`,

        mediaType:
          "application/json",

        contentBase64:
          utf8ToBase64(
            JSON.stringify(
              archivedSubmission
            )
          ),

        role:
          "SOURCE_PAYLOAD",

        evidenceClass:
          `enterprise-template.${template.label
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


export default function EnterpriseTemplateForm({
  templateName,
}: {
  templateName: string;
}) {
  const template =
    TEMPLATES[
      templateName
    ];

  const [
    values,
    setValues,
  ] =
    useState<EnterpriseTemplateValues>(
      () => ({
        sourceType:
          template
            ?.defaultSourceType ??
          "OTHER",

        sourceName: "",
        version: "",
        recordType: "",
        recordReference: "",
        eventTime: "",
        actor: "",
        role: "",
        description: "",
        previousDDTNumber: "",
        fields: {},
        customFields: [],
      })
    );

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


  if (!template) {
    return null;
  }


  function setCommon<
    K extends
      keyof Omit<
        EnterpriseTemplateValues,
        "fields" | "customFields"
      >
  >(
    key: K,
    value:
      EnterpriseTemplateValues[K]
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


  function setTemplateField(
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


  function addCustomField() {
    setValues(
      current => ({
        ...current,

        customFields: [
          ...current.customFields,
          {
            name: "",
            value: "",
          },
        ],
      })
    );

    setResult(null);
  }


  function updateCustomField(
    index: number,
    field:
      keyof EnterpriseCustomField,
    value: string
  ) {
    setValues(
      current => ({
        ...current,

        customFields:
          current.customFields.map(
            (
              item,
              itemIndex
            ) =>
              itemIndex ===
              index
                ? {
                    ...item,
                    [field]:
                      value,
                  }
                : item
          ),
      })
    );

    setResult(null);
  }


  function removeCustomField(
    index: number
  ) {
    setValues(
      current => ({
        ...current,

        customFields:
          current.customFields.filter(
            (
              _item,
              itemIndex
            ) =>
              itemIndex !==
              index
          ),
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
          buildEnterpriseRecorderInput(
            templateName,
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
          "Enterprise template did not create source evidence."
        );
      }

      setPreviewInput(
        input
      );

      setResult({
        ok: true,

        message:
          `${template.label} template maps successfully to the existing DDT Recorder core.`,
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
            : "Unable to validate enterprise template.",
      });
    }
  }


  return (
    <div className="mt-8 rounded-3xl border border-slate-700/80 bg-slate-950/80 p-6 shadow-xl shadow-black/15 md:p-8">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">
          Enterprise template
        </div>

        <h3 className="mt-2 text-2xl font-bold tracking-tight text-amber-200">
          {template.label}
        </h3>

        <p className="mt-3 max-w-4xl leading-relaxed text-slate-300">
          {template.description}
        </p>
      </div>


      <div className="mt-8 grid gap-5 rounded-2xl border border-slate-700/70 bg-slate-900/35 p-5 md:grid-cols-2">
        <Field label="Source class">
          <select
            value={
              values.sourceType
            }
            onChange={
              event =>
                setCommon(
                  "sourceType",
                  event.target
                    .value as
                    DDTRecorderSourceType
                )
            }
            className={inputClass}
          >
            {sourceTypes.map(
              option => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {option.label}
                </option>
              )
            )}
          </select>
        </Field>


        <Field label="Source / organization">
          <input
            value={
              values.sourceName
            }
            onChange={
              event =>
                setCommon(
                  "sourceName",
                  event.target.value
                )
            }
            placeholder="Organization, application, department..."
            className={inputClass}
          />
        </Field>


        <Field label="Source version">
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


        <Field label="Record / event type">
          <input
            value={
              values.recordType
            }
            onChange={
              event =>
                setCommon(
                  "recordType",
                  event.target.value
                )
            }
            placeholder="Example: DECISION_EXECUTED"
            className={inputClass}
          />
        </Field>


        <Field label="Record reference">
          <input
            value={
              values.recordReference
            }
            onChange={
              event =>
                setCommon(
                  "recordReference",
                  event.target.value
                )
            }
            placeholder="Unique case or source-event reference"
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
                    event.currentTarget
                      .value
                  )
              }
              onInput={
                event =>
                  setCommon(
                    "eventTime",
                    event.currentTarget
                      .value
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


        <Field label="Actor / responsible component">
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
            placeholder="Person, service, model, machine..."
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
            placeholder="APPROVER, OPERATOR, MODEL..."
            className={inputClass}
          />
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


        <div className="md:col-span-2">
          <Field label="Description">
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
              placeholder="Describe this specific consequential record or event."
              className={inputClass}
            />
          </Field>
        </div>
      </div>


      <div className="mt-8 rounded-2xl border border-slate-700/70 bg-slate-900/35 p-5">
        <h4 className="text-lg font-bold tracking-wide text-amber-200">
          {template.label} data
        </h4>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          {template.fields.map(
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
                          setTemplateField(
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
                          setTemplateField(
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


      <div className="mt-8 rounded-2xl border border-slate-700/70 bg-slate-900/35 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-lg font-bold tracking-wide text-amber-200">
              Flexible custom fields
            </h4>

            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-slate-400">
              Add domain-specific data that is not covered by this template.
              Custom fields are stored in the same generic DDT payload and
              do not change the Recorder protocol.
            </p>
          </div>

          <button
            type="button"
            onClick={
              addCustomField
            }
            className="shrink-0 rounded-xl border border-blue-400/45 bg-blue-500/10 px-4 py-2.5 text-sm font-semibold text-blue-200 transition hover:border-blue-300 hover:bg-blue-500/20 hover:text-blue-100"
          >
            + Add field
          </button>
        </div>


        {values.customFields.length ===
        0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-600 bg-slate-950/50 p-5 text-sm leading-relaxed text-slate-400">
            No additional custom fields.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {values.customFields.map(
              (
                customField,
                index
              ) => (
                <div
                  key={
                    index
                  }
                  className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-[1fr_1fr_auto]"
                >
                  <label className="block">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Field name
                    </div>

                    <input
                      value={
                        customField.name
                      }
                      onChange={
                        event =>
                          updateCustomField(
                            index,
                            "name",
                            event.target.value
                          )
                      }
                      placeholder="Machine, Temperature, Batch..."
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Value
                    </div>

                    <input
                      value={
                        customField.value
                      }
                      onChange={
                        event =>
                          updateCustomField(
                            index,
                            "value",
                            event.target.value
                          )
                      }
                      placeholder="CNC-04, 91.4, B-991..."
                      className={inputClass}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() =>
                      removeCustomField(
                        index
                      )
                    }
                    className="self-end rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 text-sm text-red-300 transition hover:bg-red-500/10"
                  >
                    Remove
                  </button>
                </div>
              )
            )}
          </div>
        )}
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
          Validate {template.label} Mapping
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
