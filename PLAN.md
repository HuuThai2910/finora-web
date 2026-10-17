# Kế hoạch triển khai finora-web

## Cách dùng

File này chỉ điều phối task, dependency và trạng thái. Nghiệp vụ/API/UI/test chi tiết nằm trong file plan tương ứng. Backend Design và LN đã duyệt vẫn là nguồn sự thật nghiệp vụ.

```text
DRAFT -> APPROVED -> IN_PROGRESS -> READY_FOR_REVIEW -> ACCEPTED
```

- AI được tạo `DRAFT`, chỉ bắt đầu code sau khi Thái chuyển `APPROVED`.
- Chỉ Thái chuyển task sang `APPROVED` hoặc `ACCEPTED`.
- Khi backend contract thay đổi, cập nhật plan trước khi sửa UI nếu thay đổi luồng hoặc acceptance criteria.

Trạng thái trong bảng là trạng thái **nghiệm thu task**, không phải kết luận code của luồng chưa tồn tại.
`READY_FOR_REVIEW` nghĩa là code/build đã có nhưng còn chờ owner/UAT; `IN_PROGRESS` phải đọc plan và code
để tách phần hiện hành khỏi phần acceptance/hardening còn thiếu. Plan tổng hợp liên repository nằm tại
`../finora-platform/.agents/plans/finora-remaining-work-plan.md`.

## Danh sách task

| Task | Phạm vi | Backend | Trạng thái | Đặc tả |
|---|---|---|---|---|
| WEB-LOAN-001 | Product → Fineract → assessment → admin decision/Contract | LN-003–LN-008 | `IN_PROGRESS` | [Plan](plans/WEB-LOAN-001-end-to-end.md) |
| WEB-LOAN-002 | Listing và theo dõi gọi vốn | LN-009–LN-010 | `BACKLOG` | Chưa tạo |
| WEB-LOAN-003 | Giải ngân, servicing, repayment, overdue | LN-011–LN-017 | `READY_FOR_REVIEW` | [Plan](plans/WEB-LOAN-003-servicing-operations.md) |
| WEB-UI-001 | Giao diện mềm theo finora-web-mockup, dữ liệu thật (toàn bộ trang quản trị) | API hiện có | `IN_PROGRESS` (chờ Thái xem) | [Plan](plans/WEB-UI-001-giao-dien-mem.md) |

Cập nhật 2026-10-17 (contract `LoanFundingCancelled` v1, Hải review trước merge): trang chi tiết gọi vốn hiển
thị listing `CANCELLED` sau khi đã đủ vốn bằng `cancellationReason`/`cancelledAt` của Investment — dừng ở bước
khóa vốn, ghi lý do (hợp đồng bị từ chối/hết hạn ký, giải ngân thất bại) và việc tiền giữ được trả lại ví.

Cập nhật 2026-10-17 (W3B/R4, [plan](../finora-platform/.agents/plans/W3B-wallet-withdrawal-mock-payout.md)): tab "Sự cố
giao dịch" có thêm hàng đợi "Lệnh rút tiền chờ đối soát" của Payment (`/api/v1/admin/withdrawals`). "Tra cứu lại" chỉ bật
cho lệnh `RECONCILIATION_REQUIRED` đã hết lượt tra cứu tự động (`nextAttemptAt = null`) và chỉ hẹn tra cứu provider, không
chi lại; số đếm của tab gồm cả hàng đợi này.

## Quy tắc đồng bộ về sau

Sau WEB-LOAN-001, không đợi toàn bộ Loan Service hoàn thành. Mỗi nhóm 1–2 LN backend liên quan đã sẵn sàng sẽ được lập plan, tích hợp web/mobile và kiểm thử end-to-end trước khi chuyển nhóm tiếp theo.
