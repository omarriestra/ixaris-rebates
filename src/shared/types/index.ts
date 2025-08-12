// Configuration types
export interface AppConfiguration {
  folderPath: string;
  year: number;
  month: number;
}

export interface FileValidationResult {
  isValid: boolean;
  foundFiles: string[];
  missingFiles: string[];
  errors: string[];
}

// Transaction data types
export interface TransactionRecord {
  transactionCardNumber: string;
  transactionCurrency: string;
  providerCustomerCode: string;
  transactionType: string;
  transactionCard: string;
  salesforceProductName: string;
  fundingAccountName: string;
  region: string;
  regionMC: string;
  transactionDate: string;
  binCardNumber: number;
  transactionAmount: number;
  interchangeAmount: number;
  interchangePercentage: number;
  transactionId: string;
  transactionAmountEUR: number;
  fxRate: number;
  pkReference: string;
  transactionMerchantCountry: string;
  transactionMerchantCategoryCode: number;
  merchantName: string;
  transactionMerchantName: string;
}

// Rebate lookup types
export interface VisaMCORebateRecord {
  accountName: string;
  opportunityName: string;
  fullOpportunityStage: string;
  paymentPartnerAccountName: string;
  providerCustomerCode: string;
  productName: string;
  rebate1Monthly?: number;
  rebate2Monthly?: number;
  rebate3Monthly?: number;
  rebate4Monthly?: number;
  rebate5Monthly?: number;
  rebate6Monthly?: number;
  rebate7Monthly?: number;
  rebate8Monthly?: number;
  rebate1Yearly?: number;
  rebate2Yearly?: number;
  rebate3Yearly?: number;
  rebate4Yearly?: number;
  rebate5Yearly?: number;
  rebate6Yearly?: number;
  rebate7Yearly?: number;
  rebate8Yearly?: number;
  masterAccount: string;
}

export interface PartnerPayRebateRecord {
  accountName: string;
  opportunityName: string;
  fullOpportunityStage: string;
  paymentPartnerAccountName: string;
  providerCustomerCode: string;
  productName: string;
  partnerPayAirline: string;
  partnerPayBIN: string;
  rebate1Monthly?: number;
  rebate2Monthly?: number;
  rebate3Monthly?: number;
  rebate4Monthly?: number;
  rebate5Monthly?: number;
  rebate6Monthly?: number;
  rebate7Monthly?: number;
  rebate8Monthly?: number;
  rebate1Yearly?: number;
  rebate2Yearly?: number;
  rebate3Yearly?: number;
  rebate4Yearly?: number;
  rebate5Yearly?: number;
  rebate6Yearly?: number;
  rebate7Yearly?: number;
  rebate8Yearly?: number;
  masterAccount: string;
}

// Library data types
export interface LibraryAirlineMCC {
  airlineName: string;
  airlineCode: string;
  mccCode: number;
}

export interface LibraryRegionCountry {
  providerCustomerCode: string;
  regionMC: string;
  transactionMerchantCountry: string;
  rule: string;
}

export interface LibraryVoyagePrive {
  providerCustomerCode: string;
  productName: string;
  rebate1?: number;
  rebate2?: number;
  rebate3?: number;
  rebate4?: number;
  rebate5?: number;
  rebate6?: number;
  rebate7?: number;
  rebate8?: number;
}

export interface LibraryBillingMaterial {
  salesforceProductName: string;
  billingMaterial: string;
  description: string;
}

export interface LibrarySAPCode {
  providerCustomerCode: string;
  sapVendorCode: string;
  vendorName: string;
}

// Calculated rebate types
export interface CalculatedRebate {
  transactionId: string;
  providerCustomerCode: string;
  productName: string;
  rebateLevel: number;
  rebatePercentage: number;
  rebateAmount: number;
  rebateAmountEUR: number;
  calculationType: 'visa_mco' | 'partnerpay' | 'voyage_prive' | 'region_country';
  originalTransaction: TransactionRecord;
}

// Special cases types
export interface SpecialCaseRule {
  type: 'mcc_4511' | 'voyage_prive' | 'region_country';
  providerCustomerCode: string;
  conditions: Record<string, any>;
  action: Record<string, any>;
}

// Processing types
export interface ProcessingProgress {
  stage: 'validation' | 'loading' | 'calculation' | 'complete';
  percentage: number;
  message: string;
  details?: string;
  errors?: string[];
}

export interface ProcessingResult {
  success: boolean;
  transactionsProcessed: number;
  rebatesCalculated: number;
  calculatedRebates?: CalculatedRebate[]; // Optional list of calculated rebates
  totalRebateAmountEur?: number; // Added for frontend compatibility
  errors: string[];
  warnings: string[];
  processingTime: number;
  summary: {
    totalTransactions: number;
    totalRebateAmount: number;
    totalRebateAmountEUR: number;
    byCalculationType: Record<string, number>;
    byProvider: Record<string, number>;
  };
}

// Export types
export interface ExportData {
  transactions: TransactionRecord[];
  calculatedRebates: CalculatedRebate[];
  summary: ProcessingResult['summary'];
  masterTable?: MasterTableRow[]; // Optional master table for Power Query style export
  metadata: {
    exportDate: string;
    configuration: AppConfiguration;
    version: string;
  };
}

