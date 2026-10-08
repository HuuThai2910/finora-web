---
task_id: WEB-UI-001
title: Áp giao diện mềm (finora-web-mockup) cho trang quản trị, dữ liệu thật
owner: Thai
status: IN_PROGRESS
approved_at: chưa. Hải yêu cầu triển khai ngay ngày 2026-10-08; Thái cần xem lại plan và chuyển trạng thái.
---

# WEB-UI-001: Giao diện mềm cho trang quản trị

## Nguồn tham chiếu

- Giao diện: `../finora-web-mockup/` (bản 2026-10-07). Gồm `soft.css` (token, thành phần), `soft-pages.css`, `soft-pager.js`, `soft.js` (menu "⋯"), quy tắc trong `DESIGN.md` của mockup.
- Thay cho `../finora-platform/docs/ui/bản-đẹp.html` về **trình bày** (màu, bo góc, bảng, phân trang, menu dòng). Hash bản-đẹp hiện tại (`4F8AC308…743F`) đã khác bản ghi trong `engineering-rules.md`, nên mục §1 cần Thái cập nhật sang nguồn mới.
- Mockup chỉ là nguồn trình bày. Số liệu, trạng thái, endpoint lấy theo backend hiện hành. Phần mockup dùng dữ liệu không có API thì **ẩn**, không giả lập.

## Quyết định đã chốt với Hải (2026-10-08)

1. Chỉ dùng số liệu thật có sẵn. Biểu đồ chuỗi ngày (Tổng quan, Sản phẩm, eKYC, giá trị hồ sơ 30 ngày) ẩn cho tới khi backend có API thống kê. Trang Auto-Invest quản trị chưa làm (backend không có API quản trị).
2. Làm theo đợt: đợt 1 là nền dùng chung + Quản lý khoản vay + Người dùng. Hải duyệt giao diện rồi mới làm các trang còn lại.

## Đợt 1

### Nền dùng chung

| Hạng mục | File | Ghi chú |
|---|---|---|
| Token màu, bo góc, bóng | `src/styles/index.css` | Giữ tên biến cũ để trang chưa chuyển không vỡ |
| Lớp thành phần `ui-*` | `src/styles/ui.css` | thẻ, nút, tab viên thuốc, bảng, nhãn trạng thái, phân trang, menu dòng, hộp thoại |
| Component dùng chung | `src/components/` | `Pager`, `RowMenu`, `Modal`, `PillTabs`, `StatusPill`, `Icon` |
| Khung trang | `src/layouts/*` | sidebar navy 236px, breadcrumb thay tiêu đề lặp, bỏ chip "Fabric #48210" và nút chế độ tối không hoạt động, ngăn trượt khi màn ≤ 760px; menu chỉ liệt kê mục đã chạy |
| Lỗi API | `src/lib/api/errors.ts` | `toUiApiError` hiểu thêm lỗi của `apiFetch` (finora-user) |
| Server state finora-user | `src/lib/api/userServiceApi.ts` | RTK Query, `queryFn` gọi `userApi` để giữ cơ chế refresh token của `apiFetch` |

### Quản lý khoản vay (`/loans`)

- API: `GET /api/v1/admin/loan-applications?status&page&size` (sắp xếp mới nhất trước ở backend).
- Thẻ "Đang chờ thẩm định": tổng tiền đề nghị, tổng hạn mức AI gợi ý, điểm bình quân, số hồ sơ chưa chấm được, hồ sơ chờ lâu nhất. Tính từ tối đa 100 hồ sơ `PENDING_REVIEW` mới nhất; vượt 100 thì ghi rõ phạm vi. Hồ sơ chờ lâu nhất lấy bằng `size=1&page=total-1` nên luôn đúng.
- Số đếm trên tab: mỗi trạng thái một lời gọi `size=1` (backend chưa có API đếm). Đợt 3 thay bằng `applications` của `/admin/loan-statistics/summary`.
- Màu điểm theo `assessment.aiRecommendation` của backend, không tự đặt ngưỡng.
- Bỏ ô tìm kiếm và sắp xếp của mockup: backend không hỗ trợ, lọc trong một trang sẽ gây hiểu nhầm.
- 10 hồ sơ mỗi trang, trạng thái lọc giữ trên URL (`?status=`).

