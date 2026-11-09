/**
 * Chuỗi utility Tailwind dùng ở nhiều thành phần xử lý sau giải ngân và sự cố. Lớp `svc-*` đứng đầu mỗi chuỗi không còn CSS;
 * giữ làm mốc cho kịch bản kiểm thử giao diện và truy vấn DOM.
 */

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
