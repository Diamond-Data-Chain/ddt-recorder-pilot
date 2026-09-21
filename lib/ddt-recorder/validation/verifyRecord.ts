import {
  createPublicKey,
  verify as cryptoVerify,
} from "crypto";
import path from "path";

import {
  canonicalizeJcs,
  digestJcs,
  type DDTJsonValue,
} from "../producer/canonical";
import {
  computeEnvelopeCommitments,
  computeRegistrationStatementHash,
} from "../producer/envelopeCommitments";
import {
  loadBaselineSignatureProfileRef,
} from "../signing/ed25519";
import type {
  DDTStructuralDigest,
} from "../types";
import {
  verifyConformanceReceiptSchema,
  verifyEnvelopeSchema,
} from "./schemaVerifier";

type JsonObject = Record<string, DDTJsonValue>;

export type DDTVerificationKeyring = {
  keys: Array<{
    verificationMethod: string;
    publicKeyBase64url: string;
  }>;
};

export type DDTVerifiedProofResult = {
  proofId: string;
  profile: "MATCH";
  signature: "VALID";
};

export type DDTRecordVerificationResult = {
  schemaValidation: "PASS";
  commitmentValidation: "PASS";
  registeredUpstreamCommitment: DDTStructuralDigest;
  evidenceManifestCommitment: DDTStructuralDigest;
  preservationContractCommitment: DDTStructuralDigest;
  recordHash: DDTStructuralDigest;
  registrationStatementHash: DDTStructuralDigest;
  receiptCoreHash: DDTStructuralDigest;
  conformanceReceiptCommitment: DDTStructuralDigest;
  proofs: DDTVerifiedProofResult[];
};

function asObject(
  value: DDTJsonValue | undefined,
  label: string
): JsonObject {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} must be an object.`);
  }

  return value as JsonObject;
}

function asArray(
  value: DDTJsonValue | undefined,
  label: string
): DDTJsonValue[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array.`);
  }

  return value;
}

function asString(
  value: DDTJsonValue | undefined,
  label: string
): string {
  if (
    typeof value !== "string" ||
    value.length === 0
  ) {
    throw new Error(
      `${label} must be a non-empty string.`
    );
  }

  return value;
}

function asDigest(
  value: DDTJsonValue | undefined,
  label: string
): DDTStructuralDigest {
  const object = asObject(value, label);

  const algorithm = asString(
    object.algorithm,
    `${label}.algorithm`
  );

  const digestValue = asString(
    object.value,
    `${label}.value`
  );

  if (algorithm !== "SHA-256") {
    throw new Error(
      `${label}.algorithm must be SHA-256.`
    );
  }

  if (!/^[0-9a-f]{64}$/.test(digestValue)) {
    throw new Error(
      `${label}.value must be lowercase SHA-256 hex.`
    );
  }

  return {
    algorithm: "SHA-256",
    value: digestValue,
  };
}

function sameDigest(
  a: DDTStructuralDigest,
  b: DDTStructuralDigest
): boolean {
  return (
    a.algorithm === b.algorithm &&
    a.value === b.value
  );
}

function sameJson(
  a: DDTJsonValue,
  b: DDTJsonValue
): boolean {
  return (
    canonicalizeJcs(a) === canonicalizeJcs(b)
  );
}

function compareUnicodeCodePoints(
  a: string,
  b: string
): number {
  const aa = Array.from(
    a,
    (c) => c.codePointAt(0)!
  );

  const bb = Array.from(
    b,
    (c) => c.codePointAt(0)!
  );

  const count = Math.min(
    aa.length,
    bb.length
  );

  for (let i = 0; i < count; i += 1) {
    if (aa[i] !== bb[i]) {
      return aa[i] < bb[i] ? -1 : 1;
    }
  }

  if (aa.length === bb.length) {
    return 0;
  }

  return aa.length < bb.length ? -1 : 1;
}

function artifactTuple(
  refValue: DDTJsonValue
): [string, string, string, string] {
  const ref = asObject(
    refValue,
    "artifact reference"
  );

  const digest = asObject(
    ref.digest,
    "artifact reference digest"
  );

  return [
    typeof ref.artifactId === "string"
      ? ref.artifactId
      : "",
    typeof ref.version === "string"
      ? ref.version
      : "",
    typeof digest.value === "string"
      ? digest.value
      : "",
    typeof ref.immutableRef === "string"
      ? ref.immutableRef
      : "",
  ];
}

