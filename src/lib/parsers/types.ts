// Parser types for bank statement processing

export interface ParsedTransaction {
  date: Date;
  description: string;
  amount: number; // In cents, positive for credits, negative for debits
  balance?: number; // Running balance if available
  reference?: string;
  rawText?: string; // Original text for debugging
}

export interface ParseResult {
  success: boolean;
  transactions: ParsedTransaction[];
  accountName?: string;
  accountNumber?: string; // Last 4 digits only for privacy
  statementPeriod?: {
    start: Date;
    end: Date;
  };
  errors: string[];
  warnings: string[];
}

export interface BankParser {
  name: string;
  bankCode: string;

  /**
   * Check if this parser can handle the given PDF content
   */
  canParse(text: string): boolean;

  /**
   * Parse the PDF text content and extract transactions
   */
  parse(text: string): ParseResult;
}

export interface PDFPageContent {
  pageNumber: number;
  text: string;
  lines: string[];
}

export interface PDFContent {
  pages: PDFPageContent[];
  fullText: string;
  metadata?: {
    title?: string;
    author?: string;
    creator?: string;
    creationDate?: Date;
  };
}

// Worker message types
export type PDFWorkerMessage =
  | { type: 'parse'; fileData: ArrayBuffer; fileName: string }
  | { type: 'cancel' };

export type PDFWorkerResponse =
  | { type: 'progress'; percent: number; message: string }
  | { type: 'content'; content: PDFContent }
  | { type: 'error'; error: string }
  | { type: 'cancelled' };
