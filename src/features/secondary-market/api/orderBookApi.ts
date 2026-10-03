import { investmentApi } from '@/lib/api/investmentApi';
import type {
  AdminTrade,
  OrderBookAdminSummary,
  OrderBookSnapshot,
  OrderBookSummary,
  PageResponse,
  SettlementStatus,
} from '../types';

/** Cùng base URL với slice Investment; luồng SSE không đi qua `fetchBaseQuery` nên cần tự ghép. */
const BASE_URL = import.meta.env.VITE_INVESTMENT_API_URL ?? '/api/v1';

export interface PageParams {
  page?: number;
  size?: number;
}

export interface TradeParams extends PageParams {
  /** Bỏ trống là mọi trạng thái thanh toán. */
  settlement?: SettlementStatus;
}

/**
 * Chợ Notes nhìn từ màn quản trị. Trang này **chỉ đọc**: đặt và huỷ lệnh là việc của nhà đầu tư
 * trên app, vì backend lấy danh tính từ token — quản trị đặt lệnh sẽ thành lệnh của chính quản trị.
 */
const endpoints = investmentApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrderBookAdminSummary: builder.query<OrderBookAdminSummary, void>({
      query: () => '/investments/admin/order-books/summary',
      providesTags: [{ type: 'OrderBooks', id: 'SUMMARY' }],
    }),

    getAdminTrades: builder.query<PageResponse<AdminTrade>, TradeParams>({
      query: (params) => ({ url: '/investments/admin/order-books/trades', params }),
      providesTags: [{ type: 'OrderBooks', id: 'TRADES' }],
    }),

    getOrderBooks: builder.query<PageResponse<OrderBookSummary>, PageParams>({
      query: (params) => ({ url: '/investments/order-books', params }),
      providesTags: [{ type: 'OrderBooks', id: 'LIST' }],
    }),

    /**
     * Ảnh chụp một sổ, tự cập nhật bằng Server-Sent Events khi đang mở.
     *
     * Tải ảnh qua REST trước, rồi mở `EventSource` (kèm cookie đăng nhập) và thay ảnh trong cache
     * mỗi khi backend đẩy ảnh mới. Ảnh đến muộn có `sequence` nhỏ hơn ảnh đang giữ thì bỏ. Đóng hộp
     * thoại là cache bị gỡ, luồng đóng theo. `EventSource` tự kết nối lại khi mạng chập chờn.
     */
    getOrderBook: builder.query<OrderBookSnapshot, number>({
      query: (listingId) => `/investments/order-books/${listingId}`,
      async onCacheEntryAdded(listingId, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        let source: EventSource | null = null;
        try {
          await cacheDataLoaded;
          source = new EventSource(`${BASE_URL}/investments/order-books/${listingId}/stream`, {
            withCredentials: true,
          });
          source.addEventListener('snapshot', (event) => {
            const next = JSON.parse((event as MessageEvent<string>).data) as OrderBookSnapshot;
            updateCachedData((current) => (next.sequence >= current.sequence ? next : current));
          });
        } catch {
          // Cache bị gỡ trước khi tải xong (đóng hộp thoại sớm): không mở luồng nữa.
        }
        await cacheEntryRemoved;
        source?.close();
      },
    }),
  }),
});

export const {
  useGetOrderBookAdminSummaryQuery,
  useGetAdminTradesQuery,
  useGetOrderBooksQuery,
  useGetOrderBookQuery,
} = endpoints;