### Người dùng & phân quyền (`/users`)

- API: `GET /api/v1/admin/users?role&ekycStatus&page&size`, `GET /stats`, `POST /{id}/lock|unlock|roles`.
- Tab vai trò có số đếm từ `/stats`; lọc eKYC gửi xuống backend; vai trò và eKYC giữ trên URL.
- Thao tác dòng gom vào menu "⋯": Xem chi tiết, Đổi vai trò, Khóa/Mở khóa. Dòng của chính quản trị viên đang đăng nhập khóa hai thao tác sau.
- Hộp thoại đổi vai trò, khóa: chống bấm lặp, lỗi hiện trong hộp thoại (bỏ `alert`), thành công thì làm mới danh sách và số đếm.
- Bỏ ô tìm kiếm: backend không có tham số tìm.

## Đợt 2 (2026-10-08, đã làm): các trang còn lại

Hải yêu cầu "implement các trang còn lại". Mọi trang trong menu đã chuyển sang giao diện mới, chỉ dùng API thật.

| Trang | Route | Ghi chú dữ liệu |
|---|---|---|
| Tổng quan | `/dashboard` (trang mặc định) | Số liệu hiện tại + việc cần xử lý từ `totalElements` (`size=1`), `/admin/users/stats`, `/order-books/summary`; biểu đồ phân bổ theo trạng thái; 5 hồ sơ vay và 5 tài khoản mới nhất. Không có số liệu theo kỳ 7/30/90 ngày (chưa có API) |
| Gọi vốn & Notes | `/investments/funding`, `/investments/funding/:listingId` (mới) | Danh sách tab theo trạng thái; trang chi tiết thay hộp thoại cũ; biểu đồ vốn góp theo thời gian từ `createdAt` của phần vốn |
| Chợ thứ cấp Notes | `/investments/secondary` | Sổ lệnh mở ngăn bên phải, biểu đồ độ sâu từ ảnh chụp sổ thật; giữ SSE |
| Vận hành khoản vay | `/loans/operations`, `/loans/overdue`, `/reconciliation` | Tab theo route và `?tab=`; sửa lỗi bị nuốt và idempotency key theo ý định |
| Sản phẩm vay | `/products` | Ngăn chi tiết, thao tác qua menu "⋯" theo đúng quy tắc trạng thái của domain |
| Khách hàng eKYC | `/customers/kyc`, `/customers/kyc/:id` | Lọc ở server (trước đây tải 100 dòng rồi lọc ở client); bỏ số hợp đồng bịa và tab không có API |
| Chi tiết hồ sơ vay | `/loans/:applicationNumber/review` | Giữ duyệt/từ chối có idempotency + version, chấm lại, giải thích AI tải lười |
| Chính sách đánh giá AI, Chấm điểm | `/loans/evaluation`, `/loans/scoring` | Trang chính sách nằm ở feature `rule-engine` |
| Đăng nhập | `/login` | Đăng nhập xong vào Tổng quan |

Hạ tầng thêm: `echarts` (nạp theo module, theme ở `src/lib/charts`), `src/components/EChart`, trang tải theo nhu cầu (`React.lazy`), sửa sidebar tô sáng hai mục cùng lúc, xóa mã chết (`lib/loanApi.ts`, các `features/*/api.ts`, trang stub, `aiConfigApi`).

### Đã ẩn vì backend chưa có API (không giả lập)

Cập nhật sau đợt 3: dư nợ quá hạn theo nhóm nợ **6 tháng** (chỉ có số hiện tại); ô tìm kiếm (không API nào có tham số tìm); hàng chờ duyệt eKYC tay; Auto-Invest quản trị; tab hồ sơ vay/lệnh đầu tư/nhật ký của khách hàng; hạn mức đề xuất ở trang chấm điểm; thang ngưỡng 65/75 ở phiếu điểm (và ở biểu đồ phân bố điểm). Chi tiết phần còn ẩn ở mục đợt 3.

### Việc còn lại / cần Thái xem

