import { aiApi } from '@/lib/api/aiApi';
import type { CreditExplainResponse, CreditScoreRequest } from '../types';

/**
 * Chấm điểm và giải thích quyết định (POST /api/v1/ai/credit/explain).
 *
 * Là mutation chứ không phải query: POST một hồ sơ giả định, không có khóa cache tự
 * nhiên và kết quả không dùng lại được. Không đụng tagTypes vì endpoint chỉ đọc.
 * Sửa bộ luật sẽ đổi kết quả chấm, nhưng màn hình luôn chấm lại theo yêu cầu nên
 * không cần invalidate.
 *
 * finora-ai không còn POST /credit/score; /explain tự chấm lại rồi trả cả hai nửa
 * của quyết định trong một lần gọi.
 *
 * Gọi qua `aiApi` (cùng origin, kèm cookie): finora-ai chỉ nhận /explain từ admin hoặc từ
 * Loan (mã nội bộ). Lỗi Gateway làm mất body POST tới finora-ai (ghi nhận 2026-09-03, do
 * client HTTP/2 xin `Upgrade: h2c`) đã sửa bằng `ProxyHttpClientConfig` ở finora-gateway.
 */
const creditScoreApi = aiApi.injectEndpoints({
  endpoints: (builder) => ({
    explainCredit: builder.mutation<CreditExplainResponse, CreditScoreRequest>({
      query: (body) => ({ url: '/credit/explain', method: 'POST', body }),
    }),
  }),
});

export const { useExplainCreditMutation } = creditScoreApi;
