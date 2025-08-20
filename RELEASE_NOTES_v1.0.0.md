# Release Notes - Ixaris Rebates Calculator v1.0.0

**Release Date**: August 12, 2025  
**Version**: 1.0.0 (Initial MVP Release)  
**Platform**: macOS 12.0+ (Apple Silicon & Intel)  

## 🎉 First Official Release

This is the **inaugural release** of the Ixaris Rebates Calculator, a modern desktop application that replaces the legacy Excel Power Query system for calculating Ixaris rebates.

## ✨ Key Features

### Core Functionality
- **🧮 Complete Rebate Calculation Engine**
  - Full Power Query logic implementation
  - Support for Visa/MCO and PartnerPay rebate types
  - Special case handling (MCC 4511, Voyage Prive, Regional rules)
  - 8-level rebate calculation with yearly/monthly priority

### Data Processing
- **📁 Native CSV Support**
  - Direct CSV file processing without Excel dependency
  - Handles large datasets (500K+ transactions)
  - Automatic file validation and structure checking
  - Real-time progress tracking during import

### User Interface
- **🎨 Modern Desktop UI**
  - Professional Amadeus branding
  - Intuitive navigation with sidebar and header
  - Interactive results tables with sorting and filtering
  - Real-time notifications and progress feedback

### Performance & Reliability
- **⚡ High Performance**
  - SQLite database for fast queries and data persistence
  - Efficient memory management for large datasets
  - Session recovery and data persistence between runs
  - Optimized calculation algorithms

## 🔧 Technical Specifications

### Architecture
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Electron 28
- **Database**: SQLite with better-sqlite3
- **Build System**: Webpack + Electron Builder

### System Requirements
- **OS**: macOS 12.0 Monterey or later
- **Architecture**: Apple Silicon (M1/M2/M3) or Intel x64
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 200MB free space

## 📋 Supported File Types

### Required Files
- `YYYYmm_NIUM_QLIK.csv` - Transaction data
- `Visa & MCO Monthly/Yearly Rebate.csv` - Visa/MCO rates
- `PartnerPay_PartnerDirect Monthly/Yearly Rebate.csv` - PartnerPay rates

### Optional Library Files
- `Library_NIUM/AirlinesMCC.csv` - Airline MCC codes
- `Library_NIUM/RegionCountry.csv` - Regional mapping
- `Library_NIUM/VoyagePrive.csv` - Voyage Prive rules
- `Library_NIUM/BillingMaterials.csv` - SAP billing materials
- `Library_NIUM/SAP_BPCodes.csv` - SAP business partner codes

## 🎯 Key Improvements Over Excel System

### Accuracy
- ✅ Eliminates manual calculation errors
- ✅ Consistent precision in all calculations
- ✅ Automated validation and error detection
- ✅ Reproducible results every time

### Usability
- ✅ Modern, intuitive interface
- ✅ Real-time progress and feedback
- ✅ Interactive data exploration
- ✅ One-click processing

### Performance
- ✅ Handles large datasets efficiently
- ✅ Faster processing than Power Query
- ✅ No Excel installation required
- ✅ Portable executable

### Maintainability
- ✅ Clean, documented codebase
- ✅ Version control and change tracking
- ✅ Extensible architecture
- ✅ Professional development practices

## 🚀 Getting Started

### Installation
1. Download `Ixaris Rebates Calculator-1.0.0.dmg` (Intel) or `Ixaris Rebates Calculator-1.0.0-arm64.dmg` (Apple Silicon)
2. Open the DMG file and drag the application to your Applications folder
3. Right-click the app and select "Open" (first time only - required for unsigned apps)
4. Application will create necessary data files automatically

### Basic Usage
1. **Import Data**: Load your CSV files using the Import Files page
2. **Calculate**: Click "Calculate Rebates" to process all transactions
3. **Review**: View results in the Results page and detailed data in Rebates Viewer
4. **Export**: Export results for further analysis (if needed)

## 🐛 Known Issues

### Platform Limitations
- **Windows builds**: Currently unavailable due to cross-compilation issues with native SQLite dependencies. Windows support planned for v1.1.0 using alternative build environment.

### Minor Issues (To Be Addressed in Future Versions)
- Settings page is currently under development (disabled in v1.0.0)
- Some advanced export features are planned for future releases

## 🔄 Migration from Excel Power Query

### Data Format
- Excel files can be exported to CSV format for use with this application
- File naming conventions should match the expected patterns
- All calculation logic has been preserved and validated

### Results Verification
- Initial calculations should be compared with existing Excel results
- Any discrepancies should be reported to the COE team
- The application includes detailed logging for troubleshooting

## 📞 Support & Feedback

### Getting Help
- **Email Support**: [rmc.coe@amadeus.com](mailto:rmc.coe@amadeus.com)
- **Team**: Amadeus COE (Center of Excellence)
- **Documentation**: See README.md for detailed usage instructions

### Reporting Issues
- Include application version (1.0.0)
- Provide steps to reproduce the issue
- Attach relevant log files if available
- Describe expected vs actual behavior

## 🔮 Roadmap

### Planned for Future Versions
- **Windows Support**: v1.1.0 - Native Windows executable using dedicated build environment
- **Settings Configuration**: User preferences and default values
- **Advanced Export Options**: Multiple output formats
- **Batch Processing**: Multiple file processing
- **Enhanced Reporting**: Built-in report generation
- **Performance Optimizations**: Further speed improvements

## 🏢 Credits

**Development Team**: Amadeus COE Team  
**Project Lead**: Omar Riestra  
**Technology Stack**: Electron + React + TypeScript + SQLite  
**Quality Assurance**: Comprehensive testing with real production data  

## 📄 License

Proprietary software developed by Amadeus IT Group. All rights reserved.

---

**Thank you for using Ixaris Rebates Calculator v1.0.0!**

*This marks the beginning of a new era in rebate calculation efficiency and accuracy.*