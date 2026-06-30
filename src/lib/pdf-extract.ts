/**
 * Client-side PDF text extraction using Mozilla PDF.js (pdfjs-dist v6).
 * Runs entirely in the browser — no server round-trip needed.
 */

// Vite resolves ?url imports to the hashed asset URL at build time.
// This is the correct way to reference the PDF.js worker in Vite projects.
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

let _pdfjs: typeof import("pdfjs-dist") | null = null;

async function getPdfJs() {
  if (_pdfjs) return _pdfjs;
  _pdfjs = await import("pdfjs-dist");
  _pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return _pdfjs;
}

/**
 * Extract all text content from a PDF File object.
 * Returns the concatenated text of all pages, or throws on failure.
 */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await getPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    // Each item is a TextItem or TextMarkedContent. Filter to text items only.
    const pageText = content.items
      .filter((item): item is Extract<typeof item, { str: string }> => "str" in item)
      .map((item) => (item as { str: string }).str)
      .join(" ");

    if (pageText.trim()) {
      pageTexts.push(pageText.trim());
    }
  }

  return pageTexts.join("\n\n");
}

/** Returns true if the file is a PDF based on extension or MIME type. */
export function isPdf(file: File): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}
