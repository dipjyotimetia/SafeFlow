# SafeFlow

[![GitHub Pages](https://github.com/dipjyotimetia/SafeFlow/actions/workflows/nextjs.yml/badge.svg)](https://github.com/dipjyotimetia/SafeFlow/actions/workflows/nextjs.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

**Privacy-first personal finance management for Australians**

[Live Demo](https://dipjyotimetia.github.io/SafeFlow) | [Documentation](#architecture) | [Contributing](CONTRIBUTING.md) | [Report Bug](https://github.com/dipjyotimetia/SafeFlow/issues/new?template=bug_report.md) | [Request Feature](https://github.com/dipjyotimetia/SafeFlow/issues/new?template=feature_request.md)

SafeFlow is an open-source personal finance application built with Next.js, designed specifically for Australian users. All your financial data stays on your device with optional encrypted cloud sync.

<p align="center">
  <img src="public/screenshot-dashboard.png" alt="SafeFlow Dashboard" width="800">
</p>

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Security](#security)
- [License](#license)
- [Community](#community)
- [Roadmap](#roadmap)

## Features

### Core Finance Management
- **Multi-account tracking** - Bank accounts, credit cards, investments, crypto, and assets
- **Transaction management** - Import, categorize, and analyze your spending
- **Budget tracking** - Set and monitor budgets by category with alerts
- **Family finances** - Multi-member household financial tracking

### Investment Portfolio
- **Holdings tracker** - Stocks, ETFs, crypto, and managed funds
- **Portfolio analytics** - Performance charts, allocation breakdown, and dividend tracking
- **CGT calculations** - Capital gains tax with FIFO/LIFO/Specific ID cost basis methods
- **Franking credits** - Australian dividend imputation credit tracking

### Australian Tax
- **Tax brackets** - Current ATO tax rates and Medicare levy
- **Financial year** - Proper July-June FY handling (e.g., "2024-25")
- **ATO categories** - Pre-configured deduction categories aligned with ATO requirements
- **Tax estimation** - Real-time tax liability calculations

### Property Investment
- **Property portfolio** - Track multiple investment properties
- **Loan management** - Multiple loans, offset accounts, and interest tracking
- **Rental income** - Lease tracking and rental yield calculations
- **Depreciation** - Div 40 and Div 43 depreciation schedules
- **Property modeling** - Cash flow projections and scenario analysis
- **Affordability calculator** - Purchase capacity analysis

### Superannuation
- **Super tracking** - Monitor multiple super accounts
- **Contribution tracking** - Concessional and non-concessional contributions
- **Performance history** - Track super growth over time

### Import & Sync
- **PDF statement parsing** - Automatic extraction from bank statements
- **Supported banks** - ANZ, CBA, NAB, Westpac, ING, Bendigo, Macquarie, Up, and more
- **Crypto imports** - CoinSpot, Swyftx, Raiz
- **Encrypted cloud sync** - Optional Google Drive backup with AES-GCM encryption

### AI Features (Experimental)
- **Smart categorization** - Learn from your categorization patterns
- **AI assistant** - Query your finances using local Ollama LLM

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org) with App Router
- **UI**: [React 19](https://react.dev), [Tailwind CSS 4](https://tailwindcss.com), [Radix UI](https://www.radix-ui.com)
- **Database**: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) via [Dexie](https://dexie.org)
- **State**: [Zustand](https://zustand-demo.pmnd.rs)
- **Forms**: [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev)
- **Charts**: [Recharts](https://recharts.org)
- **Testing**: [Vitest](https://vitest.dev) + [React Testing Library](https://testing-library.com/react)
- **PDF Parsing**: [PDF.js](https://mozilla.github.io/pdf.js)

## Getting Started

### Prerequisites

- Node.js 22 or later
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/dipjyotimetia/SafeFlow.git
cd SafeFlow

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Google Drive Sync (optional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id

# Ollama LLM (optional, defaults to localhost:11434)
NEXT_PUBLIC_OLLAMA_URL=http://localhost:11434
```

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build (static export)
npm run lint         # Run ESLint
npm run test         # Run tests in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage
```

## Architecture

SafeFlow follows a domain-driven design with clear separation of concerns:

```
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/        # Main application routes
│   └── api/                # API routes (Ollama proxy)
├── components/             # React components
│   ├── ui/                 # shadcn/ui base components
│   └── [feature]/          # Feature-specific components
├── domain/                 # Business logic (framework-agnostic)
│   ├── services/           # Domain services (tax, investment, etc.)
│   └── value-objects/      # Money, FinancialYear, etc.
├── hooks/                  # React hooks (data fetching)
├── lib/                    # Infrastructure
│   ├── db/                 # Dexie schema and repositories
│   ├── parsers/            # PDF statement parsers
│   └── sync/               # Google Drive sync
├── stores/                 # Zustand state stores
├── types/                  # TypeScript types
└── workers/                # Web workers (PDF processing)
```

### Key Design Decisions

- **Offline-first**: All data stored locally in IndexedDB. Works without internet.
- **Privacy by default**: No telemetry, no analytics, no data collection.
- **Cents not dollars**: All monetary values stored as integers (cents) to avoid floating-point errors.
- **Incremental sync**: Only changed records are synced, with version tracking.
- **Australian focus**: Financial year, tax brackets, and ATO categories are Australia-specific.

## Deployment

SafeFlow is configured for static export and deploys to GitHub Pages automatically on push to `main`.

For self-hosting, build and serve the static files:

```bash
npm run build
# Serve the 'out' directory with any static file server
```

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm run test:run`)
5. Run linting (`npm run lint`)
6. Commit your changes
7. Push to your fork
8. Open a Pull Request

## Security

Security is critical for a personal finance application. Please see [SECURITY.md](SECURITY.md) for:

- Security model and design
- How to report vulnerabilities
- Data protection measures

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Community

We welcome contributions from everyone! Here's how you can get involved:

- **Report Bugs**: [Open an issue](https://github.com/dipjyotimetia/SafeFlow/issues/new?template=bug_report.md)
- **Request Features**: [Submit a feature request](https://github.com/dipjyotimetia/SafeFlow/issues/new?template=feature_request.md)
- **Contribute Code**: Read our [Contributing Guide](CONTRIBUTING.md)
- **Discussions**: [Join the conversation](https://github.com/dipjyotimetia/SafeFlow/discussions)
- **Code of Conduct**: Please read our [Code of Conduct](CODE_OF_CONDUCT.md)

## Roadmap

- [ ] Additional bank statement parsers
- [ ] CSV import for generic transactions
- [ ] Recurring transaction detection
- [ ] Budget forecasting
- [ ] Self-hosted sync backend option
- [ ] Mobile-responsive design improvements
- [ ] Data export to multiple formats (CSV, JSON, Excel)
- [ ] Multi-currency support

See the [open issues](https://github.com/dipjyotimetia/SafeFlow/issues) for a full list of proposed features and known issues.

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com) for the beautiful component library
- [Dexie.js](https://dexie.org) for the excellent IndexedDB wrapper
- [PDF.js](https://mozilla.github.io/pdf.js) for reliable PDF parsing
- All [contributors](https://github.com/dipjyotimetia/SafeFlow/graphs/contributors) who help improve SafeFlow

## Support

If you find SafeFlow useful, please consider:

- Giving it a star on GitHub
- Sharing it with others who might benefit
- Contributing to the project

---

**Disclaimer**: SafeFlow is not financial advice software. Always consult a qualified financial advisor for financial decisions. Tax calculations are estimates and should be verified with the ATO or a registered tax agent.

---

