export interface ExtractionResult {
  text: string;
  method: 'pdf-text' | 'docx';
  warning?: string;
  /** Base64 data URLs of rendered page images (for OCR fallback on scanned PDFs/images) */
  renderedPages?: string[];
}

function cleanText(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .replace(/[ \t]{3,}/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .split('\n')
    .map(l => l.trim())
    .join('\n')
    .trim();
}

async function renderPdfPageToDataUrl(
  page: any,
  scale = 2
): Promise<string> {
  const viewport = page.getViewport({ scale });
  const canvas = new OffscreenCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d')!;
  await page.render({
    canvas: canvas as unknown as HTMLCanvasElement,
    canvasContext: ctx as unknown as CanvasRenderingContext2D,
    viewport,
  }).promise;
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
  const arrayBuf = await blob.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuf).reduce((data, byte) => data + String.fromCharCode(byte), '')
  );
  return `data:image/jpeg;base64,${base64}`;
}

export async function extractTextFromBuffer(
  buffer: Buffer | Uint8Array | ArrayBuffer,
  mimetype: string,
  filename: string
): Promise<ExtractionResult> {
  const lowerMime = mimetype.toLowerCase();
  const lowerName = filename.toLowerCase();

  if (lowerMime.includes('wordprocessingml') || lowerName.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer as Uint8Array) });
    return { text: cleanText(result.value), method: 'docx' };
  }

  if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();

    const bytes = new Uint8Array(buffer instanceof ArrayBuffer ? buffer : buffer as Uint8Array);
    const copy = new Uint8Array(bytes);
    const pdf = await pdfjsLib.getDocument({ data: copy }).promise;

    let extractedPages: string[] = [];
    const renderedPages: string[] = [];
    let totalTextLength = 0;

    // Render up to 5 pages for OCR fallback (scanned docs are often 1-3 pages)
    const pagesToRender = Math.min(pdf.numPages, 5);

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();

      // Reconstruct visual lines: PDF text items arrive in paint order, which
      // scrambles tabular transcripts. Group items by Y coordinate, sort each
      // line by X, and insert spaces where the gap exceeds the glyph advance.
      const lines = new Map<number, { x: number; str: string; end: number }[]>();
      for (const item of tc.items as any[]) {
        if (!item.str) continue;
        const y = Math.round(item.transform[5] / 2) * 2; // 2pt tolerance bucket
        const x = item.transform[4];
        const line = lines.get(y) ?? [];
        line.push({ x, str: item.str, end: x + (item.width || item.str.length * 4) });
        lines.set(y, line);
      }
      const pageLines = [...lines.entries()]
        .sort((a, b) => b[0] - a[0]) // top-to-bottom
        .map(([, items]) => {
          items.sort((a, b) => a.x - b.x); // left-to-right
          let text = '';
          let prevEnd = -Infinity;
          for (const it of items) {
            if (text && it.x - prevEnd > 1.5) text += ' ';
            text += it.str;
            prevEnd = it.end;
          }
          return text.trim();
        })
        .filter(Boolean);

      const pageText = pageLines.join('\n');
      totalTextLength += pageText.trim().length;

      if (pageText.trim().length > 10) {
        extractedPages.push(pageText.trim());
      }

      // Render pages for OCR fallback (first few pages only to limit memory)
      if (i <= pagesToRender) {
        try {
          const dataUrl = await renderPdfPageToDataUrl(page);
          renderedPages.push(dataUrl);
        } catch {
          // Rendering failed — skip this page for OCR
        }
      }
    }

    const fullText = extractedPages.join('\n');

    // If very little text was extracted, this is likely a scanned PDF
    if (totalTextLength < 50 || renderedPages.length > 0 && extractedPages.length === 0) {
      const warnMsg = renderedPages.length > 0
        ? 'SCANNED_PDF: This PDF appears to be a scanned image. OCR will be used to extract text.'
        : 'SCANNED_PDF: Could not extract meaningful text. OCR will be used.';
      return {
        text: cleanText(fullText),
        method: 'pdf-text',
        warning: warnMsg,
        renderedPages,
      };
    }

    return { text: cleanText(fullText), method: 'pdf-text' };
  }

  // Handle image files (JPG, PNG) — render to base64 for OCR
  if (lowerMime.startsWith('image/') || lowerName.match(/\.(png|jpg|jpeg|gif|bmp|tiff|webp)$/i)) {
    const bytes = new Uint8Array(buffer instanceof ArrayBuffer ? buffer : buffer as Uint8Array);
    const base64 = btoa(
      bytes.reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    const mimeForDataUrl = lowerMime.startsWith('image/') ? lowerMime : 'image/png';
    const dataUrl = `data:${mimeForDataUrl};base64,${base64}`;
    return {
      text: '',
      method: 'pdf-text',
      warning: `IMAGE_FILE: This is an image file. OCR will be used to extract text.`,
      renderedPages: [dataUrl],
    };
  }

  throw new Error('Unsupported file type: ' + mimetype + '. Supported formats: PDF, DOCX, JPG, PNG.');
}
