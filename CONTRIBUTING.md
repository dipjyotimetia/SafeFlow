# Contributing to SafeFlow

Thank you for your interest in contributing to SafeFlow! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Adding New Features](#adding-new-features)
- [Documentation](#documentation)

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- Node.js 22 or later
- npm (comes with Node.js)
- Git
- A modern browser with IndexedDB support

### Development Setup

1. **Fork the repository**

   Click the "Fork" button on GitHub to create your own copy.

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/SafeFlow.git
   cd SafeFlow
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/dipjyotimetia/SafeFlow.git
   ```

4. **Install dependencies**

   ```bash
   npm install
   ```

5. **Start the development server**

   ```bash
   npm run dev
   ```

6. **Run tests**

   ```bash
   npm run test        # Watch mode
   npm run test:run    # Single run
   ```

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check existing issues to avoid duplicates.

When reporting a bug, include:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Browser and OS information
- Screenshots if applicable
- Any relevant console errors

### Suggesting Features

Feature requests are welcome! Please:

- Check if the feature already exists or has been requested
- Provide a clear description of the feature
- Explain the use case and benefits
- Consider how it fits with the project's goals (privacy-first, Australian focus)

### Contributing Code

1. **Find an issue to work on**
   - Look for issues labeled `good first issue` or `help wanted`
   - Comment on the issue to let others know you're working on it

2. **Create a branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```

3. **Make your changes**
   - Follow the coding standards below
   - Write tests for new functionality
   - Update documentation if needed

4. **Test your changes**

   ```bash
   npm run test:run
   npm run lint
   npm run build
   ```

5. **Commit your changes**

   Use clear, descriptive commit messages:

   ```bash
   git commit -m "feat: add support for XYZ bank statement parsing"
   git commit -m "fix: correct CGT calculation for partial sales"
   git commit -m "docs: update README with new features"
   ```

   Follow [Conventional Commits](https://www.conventionalcommits.org/) format:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

6. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

7. **Open a Pull Request**

## Pull Request Process

1. **Before submitting**
   - Ensure all tests pass
   - Run the linter and fix any issues
   - Update documentation if needed
   - Rebase on the latest `main` if needed

2. **PR description should include**
   - Summary of changes
   - Link to related issue(s)
   - Screenshots for UI changes
   - Test plan or verification steps

3. **Review process**
   - A maintainer will review your PR
   - Address any feedback or requested changes
   - Once approved, a maintainer will merge your PR

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode (already configured)
- Prefer explicit types over `any`
- Use interfaces for object shapes

```typescript
// Good
interface AccountBalance {
  accountId: string;
  balanceCents: number;
  asOfDate: Date;
}

// Avoid
const balance: any = { ... };
```

### React Components

- Use functional components with hooks
- Prefer composition over prop drilling
- Keep components focused and single-purpose
- Use the established patterns in the codebase

```typescript
// Component structure
export function TransactionList({ accountId }: TransactionListProps) {
  const transactions = useTransactions(accountId);

  if (!transactions) return <LoadingSpinner />;

  return (
    <ul>
      {transactions.map(tx => (
        <TransactionItem key={tx.id} transaction={tx} />
      ))}
    </ul>
  );
}
```

### File Organization

- Place components in appropriate feature directories
- Keep related files together
- Use index files for clean exports

```
src/components/transactions/
├── index.ts              # Public exports
├── transaction-list.tsx  # Component
├── transaction-item.tsx  # Component
└── use-transactions.ts   # Hook (if feature-specific)
```

### Naming Conventions

- **Files**: `kebab-case.ts` or `kebab-case.tsx`
- **Components**: `PascalCase`
- **Functions/Variables**: `camelCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`

### Money Handling

Always use cents (integers) for monetary values:

```typescript
// Good - store in cents
const amountCents = 12345; // $123.45

// Use the Money value object for calculations
import { Money } from '@/domain/value-objects/money';
const amount = Money.fromCents(12345);
const formatted = amount.format(); // "$123.45"
```

## Testing Guidelines

### Test Structure

- Place tests in `__tests__` directories or alongside source files
- Name test files `*.test.ts` or `*.spec.ts`
- Use descriptive test names

```typescript
describe('TaxService', () => {
  describe('calculateIncomeTax', () => {
    it('should calculate tax for income in first bracket', () => {
      // ...
    });

    it('should include Medicare levy for eligible income', () => {
      // ...
    });
  });
});
```

### What to Test

- Domain services and business logic
- Value objects
- Utility functions
- Complex component logic
- Data transformations

### Test Utilities

- Use `fake-indexeddb` for database tests (already configured)
- Use React Testing Library for component tests
- Mock external dependencies appropriately

## Adding New Features

### Adding a Bank Statement Parser

1. Create a new parser in `src/lib/parsers/bank/`:

   ```typescript
   // src/lib/parsers/bank/newbank.parser.ts
   import { BankParser, ParsedStatement } from '../types';

   export const newBankParser: BankParser = {
     name: 'New Bank',

     canParse(text: string): boolean {
       return text.includes('NEW BANK STATEMENT');
     },

     parse(text: string): ParsedStatement {
       // Implementation
     }
   };
   ```

2. Register in `src/lib/parsers/bank/index.ts`

3. Add tests in `src/lib/parsers/__tests__/`

### Adding a New Domain Service

1. Create service in `src/domain/services/`
2. Create tests in `src/domain/services/__tests__/`
3. Keep framework-agnostic (no React dependencies)

### Adding Database Tables

1. Add type in `src/types/index.ts`
2. Update schema in `src/lib/db/schema.ts`
3. Increment database version
4. Create Zustand store in `src/stores/`
5. Create hook in `src/hooks/`

## Documentation

### Code Comments

- Document complex business logic
- Explain non-obvious decisions
- Keep comments up to date with code

### README Updates

- Update features list for new functionality
- Add to roadmap when appropriate
- Keep installation instructions current

## Questions?

If you have questions about contributing, feel free to:

- Open a GitHub Discussion
- Ask in a related issue
- Reach out to maintainers

Thank you for contributing to SafeFlow!
