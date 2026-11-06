import { loanApi } from '@/lib/api/loanApi';
import type {
  AdminAssessmentExplanation,
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
      /** ID hồ sơ người dùng ở finora-user: trang khách hàng và mục "Hồ sơ khác của cùng người vay". */
      borrowerId?: string;
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
    /** Mã hồ sơ `LA-…` theo ID số, cho các bảng chỉ có ID (đối soát của Payment). Tối đa 100 ID một lần. */
    getApplicationNumbers: builder.query<{ id: number; applicationNumber: string }[], number[]>({
      query: (ids) => ({ url: '/admin/loan-applications/numbers', params: { ids: ids.join(',') } }),
      keepUnusedDataFor: 600,
    }),
    getReviewDetail: builder.query<AdminLoanReviewDetail, string>({
      query: (applicationNumber) => `/admin/loan-applications/${applicationNumber}/review`,
      providesTags: (_result, _error, applicationNumber) => [
        { type: 'AdminApplication', id: applicationNumber },
      ],
    }),
    /**
     * Giải thích của lần chấm điểm đã dùng để quyết định hồ sơ.
     *
     * Tách khỏi `getReviewDetail` vì payload lớn (SHAP từng đặc trưng + vết mọi
     * luật): chỉ tải khi mở phần phân tích, hoặc ngay khi hồ sơ đang chờ thẩm định cần điểm CIC.
     */
    getAssessmentExplanation: builder.query<AdminAssessmentExplanation, string>({
      query: (applicationNumber) => `/admin/loan-applications/${applicationNumber}/explanation`,
      providesTags: (_result, _error, applicationNumber) => [
        { type: 'CreditAssessment', id: `${applicationNumber}-EXPLANATION` },
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
      /** Ghi chú của người duyệt (tối đa 1000 ký tự), lưu vào lịch sử quyết định. */
      decisionReasonDetail?: string;
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
  useGetApplicationNumbersQuery,
  useGetReviewDetailQuery,
  // Tra hồ sơ theo mã từ trang khác (vd. Xác minh giao dịch đổi mã LA-… ra ID số), chỉ gọi khi người dùng bấm tra.
  useLazyGetReviewDetailQuery,
  useGetAssessmentsQuery,
  // Lazy: tải khi mở phần phân tích hoặc khi hồ sơ chờ thẩm định đã chấm (xem useAssessmentExplanation).
  useLazyGetAssessmentExplanationQuery,
  useLazyGetAssessmentDetailQuery,
  useRetryScoringMutation,
  useApproveApplicationMutation,
  useRejectApplicationMutation,
} = loanReviewApi;
