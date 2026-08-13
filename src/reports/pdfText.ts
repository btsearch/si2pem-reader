import { getDocumentProxy } from "unpdf";

import { DEFAULT_MAX_PDF_BYTES } from "../constants.ts";
import { SI2PEMError, SI2PEM_ERROR_CODES } from "../errors.ts";

const MAX_EXTRACTED_TEXT_CHARACTERS = 8 * 1024 * 1024;

export type ExtractedPdfTextItem = {
  text: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
};

// oxlint-disable-next-line no-control-regex
const NON_TEXT_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g;

export type ExtractPdfTextOptions = {
  maxInputBytes?: number;
};

export async function extractPdfTextItems(bytes: Uint8Array, options: ExtractPdfTextOptions = {}): Promise<ExtractedPdfTextItem[]> {
  if (bytes.byteLength > (options.maxInputBytes ?? DEFAULT_MAX_PDF_BYTES))
    throw new SI2PEMError(SI2PEM_ERROR_CODES.responseTooLarge, "PDF exceeds the input size limit");
  const document = await getDocumentProxy(new Uint8Array(bytes), {
    useSystemFonts: true,
    disableFontFace: true,
    verbosity: 0,
  });

  try {
    const pages = await Promise.all(
      Array.from({ length: document.numPages }, async (_, index) => {
        const page = await document.getPage(index + 1);
        const content = await page.getTextContent();
        page.cleanup();
        return { pageNumber: index + 1, content };
      }),
    );

    const items: ExtractedPdfTextItem[] = [];
    let extractedCharacters = 0;
    for (const { pageNumber, content } of pages) {
      for (const raw of content.items) {
        if (!("str" in raw)) continue;
        const text = raw.str.replace(NON_TEXT_CHARACTERS, "").trim();
        if (!text) continue;
        extractedCharacters += text.length;
        if (extractedCharacters > MAX_EXTRACTED_TEXT_CHARACTERS)
          throw new SI2PEMError(SI2PEM_ERROR_CODES.responseTooLarge, "PDF exceeds the extracted text limit");
        items.push({
          text,
          pageNumber,
          x: raw.transform[4] ?? 0,
          y: raw.transform[5] ?? 0,
          width: raw.width,
        });
      }
    }
    return items;
  } finally {
    await document.loadingTask.destroy();
  }
}

export async function extractPdfText(bytes: Uint8Array, options: ExtractPdfTextOptions = {}): Promise<string> {
  return (await extractPdfTextItems(bytes, options)).map((item) => item.text).join("\n");
}
