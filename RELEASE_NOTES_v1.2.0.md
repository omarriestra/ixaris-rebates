# Ixaris Rebates Calculator — v1.2.0 (2025-09-04)

Highlights
- Large-data support for transactions: chunked storage and processing to handle multi‑million row datasets without OOM.
- Accurate “Transaction Amount in EUR” in grouped views/exports by deduplicating per transactionId.
- Robust CSV import: auto-detect delimiter (sep=;, ;, , tab, |), handle BOM and locale number formats.
- CLI validation script now parametrizable for folder/year/month and optional validation CSV.
- Test suite aligned and green (59/59).

Added
- Chunked transaction persistence: saves `transaction_data_*.json` + `transaction_data_meta.json` to avoid huge single JSONs.
- IPC/preload endpoints for chunked transactions: `db:getTransactionDataMetadata`, `db:getTransactionDataChunk`.
- Results page builds transaction/merchant lookup maps from chunks when needed.
- `src/main/validateRebates.ts` accepts `--folderPath`, `--year`, `--month`, `--validationCsv`.

Changed
- Grouped Results and export now sum Transaction Amount in EUR once per unique `transactionId` (prevents 5x overcounting by rebate level).
- `CsvImporter` detects and strips `sep=;`, autodetects delimiter, enables `bom` and `relax_column_count`, and uses robust `parseNumber`.
- `RebateCalculator` processes transactions chunk‑by‑chunk for very large datasets while keeping progress updates.

Fixed
- Merchant Names restored in grouped view/export even when `originalTransaction` is not embedded (resolved via lookup map).
- PartnerPay tests use raw Merchant matching and DB‑shape records; integration tests expect batch insertion.

Developer Notes
- All tests passing: 59/59.
- Package version bumped to 1.2.0.

Files of interest
- src/database/DatabaseManager.ts
- src/main/services/CsvImporter.ts
- src/main/services/RebateCalculator.ts
- src/main/main.ts
- src/main/preload.ts
- src/renderer/pages/Results.tsx
- src/main/validateRebates.ts
- src/tests/*.ts

