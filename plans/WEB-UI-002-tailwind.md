# WEB-UI-002 — Chuyển CSS của web quản trị sang Tailwind CSS

Trạng thái: `READY_FOR_REVIEW` (Hải yêu cầu ngày 2026-11-03: "cập nhật css thành tailwindcss"; chưa commit).

## Mục tiêu

- Web quản trị viết giao diện bằng utility của Tailwind CSS v4 thay cho 25 file CSS viết tay (khoảng 8.600 dòng).
- Giao diện giữ nguyên từng điểm ảnh: không đổi màu, khoảng cách, bố cục, trạng thái hover/focus, responsive.
- Không đổi logic, dữ liệu, API, cấu trúc DOM hay chữ hiển thị.

## Quyết định kỹ thuật

| Vấn đề | Cách làm |
|---|---|
| Phiên bản | `tailwindcss` và `@tailwindcss/vite` 4.3.3, ghim cứng trong `devDependencies`. Plugin khai báo ở `vite.config.ts`. |
| Điểm vào | `src/styles/index.css`, nạp đầu tiên trong `main.tsx` để khai báo thứ tự layer đứng trước mọi CSS khác. |
| Preflight | Không dùng. Bộ reset riêng (layer `base`) giữ giao diện đã duyệt; Preflight đổi viền, ảnh, tiêu đề, nút. |
| Layer | `theme < base < components < utilities`. Lớp dùng chung `ui-*` (`src/styles/ui.css`) ở `components`, nên utility trong JSX luôn thắng `ui-*`. |
| Quét nguồn | Chỉ `src/` (`source(none)` + `@source '../'`), tránh sinh utility từ tài liệu và skill. |
| Token | Khai báo một lần trong `@theme static`: màu (`brand`, `primary`, `secondary`, `muted`, `line`, `divider`, `fill`, `success`…), bo góc `sm/md/lg` = 6/8/12px, bóng `card`/`pop`, `ease-soft`, font `sans`/`mono`. Biến cũ (`--brand`, `--text-primary`…) đã bỏ; giá trị tùy ý gọi thẳng tên token (`var(--color-brand)`, `var(--ease-soft)`). Trong `:root` chỉ còn biến bố cục `--sidebar-width`, `--header-height`, `--admin-page-inline-padding`. |
| Thang mặc định | Gốc chữ của web là 14px nên các thang tính bằng rem của Tailwind lệch. Đã bỏ thang cỡ chữ, bo góc, bóng, container, breakpoint và bảng màu mặc định; khoảng cách đặt `--spacing: 4px` (`p-4` = 16px). |
| Hover | `@custom-variant hover (&:hover)` để `hover:` giống `:hover` cũ (Tailwind v4 mặc định chỉ áp khi thiết bị có chuột). |
| Keyframes | Giữ tên cũ, đặt trong `index.css`, gọi bằng `animate-[lr-spin_0.7s_linear_infinite]`. |
| Tên lớp cũ | Giữ trong `className` làm mốc cho kịch bản kiểm thử giao diện (`scripts-test-cases`) và truy vấn DOM (`.sd-close`, `.ui-modal-scrim`…). Các lớp này không còn CSS. Lớp mốc không được trùng tên utility của Tailwind (`inline`, `hidden`, `table`, `block`…); vì vậy `.auth-denied.inline` đã đổi thành `.auth-denied.is-inline`. |

## Quy tắc viết

- Style mới viết bằng utility trong JSX. Không thêm file CSS theo trang. Chuỗi lớp dùng lại ở nhiều component của một
  feature đặt trong `styles.ts` (hoặc `*Styles.ts`, `reviewClassNames.ts`) của feature đó, lớp mốc đứng đầu chuỗi.
- Viết đúng dạng chuẩn mà Tailwind IntelliSense gợi ý (`suggestCanonicalClasses`): khoảng cách và kích thước theo thang 4px kể
  cả giá trị lẻ (`p-3.25` = 13px, `size-3.75` = 15px), `leading-normal` thay `leading-[1.5]`, `z-70`, `-mt-1`, `*:` thay `[&>*]:`.
- Màu theo token: `text-primary`, `text-secondary`, `text-muted`, `text-brand`, `bg-card`, `bg-surface-muted`, `border-line`,
  `border-line-strong`, `border-divider`, `bg-fill` (nền icon, khung xương), `text-danger`, `bg-danger-bg`… Màu chưa có token
  ghi thẳng: `bg-[#eef2fa]`, `bg-[rgba(29,86,196,0.15)]`. Không dùng hậu tố độ mờ `/10` khi cần đúng màu cũ (ra `color-mix`).
- Cỡ chữ luôn ghi px: `text-[13px]` (thang `text-sm`… đã bỏ).
- Bo góc: `rounded-sm/md/lg`; giá trị khác ghi thẳng `rounded-[7px]`, `rounded-[999px]`, `rounded-[50%]` (`rounded-full` ra giá trị khác).
- `transform` ghi `transform-[translateY(-50%)]`; không dùng `translate-*`/`rotate-*` (Tailwind v4 dùng thuộc tính `translate`/`rotate`
  riêng, lệch với keyframes dùng `transform`).
- Responsive: `@media (max-width: 760px)` viết `max-[760px]:` (Tailwind hiểu là `width < 760px`, ranh giới lệch 1px so với CSS cũ;
  biến `--admin-page-inline-padding` trong `index.css` cũng đổi theo `width < 760px`). Giảm chuyển động: `motion-reduce:`.
