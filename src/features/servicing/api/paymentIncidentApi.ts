import { paymentApi } from '@/lib/api/paymentApi';
import type { DisbursementIncident, PaymentPage, RepaymentIncident } from '../types';
import type { PageArgs } from './servicingApi';

const tag = (id: string) => ({ type: 'PaymentIncidents' as const, id });

/**
 * Việc còn mở của hàng đợi trả nợ. `FAILED` là khoản Fineract đã từ chối và đã hoàn tiền về ví, không còn gì để xử lý
 * nên không đưa vào danh sách và số đếm (Spring nhận danh sách phân cách bằng dấu phẩy).
 */
const OPEN_REPAYMENT_STATUSES = 'CORE_POSTING,RECONCILIATION_REQUIRED';

/**
 * Hàng đợi sự cố tiền của Payment Service (R2). Mọi thao tác dùng đúng mã tham chiếu đã gửi: "Đối soát" chỉ tra cứu;
 * "Ghi lại" (B32) tra cứu trước và chỉ ghi vào Fineract khi core chưa có giao dịch, cùng mã nên không thể thành hai giao
 * dịch; giải ngân chỉ hẹn lượt hỏi đối tác, không chuyển tiền lần hai.
 */
export const paymentIncidentApi = paymentApi.injectEndpoints({
  endpoints: (builder) => ({
    repaymentIncidents: builder.query<PaymentPage<RepaymentIncident>, PageArgs>({
      query: (params) => ({ url: '/admin/repayment-reconciliation', params: { ...params, status: OPEN_REPAYMENT_STATUSES } }),
      providesTags: [tag('REPAYMENTS')],
    }),
    reconcileRepayment: builder.mutation<RepaymentIncident, string>({
      query: (repaymentId) => ({ url: `/admin/repayment-reconciliation/${repaymentId}/reconcile`, method: 'POST' }),
      invalidatesTags: [tag('REPAYMENTS')],
    }),
    repostRepayment: builder.mutation<RepaymentIncident, string>({
      query: (repaymentId) => ({ url: `/admin/repayment-reconciliation/${repaymentId}/repost`, method: 'POST' }),
      invalidatesTags: [tag('REPAYMENTS')],
    }),
    disbursementIncidents: builder.query<PaymentPage<DisbursementIncident>, PageArgs>({
      query: (params) => ({ url: '/admin/disbursement-reconciliation', params }),
      providesTags: [tag('DISBURSEMENTS')],
    }),
    recheckDisbursement: builder.mutation<DisbursementIncident, string>({
      query: (sagaId) => ({ url: `/admin/disbursement-reconciliation/${sagaId}/recheck`, method: 'POST' }),
      invalidatesTags: [tag('DISBURSEMENTS')],
    }),
  }),
});

export const {
  useRepaymentIncidentsQuery, useReconcileRepaymentMutation, useRepostRepaymentMutation,
  useDisbursementIncidentsQuery, useRecheckDisbursementMutation,
} = paymentIncidentApi;