function compareArtifactRefs(
  a: DDTJsonValue,
  b: DDTJsonValue
): number {
  const aa = artifactTuple(a);
  const bb = artifactTuple(b);

  for (let i = 0; i < aa.length; i += 1) {
    const order =
      compareUnicodeCodePoints(
        aa[i],
        bb[i]
      );

    if (order !== 0) {
      return order;
    }
  }

  return 0;
}

function verifyNormativeDependencies(
  contract: JsonObject
): {
  artifacts: DDTJsonValue[];
  closureDigest: DDTStructuralDigest;
} {
  const nd = asObject(
    contract.normativeDependencies,
    "preservationContract.normativeDependencies"
  );

  const artifacts = asArray(
    nd.artifacts,
    "preservationContract.normativeDependencies.artifacts"
  );

  const sorted = [...artifacts].sort(
    compareArtifactRefs
  );

  if (
    !sameJson(
      artifacts as DDTJsonValue,
      sorted as DDTJsonValue
    )
  ) {
    throw new Error(
      "Normative dependency closure is not canonically ordered."
    );
  }

  const seen = new Set<string>();

  for (const artifactValue of artifacts) {
    const artifact = asObject(
      artifactValue,
      "normative dependency artifact"
    );

    const artifactId = asString(
      artifact.artifactId,
      "artifact.artifactId"
    );

    const version = asString(
      artifact.version,
      "artifact.version"
    );

    const key = `${artifactId}\u0000${version}`;

    if (seen.has(key)) {
      throw new Error(
        "Duplicate (artifactId, version) in normative dependency closure."
      );
    }

    seen.add(key);
  }

  const expected = digestJcs(
    artifacts as DDTJsonValue
  );

  const actual = asDigest(
    nd.closureDigest,
    "preservationContract.normativeDependencies.closureDigest"
  );

  if (!sameDigest(expected, actual)) {
    throw new Error(
      "Normative dependency closureDigest mismatch."
    );
  }

  return {
    artifacts,
    closureDigest: actual,
  };
}

function assertSortedUniqueNormativeEvaluations(
  evaluations: DDTJsonValue[]
): void {
  const sorted = [...evaluations].sort(
    (a, b) => {
      const aa = asObject(
        a,
        "normative evaluation"
      );

      const bb = asObject(
        b,
        "normative evaluation"
      );

      return compareArtifactRefs(
        aa.artifact!,
        bb.artifact!
      );
    }
  );

  if (
    !sameJson(
      evaluations as DDTJsonValue,
      sorted as DDTJsonValue
    )
  ) {
    throw new Error(
      "normativeDependencyEvaluations not canonically ordered."
    );
  }

  const seen = new Set<string>();

  for (const evaluationValue of evaluations) {
    const evaluation = asObject(
      evaluationValue,
      "normative evaluation"
    );

    const artifact = asObject(
      evaluation.artifact,
      "normative evaluation artifact"
    );

    const artifactId = asString(
      artifact.artifactId,
      "normative evaluation artifactId"
    );

    const version = asString(
      artifact.version,
      "normative evaluation version"
    );

    const key = `${artifactId}\u0000${version}`;

    if (seen.has(key)) {
      throw new Error(
        "Duplicate normative dependency evaluation."
      );
    }

    seen.add(key);
  }
}

function assertSortedUniqueEvidenceEvaluations(
  evaluations: DDTJsonValue[]
): void {
  const ids = evaluations.map(
    (value) =>
      asString(
        asObject(
          value,
          "evidence evaluation"
        ).evaluationId,
        "evidence evaluationId"
      )
  );

  const sorted = [...ids].sort(
    compareUnicodeCodePoints
  );

  if (
    JSON.stringify(ids) !==
    JSON.stringify(sorted)
  ) {
    throw new Error(
      "evidenceEvaluations not ordered by evaluationId."
    );
  }

  if (new Set(ids).size !== ids.length) {
    throw new Error(
      "Duplicate evidence evaluationId."
    );
  }
}

