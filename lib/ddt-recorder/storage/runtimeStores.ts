import path from "path";

import {
  JsonFileDDTRegistrationStore,
} from "./jsonFileStore";

import {
  JsonFileDDTRecordStore,
} from "./jsonRecordStore";

import type {
  DDTRegistrationStore,
} from "./types";

import type {
  DDTRecordStore,
} from "./recordStore";

import type {
  DDTOfflineArtifactStore,
} from "./offlineArtifactStore";

import {
  LocalFileDDTOfflineArtifactStore,
} from "./localOfflineArtifactStore";

import {
  PostgresDDTOfflineArtifactStore,
  PostgresDDTRecordStore,
  PostgresDDTRegistrationStore,
} from "./postgresStores";

export type DDTRecorderStorageBackend =
  | "json"
  | "postgres";

export type DDTRecorderStores = {
  backend:
    DDTRecorderStorageBackend;

  registrationStore:
    DDTRegistrationStore;

  recordStore:
    DDTRecordStore;

  offlineArtifactStore:
    DDTOfflineArtifactStore;
};

function configuredBackend():
  DDTRecorderStorageBackend {
  const value =
    process.env
      .DDT_RECORDER_STORAGE_BACKEND
      ?.trim()
      .toLowerCase() ||
    "json";

  if (
    value !== "json" &&
    value !== "postgres"
  ) {
    throw new Error(
      `Unsupported DDT Recorder storage backend: ${value}`
    );
  }

  return value;
}

function configuredStateDir():
  string {
  return (
    process.env
      .DDT_RECORDER_STATE_DIR
      ?.trim() ||
    path.join(
      process.cwd(),
      ".ddc-state",
      "ddt-recorder"
    )
  );
}

function configuredOfflineDir():
  string {
  return (
    process.env
      .DDT_RECORDER_OFFLINE_DIR
      ?.trim() ||
    path.join(
      configuredStateDir(),
      "offline-packages"
    )
  );
}

function buildJsonStores():
  DDTRecorderStores {
  const stateDir =
    configuredStateDir();

  return {
    backend:
      "json",

    registrationStore:
      new JsonFileDDTRegistrationStore(
        path.join(
          stateDir,
          "registrations.json"
        )
      ),

    recordStore:
      new JsonFileDDTRecordStore(
        path.join(
          stateDir,
          "records.json"
        )
      ),

    offlineArtifactStore:
      new LocalFileDDTOfflineArtifactStore(
        configuredOfflineDir()
      ),
  };
}


function buildPostgresStores():
  DDTRecorderStores {
  return {
    backend:
      "postgres",

    registrationStore:
      new PostgresDDTRegistrationStore(),

    recordStore:
      new PostgresDDTRecordStore(),

    offlineArtifactStore:
      new PostgresDDTOfflineArtifactStore(),
  };
}

let stores:
  DDTRecorderStores
  | undefined;

export function getReferenceRecorderStores():
  DDTRecorderStores {
  if (!stores) {
    const backend =
      configuredBackend();

    switch (backend) {
      case "json":
        stores =
          buildJsonStores();
        break;

      case "postgres":
        stores =
          buildPostgresStores();
        break;

      default: {
        const exhaustive:
          never =
            backend;

        throw new Error(
          `Unsupported DDT Recorder storage backend: ${exhaustive}`
        );
      }
    }
  }

  return stores;
}

export function getReferenceRecorderRegistrationStore():
  DDTRegistrationStore {
  return getReferenceRecorderStores()
    .registrationStore;
}

export function getReferenceRecorderRecordStore():
  DDTRecordStore {
  return getReferenceRecorderStores()
    .recordStore;
}

export function getReferenceRecorderStorageBackend():
  DDTRecorderStorageBackend {
  return getReferenceRecorderStores()
    .backend;
}


export function getReferenceRecorderOfflineArtifactStore():
  DDTOfflineArtifactStore {
  return getReferenceRecorderStores()
    .offlineArtifactStore;
}
