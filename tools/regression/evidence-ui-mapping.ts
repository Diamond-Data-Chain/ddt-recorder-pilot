import assert from "node:assert/strict";

import {
  mergeRecorderEvidence,
} from "../../app/recorder/EvidenceEditor";

import {
  buildTestSystemRecorderInput,
} from "../../app/recorder/TestYourSystemForm";

const baseInput = buildTestSystemRecorderInput({
  projectName: "Evidence UI Regression",
  sourceType: "SYSTEM",
  systemType: "Decision Engine",
  version: "1.0.0",
  description: "Evidence UI regression test",
  eventType: "EVIDENCE_TEST",
  eventId: "evidence-test-001",
  eventTime: "2026-10-15T06:00:00.000Z",
  actorComponent: "urn:test:evidence:actor",
  role: "TEST_ROLE",
  inputContext: "test input",
  decisionOutput: "test decision",
  executionAction: "test action",
  outcome: "test outcome",
  previousDDTNumber: "",
});

assert.equal(
  baseInput.evidence.length,
  1
);

const additionalEvidence = [
  {
    name: "policy.json",
    mediaType: "application/json",
    contentBase64: Buffer.from(
      '{"policy":"DDT-TEST"}',
      "utf8"
    ).toString("base64"),
    role: "POLICY_OR_RULEBOOK" as const,
    evidenceClass: "policy.rulebook",
    bindings: [
      "SEMANTIC_CONTEXT" as const,
    ],
  },
  {
    name: "authority.txt",
    mediaType: "text/plain",
    contentBase64: Buffer.from(
      "Authorized by regression test",
      "utf8"
    ).toString("base64"),
    role: "AUTHORITY_EVIDENCE" as const,
    bindings: [
      "ACTOR_AUTHORITY" as const,
    ],
  },
];

const merged = mergeRecorderEvidence(
  baseInput,
  additionalEvidence
);

assert.equal(
  merged.evidence.length,
  3
);

assert.equal(
  merged.evidence[0]?.role,
  "SOURCE_PAYLOAD"
);

assert.equal(
  merged.evidence[1]?.role,
  "POLICY_OR_RULEBOOK"
);

assert.deepEqual(
  merged.evidence[1]?.bindings,
  ["SEMANTIC_CONTEXT"]
);

assert.equal(
  merged.evidence[2]?.role,
  "AUTHORITY_EVIDENCE"
);

assert.deepEqual(
  merged.evidence[2]?.bindings,
  ["ACTOR_AUTHORITY"]
);

assert.equal(
  Buffer.from(
    merged.evidence[1]!.contentBase64,
    "base64"
  ).toString("utf8"),
  '{"policy":"DDT-TEST"}'
);

console.log(
  "PASS: additional evidence -> shared DDTRecorderInput"
);

console.log(
  "PASS: evidence roles and bindings preserved"
);

console.log(
  "PASS: evidence content survives Base64 round-trip"
);

const nineteenAdditional = Array.from(
  { length: 19 },
  (_, index) => ({
    name: `evidence-${index + 1}.txt`,
    mediaType: "text/plain",
    contentBase64: Buffer.from(
      `evidence-${index + 1}`,
      "utf8"
    ).toString("base64"),
    role: "SUPPORTING_EVIDENCE" as const,
  })
);

const exactlyTwenty =
  mergeRecorderEvidence(
    baseInput,
    nineteenAdditional
  );

assert.equal(
  exactlyTwenty.evidence.length,
  20
);

console.log(
  "PASS: maximum 20 total evidence items accepted"
);

assert.throws(
  () =>
    mergeRecorderEvidence(
      baseInput,
      [
        ...nineteenAdditional,
        {
          name: "evidence-20.txt",
          mediaType: "text/plain",
          contentBase64:
            Buffer.from(
              "overflow",
              "utf8"
            ).toString("base64"),
          role:
            "SUPPORTING_EVIDENCE" as const,
        },
      ]
    ),
  /at most 20 evidence items/
);

console.log(
  "PASS: evidence item 21 rejected"
);

console.log(
  "PASS: Evidence UI -> Recorder evidence regression suite"
);
