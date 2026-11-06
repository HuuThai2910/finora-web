# Báo cáo cập nhật web quản trị FINORA (03–04/11/2026)

Các đợt việc trên `finora-web` (đợt 2 có cả backend):

1. Chuyển toàn bộ CSS viết tay sang **Tailwind CSS v4**, giữ nguyên giao diện (plan `plans/WEB-UI-002-tailwind.md`).
2. **Rà soát UI/UX kiểu senior** cả 18 màn, rồi sửa lỗi và bổ sung tính năng chỉ ở frontend, dùng API đã có (WEB-UX-001, ghi tại file này).
3. **Đợt 2:** làm các mục cần sửa backend (User, Loan, Investment, AI, Gateway), thêm thanh tải toàn trang và toast dùng chung (mục 3).

Tất cả nằm trong working tree, **chưa commit, chưa push, chưa deploy**. `npm run build` (type-check + build) chạy qua.

---

## 1. Chuyển sang Tailwind CSS v4

### Đã làm
- Cài `tailwindcss` và `@tailwindcss/vite` bản 4.3.3, ghim cứng phiên bản; plugin khai báo ở `vite.config.ts`.
- Bỏ 23 file CSS theo trang, khoảng 8.600 dòng. Style chuyển thành utility Tailwind viết thẳng trong JSX. Chuỗi class dùng lại ở nhiều component của một feature đặt trong `styles.ts`.
- Chỉ còn 2 file CSS:
  - `src/styles/index.css`: token trong `@theme` (màu, bo góc, bóng, font, khoảng cách 4px), reset, keyframes.
  - `src/styles/ui.css`: các lớp dùng chung `ui-*`, viết bằng `@apply` trong layer `components`.
- Quyết định chính:
  - Không dùng Preflight: giữ bộ reset riêng để giao diện không đổi.
  - Thứ tự layer là theme < base < components < utilities, nên utility viết trong JSX luôn ghi đè được `ui-*`.
  - Gốc chữ của web là 14px, nên bỏ các thang đo mặc định tính bằng rem của Tailwind; khoảng cách đặt `--spacing: 4px`.
  - `hover:` hoạt động như `:hover` thường, kể cả trên thiết bị cảm ứng.
- **Giữ nguyên mọi tên lớp cũ** (`lr-*`, `prod-*`…) trong `className` làm mốc, để kịch bản kiểm thử giao diện ở `scripts-test-cases` vẫn chạy. Lớp `.auth-denied.inline` đổi thành `.is-inline` vì trùng tên utility `inline` của Tailwind.
- Mọi class viết theo dạng chuẩn mà Tailwind IntelliSense gợi ý (ví dụ `size-3.75` thay cho `size-[15px]`), nên editor không còn cảnh báo `suggestCanonicalClasses`.
- Ngưỡng responsive cũ "≤ 760px" giờ là "< 760px" theo cách Tailwind hiểu, chỉ khác bản cũ ở đúng bề ngang 760px.

### Kiểm tra
- Bộ chụp tự động so bản gốc với bản Tailwind:
  - cùng một bản ghi API (HAR) lấy từ hệ thống deploy;
  - 5 bề ngang: 1440, 1050, 820, 680, 390;
  - so điểm ảnh, computed style của từng phần tử, và style khi ép trạng thái hover/focus.
- Lần cuối so 663 lần chụp (138 trạng thái màn hình):
  - không lệch style, trạng thái hay DOM;
  - lệch điểm ảnh chỉ còn ở chữ trong ô `<select>`, và chụp lại chính bản gốc cũng lệch đúng như vậy.
- Bảng các lỗi quy đổi hay gặp (ví dụ `items-start` ra `flex-start`, `[font:inherit]` đè mất cỡ chữ) ghi trong `plans/WEB-UI-002-tailwind.md` cho người viết tiếp.

---

## 2. Rà soát UI/UX và các cải tiến đã làm

Bốn người rà soát (vai senior) đi qua tác vụ chính của từng màn, trên ảnh chụp dữ liệu thật và trên code. Mỗi đề xuất đều được kiểm xem API đã có hay chưa. Những việc làm được ở frontend với API có sẵn đã được làm hết.