function assertSortedUniqueProofs(
  proofs: DDTJsonValue[]
): void {
  const ids = proofs.map(
    (value) =>
      asString(
        asObject(value, "proof").proofId,
        "proof.proofId"
      )
  );

  const sorted = [...ids].sort(
    compareUnicodeCodePoints
  );

  if (
    JSON.stringify(ids) !==
    JSON.stringify(sorted)
  ) {
    throw new Error(
      "Receipt proofs not ordered by proofId."
    );
  }

  if (new Set(ids).size !== ids.length) {
    throw new Error(
      "Duplicate receipt proofId."
    );
  }
}

function verifyReceiptInternal(
  receipt: JsonObject
): {
  receiptCoreHash: DDTStructuralDigest;
  conformanceReceiptCommitment:
    DDTStructuralDigest;
} {
  const core = asObject(
    receipt.receiptCore,
    "receipt.receiptCore"
  );

  const normativeDependencyEvaluations =
    asArray(
      core.normativeDependencyEvaluations,
      "receiptCore.normativeDependencyEvaluations"
    );

  const evidenceEvaluations =
    asArray(
      core.evidenceEvaluations,
      "receiptCore.evidenceEvaluations"
    );

  assertSortedUniqueNormativeEvaluations(
    normativeDependencyEvaluations
  );

  assertSortedUniqueEvidenceEvaluations(
    evidenceEvaluations
  );

  const validationInput = asObject(
    core.validationInput,
    "receiptCore.validationInput"
  );

  const coreRecordHash = asDigest(
    core.recordHash,
    "receiptCore.recordHash"
  );

  const viRecordHash = asDigest(
    validationInput.recordHash,
    "validationInput.recordHash"
  );

  if (
    !sameDigest(
      coreRecordHash,
      viRecordHash
    )
  ) {
    throw new Error(
      "validationInput recordHash mismatch."
    );
  }

  const coreP = asDigest(
    core.preservationContractCommitment,
    "receiptCore.preservationContractCommitment"
  );

  const viP = asDigest(
    validationInput.preservationContractCommitment,
    "validationInput.preservationContractCommitment"
  );

  if (!sameDigest(coreP, viP)) {
    throw new Error(
      "validationInput preservationContractCommitment mismatch."
    );
  }

  const artifactEvaluations = asObject(
    core.artifactEvaluations,
    "receiptCore.artifactEvaluations"
  );

  const artifactHash = digestJcs(
    artifactEvaluations as DDTJsonValue
  );

  const normativeHash = digestJcs(
    normativeDependencyEvaluations as DDTJsonValue
  );

  const evidenceHash = digestJcs(
    evidenceEvaluations as DDTJsonValue
  );

  if (
    !sameDigest(
      asDigest(
        validationInput.evaluatedArtifactSetHash,
        "validationInput.evaluatedArtifactSetHash"
      ),
      artifactHash
    )
  ) {
    throw new Error(
      "evaluatedArtifactSetHash mismatch."
    );
  }

  if (
    !sameDigest(
      asDigest(
        validationInput.evaluatedNormativeDependencySetHash,
        "validationInput.evaluatedNormativeDependencySetHash"
      ),
      normativeHash
    )
  ) {
    throw new Error(
      "evaluatedNormativeDependencySetHash mismatch."
    );
  }

  if (
    !sameDigest(
      asDigest(
        validationInput.evaluatedEvidenceSetHash,
        "validationInput.evaluatedEvidenceSetHash"
      ),
      evidenceHash
    )
  ) {
    throw new Error(
      "evaluatedEvidenceSetHash mismatch."
    );
  }

  const manifest = {
    recordHash:
      validationInput.recordHash!,
    preservationContractCommitment:
      validationInput.preservationContractCommitment!,
    preservationContractDependencyClosureDigest:
      validationInput.preservationContractDependencyClosureDigest!,
    evaluatedArtifactSetHash:
      validationInput.evaluatedArtifactSetHash!,
    evaluatedNormativeDependencySetHash:
      validationInput.evaluatedNormativeDependencySetHash!,
    evaluatedEvidenceSetHash:
      validationInput.evaluatedEvidenceSetHash!,
  };

  const expectedManifestHash =
    digestJcs(
      manifest as DDTJsonValue
    );

  if (
    !sameDigest(
      asDigest(
        validationInput.inputManifestHash,
        "validationInput.inputManifestHash"
      ),
      expectedManifestHash
    )
  ) {
    throw new Error(
      "inputManifestHash mismatch."
    );
  }

  const expectedCoreHash =
    digestJcs(
      core as DDTJsonValue
    );

  const actualCoreHash = asDigest(
    receipt.receiptCoreHash,
    "receipt.receiptCoreHash"
  );

  if (
    !sameDigest(
      expectedCoreHash,
      actualCoreHash
    )
  ) {
    throw new Error(
      "receiptCoreHash mismatch."
    );
  }

  const proofs = asArray(
    receipt.proofs,
    "receipt.proofs"
  );

  assertSortedUniqueProofs(proofs);

  const completeCommitment =
    digestJcs({
      specification:
        receipt.specification!,
      receiptCore:
        receipt.receiptCore!,
      receiptCoreHash:
        receipt.receiptCoreHash!,
      proofs:
        proofs as DDTJsonValue,
    });

  return {
    receiptCoreHash:
      expectedCoreHash,
    conformanceReceiptCommitment:
      completeCommitment,
  };
}

