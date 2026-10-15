# DDT Recorder Implementation Manifest

**Project:** Diamond Data Chain — DDT Recorder  
**Document role:** AUTHORITATIVE WORKING MANIFEST  
**Repository:** `ddt-recorder-pilot`  
**Manifest path:** `docs/ddt/DDT_RECORDER_IMPLEMENTATION_MANIFEST.md`  
**Recovered source:** `RECORDER(4).odt`  
**Status date:** 2026-10-14

---

## 1. Purpose

This document is the authoritative implementation and completion manifest for the DDT Recorder Pilot.

Its purpose is to prevent development scope, completion criteria, and current progress from being reconstructed from memory, chat history, individual tests, or implementation files.

The manifest defines:

- the fixed implementation sequence;
- the completion criterion for each stage;
- the boundary between Recorder Core, Pilot Interface, and later hardening/deployment work;
- the evidence required before a stage may be marked complete.

## 2. Status vocabulary

Only the following statuses are used:

- **DONE** — implementation is complete and its defined completion criterion has been verified.
- **PASS** — the required test has been executed successfully.
- **PARTIAL** — implementation exists but the completion criterion has not yet been fully satisfied.
- **NOT DONE** — required implementation has not been completed.
- **BLOCKED** — completion currently depends on an unresolved blocker.
- **UNVERIFIED** — implementation may exist, but current evidence is insufficient to assign DONE or PASS.

A status MUST NOT be upgraded from UNVERIFIED/PARTIAL to DONE or PASS solely because code exists.

## 3. Change-control rule

The implementation plan is frozen.

No new feature, profile, industry template, integration, or otherwise useful idea is inserted into the active sequence unless an actual test exposes a blocker that prevents completion of an existing requirement.

New ideas are deferred to the later Polish / Hardening / Deployment phase.

## 4. Completion boundary

Recorder Core and Recorder Demo / Pilot Interface are separate completion boundaries.

The recovered fixed plan states that Recorder Core points **1–8 were already DONE** when the UI/Pilot plan was frozen.

Their original detailed definitions are not reproduced in the recovered source document. Therefore this manifest records their historical status without inventing missing requirements.

| Range | Layer | Historical status | Current verification |
|---|---|---|---|
| 1–8 | DDT Recorder Core | DONE | REVERIFY CURRENT BUILD |
| 9–21 | DDT Recorder UI / Pilot Interface | FIXED PLAN | VERIFY POINT BY POINT |
| 22 | Polish / Hardening / Deployment | LATER PHASE | NOT A PREREQUISITE FOR POINT 21 |

---

## 5. Fixed implementation sequence

**Rule:** Points 9 → 21 are executed and verified in order. No scope expansion between points.


### 9. Freeze UI scope

**Status:** DONE

Define exactly what `/recorder` must do and what is explicitly out of scope for this phase.

The page has two primary paths:

**A — Record / Test a System**

- ERP
- MES
- SIEM
- QMS
- AI / Model
- API / Application
- IoT / Sensor
- SCADA / Industrial
- EHR / Healthcare
- Other
- TEST YOUR SYSTEM

**B — Custom / Enterprise Record**

- General
- AI Decision
- Healthcare
- Energy
- Manufacturing
- Finance
- Compliance / Governance
- Incident
- Maintenance / Asset
- Approval / Decision
- Custom

**DONE criterion:** The screen model is frozen and every mode maps to the existing `DDTRecorderInput`.

### 10. Build the base `/recorder` page

**Status:** DONE

Layout and navigation:

- DDT RECORDER
- Record / Test System
- Enterprise / Custom Record
- Retrieve / Verify

No backend changes are required for this point.

**DONE criterion:** The page works in Next.js and all three modes can be opened.

### 11. Test Your System mode

**Status:** DONE

Generic entry point for developers and systems that do not need to fit a predefined industry category.

Form fields:

- System / project name
- System type
- System version
- What does your system do?
- Event type
- Event ID
- Event time
- Actor / Model / Component
- Role
- Input / Context
- Decision / Output
- Execution / Action
- Outcome
- Evidence

