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
    const result = await mammoth.extractRawText({ buffer });
    return { text: cleanText(result.value), method: 'docx' };
  }

  if (lowerMime === 'application/pdf' || lowerName.endsWith('.pdf')) {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();

    const arrayBuf = buffer instanceof ArrayBuffer ? buffer : (buffer as Uint8Array).buffer;
    const pdf = await pdfjsLib.getDocument({ data: arrayBuf.slice(0) }).promise;

    let extractedPages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();

      const items = tc.items
        .map((item: any) => item.str)
        .filter(Boolean);

      const pageText = items.join(' ');

      if (pageText.trim().length > 10) {
        extractedPages.push(pageText.trim());
      }

      if (pdf.numPages === 1 && pageText.trim().length <= 50) {
        const viewport = page.getViewport({ scale: 2 });
        const canvas = new OffscreenCanvas(viewport.width, viewport.height);
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob = await canvas.convertToBlob({ type: 'image/png' });
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