- Plan này cần Thái duyệt; §1 của `engineering-rules.md` nên trỏ nguồn giao diện sang `finora-web-mockup`.
- Ba bản ngăn trượt giống nhau (secondary-market `SideDrawer`, servicing `SideDrawer`, product `ProductDrawer`) nên gộp thành `src/components/Drawer`.
- `.env` gọi thẳng AI Service (`localhost:8000`) thay vì qua Gateway; vì CORS ở đó không bật `allow_credentials` nên `aiApi` chưa gửi cookie.
- `toUiApiError` chưa đọc `detail` kiểu FastAPI; feature rule-engine đang có `toAiUiError` riêng.
- Backend: API duyệt khoản vay lên sàn (`/admin/listings/{id}/approve` chưa có, nút trên web sẽ báo 404); `fundingOpenedAt` trong DTO listing; `borrowerId` cho `/admin/loan-applications` và `LoanRescheduleResponse`; dữ liệu AI còn chữ "—" và "Rule Engine" trong mô tả luật, cảnh báo SHAP.
- Quy tắc phía trình duyệt lấy từ mockup, cần xác nhận: ngày hẹn trả không trước hôm nay, ghi chú thu hồi bắt buộc có nội dung.
- Chưa có bộ test (repo chưa cài); các hàm mapper/validation mới nên có test khi thêm.

## Đợt 3 (2026-10-08): API thống kê

Nối 5 endpoint của STATS-001 (`finora-platform/.agents/plans/STATS-001-admin-statistics-api.md`, field theo hợp đồng ở đó):
`/admin/loan-statistics/summary`, `/admin/loan-statistics/series`, `/admin/users/stats/series`,
`/investments/admin/statistics/summary`, `/investments/admin/statistics/series` (tham số `from`, `to` YYYY-MM-DD theo giờ Việt Nam, `bucket` DAY/WEEK/MONTH).

### Hạ tầng

| Hạng mục | File | Ghi chú |
|---|---|---|
| Feature thống kê | `src/features/statistics/` | type theo hợp đồng, slice RTK Query (inject vào `loanApi`, `investmentApi`, `userServiceApi`), hàm khoảng ngày theo giờ Việt Nam, nhãn cột, tách kỳ so sánh, option biểu đồ dùng ở nhiều trang (nhóm nợ, giá trị khớp, giá bình quân), cảnh báo `staleProjections` |
| Thẻ biểu đồ dùng chung | `src/components/ChartCard.tsx`, lớp `ui-chart-*`, `ui-seg` trong `src/styles/ui.css` | bốn trạng thái: tải, lỗi kèm mã (`ErrorNotice`), rỗng ("Chưa có dữ liệu trong khoảng này."), có dữ liệu; bảng "Xem số liệu" |
| Tag cache | `loanApi` thêm `LoanStatistics`, `investmentApi` thêm `InvestmentStatistics` | summary/series còn cung cấp tag của danh sách nguồn (hồ sơ vay, từng hàng đợi vận hành, khoản gọi vốn, sổ lệnh) nên duyệt, ghi nhận thu hồi hay "Làm mới" ở trang đó tự tải lại số |
| Màu phân loại | `CHART_PALETTE.categorical` | ba màu đường theo sản phẩm, lấy từ products.html |

### Đang hiển thị