function decodeBase64urlStrict(
  value: string,
  expectedBytes: number
): Buffer {
  if (
    value.includes("=") ||
    /\s/.test(value) ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    throw new Error(
      "Non-canonical base64url encoding."
    );
  }

  const pad =
    "=".repeat(
      (4 - (value.length % 4)) % 4
    );

  const raw = Buffer.from(
    value.replace(/-/g, "+").replace(/_/g, "/") +
      pad,
    "base64"
  );

  const canonical = raw
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  if (
    raw.length !== expectedBytes ||
    canonical !== value
  ) {
    throw new Error(
      "Invalid base64url data."
    );
  }

  return raw;
}

function buildKeyring(
  keyring: DDTVerificationKeyring
): Map<string, Buffer> {
  if (
    !keyring ||
    !Array.isArray(keyring.keys)
  ) {
    throw new Error(
      "Keyring must contain a keys array."
    );
  }

  const result =
    new Map<string, Buffer>();

  for (const item of keyring.keys) {
    if (
      !item.verificationMethod ||
      result.has(item.verificationMethod)
    ) {
      throw new Error(
        "Missing or duplicate verificationMethod in keyring."
      );
    }

    result.set(
      item.verificationMethod,
      decodeBase64urlStrict(
        item.publicKeyBase64url,
        32
      )
    );
  }

  return result;
}

async function verifySignatureProof(
  proofValue: DDTJsonValue,
  input: {
    expectedDigest: DDTStructuralDigest;
    purpose:
      | "CONFORMANCE_ATTESTATION"
      | "DDT_REGISTRATION";
    targetType:
      | "RECEIPT_CORE_HASH"
      | "REGISTRATION_STATEMENT_HASH";
    ddtRoot: string;
    keyring: Map<string, Buffer>;
  }
): Promise<DDTVerifiedProofResult> {
  const proof = asObject(
    proofValue,
    "signature proof"
  );

  if (
    proof.proofType !== "DDT_SIGNATURE" ||
    proof.algorithm !== "Ed25519" ||
    proof.signatureEncoding !== "base64url"
  ) {
    throw new Error(
      "Unsupported or invalid proof type/algorithm/encoding."
    );
  }

  if (
    proof.proofPurpose !== input.purpose
  ) {
    throw new Error(
      "Unexpected proof purpose."
    );
  }

  const signedObject = asObject(
    proof.signedObject,
    "proof.signedObject"
  );

  if (
    signedObject.type !== input.targetType
  ) {
    throw new Error(
      "Unexpected signedObject.type."
    );
  }

  const signedDigest = asDigest(
    signedObject.digest,
    "proof.signedObject.digest"
  );

  if (
    !sameDigest(
      signedDigest,
      input.expectedDigest
    )
  ) {
    throw new Error(
      "Signed object digest mismatch."
    );
  }

  const expectedProfile =
    await loadBaselineSignatureProfileRef(
      input.ddtRoot
    );

  const profile = asObject(
    proof.proofProfile,
    "proof.proofProfile"
  );

  if (
    profile.artifactId !==
      expectedProfile.artifactId ||
    profile.version !==
      expectedProfile.version ||
    !sameDigest(
      asDigest(
        profile.digest,
        "proof.proofProfile.digest"
      ),
      expectedProfile.digest
    )
  ) {
    throw new Error(
      "Signature profile mismatch."
    );
  }

  const verificationMethod =
    asString(
      proof.verificationMethod,
      "proof.verificationMethod"
    );

  const rawPublicKey =
    input.keyring.get(
      verificationMethod
    );

  if (!rawPublicKey) {
    throw new Error(
      `Verification key unavailable: ${verificationMethod}`
    );
  }

  const proofText =
    asString(
      proof.proofValue,
      "proof.proofValue"
    );

  if (proofText.length !== 86) {
    throw new Error(
      "Ed25519 proofValue must be exactly 86 base64url characters."
    );
  }

  const signature =
    decodeBase64urlStrict(
      proofText,
      64
    );

  const proofCore: JsonObject = {
    ...proof,
  };

  delete proofCore.proofValue;

  const signingInput = Buffer.from(
    canonicalizeJcs({
      domain:
        "DDT_SIGNATURE_PROOF_V2",
      proofCore:
        proofCore as DDTJsonValue,
    }),
    "utf8"
  );

  const spkiPrefix = Buffer.from(
    "302a300506032b6570032100",
    "hex"
  );

  const publicKey = createPublicKey({
    key: Buffer.concat([
      spkiPrefix,
      rawPublicKey,
    ]),
    format: "der",
    type: "spki",
  });

  const valid = cryptoVerify(
    null,
    signingInput,
    publicKey,
    signature
  );

  if (!valid) {
    throw new Error(
      "Ed25519 signature invalid."
    );
  }

  return {
    proofId: asString(
      proof.proofId,
      "proof.proofId"
    ),
    profile: "MATCH",
    signature: "VALID",
  };
}

