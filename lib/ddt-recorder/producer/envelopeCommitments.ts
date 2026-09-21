import type { DDTStructuralDigest } from "../types";
import {
  digestJcs,
  type DDTJsonValue,
} from "./canonical";

export type DDTEnvelopeCommitmentInput = {
  specification: DDTJsonValue;
  identity: DDTJsonValue;
  upstream: DDTJsonValue;
  evidenceManifest: DDTJsonValue;
  preservationContract: DDTJsonValue;
  relationships: DDTJsonValue;
};

export type DDTEnvelopeCommitments = {
  registeredUpstreamCommitment: DDTStructuralDigest;
  evidenceManifestCommitment: DDTStructuralDigest;
  preservationContractCommitment: DDTStructuralDigest;
  recordHash: DDTStructuralDigest;
};

export type DDTCanonicalRecordHashInput = {
  specification: DDTJsonValue;
  identity: DDTJsonValue;
  registeredUpstreamCommitment: DDTStructuralDigest;
  evidenceManifestCommitment: DDTStructuralDigest;
  preservationContractCommitment: DDTStructuralDigest;
  relationships: DDTJsonValue;
};

function asJsonDigest(
  digest: DDTStructuralDigest
): DDTJsonValue {
  return {
    algorithm: digest.algorithm,
    value: digest.value,
  };
}

export function buildRecordHashInput(
  input: DDTEnvelopeCommitmentInput,
  commitments: Omit<DDTEnvelopeCommitments, "recordHash">
): DDTCanonicalRecordHashInput {
  return {
    specification: input.specification,
    identity: input.identity,
    registeredUpstreamCommitment:
      commitments.registeredUpstreamCommitment,
    evidenceManifestCommitment:
      commitments.evidenceManifestCommitment,
    preservationContractCommitment:
      commitments.preservationContractCommitment,
    relationships: input.relationships,
  };
}

export function computeEnvelopeCommitments(
  input: DDTEnvelopeCommitmentInput
): DDTEnvelopeCommitments {
  const registeredUpstreamCommitment =
    digestJcs(input.upstream);

  const evidenceManifestCommitment =
    digestJcs(input.evidenceManifest);

  const preservationContractCommitment =
    digestJcs(input.preservationContract);

  const recordHashInput = buildRecordHashInput(
    input,
    {
      registeredUpstreamCommitment,
      evidenceManifestCommitment,
      preservationContractCommitment,
    }
  );

  const recordHash = digestJcs({
    specification: recordHashInput.specification,
    identity: recordHashInput.identity,
    registeredUpstreamCommitment: asJsonDigest(
      recordHashInput.registeredUpstreamCommitment
    ),
    evidenceManifestCommitment: asJsonDigest(
      recordHashInput.evidenceManifestCommitment
    ),
    preservationContractCommitment: asJsonDigest(
      recordHashInput.preservationContractCommitment
    ),
    relationships: recordHashInput.relationships,
  });

  return {
    registeredUpstreamCommitment,
    evidenceManifestCommitment,
    preservationContractCommitment,
    recordHash,
  };
}

export function computeRegistrationStatementHash(
  statement: DDTJsonValue
): DDTStructuralDigest {
  return digestJcs(statement);
}
