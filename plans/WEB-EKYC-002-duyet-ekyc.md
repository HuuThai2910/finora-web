---
task_id: WEB-EKYC-002
title: Trang Duyệt eKYC cho quản trị viên (hàng chờ duyệt tay, bằng chứng, duyệt/từ chối)
owner: Hai
status: IN_PROGRESS
approved_at: 2026-10-16 (Hải giao triển khai cùng EKYC-002)
---

# WEB-EKYC-002: Duyệt eKYC

## Nguồn sự thật

- Hợp đồng: `../finora-platform/.agents/plans/EKYC-002-cccd-liveness-evidence.md` §1 (luồng), §3.3 (khuôn bản nháp),
  §3.6 (mã), §3.7 (API quản trị), §4 (bảng `ekyc_attempts`, `ekyc_evidence`), §8 (phạm vi web). Plan này không chép lại
  entity/migration; khi hợp đồng đổi thì sửa plan trước rồi mới sửa UI.
- Thay mục "hàng chờ duyệt eKYC tay" còn ẩn/thiếu trong `WEB-UI-001`.

## Người dùng và luồng

Quản trị viên (route nằm dưới `ProtectedRoute requiredRole="ADMIN"`; quyền thật do backend kiểm: đọc `user:admin:read_all`,
duyệt/từ chối `user:admin:lock`).

1. Sidebar › Người dùng › **Duyệt eKYC** (`/customers/ekyc-review`), ngay dưới "Khách hàng eKYC". Mặc định mở tab
   **Chờ duyệt tay** (`MANUAL_REVIEW`); các tab khác: Đã duyệt, Đã từ chối, Xác minh tự động, Đang thực hiện, Bỏ dở.
2. Bảng: thời gian gửi (lượt chưa gửi hiện thời điểm bắt đầu, có ghi chú), email + mã khách hàng, loại thẻ, quyết định giấy
   tờ, kết quả liveness, điểm so mặt, tối đa 2 lý do đã dịch + "+N lý do khác". Bấm dòng hoặc nút "Xem" mở chi tiết.
3. Chi tiết (`/customers/ekyc-review/:attemptId`):
   - Trường đọc từ thẻ kèm nhãn nguồn: QR "Từ mã QR", MRZ "Từ dòng mã máy đọc", OCR "Từ chữ in trên thẻ", AI "AI đọc",
     USER "Người dùng sửa". Trường chỉ có nguồn AI/USER được tô nhấn kèm lời nhắc đối chiếu ảnh thẻ. Trường `null` là
     "Không thu thập", value rỗng là "Không đọc được". Không có bản nháp thì giải thích vì sao.
   - Lý do giấy tờ và lý do liveness dịch sang tiếng Việt; mã gốc hiện nhỏ, mờ ở cuối dòng; mã chưa có trong danh mục hiện
     nguyên văn.
   - Ảnh/video bằng chứng nhóm theo: Ảnh căn cước (trước, sau), Kiểm tra khuôn mặt (video rồi khung theo thứ tự động tác),
     Tệp khác (`result.json`). Ảnh bấm để phóng to trong hộp thoại.
   - Cột phải: kết quả tóm tắt (giấy tờ, loại thẻ, liveness, điểm so mặt + vùng, phiên bản điều khoản) và khay quyết định.
4. Duyệt/Từ chối mở hộp thoại ghi chú (từ chối bắt buộc, tối đa 1000 ký tự theo `review_note`; có 4 lý do gợi ý).
   Thành công: thông báo ngắn, trang tải lại trạng thái, nút khoá. Nút chỉ bật khi lượt đang `MANUAL_REVIEW`.

## API (qua Gateway, cookie phiên)

| Thao tác | Request | Ghi chú |
|---|---|---|
| Danh sách | `GET /api/v1/admin/users/ekyc-attempts?status=&page=&size=10` | `PageResponse{content,page,size,totalElements,totalPages,last}` |
| Chi tiết | `GET …/ekyc-attempts/{attemptId}` | `keepUnusedDataFor: 0`: bản nháp đã giải mã không ở lại cache khi rời trang |
| Tệp | `GET …/ekyc-attempts/{attemptId}/evidence/{evidenceId}` | `apiFetchBlob` (cookie, làm mới phiên khi 401, không token trên URL) → `URL.createObjectURL` |
| Duyệt | `POST …/{attemptId}/approve` body `{note}` | ghi chú rỗng gửi `""` |
| Từ chối | `POST …/{attemptId}/reject` body `{note}` | client chặn ghi chú rỗng trước khi gửi |

## State và cache

- Server state: RTK Query inject vào `userServiceApi` (cùng cách feature `user`, `statistics`), `queryFn` gọi `apiFetch`.
  Tag mới `EkycAttemptList`, `EkycAttempt`.
- Quyết định thành công, hoặc bị 409 `ATTEMPT_ALREADY_DECIDED`, invalidate: chi tiết lượt, danh sách lượt, `UserList`,
  `UserStats`, `User` của hồ sơ (trạng thái eKYC hồ sơ đổi theo quyết định). Lỗi khác không invalidate.
- Tệp bằng chứng: không qua RTK Query (Blob không serialize được). Hook `useEvidenceFile` giữ vòng đời: huỷ request khi rời
  trang/đổi tệp (`AbortController`), `URL.revokeObjectURL` khi ô tệp unmount. Ảnh/video tải ngay; tệp văn bản chỉ tải khi
  bấm (mỗi lần tải được backend ghi `ekyc_evidence_access_log`).
- Tab và trang trên URL (`?status=…&page=…`, tab mặc định không ghi lên URL). Hộp thoại, ghi chú, thông báo là state cục bộ.