- Trạng thái do JS gắn lớp (`.is-active`, `.done`): giữ lớp, viết `[&.done]:…` trên chính phần tử, `in-[.fd-step.done]:…` hoặc
  `group-*` cho phần tử con.
- Phần tử do component khác render (svg của `Icon`, phần trong `Pager`): đặt biến thể trên phần tử cha của mình, vd. `[&_svg]:size-3`.
- Không dựng tên utility bằng chuỗi động (`bg-${tone}`) và không viết utility dính liền `${…}` trong template literal: Tailwind
  chỉ thấy chuỗi đầy đủ, tách bằng khoảng trắng. Dùng bảng tra chuỗi tĩnh.

Bẫy đã gặp khi quy đổi (CSS sinh ra khác giá trị cũ dù nhìn giống):

| CSS cũ | Không dùng | Dùng |
|---|---|---|
| `align-items: start`, `align-content: start`, `justify-self: start` | `items-start`, `content-start`, `self-start` (ra `flex-start`) | `[align-items:start]`, `[align-content:start]`, `[justify-self:start]` |
| `font: inherit` cùng cỡ chữ riêng | `[font:inherit]` (Tailwind xếp sau `text-*`, đè mất cỡ chữ) | `font-[inherit] [font-style:inherit] [font-weight:inherit] leading-[inherit]` |
| `border-bottom: 0`, `outline: 0` | `border-b-0`, `outline-0` (vẫn để kiểu `solid`) | `[border-bottom:0]`, `[outline:0]` |
| màu viền một cạnh | `border-divider` (đổi màu cả 4 cạnh) | `border-b-divider` |
| `grid-column: span 2` | `col-span-2` (đặt cả `grid-column-end`) | `col-[span_2]` |
| `list-style: none` trên `summary` | `list-none` (chỉ đặt type) | `[list-style:none]` |
| `transition: transform` | `transition-transform` (thêm translate/scale/rotate) | `transition-[transform]` |

- Utility luôn thắng `ui-*`. Chỗ CSS cũ để `ui.css` thắng nhờ độ đặc hiệu (nền khi focus bàn phím của `.ui-table`), viết kèm
  điều kiện loại trừ: `[&.is-open:not(:focus-visible)_td]:bg-brand-50`.
- Trước khi dùng layer, `:focus-visible` chung nạp sau CSS màn đăng nhập nên thắng `.login-input { outline: none }`; nay ô nhập
  ghi `not-focus-visible:[outline:none]` để giữ viền focus như cũ.

## Kiểm tra

- `npm run build` (type-check + build).
- So giao diện trước/sau bằng bộ chụp ở scratchpad phiên làm việc: chạy bản build gốc và bản mới trên cùng domain Vercel,
  phát lại cùng một bản ghi API (HAR), so điểm ảnh ở 5 bề ngang (1440, 1050, 820, 680, 390), computed style của mọi phần tử
  và style khi ép `:hover`/`:focus`. Điều kiện xong: không còn khác biệt style; khác điểm ảnh chỉ được phép ở vùng chữ của
  `<select>` gốc (nhiễu raster, đã thấy cả khi chụp lại cùng một bản build).

## Tiến độ

- [x] Bước 0: cài Tailwind, `index.css` (theme, base, layer), bọc CSS cũ vào layer `components`, gom keyframes. Đã so 86 lần
  chụp với bản gốc: không khác style.
- [x] Bước 1: chuyển CSS từng màn sang utility, xóa 23 file CSS (8 nhóm: khung + đăng nhập, Tổng quan + Nhật ký, Khoản vay,
  Chính sách AI, Khách hàng + eKYC, Sản phẩm + Người dùng + Phân quyền, Gọi vốn + Chợ thứ cấp, Vận hành + Blockchain). Thêm
  kịch bản tương tác cho tab, ngăn trượt, hộp thoại, menu dòng, trạng thái lỗi/rỗng (một số dùng response GET giả trong trình
  duyệt vì hệ thống thật thiếu dữ liệu). Khai báo CSS cũ vốn không có tác dụng (thua rule khác) thì không chuyển: `.rl-input-code`,
  phần đệm của `.rl-textarea`, `.user-toolbar .ui-select`, màu của `.staff-matrix-name`; bỏ CSS không còn màn nào dùng
  (`.fd-chip*`, `.fd-mini*`, `.fd-days`, `.fd-field-label`).
- [x] Bước 2: viết lại `ui.css` bằng `@apply` trong layer `components` (`@reference './index.css'`). So 86 lần chụp: không
  khác style. Vài khai báo giữ CSS thường vì cần đúng thứ tự shorthand (viền `hr`, tam giác `::before`).
- [x] Bước 3 (2026-11-04): đổi class sang dạng chuẩn Tailwind (248 chỗ, bằng `canonicalizeCandidates` của chính Tailwind),
  bỏ biến cũ, thêm token `fill`; `npm run build` qua. So lần cuối 663 lần chụp (138 kịch bản × bề ngang): không còn khác style,
  trạng thái hay DOM; khác điểm ảnh chỉ còn ở chữ của `<select>` (chụp lại bản gốc cũng ra đúng số đó). Đã cập nhật
  `engineering-rules.md`.
