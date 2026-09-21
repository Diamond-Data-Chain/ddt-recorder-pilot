import { promises as fs } from "fs";
import path from "path";

import Ajv2020, {
  type ErrorObject,
  type ValidateFunction,
} from "ajv/dist/2020";
import addFormats from "ajv-formats";

type DDTLocalSchemaName =
  | "envelope"
  | "receipt"
  | "registrationResult";

export type DDTSchemaVerificationResult = {
  status: "PASS" | "FAIL";
  errors: string[];
};

const EXTERNAL_SCHEMAS = [
  {
    file:
      "ddt-evidence-manifest-v0.1.schema.json",
    expectedId:
      "https://diamonddatachain.org/specifications/ddt/evidence-manifest/0.1.0-draft.1/schema.json",
  },
  {
    file:
      "ddt-preservation-contract-v0.3.schema.json",
    expectedId:
      "https://diamonddatachain.org/specifications/ddt/preservation-contract/0.3.0-draft.1/schema.json",
  },
  {
    file:
      "ddt-signature-proof-v0.2.schema.json",
    expectedId:
      "https://diamonddatachain.org/specifications/ddt/signature-proof/0.2.0-draft.1/schema.json",
  },
] as const;

const TARGET_SCHEMAS = {
  envelope:
    "ddt-record-envelope-v0.3-draft.5.schema.json",
  receipt:
    "ddt-conformance-receipt-v0.3.schema.json",
  registrationResult:
    "ddt-registration-result-v0.1.schema.json",
} as const;

type SchemaObject = {
  $id?: string;
  [key: string]: unknown;
};

async function loadJson(
  filePath: string
): Promise<SchemaObject> {
  const raw = await fs.readFile(
    filePath,
    "utf8"
  );

  return JSON.parse(raw) as SchemaObject;
}

function formatErrors(
  errors: ErrorObject[] | null | undefined
): string[] {
  return (errors ?? []).map((error) => {
    const instancePath =
      error.instancePath || "/";

    return `${instancePath} ${error.message ?? "schema validation failed"}`;
  });
}

async function buildValidators(
  ddtRoot: string
): Promise<
  Record<DDTLocalSchemaName, ValidateFunction>
> {
  const schemasDir = path.join(
    ddtRoot,
    "schemas"
  );

  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    validateFormats: true,
  });

  addFormats(ajv);

  for (const dependency of EXTERNAL_SCHEMAS) {
    const schema = await loadJson(
      path.join(
        schemasDir,
        dependency.file
      )
    );

    if (schema.$id !== dependency.expectedId) {
      throw new Error(
        `Schema $id mismatch for ${dependency.file}: expected ${dependency.expectedId}, got ${String(schema.$id)}`
      );
    }

    ajv.addSchema(schema);
  }

  const validators = {} as Record<
    DDTLocalSchemaName,
    ValidateFunction
  >;

  for (
    const [name, file] of Object.entries(
      TARGET_SCHEMAS
    ) as Array<
      [
        DDTLocalSchemaName,
        (typeof TARGET_SCHEMAS)[DDTLocalSchemaName],
      ]
    >
  ) {
    const schema = await loadJson(
      path.join(
        schemasDir,
        file
      )
    );

    validators[name] = ajv.compile(schema);
  }

  return validators;
}

const validatorCache = new Map<
  string,
  Promise<
    Record<
      DDTLocalSchemaName,
      ValidateFunction
    >
  >
>();

function validatorsFor(
  ddtRoot: string
) {
  const root = path.resolve(ddtRoot);

  let cached = validatorCache.get(root);

  if (!cached) {
    cached = buildValidators(root);
    validatorCache.set(root, cached);
  }

  return cached;
}

async function verifySchema(
  name: DDTLocalSchemaName,
  value: unknown,
  ddtRoot = path.join(
    process.cwd(),
    "docs",
    "ddt"
  )
): Promise<DDTSchemaVerificationResult> {
  const validators =
    await validatorsFor(ddtRoot);

  const validator = validators[name];
  const valid = validator(value);

  return valid
    ? {
        status: "PASS",
        errors: [],
      }
    : {
        status: "FAIL",
        errors: formatErrors(
          validator.errors
        ),
      };
}

export function verifyEnvelopeSchema(
  value: unknown,
  ddtRoot?: string
): Promise<DDTSchemaVerificationResult> {
  return verifySchema(
    "envelope",
    value,
    ddtRoot
  );
}

export function verifyConformanceReceiptSchema(
  value: unknown,
  ddtRoot?: string
): Promise<DDTSchemaVerificationResult> {
  return verifySchema(
    "receipt",
    value,
    ddtRoot
  );
}

export function verifyRegistrationResultSchema(
  value: unknown,
  ddtRoot?: string
): Promise<DDTSchemaVerificationResult> {
  return verifySchema(
    "registrationResult",
    value,
    ddtRoot
  );
}
