/*
 * Utility dùng chung cho các thẻ của trang duyệt eKYC. Lớp `ekr-*` đứng đầu chuỗi chỉ làm mốc cho kịch bản kiểm thử
 * và truy vấn DOM, không còn CSS riêng.
 */

/** Thẻ nội dung (trường đọc từ thẻ, bằng chứng, liveness, cột phải); màn hẹp thu lề trong còn 14px. */
export const REVIEW_CARD = 'ui-card ekr-card pt-3.5 px-4.5 pb-4 max-[760px]:px-3.5 max-[760px]:pb-3.5';

export const REVIEW_CARD_TITLE = 'text-[15px] font-semibold leading-[1.4]';

export const REVIEW_CARD_HEAD = 'ekr-card-head flex items-center justify-between gap-x-3 gap-y-2 flex-wrap mb-2';

export const REVIEW_SUB_HEAD = 'ekr-sub-head mt-3.5 mb-1.5 text-secondary text-[13px] font-semibold';

/** Câu thay cho phần rỗng (không có bản nháp, tệp bằng chứng hay lý do). */
export const REVIEW_EMPTY_LINE = 'ekr-muted ekr-empty-line py-1.5 text-muted text-[13px] leading-[1.55]';
