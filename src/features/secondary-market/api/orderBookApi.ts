import { apiFetchBlob } from '@/lib/api/httpClient';
import { investmentApi } from '@/lib/api/investmentApi';
import type {
  AdminTrade,
  OrderBookAdminSummary,
  OrderBookSnapshot,
  OrderBookSummary,
  PageResponse,
  SettlementStatus,
  TransferDocument,
  TransferDocumentDetail,
  TransferDocumentStatus,
  TradeNoteOwnership,
} from '../types';

/** Cùng base URL với slice Investment; luồng SSE không đi qua `fetchBaseQuery` nên cần tự ghép. */
const BASE_URL = import.meta.env.VITE_INVESTMENT_API_URL ?? '/api/v1';

const documentPath = (tradeReference: string) =>
  `/investments/admin/transfer-documents/${encodeURIComponent(tradeReference)}`;

export interface PageParams {
  page?: number;
  size?: number;
}

export interface TradeParams extends PageParams {
  /** Bỏ trống là mọi trạng thái thanh toán. */
  settlement?: SettlementStatus;
}

export interface TransferDocumentParams extends PageParams {
  /** Bỏ trống là mọi trạng thái. */
  status?: TransferDocumentStatus;
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

    /** Note đã chuyển trong một lần khớp: người đang giữ và lịch sử chuyển nhượng của từng Note. */
    getTradeNotes: builder.query<TradeNoteOwnership[], string>({
      query: (tradeReference) => `/investments/admin/order-books/trades/${encodeURIComponent(tradeReference)}/notes`,
    }),

    /**
     * Gửi thanh toán lại lần khớp "Cần đối soát": Investment đưa về hàng chờ, worker gọi Payment lần nữa với cùng mã
     * (Payment idempotent nên không chuyển tiền hai lần). 409 khi lần khớp không còn lỗi.
     */
    retryTradeSettlement: builder.mutation<AdminTrade, string>({
      query: (tradeReference) => ({
        url: `/investments/admin/order-books/trades/${encodeURIComponent(tradeReference)}/retry-settlement`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'OrderBooks', id: 'TRADES' }, { type: 'OrderBooks', id: 'SUMMARY' }],
    }),

    /**
     * Giấy xác nhận chuyển nhượng của một lần khớp. 404 nghĩa là lần khớp chưa có văn bản (chưa thanh toán xong hoặc
     * khớp trước khi có tính năng), nơi gọi hiểu là "chưa có" chứ không phải lỗi.
     */
    getTransferDocument: builder.query<TransferDocumentDetail, string>({
      query: documentPath,
      providesTags: (_result, _error, tradeReference) => [{ type: 'TransferDocuments', id: tradeReference }],
    }),

    /**
     * Danh sách giấy xác nhận theo trạng thái (`TransferDocumentAdminController.list`), mới nhất trước. Dùng để đếm và
     * lọc văn bản lỗi hoặc đang lập; tiền là chuỗi decimal, không có `proofArtifact` (chỉ API chi tiết có).
     */
    getTransferDocuments: builder.query<PageResponse<TransferDocument>, TransferDocumentParams>({
      query: (params) => ({ url: '/investments/admin/transfer-documents', params }),
      providesTags: [{ type: 'TransferDocuments', id: 'LIST' }],
    }),

    // Chỉ văn bản FAILED mới lập lại được (backend chặn trạng thái khác); 204 rồi worker lập lại, nên làm mới đúng dòng
    // đó và các danh sách lọc theo trạng thái (văn bản rời nhóm "lỗi" sang "đang lập").
    retryTransferDocument: builder.mutation<void, string>({
      query: (tradeReference) => ({ url: `${documentPath(tradeReference)}/retry`, method: 'POST' }),
      invalidatesTags: (_result, _error, tradeReference) => [
        { type: 'TransferDocuments', id: tradeReference },
        { type: 'TransferDocuments', id: 'LIST' },
      ],
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

/**
 * Tải tệp PDF đã ký của giấy xác nhận. Không đi qua RTK Query vì `Blob` không lưu được vào store; dùng `apiFetchBlob`
 * để kèm cookie phiên và tự làm mới phiên khi gặp 401 (không đưa token lên URL, nên không mở bằng link thường).
 */
export function fetchTransferDocumentPdf(tradeReference: string, signal?: AbortSignal): Promise<Blob> {
  return apiFetchBlob(`${BASE_URL}${documentPath(tradeReference)}/pdf`, { signal });
}

export const {
  useGetTradeNotesQuery,
  useRetryTradeSettlementMutation,
  useGetOrderBookAdminSummaryQuery,
  useGetAdminTradesQuery,
  useGetOrderBooksQuery,
  useGetOrderBookQuery,
  useGetTransferDocumentQuery,
  useGetTransferDocumentsQuery,
  useLazyGetTransferDocumentQuery,
  useRetryTransferDocumentMutation,
} = endpoints;
