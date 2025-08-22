# Ixaris Rebates Calculator

[![Version](https://img.shields.io/badge/version-1.0.0--beta-blue.svg)](https://github.com/omarriestra/ixaris-rebates/releases)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-lightgrey.svg)](#download)
[![License](https://img.shields.io/badge/license-Proprietary-red.svg)](#license)

**A modern desktop application to calculate Ixaris rebates automatically**

Replace your Excel spreadsheets with a fast, accurate, and user-friendly application that processes hundreds of thousands of transactions in seconds.

![Amadeus Logo](assets/amadeus-logo-dark.png)

---

## 🚀 Quick Start

### Step 1: Download
Choose your operating system:

**Windows (Recommended)**
- Download: `Ixaris-Rebates-Calculator-v1.0.0-Windows.exe`
- Size: ~75MB
- Requirements: Windows 10 or later

**macOS**
- Download: `Ixaris-Rebates-Calculator-v1.0.0-macOS.dmg`
- Size: ~85MB  
- Requirements: macOS 12.0 (Monterey) or later

### Step 2: Install
**Windows:** Double-click the .exe file and follow the installation wizard.

**macOS:** Open the .dmg file, drag the app to your Applications folder, then right-click and select "Open" (first time only).

### Step 3: Run Your First Calculation
1. **Launch** the Ixaris Rebates Calculator
2. **Import Files**: Click "Import Files" in the sidebar
3. **Upload Data**: Select your CSV files (transaction data and rebate configuration)
4. **Calculate**: Click "Calculate Rebates" button
5. **View Results**: Review your calculated rebates and export to Excel

**⏱️ Processing Time**: ~30 seconds for 500,000 transactions

---

## 📁 Required Files

The application works with CSV files from your data export:

### Essential Files
- **`YYYYmm_NIUM_QLIK.csv`** - Your main transaction data
- **`Visa & MCO Monthly Rebate.csv`** - Monthly rebate rates  
- **`Visa & MCO Yearly Rebate.csv`** - Yearly rebate rates
- **`PartnerPay_PartnerDirect Monthly Rebate.csv`** - PartnerPay monthly rates
- **`PartnerPay_PartnerDirect Yearly Rebate.csv`** - PartnerPay yearly rates

### Optional Files (for advanced calculations)
- **`Library_NIUM/AirlinesMCC.csv`** - Airline codes
- **`Library_NIUM/RegionCountry.csv`** - Regional rules
- **`Library_NIUM/VoyagePrive.csv`** - Voyage Prive special rates
- **`Library_NIUM/BillingMaterials.csv`** - Billing codes
- **`Library_NIUM/SAP_BPCodes.csv`** - SAP business partner codes

---

## 💡 Key Features

### ✅ **Accuracy**
- Implements the exact same logic as your Excel Power Query system
- Handles all special cases: Voyage Prive, Regional rules, MCC 4511 airlines
- Processes 500K+ transactions with precision

### ⚡ **Speed**  
- **30 seconds** to process 6 months of transaction data
- **Real-time progress** tracking during calculation
- **Instant filtering** and searching in results

### 🎯 **Easy to Use**
- **Drag & drop** file import
- **One-click** rebate calculation  
- **Interactive results** table with sorting and filtering
- **One-click export** to Excel/CSV

### 🔒 **Secure & Private**
- **All data stays on your computer** - nothing sent to the internet
- **SQLite database** for fast local storage
- **Automatic backup** of your calculation results

---

## 📊 What You Get

### Results Dashboard
- **Total rebate amount** in EUR
- **Number of transactions** processed
- **Calculation summary** by provider and product
- **Grand total** with breakdown

### Detailed Rebate Table
- **Provider-by-provider** breakdown
- **Product-level** rebate details
- **Merchant information** 
- **Rebate percentages** and amounts
- **Interactive filtering** by any column

### Export Options
- **Excel format** (.xlsx) with proper formatting
- **CSV format** for further analysis
- **Grouped results** matching your Excel output format

---

## 🆘 Need Help?

### Common Issues

**Q: The app won't open on macOS**  
A: Right-click the app and select "Open", then click "Open" in the security dialog.

**Q: I get different numbers than my Excel sheet**  
A: Make sure you're using the same CSV files. The app implements the exact same Power Query logic.

**Q: The calculation is taking too long**  
A: Large files (500K+ transactions) can take 30-60 seconds. Check the progress bar.

**Q: Can I use Excel files (.xlsx) instead of CSV?**  
A: The app is optimized for CSV files. Convert your Excel files to CSV first.

### Support
- **Email**: [rmc.coe@amadeus.com](mailto:rmc.coe@amadeus.com)
- **Team**: Amadeus COE (Center of Excellence)

For detailed guides, see:
- [Installation Guide](docs/INSTALLATION_GUIDE.md)
- [User Manual](docs/USER_MANUAL.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

---

## 🔄 What's New in v1.0.0 BETA

### ✨ **New Features**
- **Cross-platform support** - Works on both Windows and macOS
- **Native CSV processing** - No more Excel dependencies
- **Real-time progress tracking** - See calculation progress live
- **Interactive results table** - Sort, filter, and search your rebates
- **Modern interface** - Clean, professional design
- **One-click export** - Generate Excel reports instantly

### 🐛 **Bug Fixes**
- Fixed calculation precision issues
- Improved handling of special characters in merchant names
- Better error messages and user feedback
- Resolved Windows-specific calculation differences

### 🚀 **Performance Improvements**
- **10x faster** than Excel Power Query
- **Memory optimized** for large datasets
- **Chunked processing** prevents app crashes on huge files

---

## 📄 License

Proprietary software developed by **Amadeus IT Group**. All rights reserved.

This application is for internal use by Amadeus and authorized partners only.

---

## 🏢 Built by Amadeus COE

Developed by the **Amadeus Center of Excellence (COE)** team as a modern replacement for Excel-based rebate calculations.

**Built with ❤️ by the Amadeus COE Team**

---

**⬇️ [Download Latest Release](https://github.com/omarriestra/ixaris-rebates/releases/latest) ⬇️**