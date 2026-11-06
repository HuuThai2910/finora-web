/*
 * Chuỗi lớp Tailwind dùng lại ở nhiều khối của trang chi tiết hồ sơ vay (theo finora-web-mockup/loan-review.html).
 * Mỗi chuỗi mở đầu bằng lớp mốc `lr-*` (kịch bản kiểm thử giao diện và truy vấn DOM dựa vào), sau đó mới là utility.
 */

/** Đoạn chữ phụ màu nhạt (trạng thái rỗng, đang tải). */
export const MUTED = 'lr-muted text-muted text-[13px] leading-[1.55]';

/** Ghi chú dưới bảng hoặc dưới danh sách. */
export const FOOTNOTE = 'lr-footnote mt-2 text-muted text-[13px] leading-[1.55]';

/** Dòng giải thích nhỏ ngay dưới một giá trị. */
export const VAL_HINT = 'lr-val-hint block mt-0.5 text-muted text-[12px] font-normal leading-[1.45]';

/** Vòng xoay trong nút khi đang gửi yêu cầu. */
export const SPINNER =
  'lr-spinner inline-block flex-none size-3 border-2 border-current border-r-transparent rounded-[50%] animate-[lr-spin_0.7s_linear_infinite]';

/** Dải bốn ô nhãn trên, giá trị dưới (điều kiện vay, tóm tắt lịch trả); dưới 1000px còn hai cột. */
export const STRIP =
  'lr-strip grid grid-cols-4 gap-x-5 gap-y-3 max-[1000px]:grid-cols-2 *:min-w-0 [&_dt]:text-muted [&_dt]:text-[12px] [&_dd]:mt-0.5 [&_dd]:text-[14px] [&_dd]:font-medium [&_dd]:tabular-nums [&_dd]:wrap-anywhere';

/** Khối viền của tab Chi tiết chấm điểm (bảng luật, yếu tố ảnh hưởng, thông điệp, SHAP). */
export const AI_SECTION = 'lr-ai-section p-4 border border-line rounded-md';

export const AI_HEADING = 'text-[14px] font-semibold';

export const AI_SUB = 'lr-ai-sub mt-0.5 mb-3 text-muted text-[13px] leading-[1.55]';

/** Hai cột "tăng rủi ro / giảm rủi ro"; dưới 900px xếp dọc. */
export const AI_COLUMNS = 'lr-ai-columns grid grid-cols-2 gap-6 max-[900px]:grid-cols-1';

export const AI_COL_TITLE = 'lr-ai-col-title mb-1 pb-1.5 border-b border-b-divider text-secondary text-[13px] font-medium';
