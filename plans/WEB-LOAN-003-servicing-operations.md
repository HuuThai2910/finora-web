---
task_id: WEB-LOAN-003
title: Vận hành trả nợ, quá hạn, cơ cấu và đối soát
owner: Thai
status: READY_FOR_REVIEW
approved_at: 2026-10-04
updated_at: 2026-11-14
---

# WEB-LOAN-003 — Vận hành servicing

Web chỉ gọi Loan qua Gateway và không tự tính lịch, dư nợ, DPD hay kết quả cơ cấu.

## Bố cục hiện hành

- `/loans`: danh sách hồ sơ/khoản vay, có bộ lọc việc sau giải ngân.
- `/loans/:applicationNumber/review?tab=servicing`: xử lý và đối chiếu theo đúng một khoản vay.
- `/loans/reschedules`: hàng đợi cơ cấu toàn hệ thống dành cho nhân viên có quyền `ops:reschedule:view`.
- Đường dẫn cũ `/loans/operations` không còn là màn tổng hợp; không khôi phục UI cũ.

Hàng đợi cơ cấu chia theo giai đoạn nghiệp vụ: chờ thẩm định, chờ nhà đầu tư, đang áp dụng lịch mới,
cần xử lý và đã kết thúc. API phân trang phía backend nhận nhiều trạng thái trong cùng một tab; web không ghép
nhiều trang kết quả ở client. Ô tìm dùng mã khoản vay, hồ sơ hoặc hợp đồng. Mỗi dòng có mã hồ sơ, khoản vay,
người vay, nội dung đề nghị, ngày đáo hạn và trạng thái; có thể mở thẳng tab "Sau giải ngân" của hồ sơ.

## Quyền và thao tác

- Quyền xem: `ops:reschedule:view`.
- Quyền thao tác: `ops:reschedule:action`.
- `PENDING_REVIEW`: thẩm định đạt hoặc từ chối, gửi `Idempotency-Key`.
- `MANUAL_REVIEW`: chạy lại idempotent hoặc đóng yêu cầu và giữ lịch cũ.
- Thẩm định đạt chỉ chuyển sang chờ toàn bộ nhà đầu tư đồng ý; chưa gọi Fineract ở bước này.
- Card cơ cấu trong tab "Sau giải ngân" vẫn được giữ để nhân viên xem đầy đủ lịch sử của riêng khoản vay.

## Contract backend

`GET /api/v1/admin/loan-reschedule-requests` hỗ trợ:

- `status` (contract cũ), `statuses` (một hoặc nhiều trạng thái);
- `requestType`, `q`, `loanNumber`, `page`, `size`;
- response bổ sung `loanApplicationId`, `applicationNumber`, `borrowerId` để định danh và mở hồ sơ mà không suy đoán.

## Acceptance

- Loading, empty, error và success có nội dung rõ ràng.
- Danh sách phân trang; URL giữ tab, tìm kiếm, loại cơ cấu và trang hiện tại.
- Không làm mất card "Sau giải ngân" và không thay đổi luồng Fineract/event.
- Mutation làm mới cả hàng đợi và nhãn việc của hồ sơ vay.
- TypeScript/Vite build xanh; backend compile và test API cơ cấu mục tiêu xanh.
