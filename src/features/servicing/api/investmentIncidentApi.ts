import { investmentApi } from '@/lib/api/investmentApi';
import type { CommonPage, OrderIncident } from '../types';
import type { PageArgs } from './servicingApi';

/**
 * Lệnh góp vốn chưa khớp với ví ở Payment (R3). "Thử lại" chỉ hẹn lượt kế tiếp của worker Investment ngay, sau khi vận
 * hành đã xử lý nguyên nhân; không tự giữ hay nhả tiền.
 */
export const investmentIncidentApi = investmentApi.injectEndpoints({
  endpoints: (builder) => ({
    orderIncidents: builder.query<CommonPage<OrderIncident>, PageArgs>({
      query: (params) => ({ url: '/investments/admin/order-incidents', params }),
      providesTags: ['OrderIncidents'],
    }),
    retryOrderIncident: builder.mutation<OrderIncident, string>({
      query: (orderReference) => ({ url: `/investments/admin/order-incidents/${orderReference}/retry`, method: 'POST' }),
      invalidatesTags: ['OrderIncidents'],
    }),
  }),
});

export const { useOrderIncidentsQuery, useRetryOrderIncidentMutation } = investmentIncidentApi;
