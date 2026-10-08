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
 * NỢ KỸ THUẬT: gọi qua `aiApi` (VITE_AI_API_URL). Ngày 2026-09-03 Gateway
 * spring-cloud-gateway-mvc không chuyển tiếp body của POST tới finora-ai (422
 * "Field required"), nên .env đang trỏ thẳng cổng 8000. Khi Gateway chuyển tiếp
 * được body, chỉ cần đổi VITE_AI_API_URL sang Gateway, không phải sửa code.
 */
const creditScoreApi = aiApi.injectEndpoints({
  endpoints: (builder) => ({
    explainCredit: builder.mutation<CreditExplainResponse, CreditScoreRequest>({
      query: (body) => ({ url: '/credit/explain', method: 'POST', body }),
    }),
  }),
});

export const { useExplainCreditMutation } = creditScoreApi;
