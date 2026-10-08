import { loanApi } from '@/lib/api/loanApi';
import type {
  CollectionAction, CollectionCase, CollectionCaseStatus, CollectionStage, CreateCollectionActionRequest,
  PageResponse, QuarantinedRepaymentEvent, ReconciliationIncident, RescheduleDecision, RescheduleRequest,
  RescheduleStatus, StaleLoan,
} from '../types';

export interface PageArgs { page: number; size: number }

/**
 * Mỗi hàng đợi một id tag riêng để mutation chỉ làm mới đúng danh sách bị ảnh hưởng, kể cả
 * các truy vấn `size=1` dùng để đếm số trên tab.
 */
const tag = (id: string) => ({ type: 'ServicingOperations' as const, id });

export const servicingApi = loanApi.injectEndpoints({
  endpoints: (builder) => ({
    collectionCases: builder.query<PageResponse<CollectionCase>, PageArgs & { status?: CollectionCaseStatus; stage?: CollectionStage }>({
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
    rescheduleRequests: builder.query<PageResponse<RescheduleRequest>, PageArgs & { status?: RescheduleStatus }>({
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
      invalidatesTags: [tag('RESCHEDULE')],
    }),
    staleLoans: builder.query<PageResponse<StaleLoan>, PageArgs>({
      query: (params) => ({ url: '/admin/loan-servicing-reconciliation', params }),
      providesTags: [tag('RECONCILIATION')],
    }),
    reconciliationIncidents: builder.query<PageResponse<ReconciliationIncident>, PageArgs>({
      query: (params) => ({ url: '/admin/loan-servicing-reconciliation/incidents', params: { ...params, status: 'OPEN' } }),
      providesTags: [tag('INCIDENTS')],
    }),
    // Đối soát đọc lại hệ thống lõi: số liệu quá hạn và sai lệch có thể đổi theo, nên làm mới cả ba hàng đợi.
    reconcileLoan: builder.mutation<StaleLoan, string>({
      query: (loanNumber) => ({ url: `/admin/loan-servicing-reconciliation/${loanNumber}/reconcile`, method: 'POST' }),
      invalidatesTags: [tag('RECONCILIATION'), tag('INCIDENTS'), tag('COLLECTION')],
    }),
    quarantinedEvents: builder.query<PageResponse<QuarantinedRepaymentEvent>, PageArgs>({
      query: (params) => ({ url: '/admin/repayment-event-quarantine', params: { ...params, status: 'PENDING' } }),
      providesTags: [tag('QUARANTINE')],
    }),
    // Ghép được sự kiện trả nợ thì khoản vay có thể hết quá hạn, nên làm mới cả hàng đợi thu hồi.
    replayQuarantine: builder.mutation<QuarantinedRepaymentEvent, string>({
      query: (eventId) => ({ url: `/admin/repayment-event-quarantine/${eventId}/replay`, method: 'POST' }),
      invalidatesTags: [tag('QUARANTINE'), tag('COLLECTION')],
    }),
  }),
});

export const {
  useCollectionCasesQuery, useCollectionActionsQuery, useRecordCollectionActionMutation,
  useRescheduleRequestsQuery, useDecideRescheduleMutation,
  useStaleLoansQuery, useReconciliationIncidentsQuery, useReconcileLoanMutation,
  useQuarantinedEventsQuery, useReplayQuarantineMutation,
} = servicingApi;
