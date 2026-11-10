/**
 * Chuỗi utility Tailwind dùng lại trong Gọi vốn. Lớp `fu-*` vẫn để trong JSX làm mốc cho kịch bản kiểm thử; chúng không
 * còn CSS.
 */

/**
 * Ô nhập số (`fu-input`) của hộp Tham số sàn, chưa gồm rộng và cao vì mỗi chỗ một cỡ.
 * Chữ lấy theo phần tử cha (thay cho `font: inherit` của ô nhập), riêng cỡ chữ luôn 14px.
 */
export const INPUT =
  'px-2.5 border border-line-strong rounded-md bg-white text-primary font-[inherit] [font-weight:inherit] ' +
  '[font-style:inherit] leading-[inherit] text-[14px] focus:[outline:0] focus:border-brand ' +
  'focus:shadow-[0_0_0_3px_rgba(29,86,196,0.15)] aria-invalid:border-danger';
