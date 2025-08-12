# Ixaris Rebates Calculator

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/omarriestra/ixaris-rebates/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2F11-lightgrey.svg)](#installation)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](#license)

Modern desktop application for calculating Ixaris rebates, replacing the legacy Excel Power Query system with a precise, user-friendly, and scalable solution.

![Amadeus Logo](assets/amadeus-logo-dark.png)

## 🚀 Features

- **🎯 Accurate Calculations**: Implements the same Power Query logic with improved precision
- **📊 Modern UI**: Clean, intuitive interface built with React and TypeScript
- **⚡ High Performance**: Processes 500K+ transactions efficiently using SQLite
- **🔍 Advanced Filtering**: Interactive table with search, sort, and filter capabilities
- **📁 CSV Support**: Native support for CSV files without Excel dependency
- **💾 Data Persistence**: SQLite database with automatic data recovery
- **🖥️ Cross-Platform**: Built with Electron for Windows 10/11

## 📋 Requirements

- **OS**: Windows 10 or Windows 11 (64-bit)
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 200MB free disk space
- **Files**: CSV files with transaction and rebate data

## 💻 Installation

### Option 1: Portable Executable (Recommended)
1. Download `Ixaris Rebates Calculator 1.0.0.exe` from [Releases](https://github.com/omarriestra/ixaris-rebates/releases)
2. Run the executable directly - no installation required
3. The application will create its data files in the same directory

### Option 2: Development Setup
```bash
# Clone the repository
git clone https://github.com/omarriestra/ixaris-rebates.git
cd ixaris-rebates

# Install dependencies
npm install

# Build the application
npm run build
npx tsc -p tsconfig.main.json

# Run in development mode
npm start
```

## 🎯 Quick Start

1. **Launch Application**: Run the executable
2. **Import Files**: Click "Import Files" and select your CSV data folder
3. **Load Data**: Upload transaction data and rebate configuration files
4. **Calculate**: Click "Calculate Rebates" to process all transactions
5. **View Results**: Review calculated rebates in the Results and Rebates Viewer pages

## 📁 Required Files

The application expects the following CSV files:

### Transaction Data
- `YYYYmm_NIUM_QLIK.csv` - Main transaction data file

### Rebate Configuration
- `Visa & MCO Monthly Rebate.csv`
- `Visa & MCO Yearly Rebate.csv` 
- `PartnerPay_PartnerDirect Monthly Rebate.csv`
- `PartnerPay_PartnerDirect Yearly Rebate.csv`

### Reference Data (Optional)
- `Library_NIUM/AirlinesMCC.csv`
- `Library_NIUM/RegionCountry.csv`
- `Library_NIUM/VoyagePrive.csv`
- `Library_NIUM/BillingMaterials.csv`
- `Library_NIUM/SAP_BPCodes.csv`

## 🏗️ Architecture

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Electron
- **Database**: SQLite with better-sqlite3
- **Build**: Webpack + Electron Builder
- **Testing**: Jest + React Testing Library

## 🔧 Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Create portable executable
npm run dist:portable

# Lint code
npm run lint
```

## 📊 Performance

- **Transactions**: Handles 500K+ transactions efficiently
- **Memory Usage**: ~200MB typical, ~500MB peak during processing
- **Processing Time**: ~30 seconds for 500K transactions
- **Storage**: SQLite database scales with data size

## 🎨 Screenshots

*Screenshots will be added in future releases*

## 🔄 Changelog

### v1.0.0 (2025-08-12) - Initial Release
- Complete Power Query logic implementation
- Native CSV file processing
- Interactive results table with filtering
- Electron-based desktop application
- Professional Amadeus branding
- SQLite database with data persistence
- Windows 10/11 portable executable

## 🤝 Contributing

This is a proprietary project developed for Amadeus internal use. External contributions are not accepted at this time.

## 📞 Support

For technical support or questions about calculations, contact:
- **Email**: [rmc.coe@amadeus.com](mailto:rmc.coe@amadeus.com)
- **Team**: Amadeus COE (Center of Excellence)

## 📄 License

Proprietary software developed by Amadeus IT Group. All rights reserved.

## 🏢 Development Team

Developed by the **Amadeus COE Team** as a modern replacement for the legacy Excel Power Query rebate calculation system.

---

**Built with ❤️ by Amadeus COE**