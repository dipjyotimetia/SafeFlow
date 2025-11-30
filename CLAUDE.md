# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeFlow is an Australian personal finance management application built with Next.js 16. It features offline-first architecture using IndexedDB (via Dexie) for local storage, PDF bank statement parsing, investment tracking, superannuation management, and optional encrypted Google Drive sync.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build (standalone output for Docker)
npm run lint     # Run ESLint
npm start        # Start production server
```

## Architecture

### Data Layer (IndexedDB with Dexie)
- **Schema**: `src/lib/db/schema.ts` - Defines all tables (accounts, transactions, holdings, superannuation, etc.)
- **Database**: `src/lib/db/index.ts` - Initialization, seeding, export/clear utilities
- All monetary values stored in **cents** (integers) to avoid floating-point issues
- Currency is hardcoded to AUD

### State Management (Zustand + Dexie React Hooks)
- **Stores** (`src/stores/`): Zustand stores for CRUD operations and UI state
  - `account.store.ts`, `transaction.store.ts`, `holding.store.ts`, `superannuation.store.ts`, `sync.store.ts`, `ui.store.ts`
- **Hooks** (`src/hooks/`): Use `dexie-react-hooks` (useLiveQuery) for reactive data fetching
  - Pattern: Stores handle mutations, hooks handle queries

### PDF Parsing System
- **Web Worker**: `src/workers/pdf.worker.ts` - Non-blocking PDF text extraction using pdfjs-dist
- **Parser Registry**: `src/lib/parsers/registry.ts` - Auto-detection and routing to bank-specific parsers
- **Bank Parsers** (`src/lib/parsers/bank/`): Each parser implements `BankParser` interface with `canParse()` and `parse()` methods
- **Super Parsers** (`src/lib/parsers/super/`): Similar pattern for superannuation statement parsing

### Sync System (`src/lib/sync/`)
- `sync-service.ts` - Orchestrates bidirectional sync with Google Drive
- `encryption.ts` - AES-GCM encryption for cloud data
- `google-drive.ts` - Drive API integration
- Data encrypted locally before upload; password never leaves device

### Australian Financial Year Utilities
- `src/lib/utils/financial-year.ts` - FY calculations (July 1 - June 30)
- FY format: "2024-25" (not calendar year)
- Functions: `getCurrentFinancialYear()`, `getFinancialYearForDate()`, `getFinancialYearDates()`

### UI Components
- **shadcn/ui** components in `src/components/ui/` (do not modify directly)
- **Feature components**: `src/components/{accounts,transactions,import,charts}/`
- **Layout**: `src/components/layout/` - Sidebar navigation, header

### App Routes
- Uses Next.js App Router with route groups
- `src/app/(dashboard)/` - Main app routes (accounts, transactions, overview, investments, superannuation, tax, settings, import)
- Dashboard layout initializes database before rendering

## Key Patterns

### Adding a New Bank Parser
1. Create `src/lib/parsers/bank/{bankname}.parser.ts` implementing `BankParser`
2. Export singleton instance
3. Register in `src/lib/parsers/bank/index.ts`

### Adding a New Feature Module
1. Types in `src/types/index.ts`
2. Dexie table in `src/lib/db/schema.ts` (increment version)
3. Zustand store in `src/stores/`
4. React hook in `src/hooks/`
5. Components in `src/components/{feature}/`
6. Route in `src/app/(dashboard)/{feature}/page.tsx`

### Type Conventions
- Account types: `'bank' | 'credit' | 'investment' | 'crypto' | 'cash' | 'asset' | 'liability'`
- Transaction types: `'income' | 'expense' | 'transfer'`
- All dates as JavaScript `Date` objects
- IDs generated with `uuid.v4()`

## Important Notes

- React Compiler enabled (`reactCompiler: true` in next.config.ts)
- Standalone Docker output configured
- Path alias: `@/*` maps to `./src/*`
- No test framework currently configured
