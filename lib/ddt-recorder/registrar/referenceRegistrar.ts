import { randomUUID } from "crypto";

import type {
  DDTRegistrationRequest,
  DDTRegistrationResult,
  DDTStoredRegistration,
  DDTStructuralDigest,
} from "../types";
import type { DDTRegistrationStore } from "../storage/types";
import type {
  DDTRecordStore,
  DDTRegisteredRecordBundle,
} from "../storage/recordStore";

export const REFERENCE_SEQUENCE_DOMAIN =
  "urn:uuid:7bb23862-0f3a-4c77-9d8c-9f2873338591";

export const REFERENCE_REGISTRAR_ID =
  "urn:uuid:62e49885-2d51-4a19-bf0f-8025c741f110";

function sameDigest(
  a: DDTStructuralDigest,
  b: DDTStructuralDigest
): boolean {
  return a.algorithm === b.algorithm && a.value === b.value;
}

/**
 * TEST_ONLY reference rendering.
 *
 * This is intentionally an implementation rule of the Reference Registrar,
 * not yet the production DDT Number profile.
 */
export function formatReferenceDDTNumber(
  registrationSequence: number
): string {
  if (
    !Number.isSafeInteger(registrationSequence) ||
    registrationSequence < 1
  ) {
    throw new Error("Invalid registrationSequence.");
  }

  return `DDT-${String(registrationSequence).padStart(8, "0")}`;
}

export class DDTReferenceRegistrar {
  constructor(
    private readonly store: DDTRegistrationStore,
    private readonly sequenceDomain = REFERENCE_SEQUENCE_DOMAIN,
    private readonly registrarId = REFERENCE_REGISTRAR_ID
  ) {}

  private buildRegistration(
    request: DDTRegistrationRequest,
    registrationSequence: number
  ): DDTStoredRegistration {
    const result:
      DDTRegistrationResult = {
        specification: {
          standard:
            "DDT-REGISTRATION-RESULT",
          version:
            "0.1.0-draft.1",
        },

        resultId:
          `urn:uuid:${randomUUID()}`,

        sequenceDomain:
          this.sequenceDomain,

        registrationSequence,

        ddtNumber:
          formatReferenceDDTNumber(
            registrationSequence
          ),

        ddtRecordId:
          request.ddtRecordId,

        recordHash:
          request.recordHash,

        registrationStatementHash:
          request.registrationStatementHash,

        registrar: {
          registrarId:
            this.registrarId,

          mechanism:
            "REFERENCE_REGISTRAR",
        },

        registrationTimeClaim:
          new Date().toISOString(),

        mechanismEvidenceRefs:
          [],
      };

    return {
      status:
        "REGISTERED",
      result,
      storedAt:
        new Date().toISOString(),
    };
  }

  private exactReplay(
    existing: DDTStoredRegistration,
    request: DDTRegistrationRequest
  ): boolean {
    return (
      existing.result.ddtRecordId === request.ddtRecordId &&
      sameDigest(existing.result.recordHash, request.recordHash) &&
      sameDigest(
        existing.result.registrationStatementHash,
        request.registrationStatementHash
      )
    );
  }

  async registerBundleAtomically(
    request: DDTRegistrationRequest,
    recordStore: DDTRecordStore,
    buildBundle: (
      registration:
        DDTStoredRegistration
    ) => Promise<DDTRegisteredRecordBundle>
  ): Promise<DDTRegisteredRecordBundle> {
    if (
      request.verificationDisposition !==
      "PASS"
    ) {
      throw new Error(
        `Registration blocked: verification disposition is ${request.verificationDisposition}.`
      );
    }

    return recordStore
      .registerBundleAtomically(
        this.sequenceDomain,
        async (registrationSequence) => {
          const registration =
            this.buildRegistration(
              request,
              registrationSequence
            );

          const bundle =
            await buildBundle(
              registration
            );

          if (
            bundle.ddtRecordId !==
            request.ddtRecordId
          ) {
            throw new Error(
              "Atomic Record Bundle ddtRecordId mismatch."
            );
          }

          if (
            !sameDigest(
              bundle.recordHash,
              request.recordHash
            )
          ) {
            throw new Error(
              "Atomic Record Bundle recordHash mismatch."
            );
          }

          if (
            !sameDigest(
              bundle.registrationResult
                .registrationStatementHash,
              request
                .registrationStatementHash
            )
          ) {
            throw new Error(
              "Atomic Record Bundle registrationStatementHash mismatch."
            );
          }

          return bundle;
        }
      );
  }

  async register(
    request: DDTRegistrationRequest
  ): Promise<DDTStoredRegistration> {
    if (request.verificationDisposition !== "PASS") {
      throw new Error(
        `Registration blocked: verification disposition is ${request.verificationDisposition}.`
      );
    }

    const existing = await this.store.getByRecordId(request.ddtRecordId);

    if (existing) {
      if (this.exactReplay(existing, request)) {
        return existing;
      }

      throw new Error(
        "Conflicting registration: ddtRecordId is already bound to different commitments."
      );
    }

    try {
      return await this.store.registerAtomically(
        this.sequenceDomain,
        (registrationSequence) =>
          this.buildRegistration(
            request,
            registrationSequence
          )
      );
    } catch (error) {
      /*
       * Handles the race where an exact replay arrives concurrently:
       * the second caller may lose the atomic append race, then resolves
       * the already committed registration and returns it idempotently.
       */
      const racedExisting = await this.store.getByRecordId(
        request.ddtRecordId
      );

      if (racedExisting && this.exactReplay(racedExisting, request)) {
        return racedExisting;
      }

      throw error;
    }
  }
}