### 2.1. Lỗi số liệu đã sửa (có từ trước, không do Tailwind)
| Màn | Lỗi | Sửa |
|---|---|---|
| Gọi vốn & Notes | Lãi suất bị nhân 100 (12,5%/năm hiện "1.250%/năm"); bộ lọc "Lãi từ %" không lọc được gì | Theo đúng đơn vị điểm phần trăm của backend |
| Gọi vốn & Notes | Khoản đủ vốn chưa giải ngân vẫn gắn "Đã phát hành Note" | Nhãn "Chờ ký hợp đồng" / "Chờ giải ngân" theo trạng thái hợp đồng; tiến trình hiện mốc giải ngân |
| Hồ sơ vay | Nút "Duyệt hồ sơ" duyệt ngay một chạm (tạo hợp đồng luôn) | Form xác nhận trong khay: tóm tắt số tiền, kỳ hạn, lãi sau định giá, kỳ trả đầu, ghi chú tùy chọn gửi lên backend |
| Hồ sơ vay | Chấm điểm lỗi thì khóa luôn nút Từ chối, nên hồ sơ bị kẹt | Từ chối chỉ cần hồ sơ đang chờ thẩm định; duyệt vẫn cần chấm điểm thành công |
| Phân quyền | Hộp khóa tài khoản hứa "đăng xuất ngay", nhưng backend không làm vậy | Câu nói đúng: không đăng nhập lại được; phiên đang mở còn dùng tối đa khoảng 15 phút |
| Tổng quan | 4/7 dòng "Việc cần xử lý" dẫn sai hàng đợi; cột dư nợ ghi "0,00 tỷ" | Link đúng hàng đợi; dư nợ ghi "50 tr" như ô KPI |

### 2.2. Dùng chung toàn web
- **Khung trang:**
  - Một trang lỗi khi hiển thị chỉ hiện thông báo kèm nút "Tải lại trang", không trắng cả web. Tab mở từ trước một lần deploy tự tải lại một lần.
  - Mở trang mới thì cuộn về đầu.
  - Quay về danh sách (nút quay lại và breadcrumb) giữ tab, bộ lọc và trang đang xem (`src/lib/navigation.ts`).
- **Ngày giờ:** một kiểu cho cả web, ví dụ `21:13 02/11/2026`, luôn theo giờ Việt Nam.
- **Khả năng truy cập:**
  - Chữ phụ xám và chữ cam của nhãn trạng thái đậm hơn để đạt tương phản 4,5:1.
  - Dòng bảng đang được chọn bằng bàn phím có viền xanh.
  - Hộp thoại giữ focus bên trong và khóa cuộn trang phía sau; hộp có form không đóng khi lỡ bấm ra nền.
  - Menu "⋯" hiện lý do một mục bị khóa thành chữ; Esc đóng menu.
  - Các nhóm nút dạng tab đi được bằng phím mũi tên.
- **Khối lỗi:** chỉ hiện câu báo và "Mã tra cứu", không hiện mã lỗi nội bộ.
- **Mã kỹ thuật trên giao diện:** đã bỏ "Fineract", "saga", "proof", "Liveness", "DEAD_LETTER", tên sự kiện và mã enum ở các màn.

### 2.3. Theo từng khu
**Khung trang, đăng nhập**
- Hết phiên thì màn đăng nhập báo lý do. Đăng nhập lại về đúng trang và bộ lọc. Đổi tài khoản không còn thấy dữ liệu của tài khoản trước.
- Ô **"Mở hồ sơ theo mã"** trên header: gõ `LA-…` rồi Enter để mở thẳng hồ sơ; phím `/` để nhảy vào ô.
- Menu tài khoản hiện họ tên, email, vai trò và các quyền Xem/Thao tác.
- Dưới 1024px, menu bên trái thành ngăn trượt (có nút đóng bên trong), nên màn tablet đủ chỗ cho bảng.
- Màn chờ dùng nền sáng; sau 15 giây chưa xong thì có nút "Thử lại".
- Thẻ "Không có quyền" có nút "Đăng xuất", hoặc "Về trang <tên>" theo trang đầu tiên được phép.

**Tổng quan**
- "Việc cần xử lý" dẫn đúng hàng đợi. Thêm hai dòng: "Xác minh danh tính chờ duyệt tay" và "Bằng chứng dừng gửi".
- Kỳ xem, ô số liệu đang chọn và tab biểu đồ lưu trên URL.
- Thẻ Tài khoản mới hiện 5 tài khoản gần nhất kèm "Xem tất cả"; các con số cộng lại khớp nhau.
- Ở màn một cột, "Việc cần xử lý" lên trước biểu đồ.

