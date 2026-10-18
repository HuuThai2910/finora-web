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
| WEB-BLOCKCHAIN-001 | Trang "Bằng chứng blockchain": tra proof theo tham chiếu hoặc trạng thái, ngăn chi tiết, kiểm toàn vẹn (dữ liệu gốc → hash, cơ sở dữ liệu ↔ Fabric), đưa proof DEAD_LETTER về hàng đợi | Blockchain W3D (R6) `/api/v1/blockchain/proofs` | `READY_FOR_REVIEW` — build ngày 2026-10-17, chờ chạy với stack có Fabric | [Plan W3D](../finora-platform/.agents/plans/W3D-fabric-proofs.md) |

Cập nhật 2026-10-17 (contract `LoanFundingCancelled` v1, Hải review trước merge): trang chi tiết gọi vốn hiển
thị listing `CANCELLED` sau khi đã đủ vốn bằng `cancellationReason`/`cancelledAt` của Investment — dừng ở bước
khóa vốn, ghi lý do (hợp đồng bị từ chối/hết hạn ký, giải ngân thất bại) và việc tiền giữ được trả lại ví.

Cập nhật 2026-10-17 (W3B/R4, [plan](../finora-platform/.agents/plans/W3B-wallet-withdrawal-mock-payout.md)): tab "Sự cố
giao dịch" có thêm hàng đợi "Lệnh rút tiền chờ đối soát" của Payment (`/api/v1/admin/withdrawals`). "Tra cứu lại" chỉ bật
cho lệnh `RECONCILIATION_REQUIRED` đã hết lượt tra cứu tự động (`nextAttemptAt = null`) và chỉ hẹn tra cứu provider, không
chi lại; số đếm của tab gồm cả hàng đợi này.

Cập nhật 2026-10-17 (WEB-BLOCKCHAIN-001, R6/[W3D](../finora-platform/.agents/plans/W3D-fabric-proofs.md) và
R5/[W3C](../finora-platform/.agents/plans/W3C-pades-contract-signing.md); Thái cho tự chọn phương án):

- D71: trang `/blockchain/proofs` (nhóm menu mới "Kiểm toán", feature `src/features/blockchain`, slice RTK Query
  `blockchainApi`, proxy Vite `/api/v1/blockchain` qua Gateway). Bộ lọc và proof đang mở nằm trên URL; tra theo tham chiếu
  và lọc trạng thái loại trừ nhau vì backend từ chối gộp (`PROOF_FILTER_UNSUPPORTED`); tab "Dừng gửi" có số đếm từ một lời
  gọi `size=1`. Chỉ biên nhận `FABRIC_ON_CHAIN` mới hiện mã giao dịch và block; biên nhận MOCK luôn có nhãn "MOCK, không có
  trên Fabric" và câu cảnh báo của backend. Kiểm toàn vẹn nhận dữ liệu gốc tùy chọn (kiểm JSON object ở trình duyệt) và
  hiện tách hai kết quả. "Đưa lại hàng đợi gửi" chỉ bật cho DEAD_LETTER. Lối vào: nút ở trang chi tiết gọi vốn (`loanId`
  của listing là ID hồ sơ vay, chỉ hiện khi đã có hợp đồng) và link "Bằng chứng" ở hàng đợi Sự cố giao dịch. Web không có
  màn tài liệu hợp đồng và Loan không có API quản trị cho tài liệu nên không thêm `SIGNED_PDF`/biên nhận chữ ký trên web.
- D72: thêm `src/components/Drawer` dùng chung (cùng hành vi, kích thước với `SideDrawer` của Vận hành khoản vay); hai bản
  `SideDrawer` cũ của servicing và secondary-market chuyển sang component này ở việc gộp của WEB-UI-001.

Cập nhật 2026-10-17 (B73 đã sửa): `GET /admin/loan-applications/{n}/review` trả `id` số của hồ sơ và `contractNumber`
(null khi chưa lập hợp đồng).

- D80: đầu trang chi tiết hồ sơ vay có nút "Bằng chứng blockchain" mở `/blockchain/proofs` lọc `LOAN_APPLICATION` theo
  `id`; nút chỉ bật khi có `id`. Khác nút ở trang chi tiết gọi vốn, nút không ẩn khi hồ sơ chưa có hợp đồng: explorer khi
  đó báo chưa có proof và nói rõ proof chỉ có sau các mốc hợp đồng, giải ngân, trả nợ, Note.

Cập nhật 2026-10-18 (sửa lỗi nhỏ theo `../finora-platform/docs/testing/UI-MANUAL-TEST-GUIDE.md`):

- BC-N10: badge biên nhận và kết quả đối chiếu sổ cái của proof MOCK dùng chung một nhãn `MOCK_RECEIPT_TAG` "MOCK,
  không có trên Fabric" (trước đó badge ghi "MOCK, không trên Fabric").
- ADM-N02b: "Yêu cầu chấm lại" chỉ bật khi lần chấm mới nhất `FAILED` và hồ sơ `PENDING_REVIEW`, đúng điều kiện Loan
  nhận (`CreditScoringAdminStateService.retry`, `LoanApplication.reopenScoring`). Assessment `RETRY_PENDING` hoặc hồ sơ
  không còn chờ thẩm định thì nút vẫn hiện nhưng bị khóa, lý do ở tooltip.

## Quy tắc đồng bộ về sau

Sau WEB-LOAN-001, không đợi toàn bộ Loan Service hoàn thành. Mỗi nhóm 1–2 LN backend liên quan đã sẵn sàng sẽ được lập plan, tích hợp web/mobile và kiểm thử end-to-end trước khi chuyển nhóm tiếp theo.
