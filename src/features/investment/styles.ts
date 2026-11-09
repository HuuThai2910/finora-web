/**
 * Chuỗi utility Tailwind dùng ở nhiều thành phần của Gọi vốn (danh sách, hộp thoại tham số sàn, trang chi tiết).
 * Lớp `fu-*`, `fd-*` vẫn để trong JSX làm mốc cho kịch bản kiểm thử; chúng không còn CSS.
 */

/** Nút ở góc phải đầu trang. */
export const HEAD_ACTIONS = 'flex gap-2 flex-wrap';

/**
 * Ô nhập số (`fu-input`), chưa gồm rộng và cao vì mỗi chỗ một cỡ.
 * Chữ lấy theo phần tử cha (thay cho `font: inherit` của ô nhập), riêng cỡ chữ luôn 14px.
 */
export const INPUT =
  'px-2.5 border border-line-strong rounded-md bg-white text-primary font-[inherit] [font-weight:inherit] ' +
  '[font-style:inherit] leading-[inherit] text-[14px] focus:[outline:0] focus:border-brand ' +
  'focus:shadow-[0_0_0_3px_rgba(29,86,196,0.15)] aria-invalid:border-danger';

/** Thẻ nội dung ở cột trái trang chi tiết (`fd-card`) và tiêu đề thẻ. */
export const CARD = 'py-4 px-4.5';
export const CARD_TITLE = 'mb-2.5 text-[15px] font-semibold';

/** Thẻ chứa bảng nhà đầu tư, bảng Note (`fd-table-card`). */
export const TABLE_CARD = 'pt-3.5 px-3.5 pb-3 max-[760px]:pt-3 max-[760px]:px-2.5 max-[760px]:pb-2.5';