// Master table types (Power Query style output)
export interface MasterTableRow extends TransactionRecord {
  // Rebate percentages (8 levels, monthly and yearly)
  rebate1Monthly: number | null;
  rebate2Monthly: number | null;
  rebate3Monthly: number | null;
  rebate4Monthly: number | null;
  rebate5Monthly: number | null;
  rebate6Monthly: number | null;
  rebate7Monthly: number | null;
  rebate8Monthly: number | null;
  rebate1Yearly: number | null;
  rebate2Yearly: number | null;
  rebate3Yearly: number | null;
  rebate4Yearly: number | null;
  rebate5Yearly: number | null;
  rebate6Yearly: number | null;
  rebate7Yearly: number | null;
  rebate8Yearly: number | null;
  
  // Calculated amounts (8 levels)
  rebateAmount1: number;
  rebateAmount2: number;
  rebateAmount3: number;
  rebateAmount4: number;
  rebateAmount5: number;
  rebateAmount6: number;
  rebateAmount7: number;
  rebateAmount8: number;
  rebateAmountEUR1: number;
  rebateAmountEUR2: number;
  rebateAmountEUR3: number;
  rebateAmountEUR4: number;
  rebateAmountEUR5: number;
  rebateAmountEUR6: number;
  rebateAmountEUR7: number;
  rebateAmountEUR8: number;
  
  // Additional fields from Power Query
  merchantNameNew: string;
  transactionMerchantCategoryCode2: string;
}

export interface SubmissionFileRow {
  providerCustomerCode: string;
  sapVendorCode: string;
  vendorName: string;
  productName: string;
  billingMaterial: string;
  rebateLevel: number;
  rebateAmount: number;
  rebateAmountEUR: number;
  transactionCount: number;
  currency: string;
  period: string;
}

// UI types
export interface TableColumn<T = any> {
  key: keyof T;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  format?: (value: any) => string;
  render?: (value: any, row: T) => React.ReactNode;
}

export interface TableProps<T = any> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  emptyMessage?: string;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
  sorting?: {
    key: keyof T;
    direction: 'asc' | 'desc';
    onSort: (key: keyof T, direction: 'asc' | 'desc') => void;
  };
  filtering?: {
    filters: Record<string, any>;
    onFilter: (filters: Record<string, any>) => void;
  };
  selection?: {
    selectedRows: T[];
    onSelectionChange: (selected: T[]) => void;
  };
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'file' | 'folder' | 'date' | 'checkbox';
  required?: boolean;
  placeholder?: string;
  options?: { value: any; label: string }[];
  validation?: {
    pattern?: RegExp;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    custom?: (value: any) => string | null;
  };
  disabled?: boolean;
  hint?: string;
}

export interface FormErrors {
  [fieldName: string]: string[];
}

// Notification types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  actions?: {
    label: string;
    action: () => void;
  }[];
}

// Context types
export interface ConfigurationContextType {
  configuration: AppConfiguration | null;
  setConfiguration: (config: AppConfiguration) => void;
  loadConfiguration: () => Promise<void>;
  saveConfiguration: (config: AppConfiguration) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export interface ProgressContextType {
  progress: ProcessingProgress | null;
  setProgress: (progress: ProcessingProgress) => void;
  clearProgress: () => void;
  isProcessing: boolean;
}

export interface DataContextType {
  transactionData: TransactionRecord[];
  calculatedRebates: CalculatedRebate[];
  processingResult: ProcessingResult | null;
  setTransactionData: (data: TransactionRecord[]) => void;
  setCalculatedRebates: (rebates: CalculatedRebate[]) => void;
  setProcessingResult: (result: ProcessingResult) => void;
  clearData: () => void;
  loadData: () => Promise<void>;
  processRebates: (config: { folderPath: string; year: number; month: number }) => Promise<ProcessingResult>;
  isLoading: boolean;
  error: string | null;
  hasExistingData: boolean;
  existingDataSummary: {
    transactionCount: number;
    rebateCount: number;
    totalAmountEUR: number;
    lastProcessed?: Date;
  } | null;
  checkExistingData: () => Promise<void>;
}

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: string;
  stack?: string;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// File processing types
export interface FileProcessingOptions {
  validateStructure: boolean;
  skipEmptyRows: boolean;
  dateFormat: string;
  currencyFormat: string;
  decimalSeparator: '.' | ',';
  thousandsSeparator: ',' | '.' | ' ';
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Constants
export const REBATE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
export type RebateLevel = typeof REBATE_LEVELS[number];

export const CALCULATION_TYPES = ['visa_mco', 'partnerpay', 'voyage_prive', 'region_country'] as const;
export type CalculationType = typeof CALCULATION_TYPES[number];

export const PROCESSING_STAGES = ['validation', 'loading', 'calculation', 'complete'] as const;
export type ProcessingStage = typeof PROCESSING_STAGES[number];

export const NOTIFICATION_TYPES = ['success', 'error', 'warning', 'info'] as const;
export type NotificationType = typeof NOTIFICATION_TYPES[number];

// Database types will be imported directly where needed
// to avoid circular dependencies during compilation