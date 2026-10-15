import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "crypto";
import { promisify } from "util";

import type {
  DDTFamilyAuthorization,
} from "./familyAuthorizationStore";

const scrypt = promisify(scryptCallback);

const SALT_BYTES = 16;
const KEY_BYTES = 32;

export async function createFamilyCredential(
  ddtFamilyId: string,
  password: string,
  createdAt: string
): Promise<DDTFamilyAuthorization> {
  if (!password) {
    throw new Error(
      "Family owner password is required."
    );
  }

  const salt = randomBytes(SALT_BYTES);

  const derived = await scrypt(
    password,
    salt,
    KEY_BYTES
  );

  return {
    version: 1,
    ddtFamilyId,

    credential: {
      algorithm: "scrypt",
      salt: salt.toString("hex"),
      verifier: (
        derived as Buffer
      ).toString("hex"),
    },

    createdAt,
  };
}

export async function verifyFamilyCredential(
  authorization: DDTFamilyAuthorization,
  password: string
): Promise<boolean> {
  if (!password) {
    return false;
  }

  if (
    authorization.credential.algorithm !==
    "scrypt"
  ) {
    throw new Error(
      "Unsupported family credential algorithm."
    );
  }

  const salt = Buffer.from(
    authorization.credential.salt,
    "hex"
  );

  const expected = Buffer.from(
    authorization.credential.verifier,
    "hex"
  );

  const derived = await scrypt(
    password,
    salt,
    expected.length
  );

  const actual = derived as Buffer;

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(
    actual,
    expected
  );
}
