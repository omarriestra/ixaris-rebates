# 🔧 Troubleshooting Guide

**Ixaris Rebates Calculator v1.0.0 BETA**

Solutions to common problems and technical issues.

---

## 📋 Quick Reference

### Most Common Issues

| Problem | Quick Solution |
|---------|---------------|
| App won't start | Right-click → "Run as administrator" (Windows) or "Open" (macOS) |
| Wrong calculations | Check file naming and ensure yearly rates are present |
| Import fails | Verify CSV file structure and naming conventions |
| Export doesn't work | Check file permissions and available disk space |
| App crashes | Close other applications and restart |

---

## 🚀 Installation Problems

### Windows Installation Issues

#### ❌ "Windows protected your PC" warning
**Problem**: Windows Defender blocks the application

**Solution**:
1. Click **"More info"**
2. Click **"Run anyway"**
3. This is normal for new applications

**Alternative**:
1. Right-click the installer
2. Select **"Properties"**
3. Check **"Unblock"** if available
4. Click **"OK"** and run again

#### ❌ "Permission denied" during installation
**Problem**: Insufficient administrator rights

**Solution**:
1. Right-click the installer
2. Select **"Run as administrator"**
3. Enter administrator password if prompted

#### ❌ App installed but won't start
**Problem**: Missing dependencies or corrupted installation

**Solution**:
1. Restart your computer
2. Try running as administrator
3. Check Windows version (needs Windows 10+)
4. Reinstall the application

### macOS Installation Issues

#### ❌ "App is damaged and can't be opened"
**Problem**: Download corruption or security settings

**Solution**:
1. Delete the app and re-download
2. Check your internet connection during download
3. Try downloading from a different browser

#### ❌ "Cannot open because Apple cannot check it"
**Problem**: macOS security (Gatekeeper) blocking the app

