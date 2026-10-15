import assert from "node:assert/strict";

import {
  buildPresetRecorderInput,
} from "../../app/recorder/SystemPresetForm";

const cases = [
  {
    presetName: "ERP",
    sourceType: "SYSTEM",
    fields: {
      transactionReference: "PO-2026-00192",
      businessEvent: "PURCHASE_ORDER_APPROVED",
      ruleApproval: "POLICY-ERP-01",
      decision: "APPROVED",
      execution: "Order released",
      outcome: "SUCCESS",
    },
  },
  {
    presetName: "SIEM",
    sourceType: "SYSTEM",
    fields: {
      alertId: "ALERT-884102",
      rule: "Privilege escalation",
      severity: "HIGH",
      observedEvent: "Unexpected privilege change",
      decision: "BLOCK",
      response: "Account disabled",
      outcome: "CONTAINED",
    },
  },
  {
    presetName: "AI / Model",
    sourceType: "MODEL",
    fields: {
      inputContext: "Loan application",
      recommendation: "REVIEW",
      confidence: "0.91",
      humanReview: "APPROVED",
      execution: "Application forwarded",
      outcome: "SUCCESS",
    },
  },
  {
    presetName: "API / Application",
    sourceType: "SYSTEM",
    fields: {
      endpoint: "/v1/approve",
      method: "POST",
      requestReference: "req-88291",
      inputContext: "Approval request",
      response: "200 APPROVED",
      decision: "APPROVED",
      outcome: "SUCCESS",
    },
  },
  {
    presetName: "IoT / Sensor",
    sourceType: "SENSOR",
    fields: {
      deviceId: "sensor-plant-04",
      measurement: "TEMPERATURE",
      value: "91.4 C",
      threshold: "> 90 C",
      action: "Cooling activated",
      outcome: "Temperature normalized",
    },
  },
] as const;

for (const [index, testCase] of cases.entries()) {
  const eventId = `preset-event-${index + 1}`;

  const input = buildPresetRecorderInput(
    testCase.presetName,
    {
      systemName: `${testCase.presetName} Test System`,
      version: "1.0.0",
      eventType: "TEST_EVENT",
      eventId,
      eventTime: "2026-10-15T06:00:00.000Z",
      actor: "urn:test:actor",
      role: "TEST_ROLE",
      description: `${testCase.presetName} regression test`,
      previousDDTNumber: "DDT-00000041",
      fields: { ...testCase.fields },
    }
  );

  assert.equal(input.recordType, "TEST_EVENT");
  assert.equal(
    input.publisher.name,
    `${testCase.presetName} Test System`
  );
  assert.equal(input.subject.reference, eventId);
  assert.equal(input.source.type, testCase.sourceType);
  assert.equal(input.source.reference, eventId);
  assert.equal(
    input.source.systemName,
    `${testCase.presetName} Test System`
  );
  assert.equal(input.source.version, "1.0.0");
  assert.equal(
    input.eventTime,
    "2026-10-15T06:00:00.000Z"
  );
  assert.equal(input.actor?.identityRef, "urn:test:actor");
  assert.equal(input.actor?.role, "TEST_ROLE");
  assert.equal(
    input.description,
    `${testCase.presetName} regression test`
  );
  assert.ok(
    input.payload &&
    typeof input.payload === "object" &&
    !Array.isArray(input.payload)
  );

  const payload = input.payload;

  assert.equal(payload.preset, testCase.presetName);
  assert.equal(input.evidence.length, 1);
  assert.equal(input.evidence[0]?.role, "SOURCE_PAYLOAD");
  assert.equal(
    input.evidence[0]?.mediaType,
    "application/json"
  );
  assert.equal(
    input.previousDDTNumber,
    "DDT-00000041"
  );

  for (const [key, value] of Object.entries(testCase.fields)) {
    assert.equal(payload[key], value);
  }

  console.log(`PASS: ${testCase.presetName}`);
}

console.log(
  "PASS: ERP, SIEM, AI, API and IoT presets -> shared DDTRecorderInput"
);
