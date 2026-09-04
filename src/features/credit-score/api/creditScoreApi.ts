import { aiApi } from '@/lib/api/aiApi';
import type {
  CreditExplainResponse,
  CreditScoreRequest,
  CreditScoreResponse,
} from '../types';

/**
 * Chấm điểm tín dụng (D4) và giải thích quyết định bằng TreeSHAP (C1.2).
 *
 * Cả hai là mutation chứ không phải query: chúng POST một hồ sơ cụ thể và không
 * có khóa cache tự nhiên để RTK Query giữ lại. Dùng query ở đây sẽ phải tự dựng
 * cache key từ toàn bộ hồ sơ, mà kết quả cũng không dùng lại được.
 *
 * Không đụng tới tagTypes: hai endpoint này chỉ đọc, không làm dữ liệu nào khác
 * cũ đi. Ngược lại, sửa cấu hình Rule Engine sẽ đổi kết quả chấm — nhưng vì màn
 * hình luôn chấm lại theo yêu cầu của người dùng nên không cần invalidate.
 *
 * NỢ KỸ THUẬT — gọi thẳng finora-ai thay vì qua Gateway.
 * `engineering-rules.md` mục 1 yêu cầu frontend chỉ gọi API qua Gateway. Hiện chưa
 * làm được: `finora-gateway` có route `/api/v1/ai/**` nhưng bản
 * spring-cloud-gateway-mvc đang dùng KHÔNG chuyển tiếp body của POST — đo được
 * ngày 2026-09-03: GET /api/v1/ai/config/rules qua cổng 8080 trả 200, còn
 * POST /api/v1/ai/credit/explain trả 422 "Field required, input: null" trong khi
 * gọi thẳng cổng 8000 trả 200.
 * Vì vậy slice này dùng chung `aiApi` (VITE_AI_API_URL) với hai slice cấu hình AI
 * đã có. Khi Gateway chuyển tiếp được body, chỉ cần đổi VITE_AI_API_URL sang
 * http://localhost:8080/api/v1/ai là cả ba slice đi qua Gateway, không phải sửa code.
 */
const creditScoreApi = aiApi.injectEndpoints({
  endpoints: (builder) => ({
    scoreCredit: builder.mutation<CreditScoreResponse, CreditScoreRequest>({
      query: (body) => ({
        url: '/credit/score',
        method: 'POST',
        body,
      }),
    }),
    explainCredit: builder.mutation<CreditExplainResponse, CreditScoreRequest>({
      query: (body) => ({
        url: '/credit/explain',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useScoreCreditMutation, useExplainCreditMutation } = creditScoreApi;
export { creditScoreApi };
