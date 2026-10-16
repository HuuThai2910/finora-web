import type { PageResponse } from '@/features/user';
import { userServiceApi } from '@/lib/api/userServiceApi';
import type { EkycAttemptDetail, EkycAttemptListArgs, EkycAttemptSummary, EkycDecisionArgs } from '../types';
import { ekycReviewApi, isAttemptAlreadyDecided } from './ekycReviewApi';

/**
 * Bọc lời gọi API thành kết quả RTK Query. Lỗi giữ nguyên dạng `ApiError` của `apiFetch`
 * để `toUiApiError` đọc được mã lỗi (ví dụ `ATTEMPT_ALREADY_DECIDED`) và traceId.
 */
async function run<T>(call: () => Promise<T>): Promise<{ data: T } | { error: unknown }> {
  try {
    return { data: await call() };
  } catch (error) {
    return { error };
  }
}

const ekycReviewQueries = userServiceApi.injectEndpoints({
  endpoints: (builder) => ({
    getEkycAttempts: builder.query<PageResponse<EkycAttemptSummary>, EkycAttemptListArgs>({
      queryFn: (args, { signal }) => run(() => ekycReviewApi.listAttempts(args, signal)),
      providesTags: [{ type: 'EkycAttemptList', id: 'LIST' }],
    }),
    getEkycAttempt: builder.query<EkycAttemptDetail, string>({
      queryFn: (attemptId, { signal }) => run(() => ekycReviewApi.getAttempt(attemptId, signal)),
      providesTags: (_result, _error, attemptId) => [{ type: 'EkycAttempt', id: attemptId }],
      // Bản nháp chứa dữ liệu định danh đã giải mã: rời trang là bỏ khỏi cache, mở lại thì đọc mới.
      keepUnusedDataFor: 0,
    }),
    /**
     * Không gửi `signal`: quyết định đã gửi thì để chạy xong dù người dùng rời trang.
     * Làm mới cache khi thành công, và cả khi bị 409 `ATTEMPT_ALREADY_DECIDED` để trang hiện kết quả
     * của người quyết định trước. Quyết định đổi trạng thái eKYC của hồ sơ nên làm mới cả danh sách,
     * thống kê và hồ sơ người dùng; lỗi khác (mạng, trùng số…) không đổi gì nên không làm mới.
     */
    decideEkycAttempt: builder.mutation<EkycAttemptDetail, EkycDecisionArgs>({
      queryFn: ({ attemptId, decision, note }) => run(() => ekycReviewApi.decide(attemptId, decision, note)),
      invalidatesTags: (_result, error, { attemptId, userProfileId }) =>
        error && !isAttemptAlreadyDecided(error)
          ? []
          : [
              { type: 'EkycAttempt', id: attemptId },
              { type: 'EkycAttemptList', id: 'LIST' },
              { type: 'UserList', id: 'LIST' },
              'UserStats',
              { type: 'User', id: String(userProfileId) },
            ],
    }),
  }),
});

export const { useGetEkycAttemptsQuery, useGetEkycAttemptQuery, useDecideEkycAttemptMutation } = ekycReviewQueries;