**Nhật ký hoạt động**
- Bộ lọc, trang và dòng đang mở lưu trên URL, nên gửi được link cho người khác.
- Bảng không còn mờ và khóa mỗi lần tự làm mới. Tự làm mới tạm dừng khi đang xem trang sau hoặc đang mở ngăn chi tiết.
- Ghi rõ khi kết quả vượt giới hạn 5.000 lượt.
- Ngăn chi tiết có "Lọc theo người này" và "Sao chép mã tra cứu". Chữ trên trang đã Việt hóa.

**Hồ sơ vay**
- Trang thẩm định:
  - mã nguồn hồ sơ, điều kiện vay và lý do loại theo chính sách hiện bằng tiếng Việt;
  - điểm và vết luật định dạng kiểu Việt Nam;
  - điểm CIC hiện ngay, không phải mở thêm tab.
- Khay kết quả hiện lý do từ chối chuẩn và số hợp đồng. Tab "Lịch sử xử lý" cũng dịch các mã lý do.
- Tên người vay là link sang trang khách hàng.
- Hàng chờ thẩm định: hồ sơ cũ nhất trước; nút "Hồ sơ chờ tiếp theo" đi đúng thứ tự.
- Danh sách:
  - có bộ lọc "Chờ chấm lại điểm";
  - cột điểm ghi rõ "Chấm lỗi" hoặc "Đang chấm";
  - nhân viên không có quyền thống kê vẫn thấy số trên tab.

**Vận hành khoản vay**
- Bảng không còn mất cột thao tác: bỏ các cột chỉ có một giá trị, gộp cột, cột thao tác dính mép phải.
- Hiện tên người thay cho mã. Có link sang khoản gọi vốn và hồ sơ vay.
- Ngăn thu hồi:
  - có số điện thoại (bấm để gọi), email và link sang khách hàng;
  - thêm ghi nhận Chuyển pháp lý, Thu hồi tận nơi, Đề xuất xóa nợ;
  - đã chuyển sang ngăn trượt dùng chung.
- Hàng thu hồi: lọc theo mức độ trên URL; bấm vào thanh biểu đồ để lọc.
- Hộp duyệt/từ chối cơ cấu nhắc lại lý do người vay nêu.

**Chính sách đánh giá AI**
- Trọng số nhập theo %, ô còn lại tự bù cho đủ 100. Ô hạn mức có dấu phân cách và đơn vị "đ".
- Mã của luật đã lưu bị khóa. Đổi chiều hoặc đổi trường làm mất các bậc thì hỏi lại trước.
- Xóa luật có nút "Hoàn tác" cho tới khi lưu.
- Lưu có bước xác nhận liệt kê thay đổi cũ → mới. Đầu trang hiện "Đang áp dụng: chính sách tín dụng vN"; lưu xong báo phiên bản mới.

**Gọi vốn & Notes, Chợ thứ cấp**
- Khoản quá hạn đóng được ngay từ danh sách, qua hộp xác nhận liệt kê từng khoản.
- Ô và tab "Chờ duyệt" chỉ hiện khi có bản nháp. Bước 1 của tiến trình đổi thành "Lên sàn".
- Tên nhà đầu tư hiện đúng (trước đây toàn "Không tra được tên") và là link sang khách hàng.
- Trang chi tiết có link sang hồ sơ vay, sổ lệnh và mục xác minh phát hành Note. "Về danh sách" giữ bộ lọc.
- Chợ thứ cấp:
  - có tab "Giấy xác nhận" liệt kê giấy lập lỗi kèm nút thử lại;
  - lỗi viết bằng tiếng Việt;
  - bảng giao dịch gộp cột nên không tràn ngang ở 1440px;
  - ngăn sổ lệnh có link về khoản gọi vốn và đã dùng ngăn trượt chung.

**Sản phẩm vay**
- Sửa được bản nháp; tạo được bản sao từ một sản phẩm.
- Kích hoạt, Tạm dừng, Lưu trữ đều có bước xác nhận.
- Ngăn chi tiết lưu trên URL.
- Khoảng có hai đầu bằng nhau ghi một số ("1 tr" thay cho "1 - 1 tr").

**Khách hàng, duyệt xác minh danh tính**
- Trang chi tiết khách hàng có menu thao tác: Khóa/Mở khóa, Đổi vai trò, Duyệt xác minh, Nhật ký hoạt động của khách. Không tìm thấy khách thì báo gọn kèm link quay lại.
- Tab "Chờ duyệt tay" liệt kê theo lượt xác minh, lượt chờ lâu nhất trước, có cột "Đã chờ bao lâu". Màn duyệt có nút sang lượt trước/sau.
- Màn duyệt:
  - phóng to ảnh thẻ thì thấy các trường bên cạnh để đối chiếu;
  - hộp Duyệt tóm tắt dữ liệu sẽ ghi vào hồ sơ;
  - hộp Từ chối ghi rõ khách không thấy lý do;
  - có dòng "Đã khai khi đăng ký";
  - đã bỏ các câu khuyên người duyệt.
