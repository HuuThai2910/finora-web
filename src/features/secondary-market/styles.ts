/**
 * Chuỗi utility Tailwind dùng ở nhiều thành phần của Chợ thứ cấp Notes.
 * Lớp `sm-*`, `sd-*` vẫn để trong JSX làm mốc cho kịch bản kiểm thử; chúng không còn CSS.
 * Xanh lá/đỏ chỉ dùng cho bên Mua/Bán và trạng thái, luôn đi kèm chữ.
 */

/** Màu chữ hai phía mua/bán (`sm-bid`, `sm-ask`) và ô trống (`sm-none`). */
export const SIDE_TEXT = { bid: 'text-success', ask: 'text-danger' } as const;
export const NONE_TEXT = 'text-muted';

/** Bảng sổ lệnh và bảng giao dịch (`sm-table`). */
export const MARKET_TABLE = '[&_td]:align-middle';

/** Mã khoản vay (cùng nhãn nợ xấu nếu có) ở cột đầu, bấm để mở ngăn sổ lệnh. */
export const LOAN_CELL = 'inline-flex items-center gap-2';
export const LOAN_LINK =
  'text-primary font-medium text-left rounded-sm hover:text-brand hover:underline hover:underline-offset-2';

/** Dòng lỗi nhỏ màu đỏ dưới ô (`sm-err`), xuống dòng được dù ô bảng không ngắt dòng. */
export const ERROR_LINE = 'block max-w-55 mt-0.5 text-danger text-[12px] whitespace-normal';
