"use client";

import {
  useMemo,
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


type TestSystemDraft = {
  projectName: string;
  sourceType: DDTRecorderSourceType;
  systemType: string;
  version: string;
  description: string;

  eventType: string;
  eventId: string;
  eventTime: string;

  actorComponent: string;
  role: string;

  inputContext: string;
  decisionOutput: string;
  executionAction: string;
  outcome: string;

  previousDDTNumber: string;
};


const initialDraft: TestSystemDraft = {
  projectName: "",
  sourceType: "SYSTEM",
  systemType: "",
  version: "",
  description: "",

  eventType: "",
  eventId: "",
  eventTime: "",

  actorComponent: "",
  role: "",

  inputContext: "",
  decisionOutput: "",
  executionAction: "",
  outcome: "",

  previousDDTNumber: "",
};


const sourceTypes: {
  value: DDTRecorderSourceType;
  label: string;
}[] = [
  {
    value: "SYSTEM",
    label: "Software / System",
  },
  {
    value: "MODEL",
    label: "AI / Model",
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
    value: "HUMAN",
    label: "Human-operated process",
  },
  {
    value: "VERIFIED_EXTERNAL",
    label: "Verified external source",
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


export function buildTestSystemRecorderInput(
  draft: TestSystemDraft
): DDTRecorderInput {
  const projectName =
    requireText(
      draft.projectName,
      "System / project name"
    );

  const eventType =
    requireText(
      draft.eventType,
      "Event type"
    );

  const eventId =
    requireText(
      draft.eventId,
      "Event ID"
    );

  const description =
    requireText(
      draft.description,
      "What does your system do?"
    );

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
    string
  > = {};

  if (
    draft.systemType.trim()
  ) {
    payload.systemType =
      draft.systemType.trim();
  }

  if (
    draft.inputContext.trim()
  ) {
    payload.inputContext =
      draft.inputContext.trim();
  }

  if (
    draft.decisionOutput.trim()
  ) {
    payload.decisionOutput =
      draft.decisionOutput.trim();
  }

  if (
    draft.executionAction.trim()
  ) {
    payload.executionAction =
      draft.executionAction.trim();
  }

  if (
    draft.outcome.trim()
  ) {
    payload.outcome =
      draft.outcome.trim();
  }

  const sourceEvidence = {
    projectName,
    sourceType:
      draft.sourceType,

    systemType:
      draft.systemType.trim() ||
      null,

    version:
      draft.version.trim() ||
      null,

    description,

    event: {
      eventType,
      eventId,
      eventTime:
        parsedTime.toISOString(),
    },

    actor: {
      identityRef:
        draft.actorComponent
          .trim() ||
        null,

      role:
        draft.role.trim() ||
        null,
    },

    payload,
  };

  return {
    recordType:
      eventType,

    publisher: {
      name:
        projectName,
    },

    subject: {
      reference:
        eventId,
    },

    source: {
      type:
        draft.sourceType,

      reference:
        eventId,

      systemName:
        projectName,

      ...(draft.version.trim()
        ? {
            version:
              draft.version.trim(),
          }
        : {}),
    },

    eventTime:
      parsedTime.toISOString(),

    ...(
      draft.actorComponent
        .trim() ||
      draft.role.trim()
        ? {
            actor: {
              ...(draft.actorComponent
                .trim()
                ? {
                    identityRef:
                      draft.actorComponent
                        .trim(),
                  }
                : {}),

              ...(draft.role.trim()
                ? {
                    role:
                      draft.role.trim(),
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
          "test-system-submission.json",

        mediaType:
          "application/json",

        contentBase64:
          utf8ToBase64(
            JSON.stringify(
              sourceEvidence
            )
          ),

        role:
          "SOURCE_PAYLOAD",

        evidenceClass:
          "test-system.submission",
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
}


export default function TestYourSystemForm() {
  const [
    draft,
    setDraft,
  ] =
    useState<TestSystemDraft>(
      initialDraft
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
    mappingStatus,
    setMappingStatus,
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


  const requiredComplete =
    useMemo(
      () =>
        Boolean(
          draft.projectName
            .trim() &&
          draft.description
            .trim() &&
          draft.eventType
            .trim() &&
          draft.eventId
            .trim() &&
          draft.eventTime
            .trim()
        ),
      [
        draft.projectName,
        draft.description,
        draft.eventType,
        draft.eventId,
        draft.eventTime,
      ]
    );


  function update<
    K extends keyof TestSystemDraft
  >(
    field: K,
    value:
      TestSystemDraft[K]
  ) {
    setDraft(
      current => ({
        ...current,
        [field]:
          value,
      })
    );

    setMappingStatus(
      null
    );
  }


  function validateMapping() {
    try {
      const request =
        mergeRecorderEvidence(
          buildTestSystemRecorderInput(
            draft
          ),
          additionalEvidence
        );

      if (
        request.evidence.length <
        1
      ) {
        throw new Error(
          "Recorder input has no evidence."
        );
      }

      setPreviewInput(
        request
      );

      setMappingStatus({
        ok: true,
        message:
          "Valid DDT Recorder input mapping. This system can use the existing Recorder core without a new protocol.",
      });
    } catch (
      error: unknown
    ) {
      setPreviewInput(
        null
      );

      setMappingStatus({
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to map this system.",
      });
    }
  }


  return (
    <div className="mt-8 rounded-3xl border border-slate-700/80 bg-slate-950/80 p-6 shadow-xl shadow-black/15 md:p-8">
      <div className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-400">
          Universal system test
        </div>

        <h3 className="mt-2 text-2xl font-bold tracking-tight text-amber-200">
          Test Your System
        </h3>

        <p className="mt-3 max-w-4xl leading-relaxed text-slate-300">
          Use this form for a decision engine, AI agent,
          API, workflow, simulator, research prototype,
          internal application or any other system you built.
          You do not need a dedicated DDT integration type.
        </p>
      </div>


      <FormSection
        title="System"
        description="Identify the system or project that produced the event."
      >
        <Field
          label="System / project name"
          required
        >
          <input
            value={
              draft.projectName
            }
            onChange={
              event =>
                update(
                  "projectName",
                  event.target.value
                )
            }
            placeholder="Example: Credit Risk Decision Engine"
            className={inputClass}
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

        <Field label="System type">
          <input
            value={
              draft.systemType
            }
            onChange={
              event =>
                update(
                  "systemType",
                  event.target.value
                )
            }
            placeholder="Decision engine, AI agent, workflow, API..."
            className={inputClass}
          />
        </Field>

        <Field label="System version">
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
            placeholder="v1.4.2"
            className={inputClass}
          />
        </Field>

        <div className="md:col-span-2">
          <Field
            label="What does your system do?"
            required
          >
            <textarea
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
              rows={4}
              placeholder="Describe the system and the kind of consequential event being tested."
              className={inputClass}
            />
          </Field>
        </div>
      </FormSection>


      <FormSection
        title="Event"
        description="Describe one concrete event produced by the system."
      >
        <Field
          label="Event type"
          required
        >
          <input
            value={
              draft.eventType
            }
            onChange={
              event =>
                update(
                  "eventType",
                  event.target.value
                )
            }
            placeholder="CREDIT_DECISION"
            className={inputClass}
          />
        </Field>

        <Field
          label="Event ID"
          required
        >
          <input
            value={
              draft.eventId
            }
            onChange={
              event =>
                update(
                  "eventId",
                  event.target.value
                )
            }
            placeholder="decision-2026-0001"
            className={inputClass}
          />
        </Field>

        <Field
          label="Event time"
          required
        >
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={
                draft.eventTime
              }
              onChange={
                event =>
                  update(
                    "eventTime",
                    event.currentTarget.value
                  )
              }
              onInput={
                event =>
                  update(
                    "eventTime",
                    event.currentTarget.value
                  )
              }
              className={inputClass}
            />

            <button
              type="button"
              onClick={() => {
                const now =
                  new Date();

                const local =
                  new Date(
                    now.getTime() -
                    now.getTimezoneOffset() *
                      60_000
                  )
                    .toISOString()
                    .slice(0, 16);

                update(
                  "eventTime",
                  local
                );
              }}
              className="shrink-0 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-300 transition hover:border-blue-500 hover:text-blue-300"
            >
              Use current time
            </button>
          </div>
        </Field>

        <Field label="Previous DDT Number">
          <input
            value={
              draft
                .previousDDTNumber
            }
            onChange={
              event =>
                update(
                  "previousDDTNumber",
                  event.target.value
                )
            }
            placeholder="Optional: DDT-00000001"
            className={inputClass}
          />
        </Field>
      </FormSection>


      <FormSection
        title="Actor / component"
        description="Who or what participated in producing the event?"
      >
        <Field label="Actor / Model / Component">
          <input
            value={
              draft.actorComponent
            }
            onChange={
              event =>
                update(
                  "actorComponent",
                  event.target.value
                )
            }
            placeholder="risk-model-v4, service-A, operator-17..."
            className={inputClass}
          />
        </Field>

        <Field label="Role">
          <input
            value={
              draft.role
            }
            onChange={
              event =>
                update(
                  "role",
                  event.target.value
                )
            }
            placeholder="DECISION_ENGINE, REVIEWER, APPROVER..."
            className={inputClass}
          />
        </Field>
      </FormSection>


      <FormSection
        title="Decision context"
        description="These fields remain flexible and are stored inside the generic Recorder payload."
      >
        <Field label="Input / Context">
          <textarea
            value={
              draft.inputContext
            }
            onChange={
              event =>
                update(
                  "inputContext",
                  event.target.value
                )
            }
            rows={4}
            placeholder="What information or context did the system receive?"
            className={inputClass}
          />
        </Field>

        <Field label="Decision / Output">
          <textarea
            value={
              draft.decisionOutput
            }
            onChange={
              event =>
                update(
                  "decisionOutput",
                  event.target.value
                )
            }
            rows={4}
            placeholder="What did the system decide, recommend or output?"
            className={inputClass}
          />
        </Field>

        <Field label="Execution / Action">
          <textarea
            value={
              draft.executionAction
            }
            onChange={
              event =>
                update(
                  "executionAction",
                  event.target.value
                )
            }
            rows={4}
            placeholder="What action was taken as a result?"
            className={inputClass}
          />
        </Field>

        <Field label="Outcome">
          <textarea
            value={
              draft.outcome
            }
            onChange={
              event =>
                update(
                  "outcome",
                  event.target.value
                )
            }
            rows={4}
            placeholder="What happened after execution?"
            className={inputClass}
          />
        </Field>
      </FormSection>


      <EvidenceEditor
        value={
          additionalEvidence
        }
        onChange={
          setAdditionalEvidence
        }
      />


      <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-semibold text-slate-100">
              Recorder mapping
            </div>

            <div className="mt-1 text-sm leading-relaxed text-slate-300">
              This validates the form-to-DDTRecorderInput mapping only.
              No record is submitted yet.
            </div>
          </div>

          <button
            type="button"
            onClick={
              validateMapping
            }
            className="rounded-xl border border-blue-400/60 bg-blue-500/15 px-5 py-3 font-semibold text-blue-200 shadow-lg shadow-blue-950/20 transition hover:border-blue-300 hover:bg-blue-500/25 hover:text-blue-100"
          >
            Validate Recorder Mapping
          </button>
        </div>

        {mappingStatus && (
          <div
            className={
              mappingStatus.ok
                ? "mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300"
                : "mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
            }
          >
            {mappingStatus.message}
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


function FormSection({
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
    <section className="mt-7 rounded-2xl border border-slate-700/70 bg-slate-900/35 p-5 first:mt-0">
      <div className="mb-5">
        <h4 className="text-lg font-bold tracking-wide text-amber-200">
          {title}
        </h4>

        <p className="mt-1 text-sm leading-relaxed text-slate-400">
          {description}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {children}
      </div>
    </section>
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
    <label className="block">
      <div className="mb-2 text-sm font-semibold tracking-wide text-amber-200/90">
        {label}

        {required && (
          <span className="ml-1 font-bold text-amber-300">
            *
          </span>
        )}
      </div>

      {children}
    </label>
  );
}


const inputClass =
  "w-full rounded-xl border border-slate-600 bg-slate-900/90 px-4 py-3 font-medium text-slate-50 shadow-inner shadow-black/20 outline-none transition-all placeholder:font-normal placeholder:text-slate-500 hover:border-slate-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20";