- Danh sách chỉ hiện 4 số cuối CCCD. Nhãn "Chưa xác minh" màu xám, tách khỏi "Chờ duyệt tay".

**Phân quyền**
- Ma trận quyền có trạng thái "chọn một phần".
- Hộp sửa vai trò báo lưu sẽ đăng xuất bao nhiêu nhân viên.
- Hộp đổi vai trò tóm tắt quyền của vai trò mới và nói rõ hệ quả.
- Màn hẹp ẩn bớt cột để nút "⋯" không bị mất.

**Xác minh giao dịch (blockchain)**
- Tra theo mã hồ sơ `LA-…` (trước đây chỉ nhận ID số). "Hồ sơ #35" là link lọc mọi bằng chứng của hồ sơ đó.
- Nút chép hash và mã giao dịch; nút "Tải kết quả xác minh" (JSON).
- Khối giới thiệu nền phẳng, gộp thành một mục gập. Bản demo chỉ báo một lần.

### 2.4. Kiểm tra
- Type-check, `npm run build` và kiểm dạng chuẩn class Tailwind đều sạch.
- Mỗi khu có kịch bản chụp riêng ở 1440px và 390px, một số khu chụp thêm ở 1050px và 820px. Các trạng thái hệ thống thật chưa có (hàng chờ, lỗi, thành công sau khi gửi) được giả bằng response GET ngay trong trình duyệt. Bộ chụp chặn mọi lệnh ghi, nên không có dữ liệu nào bị ghi lên hệ thống.
- Lần chụp cuối: 16 trang chính với bản build cuối và dữ liệu thật, 32/32 lần chụp đều vẽ được, không có lỗi JavaScript.

---

## 3. Đợt 2 (04/11): các việc cần backend, thanh tải toàn trang, toast

Làm trên working tree của `finora-platform` và `finora-web`, **chưa commit, chưa push, chưa deploy**. Không chạy migration lên Neon, không sửa realm Keycloak.

### 3.1. Đã làm theo từng mục

**1. Tìm khách hàng, lọc tài khoản theo vai trò nhân viên**
- finora-user: `GET /api/v1/admin/users` nhận thêm `q` và `staffRoleCode`.
  - `q` khớp một phần họ tên (không phân biệt dấu) hoặc email, hoặc khớp **đúng** số điện thoại / số CCCD (hai trường này chỉ lưu dạng băm nên phải gõ đủ số; nhận cả `0912…`, `+84912…`, có dấu cách).
  - `staffRoleCode` chỉ trả tài khoản nhân viên có vai trò đó.
- Web: trang Khách hàng có ô tìm (chờ gõ xong mới gửi, lưu `?q=` trên URL). Trang Phân quyền có ô tìm và ô chọn vai trò nhân viên ở tab Nhân viên (`?staffRole=`).

**2. Toàn cảnh một khách hàng**
- finora-loan: `GET /api/v1/admin/loan-applications` nhận thêm `borrowerId`.
- finora-investment: API mới `GET /api/v1/investments/admin/investors/{id}/notes` (Note khách đang giữ). Nhân viên có quyền Xem "Khách hàng" hoặc "Gọi vốn" đều gọi được.
- Web, trang chi tiết khách hàng có thêm: Hồ sơ vay, Khoản đầu tư (Note), Lịch sử xác minh danh tính.
- Trang thẩm định có thêm thẻ "Hồ sơ khác của cùng người vay".

**3. Lịch sử xác minh và lý do từ chối**
- finora-user: `GET /api/v1/admin/users/ekyc-attempts?userProfileId=` trả mọi lượt của một khách. Mỗi lượt có thêm `decidedAt` và `reviewNote`.
- Nhân viên chỉ có quyền Xem "Khách hàng" xem được lịch sử của từng khách, nhưng không xem được hàng chờ duyệt.
- API mới cho app khách: `GET /api/v1/users/me/ekyc-status` trả kết quả lượt gần nhất, kèm lý do khi bị từ chối.
- Web: hộp Từ chối ghi rõ "Khách sẽ thấy lý do này trên app". Lịch sử ở trang khách hàng ghi "Lý do từ chối (khách thấy trên app)".

