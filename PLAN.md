# Kế hoạch triển khai finora-web

## Cách dùng

File này chỉ điều phối task, dependency và trạng thái. Nghiệp vụ/API/UI/test chi tiết nằm trong file plan tương ứng. Backend Design và LN đã duyệt vẫn là nguồn sự thật nghiệp vụ.

```text
DRAFT -> APPROVED -> IN_PROGRESS -> READY_FOR_REVIEW -> ACCEPTED
```

- AI được tạo `DRAFT`, chỉ bắt đầu code sau khi Thái chuyển `APPROVED`.
- Chỉ Thái chuyển task sang `APPROVED` hoặc `ACCEPTED`.
- Khi backend contract thay đổi, cập nhật plan trước khi sửa UI nếu thay đổi luồng hoặc acceptance criteria.

## Danh sách task

| Task | Phạm vi | Backend | Trạng thái | Đặc tả |
|---|---|---|---|---|
| WEB-LOAN-001 | Product → Fineract → assessment → admin decision/Contract | LN-003–LN-008 | `IN_PROGRESS` | [Plan](plans/WEB-LOAN-001-end-to-end.md) |
| WEB-LOAN-002 | Listing và theo dõi gọi vốn | LN-009–LN-010 | `BACKLOG` | Chưa tạo |
| WEB-LOAN-003 | Giải ngân, servicing, repayment, overdue | LN-011–LN-014 | `BACKLOG` | Chưa tạo |

## Quy tắc đồng bộ về sau

Sau WEB-LOAN-001, không đợi toàn bộ Loan Service hoàn thành. Mỗi nhóm 1–2 LN backend liên quan đã sẵn sàng sẽ được lập plan, tích hợp web/mobile và kiểm thử end-to-end trước khi chuyển nhóm tiếp theo.
