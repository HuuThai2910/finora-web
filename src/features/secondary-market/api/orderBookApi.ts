import { apiFetchBlob } from '@/lib/api/httpClient';
import { investmentApi } from '@/lib/api/investmentApi';
import type {
  AdminOrderBook,
  AdminOrderBookDetail,
  AdminTrade,
  BookSort,
  BookState,
  ListingNote,
  OrderBookSnapshot,
  PageResponse,
  TradeNoteOwnership,
  TradeProgress,
  TransferDocumentDetail,
} from '../types';

/** Cùng base URL với slice Investment; luồng SSE không đi qua `fetchBaseQuery` nên cần tự ghép. */
const BASE_URL = import.meta.env.VITE_INVESTMENT_API_URL ?? '/api/v1';

const ADMIN = '/investments/admin/order-books';
const tradePath = (tradeReference: string) => `${ADMIN}/trades/${encodeURIComponent(tradeReference)}`;
const documentPath = (tradeReference: string) =>
  `/investments/admin/transfer-documents/${encodeURIComponent(tradeReference)}`;

/** Bộ lọc danh sách sổ lệnh; bỏ trống là không lọc. Lọc và sắp xếp ở server. */
export interface BookListParams {
  /** Một phần mã hồ sơ/hợp đồng hoặc họ tên người vay. */
  q?: string;
  state?: BookState;
  /** Nhiều hạng, dạng `A,B`. */
  grades?: string;
  rateMin?: string;
  rateMax?: string;
  sort?: BookSort;
  page: number;
  size: number;
}

/** Bộ lọc lần khớp của một sổ (tab Giao dịch). Ngày theo giờ Việt Nam gồm hai đầu; số tiền tính bằng đồng. */
export interface TradeListParams {
  listingId: number;
  /** Một phần họ tên người bán hoặc người mua (từ 2 ký tự). */
  party?: string;
  progress?: TradeProgress;
  executedFrom?: string;
  executedTo?: string;
  amountMin?: string;
  amountMax?: string;
  page: number;
  size: number;
}

export interface ListingNoteParams {
  listingId: number;
  /** Một phần mã phần vốn hoặc họ tên người đang nắm giữ. */
  q?: string;
  page: number;
  size: number;
}

/**
 * Chợ chuyển nhượng nhìn từ màn quản trị. Trang **chỉ đọc**: đặt và hủy lệnh là việc của nhà đầu tư trên app (backend
 * lấy danh tính từ token, quản trị đặt lệnh sẽ thành lệnh của chính quản trị). Quyền: Xem "Chợ chuyển nhượng".
 */
const endpoints = investmentApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminOrderBooks: builder.query<PageResponse<AdminOrderBook>, BookListParams>({
      query: (params) => ({ url: ADMIN, params }),
      providesTags: [{ type: 'OrderBooks', id: 'LIST' }],
    }),

    getAdminOrderBook: builder.query<AdminOrderBookDetail, number>({
      query: (listingId) => `${ADMIN}/${listingId}`,
      providesTags: (_result, _error, listingId) => [{ type: 'OrderBooks', id: listingId }],
    }),

    getListingNotes: builder.query<PageResponse<ListingNote>, ListingNoteParams>({
      query: ({ listingId, ...params }) => ({ url: `${ADMIN}/${listingId}/notes`, params }),
      providesTags: (_result, _error, { listingId }) => [{ type: 'OrderBooks', id: listingId }],
    }),

    getAdminTrades: builder.query<PageResponse<AdminTrade>, TradeListParams>({
      query: (params) => ({ url: `${ADMIN}/trades`, params }),
      providesTags: (_result, _error, { listingId }) => [{ type: 'OrderBooks', id: listingId }],
    }),

    getAdminTrade: builder.query<AdminTrade, string>({
      query: tradePath,
      providesTags: (_result, _error, tradeReference) => [{ type: 'OrderBooks', id: tradeReference }],
    }),

    /** Phần vốn đã chuyển trong một lần khớp: người đang giữ, giá đang rao bán và lịch sử chuyển nhượng. */
    getTradeNotes: builder.query<TradeNoteOwnership[], string>({
      query: (tradeReference) => `${tradePath(tradeReference)}/notes`,
      providesTags: (_result, _error, tradeReference) => [{ type: 'OrderBooks', id: tradeReference }],
    }),

    /**
     * Giấy xác nhận chuyển nhượng của một lần khớp (trang Xác minh dữ liệu đọc `proofArtifact` để tính lại mã băm).
     * 404 nghĩa là lần khớp chưa có văn bản.
     */
    getTransferDocument: builder.query<TransferDocumentDetail, string>({
      query: documentPath,
      providesTags: (_result, _error, tradeReference) => [{ type: 'TransferDocuments', id: tradeReference }],
    }),

    /**
     * Ảnh chụp một sổ, tự cập nhật bằng Server-Sent Events khi đang mở.
     *
     * Tải ảnh qua REST trước, rồi mở `EventSource` (kèm cookie đăng nhập) và thay ảnh trong cache mỗi khi backend đẩy
     * ảnh mới. Ảnh đến muộn có `sequence` nhỏ hơn ảnh đang giữ thì bỏ. Rời trang là cache bị gỡ, luồng đóng theo.
     * `EventSource` tự kết nối lại khi mạng chập chờn.
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
          // Cache bị gỡ trước khi tải xong (rời trang sớm): không mở luồng nữa.
        }
        await cacheEntryRemoved;
        source?.close();
      },
    }),
  }),
});

/**
 * Tải tệp PDF đã đóng dấu của giấy xác nhận (trang Xác minh dữ liệu). Không đi qua RTK Query vì `Blob` không lưu được
 * vào store; `apiFetchBlob` kèm cookie phiên và tự làm mới phiên khi gặp 401.
 */
export function fetchTransferDocumentPdf(tradeReference: string, signal?: AbortSignal): Promise<Blob> {
  return apiFetchBlob(`${BASE_URL}${documentPath(tradeReference)}/pdf`, { signal });
}

export const {
  useGetAdminOrderBooksQuery,
  useGetAdminOrderBookQuery,
  useGetListingNotesQuery,
  useGetAdminTradesQuery,
  useGetAdminTradeQuery,
  useGetTradeNotesQuery,
  useGetOrderBookQuery,
  useLazyGetTransferDocumentQuery,
} = endpoints;
