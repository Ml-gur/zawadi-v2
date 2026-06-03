import { createWorker } from 'tesseract.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import sharp from 'sharp';

export interface ExtractionResult {
  text: string;
  method: 'pdf-text' | 'pdf-ocr' | 'image-ocr' | 'docx';
  confidence?: number;
  warning?: string;
}

export async function extractTextFromBuffer(
  buffer: Buffer,
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
    const pdfParse = await import('pdf-parse');
    const data = await pdfParse.default(buffer);

    if (data.text.trim().length > 150) {
      return { text: data.text, method: 'pdf-text' };
    }

    const tmpDir = os.tmpdir();
    const pdfId = `ocr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const pdfPath = path.join(tmpDir, `${pdfId}.pdf`);
    fs.writeFileSync(pdfPath, buffer);

    const { fromPath } = await import('pdf2pic');
    const convert = fromPath(pdfPath, {
      format: 'png',
      width: 1600,
      height: 2400,
      density: 300,
      savePath: tmpDir,
      saveFilename: pdfId,
    });

    const worker = await createWorker('eng');
    let ocrText = '';
    let totalConfidence = 0;
    let pageCount = 0;

    try {
      const pages = await convert.bulk(-1);

      for (const page of pages) {
        const pagePath = path.join(tmpDir, `${pdfId}.${page}.png`);
        if (fs.existsSync(pagePath)) {
          const { data: pageResult } = await worker.recognize(pagePath);
          ocrText += pageResult.text + '\n';
          totalConfidence += pageResult.confidence;
          pageCount++;
          try { fs.unlinkSync(pagePath); } catch {}
        }
      }
    } finally {
      await worker.terminate();
      try { fs.unlinkSync(pdfPath); } catch {}
    }

    const avgConfidence = pageCount > 0 ? Math.round(totalConfidence / pageCount) : 0;
    const trimmed = ocrText.trim();

    return {
      text: trimmed,
      method: 'pdf-ocr',
      confidence: avgConfidence,
      ...(avgConfidence < 60 ? { warning: 'Low OCR confidence. Student may need to re-upload a clearer scan.' } : {}),
    };
  }

  if (lowerMime.startsWith('image/')) {
    const processed = await sharp(buffer)
      .grayscale()
      .normalize()
      .sharpen()
      .toFormat('png')
      .toBuffer();

    const worker = await createWorker('eng');
    try {
      const { data } = await worker.recognize(processed);
      return {
        text: data.text,
        method: 'image-ocr',
        confidence: Math.round(data.confidence),
        ...(data.confidence < 60 ? { warning: 'Low OCR confidence. Student may need to re-upload a clearer scan.' } : {}),
      };
    } finally {
      await worker.terminate();
    }
  }

  throw new Error('Unsupported file type: ' + mimetype);
}
