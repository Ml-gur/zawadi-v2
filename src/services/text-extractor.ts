import { createWorker } from 'tesseract.js';

export interface ExtractionResult {
  text: string;
  method: 'pdf-text' | 'pdf-ocr' | 'image-ocr' | 'docx';
  confidence?: number;
  warning?: string;
}

async function pdfToImages(file: File): Promise<Blob[]> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const arrayBuf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
  const pages: Blob[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = new OffscreenCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    pages.push(blob);
  }

  return pages;
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
    return { text: result.value, method: 'docx' };
  }

  if (lowerMime === 'application/pdf') {
    const file = new File([buffer], filename, { type: mimetype });
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();

    const arrayBuf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;

    const firstPage = await pdf.getPage(1);
    const viewport = firstPage.getViewport({ scale: 1 });
    const textContent = await firstPage.getTextContent();
    const rawText = textContent.items.map((item: any) => item.str).join(' ');

    if (rawText.trim().length > 150) {
      let fullText = rawText;
      for (let i = 2; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const tc = await page.getTextContent();
        fullText += '\n' + tc.items.map((item: any) => item.str).join(' ');
      }
      return { text: fullText, method: 'pdf-text' };
    }

    const pages = await pdfToImages(file);
    const worker = await createWorker('eng');
    let ocrText = '';
    let totalConfidence = 0;
    let pageCount = 0;

    try {
      for (const pageBlob of pages) {
        const { data: pageResult } = await worker.recognize(pageBlob);
        ocrText += pageResult.text + '\n';
        totalConfidence += pageResult.confidence;
        pageCount++;
      }
    } finally {
      await worker.terminate();
    }

    const avgConfidence = pageCount > 0 ? Math.round(totalConfidence / pageCount) : 0;
    const trimmed = ocrText.trim();

    return {
      text: trimmed,
      method: 'pdf-ocr',
      confidence: avgConfidence,
      ...(avgConfidence < 60 ? { warning: 'Low OCR confidence. Re-upload a clearer scan.' } : {}),
    };
  }

  if (lowerMime.startsWith('image/')) {
    const blob = new Blob([buffer], { type: mimetype });
    const worker = await createWorker('eng');
    try {
      const { data } = await worker.recognize(blob);
      return {
        text: data.text,
        method: 'image-ocr',
        confidence: Math.round(data.confidence),
        ...(data.confidence < 60 ? { warning: 'Low OCR confidence. Re-upload a clearer scan.' } : {}),
      };
    } finally {
      await worker.terminate();
    }
  }

  throw new Error('Unsupported file type: ' + mimetype);
}
