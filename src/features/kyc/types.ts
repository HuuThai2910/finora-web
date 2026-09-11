export type EkycStatus = 'PENDING' | 'VERIFIED' | 'FAILED' | 'MANUAL_REVIEW';

export type EkycResultCode =
  | 'DRAFT_READY'
  | 'DRAFT_EXPIRED'
  | 'VERIFIED'
  | 'OCR_FAILED'
  | 'ID_MISMATCH'
  | 'ID_TAKEN'
  | 'RATE_LIMITED'
  | 'AI_UNAVAILABLE';

export interface EkycDraft {
  idNumber: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  placeOfOrigin: string;
  address: string;
}

export interface EkycResultResponse {
  status: EkycStatus;
  resultCode: EkycResultCode;
  ocrWarnings: string[];
  message: string;
  draft: EkycDraft | null;
}

export interface EkycVerifyRequest {
  cccdFrontBase64: string;
  cccdBackBase64: string;
}

export interface BaseResponse<T> {
  code: number;
  message: string;
  data: T;
}
