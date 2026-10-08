/*
 * Public API của feature chính sách và bộ luật chấm điểm AI.
 * Chỉ xuất phần nơi khác cần: trang, type dùng chung và vài tiện ích hiển thị kết
 * quả chấm điểm (credit-score dùng lại cho nhãn mã luật và lỗi finora-ai).
 */
export { default as AiPolicyPage } from './pages/AiPolicyPage';
export type * from './types';
export { GIA_TRI_LABEL, NHAN_LY_DO_THAM_DINH, NHAN_MA_LOAI_TRUC_TIEP } from './constants';
export { toAiUiError } from './mappers/aiApiError';
export { AiErrorNotice } from './components/AiErrorNotice';
export { GradeBadge } from './components/GradeBadge';
