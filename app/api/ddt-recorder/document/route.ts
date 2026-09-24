import { NextResponse } from "next/server";
import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";
import * as mammoth from "mammoth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const MAX_DOCUMENT_BYTES =
  5 * 1024 * 1024;

type DocumentKind =
  | "pdf"
  | "docx"
  | "text"
  | "json";

function extensionOf(
  name: string
): string {
  const index =
    name.lastIndexOf(".");

  return index >= 0
    ? name
        .slice(index + 1)
        .toLowerCase()
    : "";
}

function detectDocumentKind(
  file: File
): DocumentKind | null {
  const mediaType =
    file.type
      .trim()
      .toLowerCase();

  const extension =
    extensionOf(
      file.name
    );

  if (
    mediaType ===
      "application/pdf" ||
    extension === "pdf"
  ) {
    return "pdf";
  }

  if (
    mediaType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === "docx"
  ) {
    return "docx";
  }

  if (
    mediaType ===
      "application/json" ||
    extension === "json"
  ) {
    return "json";
  }

  if (
    mediaType.startsWith(
      "text/"
    ) ||
    [
      "txt",
      "md",
      "markdown",
      "csv",
      "log",
    ].includes(
      extension
    )
  ) {
    return "text";
  }

  return null;
}

function normalizeText(
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

async function extractPdfText(
  bytes: Buffer
): Promise<string> {
  const parser =
    new PDFParse({
      data: bytes,
    });

  try {
    const result =
      await parser.getText();

    return normalizeText(
      result.text ?? ""
    );
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(
  bytes: Buffer
): Promise<string> {
  const result =
    await mammoth.extractRawText({
      buffer: bytes,
    });

  return normalizeText(
    result.value
  );
}

function extractJsonText(
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

function extractPlainText(
  bytes: Buffer
): string {
  return normalizeText(
    bytes.toString(
      "utf8"
    )
  );
}

export async function POST(
  request: Request
) {
  try {
    const contentType =
      request.headers
        .get(
          "content-type"
        )
        ?.toLowerCase() ??
      "";

    if (
      !contentType.startsWith(
        "multipart/form-data"
      )
    ) {
      return NextResponse.json(
        {
          status: "ERROR",
          error:
            "Content-Type must be multipart/form-data.",
        },
        {
          status: 415,
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
            "X-Content-Type-Options":
              "nosniff",
          },
        }
      );
    }

    const formData =
      await request.formData();

    const entry =
      formData.get(
        "file"
      );

    if (
      !(entry instanceof File)
    ) {
      return NextResponse.json(
        {
          status: "ERROR",
          error:
            "A document file is required.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
          },
        }
      );
    }

    if (
      entry.size < 1
    ) {
      return NextResponse.json(
        {
          status: "ERROR",
          error:
            "The uploaded document is empty.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
          },
        }
      );
    }

    if (
      entry.size >
      MAX_DOCUMENT_BYTES
    ) {
      return NextResponse.json(
        {
          status: "ERROR",
          error:
            "The uploaded document exceeds the 5 MiB pilot evidence limit.",
        },
        {
          status: 413,
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
          },
        }
      );
    }

    const kind =
      detectDocumentKind(
        entry
      );

    if (!kind) {
      return NextResponse.json(
        {
          status: "ERROR",
          error:
            "Unsupported document type. Use PDF, DOCX, TXT, MD, CSV or JSON.",
        },
        {
          status: 415,
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
          },
        }
      );
    }

    const bytes =
      Buffer.from(
        await entry.arrayBuffer()
      );

    let extractedText =
      "";

    if (
      kind === "pdf"
    ) {
      extractedText =
        await extractPdfText(
          bytes
        );
    } else if (
      kind === "docx"
    ) {
      extractedText =
        await extractDocxText(
          bytes
        );
    } else if (
      kind === "json"
    ) {
      extractedText =
        extractJsonText(
          bytes
        );
    } else {
      extractedText =
        extractPlainText(
          bytes
        );
    }

    if (
      !extractedText.trim()
    ) {
      return NextResponse.json(
        {
          status: "ERROR",
          error:
            kind ===
            "pdf"
              ? "No machine-readable text could be extracted from this PDF. Scanned/image-only PDFs are not OCR-enabled in this pilot."
              : "No readable text could be extracted from this document.",
        },
        {
          status: 422,
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
          },
        }
      );
    }

    return NextResponse.json(
      {
        status:
          "EXTRACTED",

        document: {
          name:
            entry.name,

          mediaType:
            entry.type ||
            "application/octet-stream",

          byteLength:
            entry.size,

          kind,
        },

        extraction: {
          text:
            extractedText,

          characterCount:
            extractedText.length,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
          "X-Content-Type-Options":
            "nosniff",
        },
      }
    );
  } catch (
    error: unknown
  ) {
    console.error(
      "DDT document extraction error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message.includes(
        "JSON"
      )
    ) {
      return NextResponse.json(
        {
          status: "ERROR",
          error:
            "The uploaded JSON document is invalid.",
        },
        {
          status: 400,
          headers: {
            "Cache-Control":
              "no-store, max-age=0",
          },
        }
      );
    }

    return NextResponse.json(
      {
        status: "ERROR",
        error:
          "The document could not be read.",
      },
      {
        status: 500,
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
          "X-Content-Type-Options":
            "nosniff",
        },
      }
    );
  }
}
