import assert from "node:assert/strict";

import {
  buildEnterpriseRecorderInput,
} from "../../app/recorder/EnterpriseTemplateForm";

const templates = [
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

for (const [index, templateName] of templates.entries()) {
  const eventId = `enterprise-event-${index + 1}`;

  const input = buildEnterpriseRecorderInput(
    templateName,
    {
      sourceType: "SYSTEM",
      sourceName: "DDT Test Organization",
      version: "1.0.0",
      recordType: "ENTERPRISE_TEST_EVENT",
      recordReference: eventId,
      eventTime: "2026-10-15T06:00:00.000Z",
      actor: "urn:test:enterprise:actor",
      role: "TEST_ROLE",
      description: `${templateName} regression test`,
      previousDDTNumber: "DDT-00000041",
      fields: {},
      customFields:
        templateName === "Custom"
          ? [
              { name: "vehicleVin", value: "TEST-VIN-12345" },
              { name: "riskScore", value: "87" },
            ]
          : [],
    }
  );

  assert.equal(
    input.recordType,
    "ENTERPRISE_TEST_EVENT"
  );

  assert.equal(
    input.subject.reference,
    eventId
  );

  assert.equal(
    input.source.reference,
    eventId
  );

  assert.equal(
    input.eventTime,
    "2026-10-15T06:00:00.000Z"
  );

  assert.equal(
    input.actor?.identityRef,
    "urn:test:enterprise:actor"
  );

  assert.equal(
    input.actor?.role,
    "TEST_ROLE"
  );

  assert.equal(
    input.description,
    `${templateName} regression test`
  );

  assert.equal(
    input.previousDDTNumber,
    "DDT-00000041"
  );

  assert.equal(
    input.evidence.length,
    1
  );

  assert.equal(
    input.evidence[0]?.role,
    "SOURCE_PAYLOAD"
  );

  assert.equal(
    input.evidence[0]?.mediaType,
    "application/json"
  );

  assert.ok(
    input.payload &&
    typeof input.payload === "object" &&
    !Array.isArray(input.payload)
  );

  const payload = input.payload;

  assert.equal(
    payload.template,
    templateName
  );

  if (templateName === "Custom") {
    assert.equal(
      payload.vehicleVin,
      "TEST-VIN-12345"
    );

    assert.equal(
      payload.riskScore,
      "87"
    );

    console.log(
      "PASS: arbitrary custom fields -> generic Recorder payload"
    );
  }

  console.log(
    `PASS: ${templateName}`
  );
}

console.log(
  "PASS: all enterprise/domain templates -> shared DDTRecorderInput"
);
