export type DDTOfflineArtifactKind =
  | "archive"
  | "verification-result";

export type DDTOfflineArtifactDescriptor = {
  ddtNumber: string;
  runId: string;
  artifact: DDTOfflineArtifactKind;

  fileName: string;
  mediaType: string;

  byteLength: number;
  sha256: string;
};

export type DDTOfflineStoredArtifact = {
  descriptor:
    DDTOfflineArtifactDescriptor;

  bytes: Buffer;
};

export interface DDTOfflineArtifactStore {
  put(
    input: {
      ddtNumber: string;
      runId: string;
      artifact:
        DDTOfflineArtifactKind;
      bytes: Buffer;
    }
  ): Promise<
    DDTOfflineArtifactDescriptor
  >;

  get(
    input: {
      ddtNumber: string;
      runId: string;
      artifact:
        DDTOfflineArtifactKind;
    }
  ): Promise<
    DDTOfflineStoredArtifact | null
  >;
}
