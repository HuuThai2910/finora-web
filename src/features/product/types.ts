export type RepaymentMethod = 'ANNUITY' | 'EQUAL_PRINCIPAL';
export type LoanProductStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type CoreSyncStatus = 'NOT_SYNCED' | 'PENDING' | 'PROCESSING' | 'RETRY_PENDING' | 'SYNCED' | 'FAILED';

export interface PageResponse<T> {
  data: T[];
  page: number;
  size: number;
  totalElements: number;
}

export interface LoanProduct {
  id: number;
  code: string;
  name: string;
  description: string | null;
  minAmount: number;
  maxAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
  annualInterestRate: number;
  repaymentMethod: RepaymentMethod;
  status: LoanProductStatus;
  coreSyncStatus: CoreSyncStatus;
  currentCoreMappingId: number | null;
  configurationVersion: number;
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoanProductRequest {
  code: string;
  name: string;
  description: string | null;
  minAmount: number;
  maxAmount: number;
  minTermMonths: number;
  maxTermMonths: number;
  annualInterestRate: number;
  repaymentMethod: RepaymentMethod;
}

export interface CoreProductSyncResponse {
  product: LoanProduct;
  commandId: string;
  commandStatus: 'PENDING' | 'PROCESSING' | 'RETRY_PENDING' | 'SUCCEEDED' | 'FAILED';
  errorCode: string | null;
}

