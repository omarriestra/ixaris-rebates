# 📖 User Manual

**Ixaris Rebates Calculator v1.0.0 BETA**

Complete guide to using the Ixaris Rebates Calculator application.

---

## 📑 Table of Contents

1. [Getting Started](#-getting-started)
2. [Main Interface](#-main-interface)
3. [Importing Data](#-importing-data)
4. [Calculating Rebates](#-calculating-rebates)
5. [Viewing Results](#-viewing-results)
6. [Exporting Data](#-exporting-data)
7. [Advanced Features](#-advanced-features)
8. [Best Practices](#-best-practices)

---

## 🚀 Getting Started

### Your First Calculation

**What you'll need:**
- CSV files from your data export (see [Required Files](#required-files))
- About 5 minutes for setup
- 30-60 seconds for calculation (depending on data size)

**Quick Start Process:**
1. Launch the application
2. Click "Import Files" in the sidebar
3. Select your data folder
4. Configure year and month
5. Click "Calculate Rebates"
6. View and export results

---

## 🖥️ Main Interface

### Application Layout

The application has four main areas:

#### 1. Header Bar
- **Application title** and version
- **Export button** (active after calculations)
- **Settings** and help icons

#### 2. Sidebar Navigation
- **📁 Import Files** - Load your CSV data
- **📊 Dashboard** - Overview and statistics  
- **📋 Results** - Detailed rebate calculations
- **📤 Export** - Generate final reports

#### 3. Main Content Area
- Shows the current page content
- Dashboard, import screens, results tables
- Progress indicators during processing

#### 4. Status Bar
- Current operation status
- Progress indicators
- Error messages and notifications

### Navigation

**Sidebar Menu:**
- Click any menu item to navigate
- Active page is highlighted
- Menu items are disabled until data is loaded

**Keyboard Shortcuts:**
- `Ctrl+O` (Windows) / `Cmd+O` (Mac) - Open files
- `Ctrl+E` (Windows) / `Cmd+E` (Mac) - Export results
- `F5` - Refresh current page

---

## 📁 Importing Data

### Required Files

Your data folder should contain these CSV files:

#### Essential Files (Required)
1. **`YYYYmm_NIUM_QLIK.csv`**
   - Your main transaction data
   - Example: `202412_NIUM_QLIK.csv` for December 2024
   - Contains all card transactions for the month

2. **`Visa & MCO Monthly Rebate.csv`**
   - Monthly rebate rates for Visa and Mastercard
   - Provider-specific pricing

3. **`Visa & MCO Yearly Rebate.csv`**
   - Annual rebate rates for Visa and Mastercard
   - Higher priority than monthly rates

4. **`PartnerPay_PartnerDirect Monthly Rebate.csv`**
   - Monthly rates for PartnerPay transactions
   - BIN-specific pricing

5. **`PartnerPay_PartnerDirect Yearly Rebate.csv`**
   - Annual rates for PartnerPay transactions
   - Higher priority than monthly rates

#### Optional Files (Advanced Features)
Located in `Library_NIUM/` subfolder:

6. **`AirlinesMCC.csv`** - Airline merchant codes
7. **`RegionCountry.csv`** - Regional pricing rules
8. **`VoyagePrive.csv`** - Voyage Prive special rates
9. **`BillingMaterials.csv`** - Billing reference codes
10. **`SAP_BPCodes.csv`** - SAP business partner codes

### Import Process

#### Step 1: Access Import Screen
1. Click **"Import Files"** in the sidebar
2. You'll see the data import configuration screen

#### Step 2: Select Data Folder
1. Click **"Select Data Folder"** button
2. Browse to your folder containing CSV files
3. Select the folder and click **"Choose"**

#### Step 3: Configure Period
1. **Year**: Enter the year (e.g., 2024)
2. **Month**: Select month from dropdown (1-12)
3. Example: Year=2024, Month=12 for December 2024

#### Step 4: Validate Files
The application will automatically:
- **Scan** your folder for required files
- **Validate** file formats and structure
- **Show** a summary of found files

#### Step 5: Import Data
1. Review the file validation summary
2. Click **"Import Data"** button
3. Watch the progress bar (may take 30-60 seconds)

### File Validation

The application checks for:

**✅ File Presence**
- All required CSV files exist
- Correct naming convention
- Readable file permissions

**✅ Data Structure**
- Correct number of columns
- Expected column headers
- Valid data types

**✅ Data Quality**
- No empty critical fields
- Valid date formats
- Numeric fields contain numbers

**❌ Common Issues**
- Missing files → Add missing CSV files
- Wrong naming → Rename to match expected format
- Corrupted data → Re-export from your source system

---

## 🧮 Calculating Rebates

### Calculation Process

#### Step 1: Start Calculation
1. After successful import, go to **Dashboard**
2. Click **"Calculate Rebates"** button
3. The calculation will start automatically

#### Step 2: Monitor Progress
- **Progress bar** shows completion percentage
- **Status messages** indicate current operation
- **Transaction counter** shows processed records

#### Step 3: Calculation Types
The system calculates different rebate types:

**1. Visa & MCO Rebates**
- Matches Provider Code + Product Name
- Uses yearly rates (if available) or monthly rates
- Applies to Visa and Mastercard transactions

**2. PartnerPay Rebates**
- Matches Provider + Product + BIN + MCC
- Complex multi-field matching
- Specific to PartnerPay transactions

**3. Special Cases**
- **Voyage Prive**: Special provider rates
- **MCC 4511**: Generic airline categorization
- **Regional Rules**: Country-specific pricing

#### Step 4: Results Summary
After calculation, you'll see:
- **Total rebate amount** in EUR
- **Number of transactions** processed
- **Calculation breakdown** by type
- **Error summary** (if any)

### Calculation Logic

#### Priority Rules
1. **Yearly rebates** take priority over monthly
2. **Exact matches** preferred over partial matches
3. **Special cases** override standard rules

#### Matching Process
**Visa & MCO:**
```
Transaction ← → Rebate Table
Provider Code ← → Provider Customer Code
Product Name ← → Product Name
```

**PartnerPay:**
```
Transaction ← → Rebate Table
Provider Code ← → Provider Customer Code
Product Name ← → Product Name
BIN Number ← → PartnerPay BIN
MCC Code ← → Merchant Category Code
```

#### Special Case Handling

**MCC 4511 (Generic Airlines):**
- Merchant name contains "air europa" → Air Europa
- Merchant name contains "air greenland" → Air Greenland  
- Merchant name contains "latam" → LATAM

**Voyage Prive Providers:**
- amvoyageprivefr#amvoyageprivefr
- amvoyagepriveit#amvoyagepriveit
- amvoyagepriveuk#amvoyagepriveuk

---

## 📊 Viewing Results

### Results Dashboard

#### Summary Metrics
- **Total Rebate Amount**: Grand total in EUR
- **Transaction Count**: Number of processed transactions
- **Average Rebate**: Average rebate per transaction
- **Calculation Date**: When calculation was performed

#### Breakdown Tables
1. **By Provider**: Rebates grouped by provider
2. **By Product**: Rebates grouped by product type
3. **By Region**: Geographic breakdown
4. **By Month**: Time-based analysis

### Detailed Results Table

#### Table Columns
- **Transaction ID**: Unique transaction identifier
- **Provider**: Provider customer code
- **Product**: Salesforce product name
- **Merchant**: Transaction merchant name
- **Amount**: Transaction amount in EUR
- **Rebate %**: Applied rebate percentage
- **Rebate Amount**: Calculated rebate in EUR
- **Date**: Transaction date
- **Region**: Geographic region
- **Type**: Rebate calculation type

#### Table Features

**Sorting:**
- Click column headers to sort
- Click again to reverse order
- Multiple column sorting available

**Filtering:**
- Use search box for text filtering
- Filter by date range
- Filter by amount range
- Filter by provider/product

**Pagination:**
- Navigate through large result sets
- Adjust page size (25, 50, 100, 500 rows)
- Jump to specific pages

### Result Validation

#### Quality Checks
- **Zero rebates**: Transactions with no matching rebate
- **High rebates**: Transactions exceeding normal ranges
- **Missing data**: Incomplete transaction information
- **Calculation errors**: Failed rebate calculations

#### Comparison with Excel
To validate against your Excel results:
1. **Export** results to Excel format
2. **Compare** total amounts
3. **Check** transaction counts
4. **Verify** rebate percentages
5. **Review** special cases

---

## 📤 Exporting Data

### Export Options

#### 1. Excel Format (.xlsx)
**Best for:** Final reports, stakeholder sharing
- **Features**: Formatted spreadsheet, formulas preserved
- **Compatibility**: Opens in Excel, Google Sheets, LibreOffice
- **File size**: Larger but more compatible

#### 2. CSV Format (.csv)
**Best for:** Further analysis, importing to other systems
- **Features**: Raw data, smaller file size
- **Compatibility**: Universal format
- **File size**: Smaller, faster processing

### Export Process

#### Method 1: Quick Export (Header Button)
1. Click **"Export"** button in header
2. Choose format (Excel or CSV)
3. Choose location to save
4. File opens automatically

#### Method 2: Export Page
1. Go to **"Export"** page in sidebar
2. Configure export options:
   - **Format**: Excel or CSV
   - **Data range**: All data or filtered
   - **Columns**: Select which columns to include
3. Click **"Generate Export"**

#### Method 3: Results Table Export
1. Go to **"Results"** page
2. Apply any filters you want
3. Click **"Export Filtered Results"**
4. Only visible/filtered data is exported

### Export Formats

#### Excel Export Structure
```
Sheet 1: Summary
- Total rebate amounts
- Transaction counts
- Calculation metadata

Sheet 2: Detailed Results
- Complete transaction-level data
- All rebate calculations
- Formatted as table

Sheet 3: Validation
- Quality check results
- Error transactions
- Statistical summary
```

#### CSV Export Structure
```
Single file with all transaction data:
- Transaction details
- Rebate calculations
- Metadata columns
- One row per transaction
```

### Export File Naming

**Automatic naming format:**
```
Ixaris_Rebates_YYYY_MM_YYYYMMDD_HHMMSS.xlsx
```

**Example:**
```
Ixaris_Rebates_2024_12_20241222_143045.xlsx
```

**Breakdown:**
- `Ixaris_Rebates`: Application identifier
- `2024_12`: Year and month of data
- `20241222_143045`: Export date and time

---

## 🔧 Advanced Features

### Database Management

#### Local Database
- **Location**: Stored locally on your computer
- **Type**: SQLite database
- **Security**: No data sent over internet
- **Backup**: Automatic backup before each calculation

#### Data Persistence
- **Configuration**: Remembers your last settings
- **Results**: Keeps calculation history
- **Performance**: Fast queries on large datasets

### Performance Optimization

#### Large File Handling
- **Chunked processing**: Processes data in batches
- **Memory management**: Prevents application crashes
- **Progress tracking**: Real-time progress updates

#### Speed Improvements
- **Indexed searches**: Fast data lookups
- **Optimized algorithms**: Efficient calculation logic
- **Parallel processing**: Multi-threaded operations

### Configuration Options

#### Application Settings
- **Data folder**: Default location for CSV files
- **Export folder**: Default location for exports
- **Language**: Interface language (future feature)
- **Theme**: Light/dark mode (future feature)

#### Calculation Settings
- **Precision**: Decimal places for calculations
- **Rounding**: Rounding methods
- **Validation**: Data quality checks
- **Logging**: Debug information level

---

## 📝 Best Practices

### Data Preparation

#### File Organization
```
Data_Folder/
├── 202412_NIUM_QLIK.csv
├── Visa & MCO Monthly Rebate.csv
├── Visa & MCO Yearly Rebate.csv
├── PartnerPay_PartnerDirect Monthly Rebate.csv
├── PartnerPay_PartnerDirect Yearly Rebate.csv
└── Library_NIUM/
    ├── AirlinesMCC.csv
    ├── RegionCountry.csv
    ├── VoyagePrive.csv
    ├── BillingMaterials.csv
    └── SAP_BPCodes.csv
```

#### File Quality
- **Consistent naming**: Follow exact naming conventions
- **Clean data**: Remove extra spaces, special characters
- **Complete data**: Ensure all required fields are populated
- **Recent exports**: Use fresh exports from source systems

### Workflow Recommendations

#### Monthly Process
1. **Export** fresh CSV files from source systems
2. **Organize** files in dedicated folder
3. **Import** data into application
4. **Calculate** rebates
5. **Validate** results against previous month
6. **Export** final reports
7. **Archive** source files and results

#### Quality Assurance
1. **Compare totals** with previous calculations
2. **Review** zero-rebate transactions
3. **Check** high-value rebates manually
4. **Validate** special cases
5. **Cross-reference** with source data

#### Error Resolution
1. **Check** import validation messages
2. **Verify** file naming and structure
3. **Review** calculation logs
4. **Examine** unmatched transactions
5. **Contact support** for persistent issues

### Performance Tips

#### For Large Datasets (500K+ transactions)
- **Close** other applications during processing
- **Use** SSD storage for better performance
- **Increase** system RAM if possible
- **Process** during off-peak hours

#### For Better Accuracy
- **Use yearly rates** when available (higher priority)
- **Keep** rebate tables up-to-date
- **Verify** provider codes match exactly
- **Check** product names for consistency

---

## 🆘 Getting Help

### Self-Help Resources

1. **[Troubleshooting Guide](TROUBLESHOOTING.md)** - Common issues and solutions
2. **[Installation Guide](INSTALLATION_GUIDE.md)** - Setup instructions
3. **Application logs** - Check console for error messages
4. **File validation** - Review import validation results

### Support Contacts

- **Email**: [rmc.coe@amadeus.com](mailto:rmc.coe@amadeus.com)
- **Team**: Amadeus COE (Center of Excellence)
- **Response time**: 1-2 business days

### When Contacting Support

Please include:
1. **Application version** (shown in title bar)
2. **Operating system** and version
3. **Error messages** (copy exact text)
4. **Steps to reproduce** the issue
5. **Sample files** (if appropriate)

---

**🎉 You're now ready to calculate rebates efficiently with the modern application!**

The Ixaris Rebates Calculator replaces your Excel-based process with a faster, more accurate, and user-friendly solution.