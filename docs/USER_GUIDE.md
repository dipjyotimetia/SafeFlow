# SafeFlow User Guide

This guide explains how to use SafeFlow from first launch to ongoing maintenance.

## 1. First-time setup

1. Open the app and go to **Accounts**.
2. Create your accounts (bank, credit, cash, investment, crypto, asset, liability).
3. Set realistic opening balances.

## 2. Import transactions

1. Go to **Import**.
2. Upload statement PDFs.
3. Review parsed rows and mappings before saving.
4. Fix category/account mismatches before final import.

## 3. Manage transactions

1. Open **Transactions**.
2. Filter by type, account, and member.
3. Edit descriptions/categories for accuracy.
4. Use compact density mode for large datasets.

## 4. Track budgets

1. Open **Budgets**.
2. Create monthly/yearly budgets.
3. Assign category-specific budgets where useful.
4. Monitor over-budget warnings and remaining amounts.

## 5. Track investments

1. Open **Investments**.
2. Add holdings (symbol, type, units, cost basis, account).
3. Refresh prices regularly.
4. Review gain/loss, allocation, performance, and top movers.

## 6. Family finance workflow

1. Go to **Family** and create members.
2. Tag transactions by member.
3. Use header member filter to switch perspective.

## 7. Property and superannuation

- Use **Property** for yields, projections, and affordability.
- Use **Superannuation** to track balances, contributions, and trends.

## 8. Tax and reporting

1. Open **Tax** for current financial year estimates.
2. Keep categories accurate to improve tax outputs.
3. Reconcile before end-of-year export/reporting.

## 9. Backup and sync

- Export local backup from **Settings** regularly.
- Optionally enable encrypted cloud sync.
- Keep your encryption password secure; losing it can block restore.

## 10. Recommended weekly routine

1. Import latest statements.
2. Review uncategorized transactions.
3. Refresh investment prices.
4. Check budgets and cashflow.
5. Export a backup.

## 11. Set up local AI chat (Ollama)

1. Install Ollama from https://ollama.com/download.
2. Start Ollama, then pull a model:
   `ollama pull llama3.1:8b`
3. Open **Settings > AI Assistant** in SafeFlow.
4. Set host to `http://127.0.0.1:11434`.
5. Select model `llama3.1:8b` (or any installed model).
6. Click **Test**, then **Save AI Settings**.
7. Optional: enable auto-categorize for imported transactions.
