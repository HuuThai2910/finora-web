import { loanApi } from '@/lib/api/loanApi';
import type { CollectionAction, CollectionCase, PageResponse, QuarantinedRepaymentEvent,
  ReconciliationIncident, RescheduleRequest, RescheduleStatus, StaleLoan } from '../types';

export const servicingApi = loanApi.injectEndpoints({
  endpoints: (builder) => ({
    collectionCases: builder.query<PageResponse<CollectionCase>, { page: number; status?: string }>({
      query: (params) => ({ url: '/admin/collection-cases', params: { ...params, size: 20 } }),
      providesTags: ['ServicingOperations'],
    }),
    recordCollectionAction: builder.mutation<CollectionAction, { caseId: string; note: string; key: string }>({
      query: ({ caseId, note, key }) => ({
        url: `/admin/collection-cases/${caseId}/actions`, method: 'POST',
        body: { actionType: 'BORROWER_CONTACTED', note },
        headers: { 'Idempotency-Key': key },
      }),
      invalidatesTags: ['ServicingOperations'],
    }),
    rescheduleRequests: builder.query<PageResponse<RescheduleRequest>, { page: number; status?: RescheduleStatus }>({
      query: (params) => ({ url: '/admin/loan-reschedule-requests', params: { ...params, size: 20 } }),
      providesTags: ['ServicingOperations'],
    }),
    staleLoans: builder.query<PageResponse<StaleLoan>, { page: number }>({
      query: (params) => ({ url: '/admin/loan-servicing-reconciliation', params: { ...params, size: 20 } }),
      providesTags: ['ServicingOperations'],
    }),
    reconciliationIncidents: builder.query<PageResponse<ReconciliationIncident>, { page: number }>({
      query: (params) => ({ url: '/admin/loan-servicing-reconciliation/incidents', params: { ...params, size: 20, status: 'OPEN' } }),
      providesTags: ['ServicingOperations'],
    }),
    quarantinedEvents: builder.query<PageResponse<QuarantinedRepaymentEvent>, { page: number }>({
      query: (params) => ({ url: '/admin/repayment-event-quarantine', params: { ...params, size: 20, status: 'PENDING' } }),
      providesTags: ['ServicingOperations'],
    }),
    decideReschedule: builder.mutation<RescheduleRequest, { requestId: string; decision: 'approve' | 'reject'; comment: string; key: string }>({
      query: ({ requestId, decision, comment, key }) => ({
        url: `/admin/loan-reschedule-requests/${requestId}/${decision}`,
        method: 'POST', body: { comment }, headers: { 'Idempotency-Key': key },
      }),
      invalidatesTags: ['ServicingOperations'],
    }),
    reconcileLoan: builder.mutation<StaleLoan, string>({
      query: (loanNumber) => ({ url: `/admin/loan-servicing-reconciliation/${loanNumber}/reconcile`, method: 'POST' }),
      invalidatesTags: ['ServicingOperations'],
    }),
    replayQuarantine: builder.mutation<QuarantinedRepaymentEvent, string>({
      query: (eventId) => ({ url: `/admin/repayment-event-quarantine/${eventId}/replay`, method: 'POST' }),
      invalidatesTags: ['ServicingOperations'],
    }),
  }),
});

export const { useCollectionCasesQuery, useRescheduleRequestsQuery, useStaleLoansQuery,
  useReconciliationIncidentsQuery, useQuarantinedEventsQuery, useDecideRescheduleMutation,
  useReconcileLoanMutation, useReplayQuarantineMutation, useRecordCollectionActionMutation } = servicingApi;
