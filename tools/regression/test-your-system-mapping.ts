import assert from "node:assert/strict";

import {
  buildTestSystemRecorderInput,
} from "../../app/recorder/TestYourSystemForm";

const input = buildTestSystemRecorderInput({
  projectName: "DDT Test Decision Engine",
  sourceType: "SYSTEM",
  systemType: "Decision Engine",
  version: "1.0.0",
  description: "Evaluates a request and produces a decision.",
  eventType: "DECISION_EXECUTED",
  eventId: "decision-001",
  eventTime: "2026-10-15T06:00:00.000Z",
  actorComponent: "urn:test:component:decision-engine",
  role: "DECISION_ENGINE",
  inputContext: '{"request":"approve-order","amount":1250}',
  decisionOutput: '{"decision":"APPROVE"}',
  executionAction: '{"action":"ORDER_APPROVED"}',
  outcome: '{"status":"SUCCESS"}',
  previousDDTNumber: "DDT-00000041",
});

assert.equal(input.recordType, "DECISION_EXECUTED");
assert.equal(input.publisher.name, "DDT Test Decision Engine");
assert.equal(input.subject.reference, "decision-001");

assert.equal(input.source.type, "SYSTEM");
assert.equal(input.source.reference, "decision-001");
assert.equal(input.source.systemName, "DDT Test Decision Engine");
assert.equal(input.source.version, "1.0.0");

assert.equal(input.eventTime, "2026-10-15T06:00:00.000Z");
assert.equal(
  input.actor?.identityRef,
  "urn:test:component:decision-engine"
);
assert.equal(input.actor?.role, "DECISION_ENGINE");

assert.equal(
  input.description,
  "Evaluates a request and produces a decision."
);

assert.deepEqual(input.payload, {
  systemType: "Decision Engine",
  inputContext: {
    request: "approve-order",
    amount: 1250,
  },
  decisionOutput: {
    decision: "APPROVE",
  },
  executionAction: {
    action: "ORDER_APPROVED",
  },
  outcome: {
    status: "SUCCESS",
  },
});

assert.equal(input.evidence.length, 1);
assert.equal(
  input.evidence[0]?.name,
  "test-system-submission.json"
);
assert.equal(
  input.evidence[0]?.mediaType,
  "application/json"
);
assert.equal(
  input.evidence[0]?.role,
  "SOURCE_PAYLOAD"
);

assert.equal(
  input.previousDDTNumber,
  "DDT-00000041"
);

console.log(
  "PASS: Test Your System -> DDTRecorderInput mapping"
);
