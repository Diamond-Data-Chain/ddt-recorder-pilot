import type { DDTJsonValue } from "../producer/canonical";
import type {
  DDTRegistrationResult,
  DDTStructuralDigest,
} from "../types";

export type DDTArchivedEvidence = {
  name: string;
  mediaType: string;
  contentBase64: string;
};

export type DDTRegisteredRecordBundle = {
  version: 1;

  ddtNumber: string;
  ddtRecordId: string;
  ddtFamilyId: string;
  subjectNamespace: string;

  recordHash: DDTStructuralDigest;

  envelope: DDTJsonValue;
  conformanceReceipt: DDTJsonValue;
  registrationResult: DDTRegistrationResult;

  evidence: DDTArchivedEvidence[];

  storedAt: string;
};

export type DDTAtomicRecordBundleBuilder = (
  registrationSequence: number
) => Promise<DDTRegisteredRecordBundle>;

export class DDTSourceEventRaceError extends Error {
  readonly existingDDTNumber: string;

  constructor(
    existingDDTNumber: string
  ) {
    super(
      `Source-event coordinate is already registered as ${existingDDTNumber}.`
    );

    this.name =
      "DDTSourceEventRaceError";

    this.existingDDTNumber =
      existingDDTNumber;
  }
}

export interface DDTRecordStore {
  getByDDTNumber(
    ddtNumber: string
  ): Promise<DDTRegisteredRecordBundle | null>;

  getByRecordId(
    ddtRecordId: string
  ): Promise<DDTRegisteredRecordBundle | null>;

  saveRegistered(
    bundle: DDTRegisteredRecordBundle
  ): Promise<DDTRegisteredRecordBundle>;

  registerBundleAtomically(
    sequenceDomain: string,
    buildBundle: DDTAtomicRecordBundleBuilder
  ): Promise<DDTRegisteredRecordBundle>;

  listRegistered(): Promise<DDTRegisteredRecordBundle[]>;
}

export function previousContextFromBundle(
  bundle: DDTRegisteredRecordBundle
) {
  return {
    ddtNumber: bundle.ddtNumber,
    ddtRecordId: bundle.ddtRecordId,
    ddtFamilyId: bundle.ddtFamilyId,
    subjectNamespace: bundle.subjectNamespace,
    recordHash: bundle.recordHash,
  };
}
