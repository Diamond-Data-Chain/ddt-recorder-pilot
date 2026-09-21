import type {
  DDTRegistrationResult,
  DDTStoredRegistration,
} from "../types";

export type DDTAtomicRegistrationBuilder = (
  registrationSequence: number
) => DDTStoredRegistration;

export interface DDTRegistrationStore {
  getByDDTNumber(ddtNumber: string): Promise<DDTStoredRegistration | null>;

  getByRecordId(ddtRecordId: string): Promise<DDTStoredRegistration | null>;

  getBySequence(
    sequenceDomain: string,
    registrationSequence: number
  ): Promise<DDTStoredRegistration | null>;

  registerAtomically(
    sequenceDomain: string,
    buildRegistration: DDTAtomicRegistrationBuilder
  ): Promise<DDTStoredRegistration>;

  listRegistered(): Promise<DDTRegistrationResult[]>;
}
