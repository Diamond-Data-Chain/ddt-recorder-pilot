import { promises as fs } from "fs";
import path from "path";
import type {
  DDTRegistrationResult,
  DDTStoredRegistration,
} from "../types";
import type {
  DDTAtomicRegistrationBuilder,
  DDTRegistrationStore,
} from "./types";

type StoreFile = {
  version: 1;
  registrations: DDTStoredRegistration[];
};

const EMPTY_STORE: StoreFile = {
  version: 1,
  registrations: [],
};

export class JsonFileDDTRegistrationStore implements DDTRegistrationStore {
  private readonly filePath: string;
  private readonly lockPath: string;

  constructor(
    filePath = path.join(
      process.cwd(),
      ".ddc-state",
      "ddt-recorder",
      "registrations.json"
    )
  ) {
    this.filePath = filePath;
    this.lockPath = `${filePath}.lock`;
  }

  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
  }

  private async readStore(): Promise<StoreFile> {
    await this.ensureDirectory();

    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as StoreFile;

      if (parsed.version !== 1 || !Array.isArray(parsed.registrations)) {
        throw new Error("Invalid DDT registration store format.");
      }

      return parsed;
    } catch (error: unknown) {
      const code =
        typeof error === "object" && error !== null && "code" in error
          ? String((error as { code?: unknown }).code)
          : "";

      if (code === "ENOENT") {
        return {
          version: EMPTY_STORE.version,
          registrations: [],
        };
      }

      throw error;
    }
  }

  private async writeStore(store: StoreFile): Promise<void> {
    await this.ensureDirectory();

    const tempPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    const bytes = `${JSON.stringify(store, null, 2)}\n`;

    await fs.writeFile(tempPath, bytes, { encoding: "utf8", flag: "wx" });
    await fs.rename(tempPath, this.filePath);
  }

  private async acquireLock(): Promise<() => Promise<void>> {
    await this.ensureDirectory();

    for (let attempt = 0; attempt < 200; attempt += 1) {
      try {
        const handle = await fs.open(this.lockPath, "wx");

        return async () => {
          await handle.close();
          await fs.unlink(this.lockPath).catch(() => undefined);
        };
      } catch (error: unknown) {
        const code =
          typeof error === "object" && error !== null && "code" in error
            ? String((error as { code?: unknown }).code)
            : "";

        if (code !== "EEXIST") {
          throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }

    throw new Error("DDT registration store lock could not be acquired.");
  }

  async getByDDTNumber(
    ddtNumber: string
  ): Promise<DDTStoredRegistration | null> {
    const store = await this.readStore();

    return (
      store.registrations.find(
        (entry) => entry.result.ddtNumber === ddtNumber
      ) ?? null
    );
  }

  async getByRecordId(
    ddtRecordId: string
  ): Promise<DDTStoredRegistration | null> {
    const store = await this.readStore();

    return (
      store.registrations.find(
        (entry) => entry.result.ddtRecordId === ddtRecordId
      ) ?? null
    );
  }

  async getBySequence(
    sequenceDomain: string,
    registrationSequence: number
  ): Promise<DDTStoredRegistration | null> {
    const store = await this.readStore();

    return (
      store.registrations.find(
        (entry) =>
          entry.result.sequenceDomain === sequenceDomain &&
          entry.result.registrationSequence === registrationSequence
      ) ?? null
    );
  }

  async registerAtomically(
    sequenceDomain: string,
    buildRegistration: DDTAtomicRegistrationBuilder
  ): Promise<DDTStoredRegistration> {
    const release = await this.acquireLock();

    try {
      const store = await this.readStore();

      const domainEntries = store.registrations.filter(
        (entry) => entry.result.sequenceDomain === sequenceDomain
      );

      const latestSequence = domainEntries.reduce(
        (max, entry) => Math.max(max, entry.result.registrationSequence),
        0
      );

      const nextSequence = latestSequence + 1;
      const registration = buildRegistration(nextSequence);

      if (registration.result.sequenceDomain !== sequenceDomain) {
        throw new Error("Registration sequenceDomain mismatch.");
      }

      if (registration.result.registrationSequence !== nextSequence) {
        throw new Error("Registration sequence allocation mismatch.");
      }

      if (
        store.registrations.some(
          (entry) =>
            entry.result.ddtRecordId === registration.result.ddtRecordId
        )
      ) {
        throw new Error("ddtRecordId is already registered.");
      }

      if (
        store.registrations.some(
          (entry) =>
            entry.result.ddtNumber === registration.result.ddtNumber
        )
      ) {
        throw new Error("DDT Number is already registered.");
      }

      if (
        store.registrations.some(
          (entry) =>
            entry.result.sequenceDomain === sequenceDomain &&
            entry.result.registrationSequence === nextSequence
        )
      ) {
        throw new Error("Registration sequence is already allocated.");
      }

      store.registrations.push(registration);
      await this.writeStore(store);

      return registration;
    } finally {
      await release();
    }
  }

  async listRegistered(): Promise<DDTRegistrationResult[]> {
    const store = await this.readStore();
    return store.registrations.map((entry) => entry.result);
  }
}
