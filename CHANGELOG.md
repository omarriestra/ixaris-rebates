# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2025-09-04

### Added
- Chunked transaction storage and metadata (`transaction_data_*.json` + `transaction_data_meta.json`).
- IPC and preload support for chunked transaction access (`db:getTransactionDataMetadata`, `db:getTransactionDataChunk`).
- Results builds transaction and merchant lookup maps from chunks for large datasets.
- CLI validation script parameters: `--folderPath`, `--year`, `--month`, `--validationCsv`.

### Changed
- Grouped views and exports deduplicate Transaction Amount in EUR per unique `transactionId`.
- CSV importer auto-detects delimiter (handles `sep=;`) and numeric locales; enables BOM and relaxed column counts.
- Rebate calculation processes transactions in chunks for big datasets and keeps progress reports.

### Fixed
- Merchant Names restored when not embedded in rebates (lookup from transactions).
- Tests updated to DB-shape inputs and batch insert expectations; all tests pass (59/59).

## [1.1.1] - 2025-09-03
- Preserve sign on amounts; robust number parsing; use 'Transaction Amount in EUR' in grouped table/exports; merchantNameNew logic for MCC 4511; validated against KIWI_Avianca.csv (1291 rows, total EUR 431,987.15).