**Solution**:
1. **Right-click** the app (don't double-click)
2. Select **"Open"**
3. Click **"Open"** in the security dialog
4. Future launches will work normally

**Alternative**:
1. Go to **System Preferences** → **Security & Privacy**
2. Click **"Open Anyway"** next to the blocked app
3. Enter your password if prompted

#### ❌ "The application is not optimized for this Mac"
**Problem**: Compatibility warning on Apple Silicon Macs

**Solution**:
- This is normal - the app runs in compatibility mode
- Performance is still good despite this message
- Click **"Open"** to continue

---

## 📁 File Import Problems

### File Selection Issues

#### ❌ "No files found in selected folder"
**Problem**: Wrong folder selected or files not present

**Solution**:
1. Verify your folder contains CSV files
2. Check file naming exactly matches requirements:
   - `YYYYmm_NIUM_QLIK.csv` (e.g., `202412_NIUM_QLIK.csv`)
   - `Visa & MCO Monthly Rebate.csv`
   - `Visa & MCO Yearly Rebate.csv`
   - etc.
3. Ensure files are in CSV format, not Excel (.xlsx)

#### ❌ "Invalid file structure" error
**Problem**: CSV files don't match expected format

**Solution**:
1. **Check headers**: First row should contain column names
2. **Check encoding**: Files should be UTF-8 encoded
3. **Check separators**: Should use comma (,) separators
4. **Re-export** from your source system

### Data Validation Errors

#### ❌ "Missing required columns"
**Problem**: CSV file missing expected columns

**Expected columns for transaction file**:
- Transaction Card Number
- Transaction Currency  
- Provider_Customer_Code__c
- Transaction Type
- Transaction Card
- Salesforce product name
- Funding Account Name
- Region
- Region MC
- Transaction Date
- BIN Card Number
- Transaction Amount
- Interchange Amount
- etc.

**Solution**:
1. Check your CSV export settings
2. Ensure all columns are included
3. Verify column headers match exactly
4. Remove any extra spaces in headers

#### ❌ "Invalid date format"
**Problem**: Transaction dates not recognized

**Solution**:
1. **Expected format**: YYYY-MM-DD or DD/MM/YYYY
2. **Check** your CSV export date format settings
3. **Avoid** regional date formats that might be ambiguous
4. **Re-export** with standardized date format

#### ❌ "Invalid numeric values"
**Problem**: Non-numeric data in amount fields

**Solution**:
1. **Remove** currency symbols (€, $, £)
2. **Use** decimal point (.) not comma (,) for decimals
3. **Remove** thousands separators
4. **Check** for empty cells in numeric columns

---

## 🧮 Calculation Problems

### Wrong Results

#### ❌ Results differ significantly from Excel
**Problem**: Calculation differences between systems

**Troubleshooting steps**:
1. **Compare file versions**: Ensure same source data
2. **Check yearly vs monthly**: App prioritizes yearly rates
3. **Verify special cases**: MCC 4511, Voyage Prive, regional rules
4. **Review provider codes**: Must match exactly
5. **Check decimal precision**: App uses higher precision

**Detailed comparison**:
```
Excel total: €XXX,XXX.XX
App total:   €XXX,XXX.XX
Difference:  €XXX.XX (X.XX%)
```

#### ❌ Many transactions show zero rebates
**Problem**: Transactions not matching rebate tables

**Solution**:
1. **Check provider codes**: Must match exactly between transaction and rebate files
2. **Check product names**: Must match exactly (case-sensitive)
3. **Verify BIN numbers**: For PartnerPay transactions
4. **Review special cases**: Some providers need special handling

#### ❌ Calculation takes too long or freezes
**Problem**: Performance issues with large datasets

**Solution**:
1. **Close** other applications to free memory
2. **Wait longer**: 500K+ transactions can take 2-3 minutes
3. **Check progress**: Look for progress bar movement
4. **Restart** app if frozen for >5 minutes
5. **Split data**: Try smaller date ranges

### Calculation Errors

#### ❌ "Database error during calculation"
**Problem**: SQLite database issues

**Solution**:
1. **Restart** the application
2. **Re-import** your data
3. **Check disk space**: Ensure enough space for database
4. **Run as administrator**: May need elevated permissions

#### ❌ "Memory error" or app crashes
**Problem**: Insufficient system resources

**Solution**:
1. **Close** other applications
2. **Restart** your computer
3. **Increase virtual memory** (Windows)
4. **Check RAM usage**: Need 4GB+ available
5. **Process smaller batches**: Split large files

---

## 📊 Results and Export Problems

### Display Issues

#### ❌ Results table is empty
**Problem**: No data calculated or display error

**Solution**:
1. **Check calculation status**: Ensure calculation completed
2. **Verify data import**: Confirm data was imported successfully
3. **Refresh page**: Navigate away and back to Results
4. **Check filters**: Remove any applied filters
5. **Restart app**: Force reload of data

#### ❌ Numbers look wrong or formatted poorly
**Problem**: Display formatting issues

**Solution**:
1. **Check regional settings**: Decimal separators
2. **Use export**: Export to Excel for proper formatting
3. **Verify calculations**: Compare with manual spot checks

### Export Problems

#### ❌ "Export failed" error
**Problem**: File writing permissions or path issues

**Solution**:
1. **Check permissions**: Ensure write access to chosen folder
2. **Check disk space**: Need space for export file
3. **Close Excel**: Don't have the target file open
4. **Choose different location**: Try Desktop or Documents
5. **Run as administrator**: May need elevated permissions

#### ❌ Exported file is corrupted or empty
**Problem**: Export process interrupted or failed

**Solution**:
1. **Check file size**: Empty file = export failed
2. **Wait for completion**: Don't interrupt export process
3. **Try CSV format**: Less complex than Excel
4. **Check antivirus**: May be blocking file creation

#### ❌ Excel file won't open
**Problem**: File format or Excel version issues

**Solution**:
1. **Try CSV format**: More universal compatibility
2. **Update Excel**: Newer version may support format better
3. **Use alternative**: Google Sheets, LibreOffice Calc
4. **Re-export**: Try exporting again

---

## 💾 Performance Issues

### Slow Performance

#### ❌ App is running slowly
**Problem**: System resources or large datasets

**Solutions**:

**System optimization**:
1. **Close** unnecessary applications
2. **Restart** your computer
3. **Check available RAM**: Need 4GB+ free
4. **Use SSD**: Faster than traditional hard drives

**Data optimization**:
1. **Smaller datasets**: Process monthly instead of yearly
2. **Remove unnecessary columns**: Before CSV export
3. **Clean data**: Remove duplicate transactions

### Memory Issues

#### ❌ "Out of memory" errors
**Problem**: Insufficient RAM for large datasets

**Solution**:
1. **Close** other applications
2. **Restart** computer to free memory
3. **Increase virtual memory** (Windows):
   - System Properties → Advanced → Performance Settings
   - Advanced → Virtual Memory → Change
   - Increase size to 2x your RAM
4. **Process smaller files**: Split large datasets

#### ❌ App becomes unresponsive
**Problem**: Processing too much data at once

**Solution**:
1. **Wait**: Large operations can take several minutes
2. **Check progress**: Look for progress indicators
3. **Task Manager**: Check if app is still processing
4. **Force quit** if frozen >5 minutes
5. **Restart** and try smaller datasets

---

## 🔍 Debug Information

### Getting Debug Information

#### View Application Logs
**Windows**:
1. Press `F12` or `Ctrl+Shift+I` to open Developer Tools
2. Click **"Console"** tab
3. Look for error messages in red

**macOS**:
1. Press `Cmd+Opt+I` to open Developer Tools
2. Click **"Console"** tab
3. Look for error messages in red

#### Important Log Messages
Look for these types of messages:
- **Database errors**: SQLite issues
- **Import errors**: File reading problems
- **Calculation errors**: Math or logic issues
- **Export errors**: File writing problems

### System Information

When contacting support, include:

**Application Info**:
- Version: v1.0.0 BETA
- Operating System: Windows 10/11 or macOS version
- RAM: Total and available memory
- Storage: Available disk space

**File Info**:
- CSV file sizes
- Number of transactions
- Data date range
- File source system

**Error Info**:
- Exact error message
- Steps to reproduce
- Screenshots if helpful

---

## 📞 Getting More Help

### Self-Service Options

1. **Restart** the application - Fixes 70% of issues
2. **Re-import** data - Fixes data-related problems
3. **Check file formats** - Ensures compatibility
4. **Try smaller datasets** - Helps with performance

### When to Contact Support

Contact support when:
- Error persists after trying solutions
- App crashes repeatedly
- Results are significantly wrong
- Unable to complete basic functions

### Support Information

**Email**: [rmc.coe@amadeus.com](mailto:rmc.coe@amadeus.com)
**Team**: Amadeus COE (Center of Excellence)
**Response Time**: 1-2 business days

**Include in your support request**:
1. **Application version** (shown in title bar)
2. **Operating system** and version
3. **Exact error message** (copy and paste)
4. **Steps to reproduce** the problem
5. **Screenshot** of the error (if applicable)
6. **Sample files** (if safe to share)

---

## 📚 Additional Resources

### Documentation
- [Installation Guide](INSTALLATION_GUIDE.md) - Setup instructions
- [User Manual](USER_MANUAL.md) - Complete usage guide
- [Release Notes](RELEASE_NOTES.md) - What's new

### Best Practices
- Keep CSV files organized and properly named
- Use consistent data export settings
- Validate results against known baselines
- Backup important calculation results

### Known Limitations
- Maximum ~1M transactions per calculation
- CSV format required (no direct Excel support)
- Windows 10+ or macOS 12+ required
- Internet connection not required (fully offline)

---

**💡 Remember: Most issues are resolved by restarting the application and ensuring your CSV files follow the correct naming conventions and structure.**