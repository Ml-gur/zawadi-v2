export interface ExtractionResult {
  text: string;
  method: 'pdf-text' | 'docx';
  warning?: string;
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

      if (pageText.trim().length > 10) {
        extractedPages.push(pageText.trim());
      }

      if (pdf.numPages === 1 && pageText.trim().length <= 50) {
        const viewport = page.getViewport({ scale: 2 });
        const canvas = new OffscreenCanvas(viewport.width, viewport.height);
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvas: canvas as unknown as HTMLCanvasElement, canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise;
        await canvas.convertToBlob({ type: 'image/png' });
        const warnMsg = 'This PDF appears to be a scanned image. Only text-based PDFs are supported for extraction.';
        return { text: cleanText(pageText), method: 'pdf-text', warning: warnMsg };
      }
    }

    const fullText = extractedPages.join('\n');

    if (fullText.trim().length < 50) {
      return {
        text: cleanText(fullText),
        method: 'pdf-text',
        warning: 'Could not extract meaningful text. This may be a scanned document.'
      };
    }

    return { text: cleanText(fullText), method: 'pdf-text' };
  }

  if (lowerMime.startsWith('image/') || lowerName.match(/\.(png|jpg|jpeg|gif|bmp|tiff|webp)$/i)) {
    throw new Error(
      'Image-based documents cannot be processed directly. Please upload a PDF or DOCX version of this document.'
    );
  }

  throw new Error('Unsupported file type: ' + mimetype + '. Supported formats: PDF, DOCX.');
}
