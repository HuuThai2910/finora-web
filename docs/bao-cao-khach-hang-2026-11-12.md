# Trang Khách hàng theo mock 12/11

Implement mock `finora-web-mockup/khach-hang-de-xuat.html` (bản Hải duyệt 12/11) vào web quản trị. Chưa commit, chưa deploy.

## Backend

Không cần API hay migration mới. Các API sẵn có đủ dữ liệu cho mock:

- `GET /api/v1/admin/users`: lọc vai trò, xác minh, khóa, tuổi, giới tính, ngày đăng ký, lần đăng nhập cuối, tìm tên/email/SĐT/CCCD.
- `GET /api/v1/admin/users/{id}`: trả `lockReason`, `lockedAt`.
- `POST /api/v1/admin/users/{id}/lock` (có lý do) và `POST /api/v1/admin/users/{id}/unlock`.
- `GET /api/v1/admin/users/{id}/devices`.
- `GET /api/v1/admin/users/ekyc-attempts?userProfileId=` (mới nhất trước).
- `GET /api/v1/admin/users/ekyc-attempts/{id}`: trả `reviewerName`, `faceMatchScore`/`faceMatchZone`, `evidence`, `draft` có `sources` từng trường.
- `GET /api/v1/admin/loan-applications?borrowerId=`: trả `purposeCode`, `loanNumber`, `servicingFlags`.
- `GET /api/v1/investments/admin/investors/{id}/notes`: trả `issuedAt`, `outstandingPrincipal`, `interestReceived`.

## Web đã làm

**Danh sách** (`src/features/kyc/pages/CustomerKycPage.tsx`, `components/CustomerTable.tsx`)
- Bỏ hai thẻ biểu đồ đầu trang và bảng hàng chờ theo lượt. Tiêu đề kèm dòng phụ "Người vay và nhà đầu tư đăng ký trên ứng dụng di động."
- "Làm mới" nằm cạnh "Bộ lọc".
- Bộ lọc giữ nguyên (vai trò, xác minh, trạng thái tài khoản, ngày đăng ký, tuổi, giới tính, đăng nhập cuối).
- Cột: Khách hàng | Vai trò | Số CCCD | Số điện thoại | Xác minh | Ngày đăng ký | ⋯.
  - Số CCCD và số điện thoại che, chỉ hiện 4 số cuối (thêm `maskPhone`).
  - Cột Xác minh có chữ đỏ "Tài khoản đã khóa" khi tài khoản bị khóa.
- Bấm dòng mở hộp chi tiết.
- Menu "⋯":
  - Xem chi tiết.
  - Duyệt xác minh (khách chờ duyệt tay) hoặc Xem xác minh (đã xác minh hoặc bị từ chối; khi bấm mới tra lượt gần nhất đã gửi).
  - Vạch ngăn, rồi Khóa tài khoản (đỏ) hoặc Mở khóa tài khoản.
  - Menu dùng `RowMenu` có sẵn (portal, không bị khung bảng cắt).

**Hộp chi tiết khách** (`components/CustomerDetailModal.tsx`, `components/CustomerTabTables.tsx`)
- Mở tại `/customers/kyc/:id`, ngay trên danh sách và giữ query của danh sách. Đường dẫn cũ tới hồ sơ khách từ Gọi vốn, Chợ chuyển nhượng, thẩm định, Tổng quan vẫn mở đúng khách.
- Đóng bằng X, bấm nền hoặc Esc; đóng xong về đúng danh sách.
- Rộng 880px.
- Đầu hộp: họ tên (chưa có thì email), nhãn xác minh, nhãn "Đã khóa".
- Hai nhóm thông tin chia đôi:
  - Tài khoản: SĐT, Email khi có họ tên, Vai trò, Ngày đăng ký, Khóa lúc và Lý do khóa.
  - Căn cước, chỉ khi đã xác minh: Số CCCD, Ngày sinh kèm tuổi, Giới tính, Quê quán, Nơi thường trú cùng dòng nhãn.
  - Khách chưa xác minh chỉ có nhóm Tài khoản, các dòng chia hai cột.
- Tab:
  - Hồ sơ vay với người vay: Mã hồ sơ | Mục đích | Số tiền | Ngày nộp | Trạng thái. Hồ sơ đã có mã khoản vay ghi "Đã giải ngân", kèm nhãn quá hạn, cơ cấu, sự cố.
  - Phần vốn với nhà đầu tư: Mã | Ngày nhận | Gốc góp | Gốc còn lại | Lãi đã nhận | Trạng thái, kèm dòng Tổng.
  - Thiết bị đăng nhập: Thiết bị | Hệ điều hành | Lần đầu | Gần nhất | IP.
  - Số trên tab ẩn khi bằng 0.
- Chân hộp:
  - Bên trái: Khóa tài khoản hoặc Mở khóa (cần quyền Sửa "Khách hàng").
  - Bên phải: nút chính Duyệt xác minh (lượt đang chờ) hoặc Xem xác minh (lượt gần nhất đã gửi).
