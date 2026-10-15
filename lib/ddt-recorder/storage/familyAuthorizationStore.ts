export type DDTFamilyAuthorization = {
  version: 1;

  ddtFamilyId: string;

  credential: {
    algorithm: "scrypt";
    salt: string;
    verifier: string;
  };

  createdAt: string;
};

export interface DDTFamilyAuthorizationStore {
  getByFamilyId(
    ddtFamilyId: string
  ): Promise<DDTFamilyAuthorization | null>;

  create(
    authorization: DDTFamilyAuthorization
  ): Promise<DDTFamilyAuthorization>;

  delete(
    ddtFamilyId: string
  ): Promise<void>;
}