The UI maps the submitted event to the existing:

- `recordType`
- `publisher`
- `subject`
- `source`
- `eventTime`
- `actor`
- `description`
- `payload`
- `evidence`
- `previousDDTNumber`

No new Recorder protocol is introduced.

**DONE criterion:** An arbitrary developer system can be registered without changing Recorder core code.

### 12. System / Integration presets

**Status:** DONE

Add UI presets for:

- ERP
- MES
- SIEM
- QMS
- AI
- API
- IoT

These are UI form presets, not separate Recorders.

Example SIEM fields:

- Alert ID
- Rule
- Severity
- Observed event
- Decision
- Response
- Outcome

Example ERP fields:

- Order / transaction
- Business event
- Actor
- Rule / approval
- Decision
- Execution
- Outcome

All presets ultimately produce the same `DDTRecorderInput`.

**DONE criterion:** At minimum ERP, SIEM, AI, API and IoT presets pass through the same Recorder.

### 13. Enterprise / domain templates

**Status:** DONE

Provide UI templates for:

- General Enterprise
- AI Decision
- Healthcare
- Energy
- Manufacturing
- Finance
- Governance / Compliance
- Incident
- Maintenance / Asset
- Custom

Example Healthcare fields:

- Case / reference
- Event / procedure
- Observation
- Responsible actor
- Applicable protocol
- Decision
- Action
- Outcome
- Evidence

Example Energy fields:

- Site / asset
- Device / meter
- Measurement / event
- Threshold / rule
- Decision
- Action
- Outcome
- Evidence

**DONE criterion:** Every template maps to the same canonical payload without changing Recorder core.

### 14. Flexible Custom Fields

**Status:** DONE

Provide a generic `+ Add field` mechanism so arbitrary domain-specific data can be recorded without creating a new industry template.

Example:

- Machine: CNC-04
- Temperature: 91.4
- Batch: B-991
- Result: Passed

The UI converts custom fields into the canonical payload, for example:

```json
{
  "Machine": "CNC-04",
  "Temperature": 91.4,
  "Batch": "B-991",
  "Result": "Passed"
}
```

This is the mechanism that prevents endless creation of new domain templates.

**DONE criterion:** Arbitrary user-defined fields are accepted by the UI and mapped into the Recorder payload without changing Recorder core.

### 15. Evidence UI

**Status:** DONE

The Recorder requires at least one evidence item and supports up to 20 evidence items, with the current demo limit of 5 MB per item.

The UI provides `+ Add evidence` with:

- File / text / JSON
- Name
- Media type
- Role
- Supporting evidence
- Policy / Rulebook
- Authority evidence
- Semantic dependency
- Other supported evidence roles

Supported bindings include:

- Semantic context
- Actor authority

The user MUST NOT manually create Base64 content. File encoding is handled by the browser.

**DONE criterion:** Drag/drop or file picker produces valid Recorder evidence input.

### 16. Preview + Advanced JSON

**Status:** DONE

Before registration, the UI provides:

**PREVIEW DDT RECORD**

The preview shows a human-readable representation of the record that is about to be submitted.

The UI also provides:

**Advanced / Raw JSON**

This view allows technical users to inspect the exact Recorder request.

Form mode and JSON mode MUST produce the same Recorder input.

**DONE criterion:** The user can verify exactly what will be recorded before registration.

### 17. Record + result screen

**Status:** DONE

The registration action uses the existing:

`POST /api/ddt-recorder/record`

No new registration API is introduced for the Pilot Interface.

The registration result exposes:

- DDT Number
- Registration sequence
- DDT Record ID
- Record Hash
- Registration Statement Hash
- Schema verification
- Commitment verification
- Proof results

The result screen presents a clear registration status, for example:

```text
REGISTERED
DDT-00000042

Schema        PASS
Commitments   PASS
Signature     VALID
```

**DONE criterion:** A record can be submitted through the UI and the resulting DDT identity and verification status are displayed without introducing a new API.

### 18. Retrieve / Verify

**Status:** DONE

