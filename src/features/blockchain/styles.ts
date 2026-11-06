/**
 * Chuỗi utility Tailwind dùng ở nhiều thành phần của trang Xác minh dữ liệu giao dịch. Lớp `bc-*` đứng đầu chuỗi
 * (hoặc đặt cạnh chuỗi ở JSX) không còn CSS; giữ làm mốc cho kịch bản kiểm thử giao diện.
 */

/** Câu phụ, ghi chú trong ngăn chi tiết. */
export const BC_MUTED = 'bc-muted text-[13px] text-muted';

/** Ô biểu tượng khiên của khối giải thích đầu trang và của tóm tắt trong ngăn chi tiết. */
export const BC_ICON = 'grid size-10 flex-none place-items-center rounded-lg bg-white text-brand '
  + 'shadow-[0_4px_14px_rgba(29,86,196,0.12)] [&_svg]:size-5.5';

/** Hash, mã giao dịch: chữ đơn cách, xuống dòng ở bất kỳ ký tự nào. */
export const BC_HASH = 'bc-hash font-mono text-[12px] text-primary wrap-anywhere';

/** Dòng nhãn: giá trị của `ui-rows` có giá trị dài: giá trị nằm dưới nhãn, căn trái, chữ thường. */
export const BC_STACK_ROW = 'bc-stack grid justify-stretch gap-1 [&_dd]:text-left [&_dd]:font-normal';

/** Khung gập (chi tiết kỹ thuật, kiểm tra chuyên sâu, thông số lần kiểm): mở thì tiêu đề đậm màu và có vạch dưới. */
export const BC_DETAILS = 'rounded-lg border border-line bg-white '
  + '[&[open]>summary]:border-b [&[open]>summary]:border-b-line [&[open]>summary]:text-primary';

export const BC_DETAILS_SUMMARY = 'cursor-pointer px-3 py-2.75 text-[13px] font-semibold text-secondary';

/** Khối thao tác chính của phần xác minh: mô tả bên trái, nút bên phải; màn hẹp thì xếp dọc, nút rộng hết khung. */
export const BC_VERIFY_MAIN = 'bc-verify-main flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-3 '
  + '[&_h4]:text-[13px] [&_h4]:font-bold [&_p]:mt-0.75 [&_p]:text-[12px] [&_p]:leading-[1.45] [&_p]:text-secondary '
  + 'max-[760px]:flex-col max-[760px]:items-stretch max-[760px]:[&_.ui-btn]:w-full';

/** Một kết quả kiểm (sổ cái, dữ liệu nguồn, tệp PDF). */
export const BC_RESULT = 'bc-result rounded-lg border border-line bg-surface-muted p-3';

export const BC_RESULT_HEAD = 'bc-result-head mb-1.5 flex flex-wrap items-center justify-between gap-2 '
  + '[&_h4]:text-[13px] [&_h4]:font-semibold';

export const BC_RESULT_DESCRIPTION = 'bc-result-description text-[13px] leading-normal text-secondary';
