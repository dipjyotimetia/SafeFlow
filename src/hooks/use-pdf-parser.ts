'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { PDFContent, PDFWorkerResponse, ParseResult } from '@/lib/parsers/types';
import { parserRegistry } from '@/lib/parsers';

export interface PDFParserState {
  isLoading: boolean;
  progress: number;
  progressMessage: string;
  error: string | null;
  pdfContent: PDFContent | null;
  parseResult: ParseResult | null;
}

export interface PDFParserActions {
  parseFile: (file: File, preferredBank?: string) => Promise<void>;
  reset: () => void;
}

export function usePDFParser(): PDFParserState & PDFParserActions {
  const [state, setState] = useState<PDFParserState>({
    isLoading: false,
    progress: 0,
    progressMessage: '',
    error: null,
    pdfContent: null,
    parseResult: null,
  });

  const workerRef = useRef<Worker | null>(null);

  // Clean up worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      progress: 0,
      progressMessage: '',
      error: null,
      pdfContent: null,
      parseResult: null,
    });
  }, []);

  const parseFile = useCallback(async (file: File, preferredBank?: string) => {
    // Reset state
    setState({
      isLoading: true,
      progress: 0,
      progressMessage: 'Starting...',
      error: null,
      pdfContent: null,
      parseResult: null,
    });

    try {
      // Read file as ArrayBuffer
      const fileData = await file.arrayBuffer();

      // Create worker
      // In Next.js, we use the worker-loader or inline the worker
      // For simplicity, we'll use a dynamic import approach
      const worker = new Worker(
        new URL('../workers/pdf.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      // Set up message handler
      const result = await new Promise<PDFContent>((resolve, reject) => {
        worker.onmessage = (event: MessageEvent<PDFWorkerResponse>) => {
          const message = event.data;

          switch (message.type) {
            case 'progress':
              setState((prev) => ({
                ...prev,
                progress: message.percent,
                progressMessage: message.message,
              }));
              break;

            case 'content':
              resolve(message.content);
              break;

            case 'error':
              reject(new Error(message.error));
              break;

            case 'cancelled':
              reject(new Error('Parsing cancelled'));
              break;
          }
        };

        worker.onerror = (error) => {
          reject(new Error(error.message || 'Worker error'));
        };

        // Send parse message
        worker.postMessage({
          type: 'parse',
          fileData,
          fileName: file.name,
        });
      });

      // Clean up worker
      worker.terminate();
      workerRef.current = null;

      // Parse the extracted content
      setState((prev) => ({
        ...prev,
        progressMessage: 'Parsing transactions...',
      }));

      const parseResult = parserRegistry.parse(result, preferredBank);

      setState({
        isLoading: false,
        progress: 100,
        progressMessage: 'Complete',
        error: null,
        pdfContent: result,
        parseResult,
      });
    } catch (error) {
      setState({
        isLoading: false,
        progress: 0,
        progressMessage: '',
        error: error instanceof Error ? error.message : 'Failed to parse PDF',
        pdfContent: null,
        parseResult: null,
      });
    }
  }, []);

  return {
    ...state,
    parseFile,
    reset,
  };
}
