import { promises as fs } from "fs";
import path from "path";

import type { DDTJsonValue } from "../producer/canonical";
import type { DDTStructuralDigest } from "../types";
import {
  DDTSourceEventRaceError,
  type DDTRecordStore,
  type DDTRegisteredRecordBundle,
  type DDTAtomicRecordBundleBuilder,
} from "./recordStore";

type RecordStoreFile = {
  version: 1;
  records: DDTRegisteredRecordBundle[];
};

const EMPTY_STORE: RecordStoreFile = {
  version: 1,
  records: [],
};

function asObject(
  value: DDTJsonValue,
  label: string
): Record<string, DDTJsonValue> {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    throw new Error(`${label} must be an object.`);
  }

  return value;
}

function asString(
  value: DDTJsonValue | undefined,
  label: string
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value;
}

function asDigest(
  value: DDTJsonValue | undefined,
  label: string
): DDTStructuralDigest {
  if (value === undefined) {
    throw new Error(`${label} is required.`);
  }

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
    throw new Error(`${label}.algorithm must be SHA-256.`);
  }

  if (!/^[0-9a-f]{64}$/.test(digestValue)) {
    throw new Error(`${label}.value is not a SHA-256 hex digest.`);
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

export function assertBundleBindings(
  bundle: DDTRegisteredRecordBundle
): void {
  const result = bundle.registrationResult;

  if (bundle.version !== 1) {
    throw new Error("Unsupported DDT record bundle version.");
  }

  if (result.ddtNumber !== bundle.ddtNumber) {
    throw new Error(
      "Registration Result ddtNumber does not match bundle."
    );
  }

  if (result.ddtRecordId !== bundle.ddtRecordId) {
    throw new Error(
      "Registration Result ddtRecordId does not match bundle."
    );
  }

  if (!sameDigest(result.recordHash, bundle.recordHash)) {
    throw new Error(
      "Registration Result recordHash does not match bundle."
    );
  }

  const envelope = asObject(
    bundle.envelope,
    "envelope"
  );

  const identity = asObject(
    envelope.identity,
    "envelope.identity"
  );

  if (
    asString(
      identity.ddtRecordId,
      "envelope.identity.ddtRecordId"
    ) !== bundle.ddtRecordId
  ) {
    throw new Error(
      "Envelope ddtRecordId does not match bundle."
    );
  }

  if (
    asString(
      identity.ddtFamilyId,
      "envelope.identity.ddtFamilyId"
    ) !== bundle.ddtFamilyId
  ) {
    throw new Error(
      "Envelope ddtFamilyId does not match bundle."
    );
  }

  const subject = asObject(
    identity.subject,
    "envelope.identity.subject"
  );

  if (
    asString(
      subject.namespace,
      "envelope.identity.subject.namespace"
    ) !== bundle.subjectNamespace
  ) {
    throw new Error(
      "Envelope subject namespace does not match bundle."
    );
  }

  const commitments = asObject(
    envelope.commitments,
    "envelope.commitments"
  );

  const envelopeRecordHash = asDigest(
    commitments.recordHash,
    "envelope.commitments.recordHash"
  );

  if (!sameDigest(envelopeRecordHash, bundle.recordHash)) {
    throw new Error(
      "Envelope recordHash does not match bundle."
    );
  }

  const registration = asObject(
    envelope.registration,
    "envelope.registration"
  );

  const envelopeStatementHash = asDigest(
    registration.registrationStatementHash,
    "envelope.registration.registrationStatementHash"
  );

  if (
    !sameDigest(
      envelopeStatementHash,
      result.registrationStatementHash
    )
  ) {
    throw new Error(
      "Envelope registrationStatementHash does not match Registration Result."
    );
  }

  const receipt = asObject(
    bundle.conformanceReceipt,
    "conformanceReceipt"
  );

  const receiptCore = asObject(
    receipt.receiptCore,
    "conformanceReceipt.receiptCore"
  );

  const receiptRecordHash = asDigest(
    receiptCore.recordHash,
    "conformanceReceipt.receiptCore.recordHash"
  );

  if (!sameDigest(receiptRecordHash, bundle.recordHash)) {
    throw new Error(
      "Conformance Receipt recordHash does not match bundle."
    );
  }
}

export function sourceEventKeyFromBundle(
  bundle: DDTRegisteredRecordBundle
): string {
  const envelope =
    asObject(
      bundle.envelope,
      "envelope"
    );

  const upstream =
    asObject(
      envelope.upstream,
      "envelope.upstream"
    );

  const source =
    asObject(
      upstream.source,
      "envelope.upstream.source"
    );

  const event =
    asObject(
      upstream.event,
      "envelope.upstream.event"
    );

  const eventTime =
    asObject(
      event.eventTime,
      "envelope.upstream.event.eventTime"
    );

  const sourceType =
    asString(
      source.sourceType,
      "envelope.upstream.source.sourceType"
    );

  const sourceId =
    asString(
      source.sourceId,
      "envelope.upstream.source.sourceId"
    );

  let sourceRecordId:
    string | null = null;

  if (
    source.sourceRecordId !==
    undefined
  ) {
    sourceRecordId =
      asString(
        source.sourceRecordId,
        "envelope.upstream.source.sourceRecordId"
      );
  }

  const sourceRef =
    asString(
      eventTime.sourceRef,
      "envelope.upstream.event.eventTime.sourceRef"
    );

  return JSON.stringify([
    bundle.subjectNamespace,
    sourceType,
    sourceId,
    sourceRecordId,
    sourceRef,
  ]);
}

export class JsonFileDDTRecordStore
  implements DDTRecordStore
{
  private readonly filePath: string;
  private readonly lockPath: string;

  constructor(
    filePath = path.join(
      process.cwd(),
      ".ddc-state",
      "ddt-recorder",
      "records.json"
    )
  ) {
    this.filePath = filePath;
    this.lockPath = `${filePath}.lock`;
  }

  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(
      path.dirname(this.filePath),
      { recursive: true }
    );
  }

  private async readStore(): Promise<RecordStoreFile> {
    await this.ensureDirectory();

    try {
      const raw = await fs.readFile(
        this.filePath,
        "utf8"
      );

      const parsed =
        JSON.parse(raw) as RecordStoreFile;

      if (
        parsed.version !== 1 ||
        !Array.isArray(parsed.records)
      ) {
        throw new Error(
          "Invalid DDT record store format."
        );
      }

      for (const bundle of parsed.records) {
        assertBundleBindings(bundle);
      }

      return parsed;
    } catch (error: unknown) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error
          ? String(
              (error as { code?: unknown }).code
            )
          : "";

      if (code === "ENOENT") {
        return {
          version: EMPTY_STORE.version,
          records: [],
        };
      }

      throw error;
    }
  }

  private async writeStore(
    store: RecordStoreFile
  ): Promise<void> {
    await this.ensureDirectory();

    const tempPath =
      `${this.filePath}.${process.pid}.${Date.now()}.tmp`;

    await fs.writeFile(
      tempPath,
      `${JSON.stringify(store, null, 2)}\n`,
      {
        encoding: "utf8",
        flag: "wx",
      }
    );

    await fs.rename(
      tempPath,
      this.filePath
    );
  }

  private async acquireLock():
    Promise<() => Promise<void>> {
    await this.ensureDirectory();

    for (
      let attempt = 0;
      attempt < 200;
      attempt += 1
    ) {
      try {
        const handle = await fs.open(
          this.lockPath,
          "wx"
        );

        return async () => {
          await handle.close();
          await fs
            .unlink(this.lockPath)
            .catch(() => undefined);
        };
      } catch (error: unknown) {
        const code =
          typeof error === "object" &&
          error !== null &&
          "code" in error
            ? String(
                (error as { code?: unknown }).code
              )
            : "";

        if (code !== "EEXIST") {
          throw error;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 25)
        );
      }
    }

    throw new Error(
      "DDT record store lock could not be acquired."
    );
  }

  async getByDDTNumber(
    ddtNumber: string
  ): Promise<DDTRegisteredRecordBundle | null> {
    const store = await this.readStore();

    return (
      store.records.find(
        (record) =>
          record.ddtNumber === ddtNumber
      ) ?? null
    );
  }

  async getByRecordId(
    ddtRecordId: string
  ): Promise<DDTRegisteredRecordBundle | null> {
    const store = await this.readStore();

    return (
      store.records.find(
        (record) =>
          record.ddtRecordId === ddtRecordId
      ) ?? null
    );
  }

  async saveRegistered(
    bundle: DDTRegisteredRecordBundle
  ): Promise<DDTRegisteredRecordBundle> {
    assertBundleBindings(bundle);

    const release = await this.acquireLock();

    try {
      const store = await this.readStore();

      const byNumber = store.records.find(
        (record) =>
          record.ddtNumber === bundle.ddtNumber
      );

      const byRecordId = store.records.find(
        (record) =>
          record.ddtRecordId === bundle.ddtRecordId
      );

      const existing = byNumber ?? byRecordId;

      if (existing) {
        if (
          existing.ddtNumber === bundle.ddtNumber &&
          existing.ddtRecordId === bundle.ddtRecordId &&
          sameDigest(
            existing.recordHash,
            bundle.recordHash
          )
        ) {
          return existing;
        }

        throw new Error(
          "Conflicting registered DDT record already exists."
        );
      }

      store.records.push(bundle);

      await this.writeStore(store);

      return bundle;
    } finally {
      await release();
    }
  }

  async registerBundleAtomically(
    sequenceDomain: string,
    buildBundle: DDTAtomicRecordBundleBuilder
  ): Promise<DDTRegisteredRecordBundle> {
    const release =
      await this.acquireLock();

    try {
      const store =
        await this.readStore();

      const domainEntries =
        store.records.filter(
          (record) =>
            record.registrationResult
              .sequenceDomain ===
            sequenceDomain
        );

      const latestSequence =
        domainEntries.reduce(
          (max, record) =>
            Math.max(
              max,
              record.registrationResult
                .registrationSequence
            ),
          0
        );

      const nextSequence =
        latestSequence + 1;

      /*
       * Nothing has been committed at this point.
       * If the builder throws, the sequence is not consumed.
       */
      const bundle =
        await buildBundle(nextSequence);

      assertBundleBindings(bundle);

      /*
       * Source-event uniqueness belongs inside the same lock
       * that allocates registration sequence / DDT Number.
       *
       * A concurrent caller that lost the race must not commit
       * a second immutable record for the same upstream event.
       *
       * The orchestrator will retry that caller through the
       * normal replay path, which decides exact replay vs
       * conflicting content using the existing immutable identity.
       */
      const candidateSourceEventKey =
        sourceEventKeyFromBundle(
          bundle
        );

      const racedSourceEvent =
        store.records.find(
          (record) =>
            sourceEventKeyFromBundle(
              record
            ) ===
            candidateSourceEventKey
        );

      if (racedSourceEvent) {
        throw new DDTSourceEventRaceError(
          racedSourceEvent.ddtNumber
        );
      }


      const result =
        bundle.registrationResult;

      if (
        result.sequenceDomain !==
        sequenceDomain
      ) {
        throw new Error(
          "Registration sequenceDomain mismatch."
        );
      }

      if (
        result.registrationSequence !==
        nextSequence
      ) {
        throw new Error(
          "Registration sequence allocation mismatch."
        );
      }

      if (
        store.records.some(
          (record) =>
            record.ddtRecordId ===
            bundle.ddtRecordId
        )
      ) {
        throw new Error(
          "ddtRecordId is already registered."
        );
      }

      if (
        store.records.some(
          (record) =>
            record.ddtNumber ===
            bundle.ddtNumber
        )
      ) {
        throw new Error(
          "DDT Number is already registered."
        );
      }

      if (
        store.records.some(
          (record) =>
            record.registrationResult
              .sequenceDomain ===
              sequenceDomain &&
            record.registrationResult
              .registrationSequence ===
              nextSequence
        )
      ) {
        throw new Error(
          "Registration sequence is already allocated."
        );
      }

      store.records.push(bundle);

      /*
       * One JSON-file commit establishes the Registration
       * Result and the complete retrievable Record Bundle.
       */
      await this.writeStore(store);

      return bundle;
    } finally {
      await release();
    }
  }

  async listRegistered():
    Promise<DDTRegisteredRecordBundle[]> {
    const store = await this.readStore();

    return [...store.records];
  }
}
