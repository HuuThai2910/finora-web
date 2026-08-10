import { loanApi } from '@/lib/api/loanApi';
import type {
  AdminDecisionResponse,
  AdminLoanReviewDetail,
  AdminLoanReviewPage,
  AssessmentPage,
  CreditAssessmentDetail,
  LoanApplicationStatus,
  ScoringRetryAcceptedResponse,
} from '../types';

const loanReviewApi = loanApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminApplications: builder.query<AdminLoanReviewPage, {
      status?: LoanApplicationStatus;
      page?: number;
      size?: number;
    }>({
      query: (params) => ({ url: '/admin/loan-applications', params }),
      providesTags: (result) => [
        { type: 'AdminApplicationList', id: 'LIST' },
        ...(result?.data.map(({ applicationNumber }) => ({
          type: 'AdminApplication' as const,
          id: applicationNumber,
        })) ?? []),
      ],
    }),
    getReviewDetail: builder.query<AdminLoanReviewDetail, string>({
      query: (applicationNumber) => `/admin/loan-applications/${applicationNumber}/review`,
      providesTags: (_result, _error, applicationNumber) => [
        { type: 'AdminApplication', id: applicationNumber },
      ],
    }),
    getAssessments: builder.query<AssessmentPage, { applicationNumber: string; page?: number; size?: number }>({
      query: ({ applicationNumber, ...params }) => ({
        url: `/admin/loan-applications/${applicationNumber}/assessments`,
        params,
      }),
      providesTags: (_result, _error, { applicationNumber }) => [
        { type: 'CreditAssessment', id: applicationNumber },
      ],
    }),
    getAssessmentDetail: builder.query<CreditAssessmentDetail, {
      applicationNumber: string;
      assessmentId: number;
    }>({
      query: ({ applicationNumber, assessmentId }) =>
        `/admin/loan-applications/${applicationNumber}/assessments/${assessmentId}`,
    }),
    retryScoring: builder.mutation<ScoringRetryAcceptedResponse, {
      applicationNumber: string;
      version: number;
      idempotencyKey: string;
    }>({
      query: ({ applicationNumber, version, idempotencyKey }) => ({
        url: `/admin/loan-applications/${applicationNumber}/scoring-retry`,
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: { version },
      }),
      invalidatesTags: (_result, _error, { applicationNumber }) => [
        { type: 'CreditAssessment', id: applicationNumber },
        { type: 'AdminApplication', id: applicationNumber },
      ],
    }),
    approveApplication: builder.mutation<AdminDecisionResponse, {
      applicationNumber: string;
      applicationVersion: number;
      assessmentId: number;
      contractExpiresAt?: string;
      idempotencyKey: string;
    }>({
      query: ({ applicationNumber, idempotencyKey, ...body }) => ({
        url: `/admin/loan-applications/${applicationNumber}/approve`,
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: { ...body, decisionReasonCode: 'POLICY_APPROVED' },
      }),
      invalidatesTags: (_result, _error, { applicationNumber }) => [
        { type: 'AdminApplication', id: applicationNumber },
        { type: 'AdminApplicationList', id: 'LIST' },
      ],
    }),
    rejectApplication: builder.mutation<AdminDecisionResponse, {
      applicationNumber: string;
      applicationVersion: number;
      assessmentId?: number;
      reasonCode: string;
      reasonDetail?: string;
      idempotencyKey: string;
    }>({
      query: ({ applicationNumber, idempotencyKey, ...body }) => ({
        url: `/admin/loan-applications/${applicationNumber}/reject`,
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body,
      }),
      invalidatesTags: (_result, _error, { applicationNumber }) => [
        { type: 'AdminApplication', id: applicationNumber },
        { type: 'AdminApplicationList', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetAdminApplicationsQuery,
  useGetReviewDetailQuery,
  useGetAssessmentsQuery,
  useLazyGetAssessmentDetailQuery,
  useRetryScoringMutation,
  useApproveApplicationMutation,
  useRejectApplicationMutation,
} = loanReviewApi;