**4. Khóa tài khoản**
- finora-user: `POST /admin/users/{id}/lock` bắt buộc body `{"reason": "..."}`, tối đa 500 ký tự. Thiếu lý do thì trả 400 `LOCK_REASON_REQUIRED`.
- Khi khóa, hệ thống lưu lý do, thời điểm, người khóa, rồi gọi Keycloak Admin API đăng xuất mọi phiên (`users/{id}/logout`). Mở khóa thì xóa lý do.
- Trang khách hàng hiện lại lý do khóa. Hộp mở khóa cũng hiện lý do lúc khóa.
- Câu trong hộp khóa đổi theo hành vi mới:
  - người dùng bị đăng xuất khỏi app và web ngay;
  - thao tác đang làm dở có thể chạy thêm tối đa 15 phút, vì mã truy cập đã cấp vẫn còn hạn.

**5. Lý do AI chuyển thẩm định**
- finora-ai: hồ sơ chuyển thẩm định luôn kèm mã lý do. Ngoài 2 mã CIC đã có, thêm:
  - `SCORE_IN_REVIEW_BAND`: điểm nằm giữa hai ngưỡng;
  - `INSUFFICIENT_RULE_DATA`: tra được quá ít dữ liệu.
  - Mã được thêm sau khi đã có quyết định, nên kết quả chấm không đổi.
- finora-loan:
  - lưu mã lý do vào snapshot lần chấm và vào lịch sử hồ sơ;
  - `/review` trả thêm `aiReviewReasons`.
- Web: thẻ "Vì sao hồ sơ cần người thẩm định", và tab Lịch sử dịch mã thành câu tiếng Việt. Lần chấm cũ chưa lưu lý do thì thẻ ghi rõ như vậy.
- *Duyệt với số tiền thấp hơn: chưa làm*, xem mục 4.

**6. Notes "Cần đối soát", người giữ Note, tìm/sắp gọi vốn**
- finora-investment, migration **V20** (thêm số lần, người và thời điểm gửi lại):
  - `POST /admin/order-books/trades/{mã}/retry-settlement`: đưa lần khớp lỗi về hàng chờ thanh toán. Worker gửi lại đúng lệnh cũ (Payment chống trùng theo mã), nên không chuyển tiền hai lần. Lần khớp không còn lỗi thì trả 409.
  - `GET /admin/order-books/trades/{mã}/notes`: các Note của lần khớp, người đang giữ và lịch sử chuyển nhượng.
  - `GET /market/listings` nhận thêm `q` (tìm theo mã hồ sơ hoặc số hợp đồng) và `sort` (`rate`, `newest`, `closing`, `amount`).
- Web, Chợ thứ cấp (cột Thanh toán):
  - nút "Xem Note" mở ngăn người giữ và lịch sử;
  - nút "Gửi thanh toán lại" (cần quyền Thao tác), có hộp xác nhận.
- Web, Gọi vốn: ô tìm mã và ô Sắp xếp, lưu trên URL.

**7. Nhật ký hoạt động**
- Gateway ghi cờ `background` khi request có header `X-Finora-Background: 1`. Web gửi header này cho các lượt tự làm mới.
- finora-user, `GET /admin/activity-logs`:
  - mặc định ẩn lượt tự động; `includeBackground=true` để hiện;
  - nhận `from` và `to` (ISO, tối đa 31 ngày) thay cho `range`.
- finora-user: API mới `GET /admin/activity-logs/export` xuất CSV:
  - có BOM UTF-8 và giờ Việt Nam;
  - chặn ô bị Excel hiểu thành công thức;
  - không xuất thân request.
- Web: ô "Chọn ngày…" (từ ngày, đến ngày), ô tích "Hiện lượt gọi tự động", nút "Xuất CSV".

**8. Chuông thông báo, khóa chống ghi đè chính sách AI**
- Chuông trên header (`src/features/staff-inbox`):
  - Việc cần xử lý theo quyền Xem: hồ sơ chờ thẩm định, chờ chấm lại, khoản chờ lên sàn, cơ cấu chờ duyệt, xác minh chờ duyệt tay. Việc "mới" là phần tăng thêm so với lần bấm "Đánh dấu đã xem".
  - Tin gửi cho tài khoản, lấy từ finora-notification, có đánh dấu đã đọc.
  - Tự làm mới 2 phút một lần, chạy nền.