- Hộp khóa (`LockUserModal` có sẵn) mở chồng lên. Esc chỉ đóng hộp trên cùng: thêm ngăn xếp hộp trong `components/Modal.tsx`.
- `Modal` có thêm `large` (880px, thân cuộn riêng) và `titleAside` (nhãn cạnh tiêu đề). Khung hộp không còn viền focus.

**Màn duyệt xác minh** (`src/features/ekyc-review`)
- Tiêu đề là họ tên (chưa có thì email) kèm nhãn trạng thái lượt.
- Bên phải đầu trang: bộ chuyển lượt chờ n/N (giữ nguyên) và nút "Hồ sơ khách hàng". Nút này mở cùng hộp chi tiết, không rời trang.
- Breadcrumb đổi thành "Khách hàng / Xác minh danh tính". Bỏ dòng meta và nút Làm mới.
- Thẻ Giấy tờ (`components/EvidenceCards.tsx`):
  - Ảnh mặt trước, mặt sau xếp dọc bên trái; bên phải là Loại thẻ và các trường đọc được.
  - Chữ cam "AI đọc" khi trường chỉ có nguồn AI; "Người dùng sửa" khi người dùng tự sửa.
  - Lượt tự xác minh không có bản nháp thì lấy trường từ hồ sơ khách, không gắn nhãn.
  - Trường không thu thập thì không hiện; trường đọc trống ghi "Không đọc được".
- Thẻ Khuôn mặt: video và các khung hình theo thứ tự động tác. Chỉ ghi tên ngắn, bỏ kích thước tệp.
- Cột phải "Kiểm tra tự động" (`components/CheckSlip.tsx`):
  - Giấy tờ, Người thật, So khuôn mặt (số kèm vùng), Gửi lúc. Chỉ tô màu khi cần chú ý.
  - Rồi nút Duyệt/Từ chối, hoặc nhóm Quyết định (người, lúc, ghi chú hoặc lý do từ chối).
  - Không còn danh sách lý do, điều khoản, mã lượt.
- Hộp quyết định:
  - Duyệt: chỉ ô "Ghi chú nội bộ (không bắt buộc)".
  - Từ chối: "Lý do gửi cho khách", gợi ý dạng chip, ô nhập (bắt buộc).

**Dọn mã không còn dùng**
- Trang chi tiết khách cũ, `CustomerActions`, các thẻ hồ sơ.
- Hai thẻ biểu đồ và mapper biểu đồ, `useNarrowScreen`.
- `PendingAttemptTable`, `DraftFieldsCard`, `EvidenceGallery`, `LivenessCard`, `ReasonList`, `ReviewSummaryPanel`, `CopyIdButton`.
- Mapper lý do và quyết định không còn dùng.

**Thêm mới dùng chung**
- `BorrowerApplicationsTable` (loan).
- `WithdrawalIncidentsSection` có chế độ `bare` và hook `useWithdrawalIncidentCount` (servicing).
- Nút `.ui-btn.outline-danger`.

## Kiểm tra

- `npx tsc --noEmit -p .`: đạt (tsconfig bật `strict`, `noUnusedLocals`, `noUnusedParameters`).
- `npm run build` (`tsc && vite build`): đạt.
  - Còn cảnh báo chunk > 500 kB (chunk `investmentIncidentApi`). Chưa so với bản trước khi sửa.
- Lint: repo không cấu hình ESLint (không có script `lint`, không có file cấu hình), nên không chạy.
- Chạy thật bản build bằng `vite preview`, API giả chặn bằng Playwright (không gọi backend thật). Ảnh chụp ở `docs/anh-khach-hang-2026-11-12/`. Không có lỗi JS.
- Kiểm tra luồng:
  - Khóa từ menu dòng: dòng hiện "Tài khoản đã khóa".
  - Bấm dòng mở hộp tại `/customers/kyc/1057`.
  - Mở hộp khóa chồng lên (2 hộp). Esc lần 1 còn 1 hộp; Esc lần 2 về `/customers/kyc`.
  - "Xem xác minh" từ menu mở `/customers/kyc/review/a1057`.
- Chưa thử với backend thật.

## Lệch so với mock

- Nhãn trạng thái khách FAILED giữ chữ "Thất bại" như trang Phân quyền; mock ghi "Bị từ chối".
- Tab "Lệnh rút chờ đối soát" chỉ hiện khi khách đang có lệnh rút chờ kết quả và tài khoản được xem "Rút tiền". Mock không có tab này, nhưng nó giữ lại phần đối soát rút tiền trước đây nằm ở trang chi tiết khách.
- Lượt đã quyết định mà lượt chờ đã hết: đầu trang còn nút "Lượt chờ tiếp theo" như trước.
- Thiếu quyền Sửa "Duyệt xác minh danh tính" thì cột phải ghi một dòng nhắc thay cho hai nút.

## Khi deploy

Chỉ cần deploy web (`vercel --prod`), backend không đổi.
