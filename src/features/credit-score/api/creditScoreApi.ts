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
 * Đi qua Gateway cùng cookie phiên của quản trị viên (W3A). Trước đây Gateway gọi
 * finora-ai bằng HTTP/2 kèm `Upgrade: h2c` nên uvicorn bỏ body và trả 422 (B43);
 * Gateway nay gọi upstream bằng HTTP/1.1.
 */
const creditScoreApi = aiApi.injectEndpoints({
  endpoints: (builder) => ({
    explainCredit: builder.mutation<CreditExplainResponse, CreditScoreRequest>({
      query: (body) => ({ url: '/credit/explain', method: 'POST', body }),
    }),
  }),
});

export const { useExplainCreditMutation } = creditScoreApi;