## Trạng thái lỗi

| Tình huống | Hiển thị |
|---|---|
| Đang tải danh sách/chi tiết | `ui-empty` có `aria-busy` |
| Danh sách rỗng | câu riêng theo tab; trang trên URL vượt số trang thì "Trang này không còn lượt nào" + về trang đầu |
| Lỗi tải danh sách/chi tiết | `ErrorNotice` (thông điệp, mã lỗi, traceId) + Thử lại; 404 chi tiết: "Không tìm thấy lượt eKYC này." |
| Tệp `deleted=true` | không gọi API; ô "Đã xoá theo hạn lưu" (kèm dòng phụ: hoặc do người dùng rút lại đồng ý) |
| Tệp 410 `EVIDENCE_DELETED` | như trên |
| Tệp lỗi khác | ô lỗi kèm mã/traceId + "Thử lại" |
| Video trình duyệt không phát được | nút tải video về máy |
| 409 `ATTEMPT_ALREADY_DECIDED` | đóng hộp thoại, dải cảnh báo "vừa được quản trị viên khác xử lý", tự tải lại chi tiết |
| Lỗi quyết định khác (403, 400, trùng số…) | `ErrorNotice` trong hộp thoại, giữ ghi chú để gửi lại |

## File

- Hạ tầng: `src/lib/api/httpClient.ts` (thêm `apiFetchBlob`, gom cơ chế làm mới phiên dùng chung với `apiFetch`),
  `src/lib/api/userServiceApi.ts` (tag).
- Feature `src/features/ekyc-review/`: `types.ts`, `constants.ts`, `api/ekycReviewApi.ts`, `api/ekycReviewQueries.ts`,
  `hooks/useEvidenceFile.ts`, `mappers/{attemptDisplay,reasonDisplay,draftDisplay,evidenceDisplay}.ts`,
  `components/{AttemptTable,ReasonList,DraftFieldsCard,LivenessCard,EvidenceGallery,EvidenceTile,ReviewSummaryPanel,ReviewDecisionModal}.tsx`,
  `pages/EkycReviewListPage.tsx|.css`, `pages/EkycReviewDetailPage.tsx|.css`, `index.ts`.
- Khung: `src/App.tsx` (2 route lazy), `src/layouts/adminNavigation.ts` (mục menu, tiêu đề breadcrumb chi tiết),
  `src/layouts/SidebarIcon.tsx` (icon `faceScan`).

## Kiểm tra

- `npm run build` xanh (trước và sau thay đổi; cảnh báo chunk EChart > 500 kB có từ trước).
- 16/10/2026: smoke test ngoài repo (mock HTTP theo §3.7 ở scratchpad + Vite dev proxy + Chrome headless điều khiển qua CDP),
  63/63 kiểm tra đạt: lọc tab/URL, phân trang, nhãn nguồn, dịch lý do và mã lạ, điểm + vùng, thứ tự nhóm tệp, ảnh/video
  tải qua blob, `deleted` không gọi API, 410, 500 + Thử lại, JSON tải khi bấm, phóng to + Esc, chặn từ chối thiếu ghi chú,
  POST đúng body, toast, khoá nút sau quyết định, 409 đóng hộp thoại + tải lại, 404, object URL thu hồi hết khi rời trang,
  màn 390 px không tràn ngang; không có lỗi console ngoài các lỗi mạng cố ý của mock. Repo chưa có bộ test nên không thêm test.
- Backend thật đã có endpoint (EKYC-002); API đã chạy E2E cục bộ, giao diện trang chưa bấm thử với backend thật.

## Điểm hợp đồng đã chốt sau khi backend xong (16/10/2026)

- `livenessReasons` là mảng mã chuỗi (mapper vẫn nhận cả `{code, message}` cho an toàn); `evidenceId` là id số trong DB.
- Summary/detail có `faceMatchZone` (`HIGH|GRAY|LOW|null`) do finora-user suy từ lý do AI; web ưu tiên trường này, thiếu
  thì mới suy từ `livenessReasons`.
- Nhãn tiếng Việt đã bổ sung cho toàn bộ mã lý do mà `finora-ai/app/ml/ekyc/fusion.py` trả về (ví dụ `SINGLE_SOURCE`,
  `MRZ_MISSING`, `NOT_LINKED`, `QUALITY_LOW`, `GALLERY_SOURCE`, `CARD_CMND`); mã lạ vẫn hiện nguyên văn.
- JSON thật của `GET …/ekyc-attempts` và `GET …/ekyc-attempts/{id}` (chụp từ E2E cục bộ, xem plan EKYC-002 §10.7) đã được
  gán vào `EkycAttemptSummary`/`EkycAttemptDetail` và `tsc` xanh. Giao diện trang chưa bấm thử với backend thật.
- Người duyệt: backend trả thêm `reviewerEmail`/`reviewerName` (tra hồ sơ theo `reviewerKeycloakId`); web hiện họ tên · email, mã đầy đủ trong tooltip. Admin không có hồ sơ FINORA thì vẫn hiện mã rút gọn.

## Acceptance

- Loading, empty, error (có mã/traceId) và success ở cả hai trang; tệp có đủ trạng thái tải/xoá/lỗi.
- Danh sách 10 dòng mỗi trang, chân bảng "Hiển thị a đến b trong N lượt", tab trên URL.
- Không có token trong URL; object URL được thu hồi khi rời trang.
- Duyệt/Từ chối chỉ bật ở `MANUAL_REVIEW`, chống bấm lặp, từ chối bắt buộc ghi chú, 409 hiển thị và tải lại.
- `npm run build` xanh.