- finora-ai: `PUT /config/product` và `PUT /config/rules` nhận `expected_version`. Phiên bản khác bản đang có thì trả 409.
- Web gửi phiên bản đã đọc. Gặp 409 thì báo "Chính sách vừa được người khác lưu", có nút "Tải bản mới".
- Sửa thêm: lưu trọng số/hạng giờ làm mới cả bộ luật, vì hai phần dùng chung số phiên bản.

**9. Mã hồ sơ thay cho "Hồ sơ #id"**
- finora-loan: bảng saga giải ngân và sự kiện trả nợ chờ ghép trả thêm `applicationNumber`.
- finora-loan: API mới `GET /admin/loan-applications/numbers?ids=` (tối đa 100 ID) cho hai bảng đối soát của Payment.
- Web hiện "Hồ sơ LA-…", bấm được để mở trang thẩm định. Chưa tra được mã thì vẫn hiện "Hồ sơ #id".

### 3.2. Chỉ báo đang tải toàn trang
- Thanh mảnh 3px ở mép trên cửa sổ, màu brand, nằm trên header.
- Hiện khi còn query hoặc mutation đang chạy (kể cả refetch), hoặc khi đang tải trang. Theo dõi qua middleware Redux `src/lib/progress/progressMiddleware.ts`; trang tải chậm thì dùng Suspense fallback `PageChunkFallback`.
- Cách chạy:
  - trễ 150 ms mới hiện;
  - chạy chậm dần tới 90%;
  - xong thì lên 100% rồi mờ đi.
- Không tính các lượt chạy nền (`src/lib/api/background.ts`):
  - lượt tự làm mới 30 giây của Nhật ký (lần tải đầu và lần đổi bộ lọc vẫn tính);
  - mọi request của chuông.
- Có `role="progressbar"` và `aria-busy`. Người dùng bật giảm chuyển động thì thanh đứng yên.
- Giữ nguyên các chữ "Đang tải…" và khung xương cục bộ.

### 3.3. Thông báo dùng toast
- Hệ toast dùng chung: `src/lib/toast` (gọi `toast.success/error/info/warning` hoặc `useToast()`), vẽ ở `src/components/Toaster.tsx`.
  - Vị trí: góc trên phải trên desktop, trên cùng giữa ở màn hẹp.
  - Có `aria-live`; lỗi đọc ngay (assertive).
  - Tự đóng sau 4,5 giây, cảnh báo 6 giây, lỗi 8 giây. Dừng đếm khi rê chuột hoặc focus, có nút đóng.
  - Tối đa 3 toast chồng nhau.
- Lỗi thao tác hiện câu báo và "Mã tra cứu", không hiện mã nội bộ. Trong hộp thoại dùng `<ErrorToast>` đặt đúng chỗ khối lỗi cũ.
- Đã thay ở mọi trang:
  - khóa/mở khóa, đổi vai trò;
  - vai trò nhân viên (lưu, xóa);
  - duyệt/từ chối hồ sơ, chấm lại;
  - duyệt/từ chối xác minh;
  - sản phẩm vay (lưu, kích hoạt, tạm dừng, lưu trữ, chép mã);
  - gọi vốn (tham số sàn, đóng khoản hết hạn, khóa vốn, phát hành Note);
  - cơ cấu, thu hồi, đối soát, ghi lại giao dịch, đưa saga về ghi lại, chạy lại sự kiện;
  - đưa lại bằng chứng, tải PDF;
  - chép mã ở mọi nút chép;
  - lưu chính sách AI và bộ luật;
  - xuất CSV.
- Thay toàn bộ `components/Toast.tsx` cũ và `ActionError` (khối này từng hiện cả mã lỗi kỹ thuật).
- Giữ trong trang: lỗi tải dữ liệu (`ErrorNotice` có "Thử lại"), lỗi nhập ở từng ô, cảnh báo thường trực. Cụ thể: tài khoản đang khóa; hồ sơ vừa được người khác xử lý (409, có nút tải lại); chính sách vừa được người khác lưu.
- Mỗi toast vẫn mang lớp `ui-toast` như trước.

### 3.4. Kiểm tra
- Backend, `mvn test`:

  | Module | Kết quả |
  |---|---|
  | finora-user | 499 ca + 4 ca nhật ký mới, đều đạt |
  | finora-loan | 480 ca đạt |
  | finora-investment | 121 ca đạt |
  | finora-gateway | 105 ca đạt |

