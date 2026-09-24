"use client";

import { useState } from "react";

import TestYourSystemForm from "./TestYourSystemForm";
import SystemPresetForm from "./SystemPresetForm";
import EnterpriseTemplateForm from "./EnterpriseTemplateForm";
import DocumentUploadForm from "./DocumentUploadForm";
import RetrieveVerifyPanel from "./RetrieveVerifyPanel";

type RecorderMode =
  | "system"
  | "enterprise"
  | "document"
  | "verify";

const systemPresets = [
  "TEST YOUR SYSTEM",
  "ERP",
  "MES",
  "SIEM",
  "QMS",
  "AI / Model",
  "API / Application",
  "IoT / Sensor",
  "SCADA / Industrial",
  "EHR / Healthcare",
  "Other / Custom Source",
];

const enterpriseTemplates = [
  "General Enterprise",
  "AI Decision",
  "Healthcare",
  "Energy",
  "Manufacturing",
  "Finance",
  "Governance / Compliance",
  "Incident",
  "Maintenance / Asset",
  "Approval / Decision",
  "Custom",
];

export default function RecorderPage() {
  const [mode, setMode] =
    useState<RecorderMode>("system");

  const [
    selectedSystemPreset,
    setSelectedSystemPreset,
  ] =
    useState(
      "TEST YOUR SYSTEM"
    );

  const [
    selectedEnterpriseTemplate,
    setSelectedEnterpriseTemplate,
  ] =
    useState(
      "General Enterprise"
    );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10 rounded-3xl border border-slate-800 bg-slate-900/55 p-7 shadow-2xl shadow-black/20 md:p-9">
          <div className="mb-3 text-sm font-bold uppercase tracking-[0.28em] text-amber-300">
            Diamond Data Chain
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-slate-50 md:text-5xl">
            DDT Recorder
          </h1>

          <p className="mt-4 max-w-4xl text-lg leading-relaxed text-slate-300">
            Record, retrieve and independently verify consequential
            events from existing systems, custom applications and
            enterprise workflows.
          </p>
        </div>

        <div className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <ModeButton
            active={mode === "system"}
            title="Record / Test System"
            description="Test your own system or use an integration preset."
            onClick={() => setMode("system")}
          />

          <ModeButton
            active={mode === "enterprise"}
            title="Enterprise / Custom Record"
            description="Create a record using a domain template or custom fields."
            onClick={() => setMode("enterprise")}
          />

          <ModeButton
            active={mode === "document"}
            title="Upload Your Document"
            description="Upload a document, review the extracted mapping and create a DDT Record."
            onClick={() => setMode("document")}
          />

          <ModeButton
            active={mode === "verify"}
            title="Retrieve / Verify"
            description="Retrieve an existing DDT Record and independently verify it."
            onClick={() => setMode("verify")}
          />
        </div>

        {mode === "system" && (
          <section className="rounded-3xl border border-slate-700/80 bg-slate-900/75 p-6 shadow-2xl shadow-black/20 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-amber-200">
                Record / Test a System
              </h2>

              <p className="mt-2 text-slate-400">
                Select a source type or test a system you built yourself.
                All options use the same DDT Recorder core.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {systemPresets.map((preset) => {
                const selected =
                  selectedSystemPreset ===
                  preset;

                const testSystem =
                  preset ===
                  "TEST YOUR SYSTEM";

                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      setSelectedSystemPreset(
                        preset
                      )
                    }
                    className={
                      selected
                        ? "rounded-2xl border border-amber-300/55 bg-amber-400/10 p-5 text-left shadow-lg shadow-black/10 transition hover:border-amber-300/80 hover:bg-amber-400/15"
                        : "rounded-2xl border border-slate-700 bg-slate-950/70 p-5 text-left transition hover:border-slate-500 hover:bg-slate-800/60"
                    }
                  >
                    <div
                      className={
                        selected
                          ? "font-bold text-amber-200"
                          : "font-semibold text-slate-100"
                      }
                    >
                      {preset}
                    </div>

                    {testSystem && (
                      <div className="mt-2 text-sm leading-relaxed text-slate-400">
                        Decision engines, AI agents, APIs, workflows,
                        simulators, prototypes and other systems.
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedSystemPreset ===
            "TEST YOUR SYSTEM"
              ? (
                <TestYourSystemForm />
              )
              : (
                <SystemPresetForm
                  key={
                    selectedSystemPreset
                  }
                  presetName={
                    selectedSystemPreset
                  }
                />
              )}

            <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-400">
              Test Your System and system presets use the same DDT Recorder core.
            </div>
          </section>
        )}

        {mode === "enterprise" && (
          <section className="rounded-3xl border border-slate-700/80 bg-slate-900/75 p-6 shadow-2xl shadow-black/20 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-amber-200">
                Enterprise / Custom Record
              </h2>

              <p className="mt-2 text-slate-400">
                Domain templates change the input form, not the DDT
                Recorder protocol.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {enterpriseTemplates.map((template) => {
                const selected =
                  selectedEnterpriseTemplate ===
                  template;

                return (
                  <button
                    key={template}
                    type="button"
                    onClick={() =>
                      setSelectedEnterpriseTemplate(
                        template
                      )
                    }
                    className={
                      selected
                        ? "rounded-2xl border border-amber-300/55 bg-amber-400/10 p-5 text-left font-bold text-amber-200 shadow-lg shadow-black/10 transition"
                        : "rounded-2xl border border-slate-700 bg-slate-950/70 p-5 text-left font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800/60"
                    }
                  >
                    {template}
                  </button>
                );
              })}
            </div>

            <EnterpriseTemplateForm
              key={
                selectedEnterpriseTemplate
              }
              templateName={
                selectedEnterpriseTemplate
              }
            />

            <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-400">
              Enterprise templates use the same DDT Recorder core.
              Flexible arbitrary fields are added in Step 14.
            </div>
          </section>
        )}

        {mode === "document" && (
          <section className="rounded-3xl border border-slate-700/80 bg-slate-900/75 p-6 shadow-2xl shadow-black/20 md:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-amber-200">
                Upload Your Document
              </h2>

              <p className="mt-2 text-slate-400">
                Upload an existing document, review the extracted DDT mapping
                and register it through the same Recorder core.
              </p>
            </div>

            <DocumentUploadForm />
          </section>
        )}

        {mode === "verify" && (
          <RetrieveVerifyPanel />
        )}
      </div>
    </main>
  );
}

function ModeButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-2xl border border-amber-300/55 bg-amber-400/10 p-5 text-left shadow-lg shadow-black/10 transition"
          : "rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-left transition hover:border-slate-500 hover:bg-slate-800/70"
      }
    >
      <div
        className={
          active
            ? "font-bold text-amber-200"
            : "font-semibold text-slate-100"
        }
      >
        {title}
      </div>

      <div className="mt-2 text-sm leading-relaxed text-slate-400">
        {description}
      </div>
    </button>
  );
}