| Trang | Biểu đồ / số liệu | Nguồn |
|---|---|---|
| Tổng quan | Bộ chọn kỳ 7/30/90 ngày; bốn ô: dư nợ hiện tại, vốn gọi được, tỷ lệ nợ xấu, phí chợ Notes | dư nợ, nợ xấu: `portfolio` của loan summary (chỉ số hiện tại, không có chênh lệch); vốn gọi được, phí: tổng `committedAmount`, `platformFee` của investment series ngày dài gấp đôi kỳ, so với kỳ trước khi kỳ trước đủ cột và khác 0 (không thì bỏ chênh lệch) |
| Tổng quan | Xu hướng của ô đang chọn | vốn gọi được, phí: đường theo ngày; dư nợ, nợ xấu: số chi tiết và ghi rõ chưa có lịch sử |
| Tổng quan | Tab biểu đồ: Vốn và giải ngân, Hồ sơ qua từng bước, Hạng tín dụng, Nợ quá hạn, Chợ Notes, Auto-Invest | `committedAmount` + `disbursedAmount` (cột ngày, tuần với kỳ 90); `funnel`; `byCreditGrade`; `byDebtGroup` (số hiện tại, ghi rõ không phải 6 tháng); `tradedAmount`; `autoInvestPlaced/Skipped` + `autoInvest.activeConfigs` |
| Tổng quan | Tài khoản mới theo kỳ (câu tóm tắt có so với kỳ trước, cột chồng người vay, nhà đầu tư) | user series + tổng từ `/admin/users/stats` |
| Tổng quan | Việc cần xử lý | `applications.byStatus`, `listings.byStatus`, `collections.openCases`, `reschedules.byStatus`, `reconciliationIncidents.byStatus`; lỗi thanh toán từ `/order-books/summary`; sự kiện trả nợ chờ ghép vẫn `size=1` (summary chưa có) |
| Quản lý hồ sơ vay | Số trên tab | `applications.total`, `applications.byStatus` |
| Sản phẩm vay | Hồ sơ nộp theo tháng (6 tháng, 3 sản phẩm nhiều hồ sơ nhất + nhóm còn lại), Nợ xấu theo sản phẩm (bấm thanh mở ngăn) | loan series MONTH `productPoints`; `portfolio.byProduct`, vạch đứt là `nplRatioPercent` toàn danh mục |
| Sản phẩm vay, ngăn chi tiết | Khoản vay đang có, Giải ngân 6 tháng | `byProduct` của sản phẩm; `productPoints.disbursedAmount` |
| Khách hàng eKYC | Đăng ký và xác minh theo tuần (12 tuần), Kết quả eKYC | user series WEEK; `/admin/users/stats` (`byEkycStatus`, như cũ) |
| Vận hành khoản vay | Dư nợ quá hạn theo nhóm nợ (số hiện tại), Hồ sơ thu hồi đang mở; số trên tab thu hồi, cơ cấu, sai lệch | `byDebtGroup`; `collections.openByStage`; khoản cần đối soát và sự kiện chờ ghép vẫn `size=1` |
| Chợ thứ cấp Notes | Giá trị khớp theo ngày (30 ngày), Giá khớp bình quân (ngày không khớp để trống) | investment series DAY `tradedAmount`, `trades`, `platformFee`, `averagePricePermille` |
| Chấm điểm | Phân bố điểm tín dụng (tô đậm cột chứa điểm hồ sơ vừa chấm thử) | `creditScores.histogram` |
| Gọi vốn & Notes | Vốn góp 30 ngày | investment series DAY `committedAmount`, `commitments` |

Mỗi biểu đồ có tải, lỗi (mã lỗi, ví dụ `STATISTICS_RANGE_INVALID`), rỗng; biểu đồ dùng dư nợ hiện cảnh báo khi `staleProjections > 0`.
Mã chết đã xóa: `KpiPanel`, `breakdownOption`, các lời gọi đếm `size=1` của Tổng quan (hồ sơ theo trạng thái, khoản gọi vốn theo trạng thái, thu hồi, cơ cấu, sai lệch), của tab Quản lý hồ sơ vay và của thẻ thu hồi theo mức độ.

### Còn ẩn hoặc khác mockup

- Dư nợ quá hạn theo nhóm nợ 6 tháng (Tổng quan, Vận hành): backend không lưu lịch sử projection, chỉ vẽ số hiện tại.
- Xu hướng dư nợ và tỷ lệ nợ xấu theo ngày, chênh lệch so với kỳ trước của hai ô này: cùng lý do.
- Bảng "Số liệu từng ngày" của Tổng quan (làm 2026-10-08, theo bố cục mockup): có vốn gọi được, giải ngân, hồ sơ nộp, hồ sơ duyệt, phí chợ Notes theo ngày (theo tuần với kỳ 90); bỏ cột dư nợ cuối ngày và tỷ lệ nợ xấu vì không có lịch sử, ghi chú dưới bảng. Đường xu hướng và tab "Vốn và giải ngân" vẽ bình quân 7 ngày như mockup. Bỏ thẻ "Hồ sơ vay mới nhất" (mockup không có); chuông thông báo ở header chưa làm vì chưa có API thông báo.
- Giá thấp nhất/cao nhất trong ngày ở tooltip giá khớp (mockup chợ Notes): series không có. (Bình quân trượt 7 ngày bỏ nợ xấu đã làm ở đợt 4.)
- Kết quả eKYC chia theo cách xác minh (tự động, duyệt tay) trong 30 ngày: backend chỉ có trạng thái hiện tại; giữ phân bổ hiện tại.
- Ngưỡng duyệt 65/75 và vạch "hồ sơ đang xem" đúng điểm lẻ trên biểu đồ phân bố điểm (cột 10 điểm, web chưa đọc ngưỡng từ backend).
- Điểm bình quân theo hạng, tỷ lệ duyệt theo sản phẩm (tooltip mockup): summary không có.
- Ô tìm kiếm; hàng chờ duyệt eKYC tay; trang Auto-Invest quản trị (tab Auto-Invest ở Tổng quan không có link); tab hồ sơ vay/lệnh đầu tư/nhật ký của khách hàng; hạn mức đề xuất ở trang chấm điểm.
- Dải số liệu Gọi vốn & Notes vẫn đếm `size=1` và cộng tiền trên mẫu 100 khoản (cần số đã đủ vốn và số khoản quá hạn chờ đóng mà summary chưa có); có thể chuyển phần đếm sang `listings.byStatus` sau.
- Chưa kiểm tra với dữ liệu thật: gateway lúc làm chưa phục vụ endpoint mới; mới kiểm tra kiểu (`npm run build`).