- Hai test consumer của finora-loan vốn đã gãy sau REFACTOR-001 (vẫn dùng chữ ký `ObjectMapper` cũ). Đã sửa sang `KafkaEventReader` để module chạy được test.
- finora-ai, `pytest tests/credit`: các ca mới (lý do chuyển thẩm định, khóa 409) đạt. Còn 10 ca hỏng **có từ trước**, không liên quan tới thay đổi lần này:
  - thứ tự bộ luật mặc định khác;
  - router CIC trả 422.
- Web: `tsc --noEmit` sạch, `npm run build` qua, kiểm dạng chuẩn class Tailwind còn 0 chỗ.
- Chụp bằng playwright với API giả hoàn toàn (không request nào ra ngoài), ở 1440px và 390px:
  - trang khách hàng, chuông, toast, Phân quyền, Nhật ký khoảng ngày;
  - không có lỗi JavaScript;
  - thanh tải hiện khi API chậm.

### 3.5. Khi deploy
- **Migration** (Flyway tự chạy khi service khởi động; cột mới đều cho phép trống):
  - finora-user `V8__user_lock_reason_and_search.sql`;
  - finora-investment `V20__track_trade_settlement_requeue.sql`.
- **Build lại:**
  - finora-user, finora-loan, finora-investment, finora-gateway;
  - finora-ai;
  - finora-web.
  - finora-notification và finora-payment không đổi.
- **Biến môi trường:** không có biến mới.
- **Keycloak:** không đổi cấu hình. Đăng xuất phiên dùng tài khoản quản trị Keycloak mà finora-user đang dùng để gán vai trò.
- **Thứ tự nên deploy:**
  1. Backend trước, web sau. Web mới gửi `reason` khi khóa: backend cũ bỏ qua trường này nên vẫn khóa được. Nhưng backend mới gặp web cũ thì khóa sẽ báo 400 vì thiếu lý do.
  2. finora-ai trước Loan, để Loan có `review_reasons` mà lưu.
- **App mobile:** có thể đọc lý do từ chối qua `GET /api/v1/users/me/ekyc-status`. App chưa dùng API này.

### 3.6. Ca kiểm thử giao diện cần sửa khi chạy lại
Không sửa file kịch bản. Các ca bị ảnh hưởng (cả bản `ui` và `ui_deploy`):
- `A1b/F72_F73_khoa_mo_khoa.mjs`:
  - hộp khóa không còn câu "Bạn có chắc muốn…";
  - phải nhập lý do vào ô `.user-lock-reason`;
  - câu cảnh báo đã đổi.
  - Hộp mở khóa cũng bỏ câu hỏi.
- `A1b/common.mjs`, `F78_tao_vai_tro.mjs`: lỗi từ máy chủ không còn ở `.user-modal-error .ui-alert`, giờ là toast `.ui-toast`.
- `A1b/F80_xoa_vai_tro.mjs`: phần lỗi như trên (câu hỏi xác nhận không đổi).
- `A3/F50`, `F51`, `F52` (`_a3.mjs`): câu báo kết quả không còn ở `.lr-notice`, đọc từ `.ui-toast`.
- `A1a/_common.mjs` và `F57_F59_vong_doi_goi_vay.mjs`: lỗi thao tác trong hộp/ngăn (`.ui-alert`, `.prod-dr-alert`) giờ là toast `.ui-toast` có câu báo và "Mã tra cứu".
- `A4/F34_F36_web_co_cau.mjs`: thành công vẫn đọc `.ui-toast`. Toast giờ nằm trên cùng và có nút đóng, nên `innerText` có thêm dòng "Mã tra cứu" khi lỗi.
- F53, F54: như mục 4. Thêm: gặp 409 thì có khối "Chính sách vừa được người khác lưu".

## 4. Chưa làm, và lý do
- **Duyệt với số tiền thấp hơn số đề nghị: chưa làm.** Lý do:
  - Số tiền gắn với lịch trả cuối do Fineract tính lúc chấm điểm. Snapshot lịch này không sửa được theo thiết kế (21 cột chỉ ghi một lần, mỗi hồ sơ chỉ có một lịch cuối).
  - Số tiền cũng gắn với bằng chứng điều khoản người vay đồng ý (hash), số tiền gọi vốn bên Investment và hợp đồng PDF.
  - Làm đúng thì phải: tính lại lịch qua Fineract, thay snapshot, buộc người vay xác nhận lại, rồi kiểm cả luồng gọi vốn → hợp đồng → giải ngân. Phần này không kiểm được nếu không chạy cụm thật.
  - Thay vào đó, form duyệt ghi cách làm hiện có: từ chối với lý do "Khả năng trả nợ chưa đạt", ghi số đề xuất để người vay nộp hồ sơ mới.
