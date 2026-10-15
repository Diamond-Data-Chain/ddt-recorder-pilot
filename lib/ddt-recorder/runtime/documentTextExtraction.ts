import {
  PDFParse,
} from "pdf-parse";

import mammoth from "mammoth";

function normalizeExtractedText(
  value: string
): string {
  return value
    .replace(
      /\u0000/g,
      ""
    )
    .replace(
      /\r\n?/g,
      "\n"
    )
    .trim();
}

export async function extractPdfText(
  bytes: Buffer
): Promise<string> {
  const parser =
    new PDFParse({
      data: bytes,
    });

  try {
    const result =
      await parser.getText();

    return normalizeExtractedText(
      result.text ?? ""
    );
  } finally {
    await parser.destroy();
  }
}

export async function extractDocxText(
  bytes: Buffer
): Promise<string> {
  const result =
    await mammoth.extractRawText({
      buffer: bytes,
    });

  return normalizeExtractedText(
    result.value
  );
}

export function extractJsonText(
  bytes: Buffer
): string {
  const text =
    bytes.toString(
      "utf8"
    );

  const parsed =
    JSON.parse(
      text
    ) as unknown;

  return JSON.stringify(
    parsed,
    null,
    2
  );
}

export function extractPlainText(
  bytes: Buffer
): string {
  return normalizeExtractedText(
    bytes.toString(
      "utf8"
    )
  );
}
