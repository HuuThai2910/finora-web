/*
 * Chuỗi utility Tailwind dùng ở nhiều thành phần của trang Chính sách đánh giá AI và bộ luật chấm điểm.
 * Lớp cũ (aip-*, rl-*) vẫn giữ trong className làm mốc cho kịch bản kiểm thử và truy vấn DOM.
 */

// Thẻ có đầu thẻ kẻ ngang (aip-card, đi cùng ui-card).
export const CARD = 'overflow-hidden';
export const CARD_HEAD =
  'flex items-center justify-between gap-4 min-h-13 py-2.5 px-4 border-b border-b-line max-[700px]:flex-wrap';
export const CARD_TITLE = 'text-[16px] font-semibold leading-[1.4]';
/** Tiêu đề và dòng phụ cùng một hàng, xuống dòng khi hẹp. */
export const HEAD_MAIN = 'flex items-baseline flex-wrap gap-x-3 gap-y-1 min-w-0';
export const META = 'text-muted text-[13px] [font-variant-numeric:tabular-nums]';
export const META_STRONG = 'text-primary font-semibold';
export const TABLE_WRAP = 'pt-2 px-3 pb-1';

// Ô nhập (aip-input), dùng chung cho cả bộ luật. "font: inherit" viết thành từng thuộc tính: Tailwind xếp
// utility shorthand font sau utility cỡ chữ, nên viết gộp sẽ xóa cỡ chữ.
const INPUT =
  'py-0 border border-line-strong rounded-md bg-white text-primary ' +
  'font-[inherit] [font-style:inherit] [font-weight:inherit] leading-[inherit] [font-variant-numeric:tabular-nums] ' +
  'transition-[border-color] duration-150 focus:[outline:0] focus:border-brand focus:shadow-[0_0_0_3px_rgba(29,86,196,0.15)]';
/** Ô số của trọng số, ngưỡng duyệt và bảng hạng; bề ngang do chỗ dùng đặt. */
export const POLICY_INPUT = `${INPUT} h-8.5 px-2.5 text-[14px] text-right`;
const RULE_INPUT = `${INPUT} text-[13px] placeholder:text-muted`;
/** Ô chữ, ô chọn ở đầu thẻ luật và ô gợi ý: rộng hết cột. */
export const RULE_FIELD_INPUT = `${RULE_INPUT} w-full h-8.5 px-2.5`;
/** Ô số trong bảng bậc, bảng điểm và chân thẻ: thấp hơn ô thường, canh phải; bề ngang do chỗ dùng đặt. */
export const RULE_CELL_INPUT = `${RULE_INPUT} h-7.5 px-2 text-right`;

// Bảng bậc điểm / bảng điểm phân loại (rl-table).
export const RULE_TABLE = 'w-full table-fixed border-separate border-spacing-0 text-[13px]';
export const RULE_TBODY = '[&>tr:last-child>td]:[border-bottom:0]';
const RULE_TH = 'py-1.5 bg-[#f6f8fd] text-secondary text-[12px] font-medium first:rounded-l-md last:rounded-r-md';
export const RULE_TH_LABEL = `${RULE_TH} px-2.5 text-left`;
export const RULE_TH_SCORE = `${RULE_TH} w-21 px-2.5 text-right`;
export const RULE_TH_TOOL = `${RULE_TH} w-10 px-1 text-center`;
const RULE_TD = 'py-2 border-b border-b-divider wrap-anywhere align-middle';
export const RULE_TD_LABEL = `${RULE_TD} px-2.5`;
export const RULE_TD_SCORE = `${RULE_TD} w-21 px-2.5 text-right`;
export const RULE_TD_TOOL = `${RULE_TD} w-10 px-1 text-center`;
/** Điểm của một bậc / một giá trị khi xem. */
export const RULE_SCORE = 'font-semibold [font-variant-numeric:tabular-nums]';

// Nút vuông chỉ có icon (rl-tool).
const RULE_TOOL =
  'inline-grid place-items-center rounded-md bg-white text-secondary [&_svg]:size-4 disabled:opacity-40 disabled:cursor-not-allowed';
/** Có viền: chuyển luật lên/xuống. */
export const RULE_TOOL_BOX =
  `${RULE_TOOL} size-8 border border-line-strong hover:not-disabled:bg-surface-muted hover:not-disabled:text-primary`;
/** Không viền, rê chuột hiện đỏ (rl-tool bare danger): xóa bậc. */
export const RULE_TOOL_DANGER =
  `${RULE_TOOL} size-7.5 border border-transparent hover:not-disabled:bg-danger-bg hover:not-disabled:text-danger`;
