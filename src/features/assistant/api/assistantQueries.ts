import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { aiApi } from '@/lib/api/aiApi';
import type { SuggestionItem } from '../types';
import { getSuggestions } from './assistantApi';

/**
 * `aiApi` dùng `fetchBaseQuery` nên kiểu lỗi phải là `FetchBaseQueryError`. Lỗi của `apiFetch` có
 * `status` số thì giữ status + body (để đọc `code`); lỗi mạng thành `FETCH_ERROR`.
 */
function toFetchError(error: unknown): FetchBaseQueryError {
  if (typeof error === 'object' && error !== null && 'status' in error && typeof error.status === 'number') {
    return { status: error.status, data: 'data' in error ? error.data : undefined };
  }
  return { status: 'FETCH_ERROR', error: error instanceof Error ? error.message : 'Không gọi được trợ lý' };
}

/**
 * Gợi ý theo màn, cache trong slice của finora-ai (`aiApi`). Dùng `queryFn` gọi `apiFetch` để cả ba
 * endpoint trợ lý đi chung một client (cùng origin, cookie, làm mới phiên khi 401), không phụ thuộc
 * `baseUrl` của slice.
 *
 * Lời gọi không theo màn (`screen = null`) đồng thời là công tắc hiện nút trợ lý (spec mục 16):
 * 200 thì hiện; 503 `ASSISTANT_DISABLED`, 403 hay lỗi mạng thì ẩn.
 */
const assistantQueries = aiApi.injectEndpoints({
  endpoints: (builder) => ({
    getAssistantSuggestions: builder.query<SuggestionItem[], string | null>({
      queryFn: async (screen, { signal }) => {
        try {
          return { data: await getSuggestions(screen, signal) };
        } catch (error) {
          return { error: toFetchError(error) };
        }
      },
      // Gợi ý chỉ đổi khi deploy lại finora-ai; giữ 10 phút để chuyển qua lại giữa các trang không gọi lại.
      keepUnusedDataFor: 600,
    }),
  }),
});

export const { useGetAssistantSuggestionsQuery } = assistantQueries;
