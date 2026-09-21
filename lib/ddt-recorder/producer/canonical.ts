import { createHash } from "crypto";

import type { DDTStructuralDigest } from "../types";

export type DDTJsonValue =
  | null
  | boolean
  | number
  | string
  | DDTJsonValue[]
  | { [key: string]: DDTJsonValue };

function assertScalarString(value: string): void {
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);

    if (c >= 0xd800 && c <= 0xdbff) {
      if (i + 1 >= value.length) {
        throw new Error("unpaired high surrogate");
      }

      const d = value.charCodeAt(i + 1);

      if (!(d >= 0xdc00 && d <= 0xdfff)) {
        throw new Error("unpaired high surrogate");
      }

      i++;
    } else if (c >= 0xdc00 && c <= 0xdfff) {
      throw new Error("unpaired low surrogate");
    }
  }
}

export function canonicalizeJcs(value: DDTJsonValue): string {
  if (value === null) return "null";

  const type = typeof value;

  if (type === "boolean") {
    return value ? "true" : "false";
  }

  if (type === "number") {
    if (!Number.isFinite(value as number)) {
      throw new Error("non-finite number");
    }

    return JSON.stringify(value);
  }

  if (type === "string") {
    assertScalarString(value as string);
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeJcs).join(",")}]`;
  }

  if (type === "object") {
    const object = value as Record<string, DDTJsonValue>;
    const keys = Object.keys(object);

    for (const key of keys) {
      assertScalarString(key);
    }

    // ECMAScript UTF-16 code-unit ordering, matching the Python
    // reference implementation's Node JCS engine.
    keys.sort();

    return `{${keys
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalizeJcs(object[key])}`
      )
      .join(",")}}`;
  }

  throw new Error(`unsupported JSON type: ${type}`);
}

export function digestJcs(
  value: DDTJsonValue
): DDTStructuralDigest {
  const canonical = canonicalizeJcs(value);

  return {
    algorithm: "SHA-256",
    value: createHash("sha256")
      .update(Buffer.from(canonical, "utf8"))
      .digest("hex"),
  };
}
