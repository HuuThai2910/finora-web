import { loanApi } from '@/lib/api/loanApi';
import type {
  AdminAssessmentExplanation,
  AdminDecisionResponse,
  AdminLoanReviewDetail,
  AdminLoanReviewPage,
  ApplicationReference,
  AssessmentPage,
  CreditAssessmentDetail,
  LoanApplicationStatus,
  ScoringRetryAcceptedResponse,
  ServicingFlag,
} from '../types';

const loanReviewApi = loanApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminApplications: builder.query<AdminLoanReviewPage, {
      status?: LoanApplicationStatus;
      /** ID hồ sơ người dùng ở finora-user: trang khách hàng và mục "Hồ sơ khác của cùng người vay". */
      borrowerId?: string;
      /** Ô tìm: mã hồ sơ (HS-…/LA-…) hoặc mã hợp đồng (HĐ-…/LC-…), khớp một phần ở server. */
      q?: string;
      /** Lọc theo việc vận hành của khoản vay: đang quá hạn, chờ duyệt cơ cấu, có sự cố. */
      servicing?: ServicingFlag;
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
    /** Mã tra cứu `LA-…` và mã hiển thị `HS-…` theo ID số, cho các bảng chỉ có ID. Tối đa 100 ID một lần. */
    getApplicationNumbers: builder.query<ApplicationReference[], number[]>({
      query: (ids) => ({ url: '/admin/loan-applications/numbers', params: { ids: ids.join(',') } }),
      keepUnusedDataFor: 600,
    }),
    /** Đổi mã nhân viên có trong tay (`HS-…`, `HĐ-…`/`HD-…`, `LA-…`, `LC-…`) về hồ sơ để mở trang thẩm định. */
    lookupApplication: builder.query<ApplicationReference, string>({
      query: (code) => ({ url: '/admin/loan-applications/lookup', params: { code } }),
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
  useLazyLookupApplicationQuery,
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