Provide a dedicated Retrieve / Verify mode.

The user enters a DDT Number, for example:

`DDT-00000042`

and executes:

**RETRIEVE & VERIFY**

The reconstructed record displays:

- Identity
- Source event
- Payload
- Actor
- Evidence
- Policy / context
- Previous record
- Outcome

Verification results include:

- Schema — PASS
- Commitments — PASS
- Proofs — VALID

The existing backend reconstruction structure is used.

**DONE criterion:** A registered DDT Number can be retrieved through the UI, reconstructed, and its schema, commitments and proofs verified.

### 19. Offline Independent Verification

**Status:** DONE

From the registration / verification result, provide:

**BUILD INDEPENDENT VERIFICATION PACKAGE**

The result displays:

- Package signature — VALID
- Schema — PASS
- Verification axes — 9 / 9
- Offline checks — 12 / 12
- Replay executed — YES
- Replay match — YES

Provide access to:

- Download Offline Package
- Download Verification Result

Existing APIs for these artifacts are used.

**DONE criterion:** The user can build and obtain the independent verification package and verification result, with successful offline verification and replay match.

### 20. UI E2E test

**Status:** DONE

Test at least five materially different real-world scenarios:

1. Test Your System — custom decision engine
2. AI Decision
3. ERP business event
4. Healthcare event
5. Energy / IoT event

Every scenario MUST complete the full user-visible chain:

```text
FORM
→ PREVIEW
→ RECORD
→ DDT NUMBER
→ RETRIEVE
→ VERIFY
→ OFFLINE PACKAGE
→ REPLAY MATCH
```

The final acceptance test is performed through the Recorder UI, without using the terminal to substitute for any user-facing step.

**PASS criterion:** All five real UI E2E scenarios complete the entire chain successfully without terminal intervention.

### 21. RECORDER DEMO COMPLETE

**Status:** DONE

This is the final completion gate for the DDT Recorder Demo / Pilot Interface.

The following MUST all be satisfied:

- DDT RECORDER CORE — DONE
- DDT RECORDER UI — DONE
- TEST YOUR SYSTEM — DONE
- SYSTEM PRESETS — DONE
- ENTERPRISE TEMPLATES — DONE
- CUSTOM FIELDS — DONE
- EVIDENCE UI — DONE
- PREVIEW / RAW JSON — DONE
- RECORD — DONE
- RETRIEVE / VERIFY — DONE
- OFFLINE VERIFICATION — DONE
- 5 REAL UI E2E SCENARIOS — PASS

Only when every requirement above has been verified may the project state:

**DDT Recorder Demo / Pilot Interface — COMPLETE**

No new industries, profiles, features or unrelated refinements are inserted before this completion gate.

**DONE criterion:** Every prerequisite above is independently verified as DONE or PASS.

### 22. POLISH / HARDENING / DEPLOYMENT

**Status:** NOT STARTED / LATER PHASE

This phase begins only after Point 21 — RECORDER DEMO COMPLETE.

It may include:

- UX and visual polish
- Additional safeguards where justified
- Production configuration
- Vercel / cloud deployment work
- Real connectors to ERP / MES / SIEM / API / IoT systems
- Authentication where required
- Enterprise deployment work

System presets are NOT monitoring connectors.

During the Demo / Pilot Interface phase, ERP, SIEM, IoT, Test Your System and similar modes allow a user to manually or experimentally submit an event through the real Recorder.

Automatic monitoring and direct integration with external systems belong to this later integration layer.

**ENTRY criterion:** Point 21 has been verified COMPLETE.

---

## 6. Manifest maintenance rule

This file remains the authoritative working checklist for DDT Recorder completion.

After every verified implementation or test:

1. Update the corresponding point status.
2. Record only results that were actually observed.
3. Do not mark a point DONE merely because implementation code exists.
4. Do not bypass Point 20 UI E2E acceptance with terminal-only tests.
5. Do not declare Point 21 COMPLETE until every listed prerequisite is verified.

**Fixed active sequence:** 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21.

**Post-completion phase:** 22 — Polish / Hardening / Deployment.

