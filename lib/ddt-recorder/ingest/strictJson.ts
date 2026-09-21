import type { DDTJsonValue } from "../producer/canonical";

const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER);

export class DDTStrictJsonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DDTStrictJsonError";
  }
}

function assertScalarString(value: string, where: string): void {
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);

    if (c >= 0xd800 && c <= 0xdbff) {
      if (i + 1 >= value.length) {
        throw new DDTStrictJsonError(
          `unpaired high surrogate at ${where}`
        );
      }

      const d = value.charCodeAt(i + 1);

      if (!(d >= 0xdc00 && d <= 0xdfff)) {
        throw new DDTStrictJsonError(
          `unpaired high surrogate at ${where}`
        );
      }

      i++;
      continue;
    }

    if (c >= 0xdc00 && c <= 0xdfff) {
      throw new DDTStrictJsonError(
        `unpaired low surrogate at ${where}`
      );
    }
  }
}

export function validateIJsonValue(
  value: unknown,
  where = "$"
): asserts value is DDTJsonValue {
  if (
    value === null ||
    typeof value === "boolean"
  ) {
    return;
  }

  if (typeof value === "string") {
    assertScalarString(value, where);
    return;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new DDTStrictJsonError(
        `non-finite number at ${where}`
      );
    }

    if (
      Number.isInteger(value) &&
      !Number.isSafeInteger(value)
    ) {
      throw new DDTStrictJsonError(
        `integer outside I-JSON interoperable range at ${where}: ${value}`
      );
    }

    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateIJsonValue(item, `${where}[${index}]`)
    );
    return;
  }

  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      assertScalarString(key, `${where}.<key>`);
      validateIJsonValue(child, `${where}.${key}`);
    }
    return;
  }

  throw new DDTStrictJsonError(
    `unsupported JSON value at ${where}: ${typeof value}`
  );
}

class StrictJsonParser {
  private pos = 0;

  constructor(private readonly text: string) {}

  parse(): DDTJsonValue {
    this.skipWhitespace();

    if (this.pos >= this.text.length) {
      throw this.error("empty JSON input");
    }

    const value = this.parseValue("$");

    this.skipWhitespace();

    if (this.pos !== this.text.length) {
      throw this.error("unexpected trailing data");
    }

    validateIJsonValue(value);

    return value;
  }

  private parseValue(where: string): DDTJsonValue {
    this.skipWhitespace();

    const c = this.text[this.pos];

    if (c === "{") return this.parseObject(where);
    if (c === "[") return this.parseArray(where);
    if (c === '"') return this.parseString(where);
    if (c === "t") return this.parseLiteral("true", true);
    if (c === "f") return this.parseLiteral("false", false);
    if (c === "n") return this.parseLiteral("null", null);

    if (c === "-" || (c >= "0" && c <= "9")) {
      return this.parseNumber(where);
    }

    throw this.error("invalid JSON value");
  }

  private parseObject(
    where: string
  ): { [key: string]: DDTJsonValue } {
    this.expect("{");
    this.skipWhitespace();

    const out: { [key: string]: DDTJsonValue } =
      Object.create(null) as { [key: string]: DDTJsonValue };

    const seen = new Set<string>();

    if (this.peek("}")) {
      this.pos++;
      return out;
    }

    while (true) {
      this.skipWhitespace();

      if (!this.peek('"')) {
        throw this.error("object member name must be a string");
      }

      const key = this.parseString(`${where}.<key>`);

      if (seen.has(key)) {
        throw new DDTStrictJsonError(
          `duplicate JSON member: ${JSON.stringify(key)}`
        );
      }

      seen.add(key);

      this.skipWhitespace();
      this.expect(":");

      const childWhere =
        where === "$" ? `$.${key}` : `${where}.${key}`;

      out[key] = this.parseValue(childWhere);

      this.skipWhitespace();

      if (this.peek("}")) {
        this.pos++;
        break;
      }

      this.expect(",");
    }

    return out;
  }

  private parseArray(where: string): DDTJsonValue[] {
    this.expect("[");
    this.skipWhitespace();

    const out: DDTJsonValue[] = [];

    if (this.peek("]")) {
      this.pos++;
      return out;
    }

    let index = 0;

    while (true) {
      out.push(this.parseValue(`${where}[${index}]`));
      index++;

      this.skipWhitespace();

      if (this.peek("]")) {
        this.pos++;
        break;
      }

      this.expect(",");
    }

    return out;
  }

