import { loanApi } from '@/lib/api/loanApi';
import type {
  CollectionAction, CollectionCase, CollectionCaseStatus, CreateCollectionActionRequest,
  DisbursementSagaRepair, PageResponse, QuarantinedRepaymentEvent, ReconciliationIncident, RescheduleDecision,
  RescheduleRecoveryAction, RescheduleRequest, RescheduleStatus, StaleLoan,
} from '../types';

export interface PageArgs { page: number; size: number }

export interface RescheduleListArgs extends PageArgs {
  loanNumber?: string;
  /** Contract cũ của card chi tiết khoản vay. */
  status?: RescheduleStatus;
  /** Hàng đợi quản trị có thể gộp nhiều trạng thái nghiệp vụ trong một tab. */
  statuses?: RescheduleStatus[];
  requestType?: RescheduleRequest['requestType'];
  q?: string;
}

/**
 * Mỗi nhóm việc một id tag riêng để mutation chỉ làm mới đúng danh sách bị ảnh hưởng. Thao tác làm đổi nhãn việc vận
 * hành của hồ sơ (quá hạn, chờ duyệt cơ cấu, sự cố) làm mới cả danh sách và chi tiết hồ sơ (tag `AdminApplication*`).
 */
const tag = (id: string) => ({ type: 'ServicingOperations' as const, id });
const APPLICATION_TAGS = ['AdminApplication', { type: 'AdminApplicationList' as const, id: 'LIST' }] as const;

