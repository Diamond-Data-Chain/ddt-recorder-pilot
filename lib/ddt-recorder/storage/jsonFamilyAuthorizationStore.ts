import { promises as fs } from "fs";
import path from "path";

import type {
  DDTFamilyAuthorization,
  DDTFamilyAuthorizationStore,
} from "./familyAuthorizationStore";

type FamilyAuthorizationStoreFile = {
  version: 1;
  families: DDTFamilyAuthorization[];
};

const EMPTY_STORE: FamilyAuthorizationStoreFile = {
  version: 1,
  families: [],
};

export class JsonFileDDTFamilyAuthorizationStore
  implements DDTFamilyAuthorizationStore
{
  private readonly filePath: string;
  private readonly lockPath: string;

  constructor(
    filePath = path.join(
      process.cwd(),
      ".ddc-state",
      "ddt-recorder",
      "family-authorizations.json"
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

  private async readStore():
    Promise<FamilyAuthorizationStoreFile> {
    await this.ensureDirectory();

    try {
      const raw = await fs.readFile(
        this.filePath,
        "utf8"
      );

      const parsed =
        JSON.parse(raw) as FamilyAuthorizationStoreFile;

      if (
        parsed.version !== 1 ||
        !Array.isArray(parsed.families)
      ) {
        throw new Error(
          "Invalid DDT family authorization store format."
        );
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
          families: [],
        };
      }

      throw error;
    }
  }

  private async writeStore(
    store: FamilyAuthorizationStoreFile
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
      "DDT family authorization store lock could not be acquired."
    );
  }

  async getByFamilyId(
    ddtFamilyId: string
  ): Promise<DDTFamilyAuthorization | null> {
    const store = await this.readStore();

    return (
      store.families.find(
        (family) =>
          family.ddtFamilyId === ddtFamilyId
      ) ?? null
    );
  }

  async create(
    authorization: DDTFamilyAuthorization
  ): Promise<DDTFamilyAuthorization> {
    const release = await this.acquireLock();

    try {
      const store = await this.readStore();

      const existing = store.families.find(
        (family) =>
          family.ddtFamilyId ===
          authorization.ddtFamilyId
      );

      if (existing) {
        throw new Error(
          "DDT family authorization already exists."
        );
      }

      store.families.push(authorization);

      await this.writeStore(store);

      return authorization;
    } finally {
      await release();
    }
  }

  async delete(
    ddtFamilyId: string
  ): Promise<void> {
    const release = await this.acquireLock();

    try {
      const store = await this.readStore();

      const remaining = store.families.filter(
        (family) =>
          family.ddtFamilyId !== ddtFamilyId
      );

      if (
        remaining.length ===
        store.families.length
      ) {
        return;
      }

      await this.writeStore({
        version: 1,
        families: remaining,
      });
    } finally {
      await release();
    }
  }
}
