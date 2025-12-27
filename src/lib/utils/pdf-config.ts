/**
 * PDF Worker Configuration
 *
 * Centralized configuration for pdfjs-dist worker setup.
 * Handles basePath for GitHub Pages subdirectory deployment.
 */

/**
 * Get the base path for static assets.
 * Uses NEXT_PUBLIC_BASE_PATH environment variable, which is inlined at build time.
 */
export function getBasePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH || "";
}

/**
 * Get the full URL for the PDF.js worker file.
 * The worker file (pdf.worker.min.mjs) must be placed in the public folder.
 */
export function getPDFWorkerSrc(): string {
  return `${getBasePath()}/pdf.worker.min.mjs`;
}

/**
 * Configure pdfjs-dist with the correct worker source.
 * Call this before using any pdfjs-dist functions.
 *
 * @param pdfjsLib The imported pdfjs-dist module
 *
 * @example
 * import * as pdfjsLib from 'pdfjs-dist';
 * import { configurePDFWorker } from '@/lib/utils/pdf-config';
 *
 * configurePDFWorker(pdfjsLib);
 * const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
 */
export function configurePDFWorker(pdfjsLib: {
  GlobalWorkerOptions: { workerSrc: string };
}): void {
  pdfjsLib.GlobalWorkerOptions.workerSrc = getPDFWorkerSrc();
}
