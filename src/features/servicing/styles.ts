/**
 * Chuỗi utility Tailwind dùng ở nhiều thành phần của Vận hành khoản vay. Lớp `svc-*` đứng đầu mỗi chuỗi không còn CSS;
 * giữ làm mốc cho kịch bản kiểm thử giao diện và truy vấn DOM.
 */

/** Đoạn giải thích ở đầu một hàng đợi. */
export const SVC_NOTE = 'svc-note mx-0.5 mb-3 rounded-md bg-surface-muted px-3 py-2.5 text-[13px] text-secondary';

/** Tiêu đề một hàng đợi con trong tab (vạch ngăn với hàng đợi phía trên), dòng phụ bên phải. */
export const SVC_SUBHEAD = 'svc-subhead mt-4 flex items-baseline justify-between gap-3 border-t border-t-divider px-1 pt-3.5 pb-2.5 '
  + '[&_h2]:text-[14px] [&_h2]:font-semibold [&_span]:text-[12px] [&_span]:text-muted';

/** Ô chữ dài trong bảng (lỗi, lý do, giá trị lệch): xuống dòng được, chữ nhỏ hơn ô thường. */
export const SVC_WRAP_CELL = 'svc-wrap min-w-55 max-w-85 whitespace-normal text-[13px] text-secondary';

/**
 * Cột thao tác dính mép phải của khung cuộn ngang: bảng rộng hơn màn (1050px trở xuống) vẫn luôn thấy nút xử lý. Ô cần
 * nền riêng để chữ cuộn bên dưới không lộ ra; nền theo dòng khi rê chuột như các ô khác. Không thêm bóng hay vạch ngăn:
 * khi bảng không tràn, vạch đó thành một đường kẻ thừa ở mọi dòng.
 */
const STICKY_ACT = 'sticky right-0 z-1';
export const SVC_ACT_HEAD = `act ${STICKY_ACT}`;
export const SVC_ACT_CELL = `act w-[1%] ${STICKY_ACT} bg-white in-[tr:hover]:bg-[#f8faff]`;

export const SVC_LABEL = 'svc-label mb-1.5 block text-[13px] font-medium text-primary';

/**
 * Phần chung của ô nhập. `font: inherit` của CSS cũ ghi thành từng phần: shorthand `font` đứng sau cỡ chữ trong thứ tự
 * của Tailwind nên sẽ ghi đè `text-[13px]`.
 */
const FIELD = 'svc-input w-full rounded-md border border-line-strong bg-white font-[inherit] [font-style:inherit] '
  + '[font-weight:inherit] text-[13px] text-primary focus:border-brand focus:shadow-[0_0_0_3px_rgba(29,86,196,0.15)] '
  + 'focus:[outline:0] aria-invalid:border-danger';

export const SVC_INPUT = `${FIELD} h-8.5 px-2.5 leading-[inherit]`;

export const SVC_TEXTAREA = `${FIELD} min-h-18 resize-y px-2.5 py-2 leading-normal`;

export const SVC_FIELD_ERROR = 'svc-err mt-1 text-[12px] text-danger';