export const servicingApi = loanApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Hồ sơ thu hồi của một khoản vay (phần "Sau giải ngân" của trang hồ sơ), mới mở trước. */
    collectionCases: builder.query<PageResponse<CollectionCase>, PageArgs & { loanNumber: string; status?: CollectionCaseStatus }>({
      query: (params) => ({ url: '/admin/collection-cases', params }),
      providesTags: [tag('COLLECTION')],
    }),
    collectionActions: builder.query<PageResponse<CollectionAction>, PageArgs & { caseId: string }>({
      query: ({ caseId, ...params }) => ({ url: `/admin/collection-cases/${caseId}/actions`, params }),
      providesTags: (_result, _error, { caseId }) => [tag(`ACTIONS-${caseId}`)],
    }),
    recordCollectionAction: builder.mutation<CollectionAction, { caseId: string; body: CreateCollectionActionRequest; key: string }>({
      query: ({ caseId, body, key }) => ({
        url: `/admin/collection-cases/${caseId}/actions`,
        method: 'POST',
        body,
        headers: { 'Idempotency-Key': key },
      }),
      invalidatesTags: (_result, _error, { caseId }) => [tag(`ACTIONS-${caseId}`)],
    }),
    /** Yêu cầu cơ cấu của một khoản vay, mới nhất trước; không gửi `status` là mọi trạng thái. */
    rescheduleRequests: builder.query<PageResponse<RescheduleRequest>, RescheduleListArgs>({
      query: (params) => ({ url: '/admin/loan-reschedule-requests', params }),
      providesTags: [tag('RESCHEDULE')],
    }),
    decideReschedule: builder.mutation<RescheduleRequest, { requestId: string; decision: RescheduleDecision; comment: string | null; key: string }>({
      query: ({ requestId, decision, comment, key }) => ({
        url: `/admin/loan-reschedule-requests/${requestId}/${decision}`,
        method: 'POST',
        body: { comment },
        headers: { 'Idempotency-Key': key },
      }),
      invalidatesTags: [tag('RESCHEDULE'), ...APPLICATION_TAGS],
    }),
    recoverReschedule: builder.mutation<RescheduleRequest, { requestId: string; action: RescheduleRecoveryAction; comment?: string; key?: string }>({
      query: ({ requestId, action, comment, key }) => ({
        url: `/admin/loan-reschedule-requests/${requestId}/${action}`,
        method: 'POST',
        ...(action === 'cancel' ? { body: { comment }, headers: { 'Idempotency-Key': key! } } : {}),
      }),
      invalidatesTags: [tag('RESCHEDULE'), ...APPLICATION_TAGS],
    }),
    /** Số liệu FINORA đang lưu của một khoản vay so với lịch đồng bộ hệ thống lõi; chỉ đọc, không gọi hệ thống lõi. */
    loanServicingStatus: builder.query<StaleLoan, string>({
      query: (loanNumber) => `/admin/loan-servicing-reconciliation/${encodeURIComponent(loanNumber)}`,
      providesTags: [tag('RECONCILIATION')],
    }),
    /** Sai lệch đang mở của một khoản vay. */
    reconciliationIncidents: builder.query<PageResponse<ReconciliationIncident>, PageArgs & { loanNumber: string }>({
      query: (params) => ({ url: '/admin/loan-servicing-reconciliation/incidents', params: { ...params, status: 'OPEN' } }),
      providesTags: [tag('INCIDENTS')],
    }),
    // Đối soát đọc lại hệ thống lõi: số liệu quá hạn và sai lệch có thể đổi theo, nên làm mới cả thu hồi và nhãn hồ sơ.
    reconcileLoan: builder.mutation<StaleLoan, string>({
      query: (loanNumber) => ({ url: `/admin/loan-servicing-reconciliation/${loanNumber}/reconcile`, method: 'POST' }),
      invalidatesTags: [tag('RECONCILIATION'), tag('INCIDENTS'), tag('COLLECTION'), ...APPLICATION_TAGS],
    }),
    quarantinedEvents: builder.query<PageResponse<QuarantinedRepaymentEvent>, PageArgs>({
      query: (params) => ({ url: '/admin/repayment-event-quarantine', params: { ...params, status: 'PENDING' } }),
      providesTags: [tag('QUARANTINE')],
    }),
    // Ghép được sự kiện trả nợ thì khoản vay có thể hết quá hạn, nên làm mới cả thu hồi và nhãn hồ sơ.
    replayQuarantine: builder.mutation<QuarantinedRepaymentEvent, string>({
      query: (eventId) => ({ url: `/admin/repayment-event-quarantine/${eventId}/replay`, method: 'POST' }),
      invalidatesTags: [tag('QUARANTINE'), tag('COLLECTION'), ...APPLICATION_TAGS],
    }),
    /**
     * Saga giải ngân hết lượt ghi Fineract tự động (R2): tiền đã giải ngân, khoản vay chưa có ở hệ thống lõi. Có
     * `loanApplicationId` thì chỉ đọc saga của hồ sơ đó.
     */
    repairSagas: builder.query<PageResponse<DisbursementSagaRepair>, PageArgs & { loanApplicationId?: number }>({
      query: (params) => ({ url: '/admin/disbursement-sagas', params: { ...params, status: 'REPAIR_REQUIRED' } }),
      providesTags: [tag('SAGA_REPAIR')],
    }),
    // Chỉ đưa bước ghi Fineract về hàng chờ; booking đối chiếu theo số hợp đồng nên không tạo khoản vay thứ hai.
    requeueSaga: builder.mutation<DisbursementSagaRepair, { sagaId: string; note: string }>({
      query: ({ sagaId, note }) => ({ url: `/admin/disbursement-sagas/${sagaId}/requeue`, method: 'POST', body: { note } }),
      invalidatesTags: [tag('SAGA_REPAIR'), ...APPLICATION_TAGS],
    }),
  }),
});

export const {
  useCollectionCasesQuery, useCollectionActionsQuery, useRecordCollectionActionMutation,
  useRescheduleRequestsQuery, useDecideRescheduleMutation, useRecoverRescheduleMutation,
  useLoanServicingStatusQuery, useReconciliationIncidentsQuery, useReconcileLoanMutation,
  useQuarantinedEventsQuery, useReplayQuarantineMutation,
  useRepairSagasQuery, useRequeueSagaMutation,
} = servicingApi;