export async function verifyRecordBundle(
  envelopeValue: DDTJsonValue,
  receiptValue: DDTJsonValue,
  keyringValue: DDTVerificationKeyring,
  ddtRoot = path.join(
    process.cwd(),
    "docs",
    "ddt"
  )
): Promise<DDTRecordVerificationResult> {
  const envelopeSchema =
    await verifyEnvelopeSchema(
      envelopeValue,
      ddtRoot
    );

  if (
    envelopeSchema.status !== "PASS"
  ) {
    throw new Error(
      `Envelope schema validation failed: ${envelopeSchema.errors.join("; ")}`
    );
  }

  const receiptSchema =
    await verifyConformanceReceiptSchema(
      receiptValue,
      ddtRoot
    );

  if (
    receiptSchema.status !== "PASS"
  ) {
    throw new Error(
      `Receipt schema validation failed: ${receiptSchema.errors.join("; ")}`
    );
  }

  const envelope = asObject(
    envelopeValue,
    "envelope"
  );

  const receipt = asObject(
    receiptValue,
    "receipt"
  );

  const contract = asObject(
    envelope.preservationContract,
    "envelope.preservationContract"
  );

  const closure =
    verifyNormativeDependencies(
      contract
    );

  const expected =
    computeEnvelopeCommitments({
      specification:
        envelope.specification!,
      identity:
        envelope.identity!,
      upstream:
        envelope.upstream!,
      evidenceManifest:
        envelope.evidenceManifest!,
      preservationContract:
        envelope.preservationContract!,
      relationships:
        envelope.relationships!,
    });

  const commitments = asObject(
    envelope.commitments,
    "envelope.commitments"
  );

  const commitmentPairs: Array<
    [
      keyof typeof expected,
      DDTStructuralDigest,
    ]
  > = [
    [
      "registeredUpstreamCommitment",
      expected.registeredUpstreamCommitment,
    ],
    [
      "evidenceManifestCommitment",
      expected.evidenceManifestCommitment,
    ],
    [
      "preservationContractCommitment",
      expected.preservationContractCommitment,
    ],
    [
      "recordHash",
      expected.recordHash,
    ],
  ];

  for (
    const [name, expectedDigest]
    of commitmentPairs
  ) {
    const actual = asDigest(
      commitments[name],
      `envelope.commitments.${name}`
    );

    if (
      !sameDigest(
        actual,
        expectedDigest
      )
    ) {
      throw new Error(
        `${name} mismatch.`
      );
    }
  }

  const registration = asObject(
    envelope.registration,
    "envelope.registration"
  );

  const statement = asObject(
    registration.statement,
    "envelope.registration.statement"
  );

  if (
    !sameDigest(
      asDigest(
        statement.recordHash,
        "registration.statement.recordHash"
      ),
      expected.recordHash
    )
  ) {
    throw new Error(
      "Registration statement recordHash mismatch."
    );
  }

  if (
    !sameDigest(
      asDigest(
        statement.preservationContractCommitment,
        "registration.statement.preservationContractCommitment"
      ),
      expected.preservationContractCommitment
    )
  ) {
    throw new Error(
      "Registration statement preservationContractCommitment mismatch."
    );
  }

  const expectedS =
    computeRegistrationStatementHash(
      statement as DDTJsonValue
    );

  const actualS = asDigest(
    registration.registrationStatementHash,
    "registration.registrationStatementHash"
  );

  if (
    !sameDigest(
      expectedS,
      actualS
    )
  ) {
    throw new Error(
      "registrationStatementHash mismatch."
    );
  }

  const receiptVerification =
    verifyReceiptInternal(
      receipt
    );

  const receiptCore = asObject(
    receipt.receiptCore,
    "receipt.receiptCore"
  );

  if (
    !sameDigest(
      asDigest(
        receiptCore.recordHash,
        "receiptCore.recordHash"
      ),
      expected.recordHash
    )
  ) {
    throw new Error(
      "Receipt recordHash binding mismatch."
    );
  }

  if (
    !sameDigest(
      asDigest(
        receiptCore.preservationContractCommitment,
        "receiptCore.preservationContractCommitment"
      ),
      expected.preservationContractCommitment
    )
  ) {
    throw new Error(
      "Receipt contract binding mismatch."
    );
  }

  const validationInput = asObject(
    receiptCore.validationInput,
    "receiptCore.validationInput"
  );

  if (
    !sameDigest(
      asDigest(
        validationInput.preservationContractDependencyClosureDigest,
        "validationInput.preservationContractDependencyClosureDigest"
      ),
      closure.closureDigest
    )
  ) {
    throw new Error(
      "Receipt dependency closure binding mismatch."
    );
  }

  const receiptEvaluations =
    asArray(
      receiptCore.normativeDependencyEvaluations,
      "receiptCore.normativeDependencyEvaluations"
    );

  const receiptRefs =
    receiptEvaluations.map(
      (evaluationValue) =>
        asObject(
          evaluationValue,
          "normative evaluation"
        ).artifact!
    );

  if (
    !sameJson(
      receiptRefs as DDTJsonValue,
      closure.artifacts as DDTJsonValue
    )
  ) {
    throw new Error(
      "Receipt normative dependency coverage differs from Preservation Contract closure."
    );
  }

  if (
    !sameDigest(
      asDigest(
        statement.conformanceReceiptCommitment,
        "registration.statement.conformanceReceiptCommitment"
      ),
      receiptVerification.conformanceReceiptCommitment
    )
  ) {
    throw new Error(
      "conformanceReceiptCommitment mismatch."
    );
  }

  const keyring =
    buildKeyring(
      keyringValue
    );

  const proofResults:
    DDTVerifiedProofResult[] = [];

  const receiptProofs = asArray(
    receipt.proofs,
    "receipt.proofs"
  );

  for (
    const proof
    of receiptProofs
  ) {
    proofResults.push(
      await verifySignatureProof(
        proof,
        {
          expectedDigest:
            receiptVerification.receiptCoreHash,
          purpose:
            "CONFORMANCE_ATTESTATION",
          targetType:
            "RECEIPT_CORE_HASH",
          ddtRoot,
          keyring,
        }
      )
    );
  }

  const registrationProofs =
    asArray(
      registration.signatureProofs,
      "registration.signatureProofs"
    );

  for (
    const proof
    of registrationProofs
  ) {
    proofResults.push(
      await verifySignatureProof(
        proof,
        {
          expectedDigest:
            expectedS,
          purpose:
            "DDT_REGISTRATION",
          targetType:
            "REGISTRATION_STATEMENT_HASH",
          ddtRoot,
          keyring,
        }
      )
    );
  }

  return {
    schemaValidation: "PASS",
    commitmentValidation: "PASS",
    registeredUpstreamCommitment:
      expected.registeredUpstreamCommitment,
    evidenceManifestCommitment:
      expected.evidenceManifestCommitment,
    preservationContractCommitment:
      expected.preservationContractCommitment,
    recordHash:
      expected.recordHash,
    registrationStatementHash:
      expectedS,
    receiptCoreHash:
      receiptVerification.receiptCoreHash,
    conformanceReceiptCommitment:
      receiptVerification.conformanceReceiptCommitment,
    proofs:
      proofResults,
  };
}
