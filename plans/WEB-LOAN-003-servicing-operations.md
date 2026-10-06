---
task_id: WEB-LOAN-003
title: Vận hành trả nợ, quá hạn, cơ cấu và đối soát
owner: Thai
status: IN_PROGRESS
approved_at: 2026-10-04
---

# WEB-LOAN-003 — Vận hành servicing

Người dùng đã yêu cầu triển khai đầy đủ trong lượt ngày 2026-10-04; đây là phê duyệt bắt đầu task.
Web chỉ gọi Loan qua Gateway. Trang `/loans/operations` gồm bốn hàng đợi phân trang: thu hồi,
cơ cấu, projection/incident đối soát và event repayment đến trước mapping. Mutation approve/reject,
reconcile và replay khóa nút trong lúc chạy, hiển thị lỗi, rồi invalidates cache tương ứng.

Contract nguồn chuẩn: `LN-013`–`LN-017`, `docs/LOAN-SERVICING-POLICY.md` và controller Loan hiện hành.
Không tính lại tiền/lịch/DPD ở browser. Backend tiếp tục quyết định quyền `ROLE_ADMIN` và invariant.

## Acceptance

- Loading, empty, error và success có nội dung rõ ràng.
- Danh sách phân trang, không tải không giới hạn.
- Admin duyệt/từ chối cơ cấu với idempotency key; reconcile/replay không gửi lặp khi nút đang chạy.
- Build TypeScript/Vite xanh.