## Đợt 4 (2026-10-08): bám mockup hơn ở các trang

| Trang | Thay đổi | Nguồn số liệu |
|---|---|---|
| Quản lý hồ sơ vay | Hàng đầu hai thẻ như mockup: "Giá trị hồ sơ nộp 30 ngày" (tổng, chênh lệch so với 30 ngày trước, số hồ sơ và bình quân, cột ngày có bong bóng đỉnh) và thẻ gọn "Đang chờ thẩm định" dạng dòng; viên thuốc là kỳ ngày (không có nguồn cho "lãi cơ sở"). Dòng bảng: icon và nhãn mục đích vay dưới mã hồ sơ, giờ nộp dưới trạng thái, dấu đã xác minh eKYC cạnh tên, điểm định dạng tiếng Việt | loan series DAY 60 ngày `applicationsSubmittedAmount`; mục đích từ API chi tiết `/review` từng dòng (DTO danh sách không có `purposeCode`); eKYC từ `/admin/users/{id}` |
| Chợ thứ cấp Notes | Giá khớp bình quân trượt 7 ngày, không tính nợ xấu, gia quyền theo số Note; câu dẫn 7 ngày gần nhất, các tuần trước, bình quân 30 ngày; đường mảnh, trục y ôm sát giá | investment series DAY 36 ngày `performingQuantity`, `performingAveragePricePermille` |
| Sản phẩm vay | Biểu đồ hồ sơ theo tháng chỉ vẽ tháng đã trọn (bỏ tháng đang chạy như mockup), đường cong nhẹ không vồng quá điểm thật, câu dẫn "tăng nhanh nhất, giảm n tháng liền" | loan series MONTH `productPoints` |
| Gọi vốn & Notes, eKYC, Vận hành | Nhãn trạng thái không chấm như mockup, mã khoản vay chữ đơn cách; biểu đồ kết quả eKYC cao bằng thẻ bên cạnh; thẻ thu hồi thay bảng mức độ bằng các dòng tiền quá hạn, khoản quá hạn, dư nợ gốc nợ xấu | summary thống kê Loan |

Backend nên thêm `purposeCode` vào `AdminLoanReviewSummaryResponse` để bảng hồ sơ không phải gọi API chi tiết cho từng dòng.

## Backend còn thiếu (ghi nhận, không làm trong task này)

- Lịch sử dư nợ và nhóm nợ theo ngày (cho xu hướng dư nợ, nợ xấu và biểu đồ 6 tháng).
- Đếm sự kiện trả nợ chờ ghép và khoản cần đối soát trong summary.
- Tìm kiếm người dùng, hồ sơ vay ở backend.
- API quản trị Auto-Invest; hàng đợi duyệt eKYC tay; thông báo cho quản trị viên.

## Acceptance đợt 1

- Loading, empty, error (có mã lỗi để chẩn đoán) và success ở cả hai trang.
- Danh sách phân trang 10 dòng, chân bảng "Hiển thị a đến b trong N …".
- Menu "⋯" dùng được bằng bàn phím, đóng khi bấm ra ngoài hoặc Esc.
- Không còn dấu "—" trong chữ hiển thị ở hai trang.
- `npm run build` xanh.
