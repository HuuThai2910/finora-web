---
name: finora-frontend-engineering
description: Chuẩn hóa việc thiết kế, triển khai, rà soát và tái cấu trúc frontend FINORA bằng React, TypeScript, React Native và Expo. Dùng khi làm feature, page/screen, component, hook, state, API integration, form, xử lý lỗi, hiệu năng, accessibility, kiểm thử hoặc review cấu trúc thư mục trong finora-web và finora-mobile.
---

# FINORA Frontend Engineering

## Quy trình bắt buộc

1. Đọc `AGENTS.md` gần file đang sửa nhất.
2. Đọc toàn bộ [engineering-rules.md](references/engineering-rules.md) trước khi thiết kế, sửa hoặc review code.
3. Nếu feature có task trong `PLAN.md`, đọc plan chi tiết hiện hành và chỉ code khi trạng thái đã được Thái chuyển `APPROVED`.
4. Xác định đây là state cục bộ, form state, server state hay global client state trước khi chọn công cụ.
5. Xác định API contract, trạng thái nghiệp vụ, quyền người dùng và các trạng thái loading/empty/error/success trước khi viết UI.
6. Tách page/screen điều phối khỏi component hiển thị, hook nghiệp vụ, API, type, mapper và validation khi chúng có trách nhiệm khác nhau.
7. Chỉ comment phần giải thích lý do, quy tắc nghiệp vụ, side effect hoặc giới hạn kỹ thuật; không diễn giải lại cú pháp.
8. Chạy checklist trong [review-checklist.md](references/review-checklist.md) và các lệnh kiểm tra của dự án trước khi kết luận hoàn thành.

## Nguyên tắc quyết định nhanh

- Giữ state gần nơi sử dụng nhất; không đưa mọi state vào Redux hoặc Context.
- Dùng Redux Toolkit nếu thật sự cần global client state; dùng RTK Query khi dự án chọn Redux và cần quản lý server state/cache.
- Không gọi trực tiếp AI Service, Fineract hay database từ frontend. Chỉ gọi API công khai qua Gateway/backend được phân quyền.
- Không tự phát minh field, status, quyền, công thức tín dụng hoặc quy trình duyệt. Đối chiếu contract backend và tài liệu nghiệp vụ.
- Không tối ưu bằng `memo`, `useMemo`, `useCallback` theo thói quen. Đo hoặc chứng minh nguyên nhân render/tính toán trước.
- Không tách file chỉ để đạt số dòng; tách theo trách nhiệm và khả năng kiểm thử.
- Không sửa hàng loạt code ngoài phạm vi chỉ để ép cấu trúc cũ theo cấu trúc mới.

## Kết quả bàn giao

Nêu ngắn gọn:

- Luồng người dùng và API đã nối.
- State nằm ở đâu và vì sao.
- Các trường hợp loading/empty/error/success đã xử lý.
- Kiểm tra đã chạy và phần nào chưa thể kiểm tra.
- Nợ kỹ thuật hoặc contract backend còn thiếu, nếu có.
