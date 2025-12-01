// PDF Worker - Extracts text from PDF files using pdfjs-dist
// This runs in a Web Worker to avoid blocking the main thread

import * as pdfjsLib from 'pdfjs-dist';
import type { PDFContent, PDFPageContent, PDFWorkerMessage, PDFWorkerResponse } from '@/lib/parsers/types';

// Set up the worker source for pdfjs-dist
// Use a local file served from the public folder for reliability
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Send a message back to the main thread
function postMessage(message: PDFWorkerResponse): void {
  self.postMessage(message);
}

// Extract text from a single page
async function extractPageContent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  page: any,
  pageNumber: number
): Promise<PDFPageContent> {
  const textContent = await page.getTextContent();

  const lines: string[] = [];
  let currentLine = '';
  let lastY: number | null = null;

  // Group text items by their Y position to form lines
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const item of textContent.items as any[]) {
    if (!item.str) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transform = item.transform as any;
    const y = transform ? transform[5] : 0;

    // If Y position changes significantly, start a new line
    if (lastY !== null && Math.abs(y - lastY) > 3) {
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
      currentLine = item.str;
    } else {
      // Add space between items on the same line
      if (currentLine && !currentLine.endsWith(' ') && !item.str.startsWith(' ')) {
        currentLine += ' ';
      }
      currentLine += item.str;
    }

    lastY = y;
  }

  // Don't forget the last line
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return {
    pageNumber,
    text: lines.join('\n'),
    lines,
  };
}

// Parse a PDF file and extract all content
async function parsePDF(fileData: ArrayBuffer): Promise<PDFContent> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(fileData),
    useSystemFonts: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const pages: PDFPageContent[] = [];

  for (let i = 1; i <= numPages; i++) {
    postMessage({
      type: 'progress',
      percent: Math.round((i / numPages) * 90),
      message: `Processing page ${i} of ${numPages}`,
    });

    const page = await pdf.getPage(i);
    const pageContent = await extractPageContent(page, i);
    pages.push(pageContent);
  }

  // Extract metadata
  const metadata = await pdf.getMetadata().catch(() => null);

  const pdfMetadata: PDFContent['metadata'] = {};
  if (metadata?.info) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const info = metadata.info as any;
    if (info.Title) pdfMetadata.title = info.Title;
    if (info.Author) pdfMetadata.author = info.Author;
    if (info.Creator) pdfMetadata.creator = info.Creator;
    if (info.CreationDate) {
      // PDF dates are in format D:YYYYMMDDHHmmss
      const dateStr = info.CreationDate as string;
      const match = dateStr.match(/D:(\d{4})(\d{2})(\d{2})/);
      if (match) {
        pdfMetadata.creationDate = new Date(
          parseInt(match[1]),
          parseInt(match[2]) - 1,
          parseInt(match[3])
        );
      }
    }
  }

  return {
    pages,
    fullText: pages.map((p) => p.text).join('\n\n'),
    metadata: pdfMetadata,
  };
}

// Handle messages from the main thread
self.onmessage = async (event: MessageEvent<PDFWorkerMessage>) => {
  const message = event.data;

  if (message.type === 'parse') {
    try {
      postMessage({
        type: 'progress',
        percent: 5,
        message: 'Loading PDF...',
      });

      const content = await parsePDF(message.fileData);

      postMessage({
        type: 'progress',
        percent: 100,
        message: 'Complete',
      });

      postMessage({
        type: 'content',
        content,
      });
    } catch (error) {
      postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : 'Failed to parse PDF',
      });
    }
  } else if (message.type === 'cancel') {
    postMessage({ type: 'cancelled' });
  }
};

export {};