  private parseString(where: string): string {
    const start = this.pos;

    this.expect('"');

    let escaped = false;

    while (this.pos < this.text.length) {
      const code = this.text.charCodeAt(this.pos);

      if (escaped) {
        if (
          code === 0x22 ||
          code === 0x5c ||
          code === 0x2f ||
          code === 0x62 ||
          code === 0x66 ||
          code === 0x6e ||
          code === 0x72 ||
          code === 0x74
        ) {
          escaped = false;
          this.pos++;
          continue;
        }

        if (code === 0x75) {
          const hexStart = this.pos + 1;
          const hexEnd = hexStart + 4;

          if (hexEnd > this.text.length) {
            throw this.error("truncated Unicode escape");
          }

          const hex = this.text.slice(hexStart, hexEnd);

          if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
            throw this.error("invalid Unicode escape");
          }

          this.pos = hexEnd;
          escaped = false;
          continue;
        }

        throw this.error("invalid JSON string escape");
      }

      if (code === 0x5c) {
        escaped = true;
        this.pos++;
        continue;
      }

      if (code === 0x22) {
        this.pos++;

        const token = this.text.slice(start, this.pos);

        let value: unknown;

        try {
          value = JSON.parse(token);
        } catch {
          throw this.error("invalid JSON string");
        }

        if (typeof value !== "string") {
          throw this.error("invalid JSON string");
        }

        assertScalarString(value, where);

        return value;
      }

      if (code <= 0x1f) {
        throw this.error("unescaped control character in string");
      }

      this.pos++;
    }

    throw this.error("unterminated JSON string");
  }

  private parseNumber(where: string): number {
    const rest = this.text.slice(this.pos);

    const match = rest.match(
      /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/
    );

    if (!match) {
      throw this.error("invalid JSON number");
    }

    const token = match[0];
    const end = this.pos + token.length;

    const next = this.text[end];

    if (
      next !== undefined &&
      !/[\s,\]}]/.test(next)
    ) {
      throw this.error("invalid JSON number");
    }

    this.pos = end;

    const isIntegerToken =
      !token.includes(".") &&
      !token.includes("e") &&
      !token.includes("E");

    if (isIntegerToken) {
      let integer: bigint;

      try {
        integer = BigInt(token);
      } catch {
        throw this.error("invalid JSON integer");
      }

      const magnitude =
        integer < 0n ? -integer : integer;

      if (magnitude > MAX_SAFE_INTEGER) {
        throw new DDTStrictJsonError(
          `integer outside I-JSON interoperable range at ${where}: ${token}`
        );
      }
    }

    const value = Number(token);

    if (!Number.isFinite(value)) {
      throw new DDTStrictJsonError(
        `non-finite number at ${where}`
      );
    }

    return value;
  }

  private parseLiteral<T extends null | boolean>(
    literal: string,
    value: T
  ): T {
    if (
      this.text.slice(
        this.pos,
        this.pos + literal.length
      ) !== literal
    ) {
      throw this.error(`invalid JSON literal`);
    }

    this.pos += literal.length;

    return value;
  }

  private skipWhitespace(): void {
    while (this.pos < this.text.length) {
      const c = this.text.charCodeAt(this.pos);

      if (
        c === 0x20 ||
        c === 0x09 ||
        c === 0x0a ||
        c === 0x0d
      ) {
        this.pos++;
        continue;
      }

      break;
    }
  }

  private expect(expected: string): void {
    if (!this.peek(expected)) {
      throw this.error(
        `expected ${JSON.stringify(expected)}`
      );
    }

    this.pos += expected.length;
  }

  private peek(value: string): boolean {
    return this.text.startsWith(value, this.pos);
  }

  private error(message: string): DDTStrictJsonError {
    return new DDTStrictJsonError(
      `${message} at character ${this.pos}`
    );
  }
}

export function parseStrictJson(
  text: string
): DDTJsonValue {
  if (typeof text !== "string") {
    throw new DDTStrictJsonError(
      "JSON input must be text"
    );
  }

  return new StrictJsonParser(text).parse();
}
