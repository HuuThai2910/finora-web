# Hướng dẫn làm việc với finora-web

Mọi AI hoặc lập trình viên sửa mã nguồn trong repository này phải tuân thủ skill:

- `.agents/skills/finora-frontend-engineering/SKILL.md`
- `.agents/skills/finora-frontend-engineering/references/engineering-rules.md`
- `.agents/skills/finora-frontend-engineering/references/review-checklist.md`
- `PLAN.md` và plan chi tiết của task hiện hành nếu thay đổi một feature/luồng đã được lập kế hoạch.

## Quy tắc bắt buộc

- Giao tiếp, tài liệu và comment nghiệp vụ dùng tiếng Việt rõ ràng.
- Giữ TypeScript strict; không che lỗi bằng `any`, `!` hoặc `catch` rỗng.
- Tổ chức theo feature và tách đúng trách nhiệm; không gom API, hook, mapping, type và JSX lớn trong một page.
- Frontend chỉ gọi API công khai qua Gateway/backend. Không gọi trực tiếp AI Service, Fineract hoặc database.
- Không tự suy đoán contract, status, version, quyền hoặc công thức tài chính.
- State cục bộ giữ cục bộ. Chỉ dùng Redux Toolkit/RTK Query hoặc Context theo ma trận trong skill.
- Không chỉnh sửa diện rộng ngoài yêu cầu hiện tại; bảo toàn thay đổi đang có của người dùng.
- Không bắt đầu code task có plan khi trạng thái còn `DRAFT`; chỉ Thái phê duyệt `APPROVED`.

## Kiểm tra tối thiểu

Chạy các script đang tồn tại trong `package.json`. Hiện tại:

```powershell
npm run build
```

Nếu bổ sung lint/test/typecheck thì phải cập nhật phần này và chạy trước khi bàn giao.
