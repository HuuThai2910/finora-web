import { loanApi } from '@/lib/api/loanApi';
import type {
  CoreProductSyncResponse,
  CoreSyncStatus,
  CreateLoanProductRequest,
  LoanProduct,
  LoanProductStatus,
  PageResponse,
} from '../types';

export interface ProductListParams {
  page?: number;
  size?: number;
  status?: LoanProductStatus;
  coreSyncStatus?: CoreSyncStatus;
}

const productApi = loanApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminProducts: builder.query<PageResponse<LoanProduct>, ProductListParams>({
      query: (params) => ({ url: '/admin/loan-products', params }),
      providesTags: (result) => [
        { type: 'LoanProductList', id: 'ADMIN' },
        ...(result?.data.map(({ id }) => ({ type: 'LoanProduct' as const, id })) ?? []),
      ],
    }),
    getAdminProduct: builder.query<LoanProduct, number>({
      query: (id) => `/admin/loan-products/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'LoanProduct', id }],
    }),
    createProduct: builder.mutation<LoanProduct, CreateLoanProductRequest>({
      query: (body) => ({ url: '/admin/loan-products', method: 'POST', body }),
      invalidatesTags: [{ type: 'LoanProductList', id: 'ADMIN' }],
    }),
    syncProduct: builder.mutation<CoreProductSyncResponse, { id: number; version: number }>({
      query: ({ id, version }) => ({
        url: `/admin/loan-products/${id}/core-sync`,
        method: 'POST',
        body: { version },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'LoanProduct', id },
        { type: 'LoanProductList', id: 'ADMIN' },
      ],
    }),
    changeProductStatus: builder.mutation<LoanProduct, {
      id: number;
      version: number;
      action: 'activate' | 'deactivate' | 'archive';
    }>({
      query: ({ id, version, action }) => ({
        url: `/admin/loan-products/${id}/${action}`,
        method: 'POST',
        body: { version },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'LoanProduct', id },
        { type: 'LoanProductList', id: 'ADMIN' },
      ],
    }),
  }),
});

export const {
  useGetAdminProductsQuery,
  useLazyGetAdminProductQuery,
  useCreateProductMutation,
  useSyncProductMutation,
  useChangeProductStatusMutation,
} = productApi;