- **Số dư ví ở trang khách hàng: chưa có.** finora-payment chưa có API quản trị tra ví theo khách. Thêm API đó là việc của Payment, chưa làm trong đợt này.
- **Thông báo do sự kiện gửi riêng cho nhân viên** (ví dụ "có hồ sơ mới chờ thẩm định" đẩy tới từng người): chưa có. finora-notification hiện chỉ gửi tin cho người vay và nhà đầu tư. Chuông lấy "việc mới" từ số đếm, và ghi nhớ "đã xem" trên từng trình duyệt.
- **Ẩn lượt gọi tự động ở log cũ:** log ghi trước khi Gateway có cờ `background` vẫn hiện như lượt thường.
- **Khóa tài khoản:** mã truy cập đã cấp vẫn dùng được tới khi hết hạn (tối đa 15 phút). Muốn chặn ngay thì từng service phải kiểm trạng thái tài khoản mỗi request, hoặc phải rút thời hạn token trên realm. Cả hai đều ngoài phạm vi đợt này.

**Giữ nguyên có chủ ý**
- Tên menu khác tiêu đề trang ("Quản lý khoản vay" và "Quản lý hồ sơ vay"); không gộp nhóm menu. Đổi những tên này sẽ lệch với báo cáo khóa luận và ảnh chụp đã dùng.
- Mã sản phẩm tự sinh vẫn viết thường (`vay_kinh_doanh`), theo quyết định đã ghi trong PLAN.md ngày 25/10.
- Ngăn chi tiết Sản phẩm vay chưa chuyển sang ngăn trượt dùng chung: bản chung còn thiếu chân ngăn và cơ chế chặn đóng khi đang gửi.

**Dữ liệu cần dọn:** có 6 khách mang trạng thái "Chờ duyệt tay" nhưng không có lượt xác minh nào đang chờ. Vì vậy tab hàng chờ hiện 0 và Tổng quan hiện 6.

**Kịch bản kiểm thử giao diện cần sửa khi chạy lại (từ đợt 1; ca của đợt 2 ở mục 3.6)**
- `scripts-test-cases/ui/run/A1a/F54_chinh_sach_danh_gia.mjs` (và bản trong `ui_deploy`):
  - nút "Chỉnh sửa" đổi tên thành "Sửa trọng số và hạng";
  - sau "Lưu thay đổi" phải bấm thêm "Lưu và áp dụng";
  - trọng số nhập theo % (80 thay cho 0.8).
- F53 bộ luật: ca lưu hợp lệ cũng phải bấm thêm bước xác nhận; đổi mã của luật đã lưu giờ không còn cho phép.
- Các ca đã ghi kết quả ngày 01–02/11 vẫn giữ nguyên, mình không sửa file kịch bản để không lệch với bằng chứng đã nộp.

**Nhỏ, để sau**
- `useServicingCounts` nên trả thêm cờ lỗi và hàm làm mới.
- Gộp 3 nút chép mã và 2 bản `tabKeys.ts` thành một bản dùng chung.
- Hook duyệt hồ sơ còn state `retryError` không dùng tới, dọn khi sửa file sau.

---

## 5. Tệp liên quan
- Plan Tailwind: `plans/WEB-UI-002-tailwind.md`. Danh sách task: `PLAN.md` (dòng WEB-UI-002, WEB-UX-001).
- Quy tắc viết style: `.agents/skills/finora-frontend-engineering/references/engineering-rules.md` §8.
- Hạ tầng mới: `src/lib/navigation.ts`, `src/components/PageErrorBoundary.tsx`. Đợt 2: `src/lib/toast`, `src/components/Toaster.tsx`, `src/components/ErrorToast.tsx`, `src/components/GlobalProgressBar.tsx`, `src/lib/progress`, `src/lib/api/background.ts`, `src/components/SearchBox.tsx`, `src/features/staff-inbox`.
- Bản sao lưu code trước khi chuyển Tailwind, kèm bộ chụp so sánh dùng trong hai đợt: thư mục scratchpad phiên làm việc, `C:\Users\PC\AppData\Local\Temp\claude\c--Users-PC-Desktop-Data-----n\190bedcd-5036-492d-b292-f3a34c09c3e2\scratchpad\` (`backup-truoc-tailwind`, `tw\harness`).
- Thư mục rác `C:\c\Users\PC\AppData\…\dist-before` do một lần build sai đường dẫn: chỉ chứa bản build, xóa thư mục `C:\c` được.
