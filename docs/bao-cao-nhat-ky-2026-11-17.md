# Nhật ký hoạt động theo mock 17/11 — báo cáo

Mock đã duyệt: `finora-web-mockup/nhat-ky-de-xuat.html`. Làm trong `finora-web/src/features/activity-log`, không đổi backend. Chưa commit, chưa deploy.

## Tiến độ

- [x] Đọc trang cũ, API `/api/v1/admin/activity-logs` (đã nhận `outcome=ERROR`, `method=GET|WRITE`), thanh lọc dùng chung
- [x] Bộ lọc trên URL, bảng lọc dạng popover
- [x] Bảng mỗi ô một giá trị, tên cho lượt xem (GET)
- [x] Hộp chi tiết thay ngăn kéo
- [x] tsc + build, chụp màn với API giả

## Đã làm

**Đầu trang và hàng lọc**
- Bỏ 3 ô số liệu, hàng tab kết quả, ô tick "Tự làm mới 30 giây" và "Hiện lượt gọi tự động". Trang vẫn tự làm mới 30 giây ở trang đầu khi không mở chi tiết và không chọn ngày tự do.
- Một hàng: ô tìm "Tìm người gọi, thao tác, mã tra cứu" | chọn khoảng thời gian (1 giờ/24 giờ/7 ngày/30 ngày/Chọn ngày… hiện hai ô ngày) | Bộ lọc | Xuất CSV | Làm mới.
- Bảng lọc (dùng `FilterBar` chung): Kết quả (Tất cả / Thành công / Lỗi, số trong ngoặc theo khoảng thời gian: `total`, `total − clientErrors − serverErrors`, `clientErrors + serverErrors`), Thao tác (Xem / Thay đổi), Nhóm chức năng, Ứng dụng (Web / Mobile), Lượt gọi tự động (Ẩn / Hiện). Sửa trên bản nháp, bấm Áp dụng mới đổi URL. Chip dưới hàng lọc cho từng mục đang bật.
- "Xóa bộ lọc"/"Xóa tất cả" giữ ô tìm và khoảng thời gian như các trang danh sách khác.

**Bảng**
- Thời gian (`09:27:42 17/11/2026`) | Thao tác | Đối tượng | Người gọi | Vai trò | Ứng dụng | Kết quả. Không nhãn phương thức, không dòng phụ.
- Thao tác: tên từ `actions.ts`; thêm bảng tra `VIEW_RULES` cho lượt xem (121 mẫu GET lấy từ controller thật của finora-platform và finora-ai, ví dụ "Xem danh sách hồ sơ vay", "Xem ví"). Đường dẫn chưa có trong bảng tra thì hiện nguyên đường dẫn.
- Đối tượng chỉ ghi giá trị (mã hồ sơ, mã hợp đồng…); mã dài như UUID của lượt xác minh cắt bớt, đủ mã ở hộp chi tiết.
- Kết quả: "Thành công" xanh hoặc "Lỗi" đỏ (mọi mã ≥ 400).
- Lọc Kết quả = Lỗi: cột Vai trò, Ứng dụng nhường chỗ cho cột "Lỗi trả về".
- Vượt `maxRows`: dòng phân trang ghi "… trong 1.000 lượt gọi gần nhất".

**Hộp chi tiết** (thay `ActivityLogDrawer`, vẫn mở/đóng qua `?open=` trên URL)
- Đầu: tên thao tác + nhãn kết quả. Lỗi: khung đỏ với nội dung lỗi.
- Hai nhóm cạnh nhau (màn hẹp xếp một cột): Lượt gọi (Thời gian, Đối tượng, Nhóm chức năng, Mã trả về, Mã lỗi khi lỗi, Thời gian xử lý, Mã tra cứu) | Người gọi (Tài khoản, Vai trò, Ứng dụng, Địa chỉ IP).
- Đường dẫn (`METHOD path?query`), Dữ liệu gửi lên (JSON thụt lề, chỉ khi có body). Bỏ câu "đã che bằng ***".
- Chân: "Lọc theo người này" (khi có người gọi), "Sao chép mã tra cứu" (khi có mã).

## Tệp

- Sửa: `src/features/activity-log/actions.ts` (thêm `VIEW_RULES`, `describeAction` nhận GET), `constants.ts`, `types.ts`, `format.ts` (`formatWhen`), `hooks/useActivityLogFilters.ts`, `components/ActivityLogTable.tsx`, `pages/ActivityLogPage.tsx`.
- Mới: `components/ActivityLogDetailModal.tsx`, `components/ResultPill.tsx`.
- Xoá: `components/ActivityLogDrawer.tsx`, `components/ActivityLogFilterBar.tsx`, `components/tabKeys.ts`.
- Dùng chung (chỉ thêm, không đổi hành vi trang khác): `src/components/Modal.tsx` thêm `medium` (760px), `src/styles/ui.css` thêm `.ui-modal.large.medium`; `src/components/filters/FilterBar.tsx` thêm ô `leading` trước nút Bộ lọc và cho hàng nút xuống dòng khi hẹp.

## Kiểm tra

- `npx tsc --noEmit -p .`: đạt.
- `npm run build`: đạt (cảnh báo chunk > 500 kB có từ trước, không thuộc trang này).
- Lint: repo không cấu hình ESLint.
- `vite preview` + API giả chặn bằng Playwright, 12 ảnh ở `docs/anh-nhat-ky-2026-11-17/`, không lỗi JS. Luồng: áp dụng Kết quả = Lỗi từ bảng lọc → URL `?outcome=ERROR`, 7 dòng, có cột Lỗi trả về và chip; bấm dòng mở hộp, Esc đóng và bỏ `open` trên URL; "Lọc theo người này" → `q=maivo.cantho@gmail.com`, hộp đóng, ô tìm có email, 2 dòng.
- Chưa thử với backend thật.

## Lệch so với mock

- Đường dẫn chưa có tên hiện nguyên đường dẫn (mock chỉ có lượt có tên).
- Cột Vai trò ẩn khi màn ≤ 1380px như các bảng khác; Đối tượng, Ứng dụng, Lỗi trả về ẩn trên điện thoại.
- Mã dài ở cột Đối tượng bị cắt bớt (mock dùng tên ngắn).

Khi deploy: chỉ cần deploy web (`vercel --prod`).
