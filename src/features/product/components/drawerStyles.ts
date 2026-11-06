/*
 * Lớp utility dùng ở nhiều mục của ngăn chi tiết sản phẩm (ProductDetailBody, ProductPerformance).
 * Lớp đầu mỗi chuỗi (`prod-dl`, `prod-cap`) là mốc cho kịch bản kiểm thử, không mang CSS.
 */

/** Bảng nhãn: giá trị hai cột; mỗi dòng có vạch dưới, trừ dòng cuối. */
export const DETAIL_LIST =
  'prod-dl grid grid-cols-[128px_minmax(0,1fr)] text-[13px] [&_:is(dt,dd)]:py-1.5 [&_:is(dt,dd)]:border-b'
  + ' [&_:is(dt,dd)]:border-b-divider [&_dt]:text-muted [&_dd]:text-primary [&_dd]:tabular-nums'
  + ' [&>:nth-last-child(-n+2)]:[border-bottom:0]';

/** Dòng chú thích nhỏ dưới một mục. */
export const CAPTION = 'prod-cap mt-0.5 text-muted text-[12px] leading-4.5';
