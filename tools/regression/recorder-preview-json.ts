import assert from "node:assert/strict";

import {
  stableJson,
} from "../../app/recorder/RecorderPreview";

const formRequest = {
  recordType: "TEST_RECORD",
  subject: {
    reference: "urn:test:preview:001",
  },
  payload: {
    decision: "APPROVE",
    score: 87,
  },
  evidence: [
    {
      name: "policy.json",
      role: "POLICY_OR_RULEBOOK",
    },
  ],
};

const exactRawJson =
  JSON.stringify(formRequest, null, 2);

const reorderedRawJson =
  JSON.stringify({
    evidence: formRequest.evidence,
    payload: {
      score: 87,
      decision: "APPROVE",
    },
    subject: formRequest.subject,
    recordType: "TEST_RECORD",
  });

const modifiedRawJson =
  JSON.stringify({
    ...formRequest,
    payload: {
      ...formRequest.payload,
      score: 88,
    },
  });

assert.equal(
  stableJson(JSON.parse(exactRawJson)),
  stableJson(formRequest)
);

console.log(
  "PASS: exact Raw JSON matches form request"
);

assert.equal(
  stableJson(JSON.parse(reorderedRawJson)),
  stableJson(formRequest)
);

console.log(
  "PASS: JSON key order does not change request equality"
);

assert.notEqual(
  stableJson(JSON.parse(modifiedRawJson)),
  stableJson(formRequest)
);

console.log(
  "PASS: modified Raw JSON differs from form request"
);

assert.throws(
  () => JSON.parse("{ invalid json")
);

console.log(
  "PASS: invalid Raw JSON is rejected"
);

console.log(
  "PASS: Preview + Advanced JSON regression suite"
);
