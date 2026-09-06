---
task_id: WEB-LOAN-001
status: IN_PROGRESS
owner: Thai
approved_by: Thai
approved_at: 2026-08-09
backend_scope: LN-003, LN-004, LN-005, LN-006, LN-007, LN-008
ui_reference: ../../finora-platform/docs/ui/bản-đẹp.html
ui_reference_sha256: 4F8AC308B4614AADD3A756B18FC13DF66BB43015DAE77B940ED540376203743F
---

# WEB-LOAN-001 — Tích hợp quản trị Loan end-to-end

## Bản đọc nhanh theo nghiệp vụ

Admin cần thực hiện được một luồng thật trên web:

```text
Tạo sản phẩm vay
→ hệ thống web tự yêu cầu đồng bộ cấu hình sang Fineract
→ admin kích hoạt sản phẩm
→ borrower nộp hồ sơ từ mobile
→ Loan áp chính sách theo điểm và tính lại lãi suất/lịch trả cuối
→ hồ sơ đủ ngưỡng được AI policy tự duyệt; hồ sơ vùng xem xét vào hàng đợi admin
→ admin so sánh điều khoản lúc nộp với điều khoản sau đánh giá rồi duyệt hoặc từ chối
→ nếu được duyệt, backend tạo Contract chờ borrower đọc và ký
```

Admin không phải bấm “Đồng bộ Fineract” sau mỗi lần tạo thành công. Web tự gọi bước đồng bộ và chỉ hiện nút **Thử đồng bộ lại** khi thất bại. Kích hoạt vẫn là quyết định riêng vì nó làm sản phẩm xuất hiện cho borrower.

## 1. Nguồn sự thật

- Nghiệp vụ tổng thể: [`LOAN-SERVICE-DESIGN.md`](../../finora-platform/finora-loan/plans/LOAN-SERVICE-DESIGN.md).
- Product và version: [`LN-003`](../../finora-platform/finora-loan/plans/LN-003-loan-product.md).
- Fineract sync/schedule: [`LN-006`](../../finora-platform/finora-loan/plans/LN-006-fineract-product-schedule-integration.md).
- Application/profile/AI: [`LN-004`](../../finora-platform/finora-loan/plans/LN-004-loan-application.md), [`LN-005`](../../finora-platform/finora-loan/plans/LN-005-borrower-profile-kyc.md), [`LN-007`](../../finora-platform/finora-loan/plans/LN-007-credit-profile-ai-assessment.md).
- Admin decision/Contract: [`LN-008`](../../finora-platform/finora-loan/plans/LN-008-approval-loan-contract.md).
- Visual: [`bản-đẹp.html`](../../finora-platform/docs/ui/bản-đẹp.html), chủ yếu các view `a-products`, `a-loans`, `a-approve` và khung admin.

Backend quyết định field, status, quyền và chuyển trạng thái. HTML chỉ quyết định ngôn ngữ trình bày, bố cục, token và phân cấp thông tin.

## 2. Phạm vi

### Có làm

- Chuẩn hóa HTTP client và lỗi Loan Service.
- Quản lý server state bằng Redux Toolkit + RTK Query; không tạo Redux slice cho dữ liệu server.
- Tạo/sửa/xem Product với khung lãi suất `min/base/max`; tự sync sau create; retry sync; activate/deactivate/archive.
- Danh sách tất cả hồ sơ hoặc lọc theo trạng thái, phân trang và giữ filter trên URL.
- Trang review chi tiết gồm thông tin khai báo, eligibility, credit profile, schedule và assessment.
- Khối so sánh luôn nhìn thấy giữa điều khoản lúc nộp và sau thẩm định: base/final rate,
  kỳ trả đầu, tổng lãi và tổng phải trả; không bắt admin đổi tab để ghép thông tin.
- Danh sách/chi tiết assessment; retry có polling giới hạn.
- Approve/reject có version, assessment evidence, idempotency và phản hồi Contract.
- Loading/empty/error/success, version conflict và dependency unavailable.
- Refactor theo `components/hooks/api/types/mappers/pages/schemas` khi chạm vào feature.

### Không làm

- Chỉnh sửa mô hình AI/grade trực tiếp từ web vì Loan/AI chưa công bố API quản trị có version và audit. Web chỉ mở màn giải thích chính sách v10 ở chế độ chỉ đọc.
- Gọi trực tiếp `finora-ai` hoặc Fineract.
- Disbursement, repayment, overdue, early settlement, restructuring và NPL vì LN-009 trở đi chưa triển khai.
- JWT/RBAC thật; local vẫn theo mock actor của Loan Service cho tới LN-002.
- SmartCA; LN-008 hiện chỉ hỗ trợ `CLICK_WRAP_MVP` phía borrower.

## 3. Khoảng trống phải xử lý

| Mã | Hiện trạng | Ảnh hưởng | Hướng xử lý |
|---|---|---|---|
| BE-WEB-01 | Đã bổ sung `GET /api/v1/admin/loan-products` ngày 2026-08-09 | Admin lấy được DRAFT/FAILED/INACTIVE theo trang và filter | Web đã chuyển sang admin list; backend có Flyway V6 và test query-count |
| AUTH-01 | Loan dùng actor/role cấu hình cố định | Không thể đổi admin/borrower trong cùng một instance như production | Test web với backend role admin; JWT/RBAC thuộc LN-002 |
| WEB-OLD-01 | Đã thay `LoanEvaluationPage` gọi endpoint giả bằng màn chính sách v10 chỉ đọc | Không còn gọi trực tiếp AI hoặc giả lập lưu blockchain | Chỉ bật chức năng chỉnh sửa khi có API quản trị/version/audit thật |
| WEB-OLD-02 | `ProductListPage` đang gom type/API/form/table/modal | Khó đọc và khó test | Refactor theo cấu trúc feature trước khi nối đầy đủ API |

`BE-WEB-01` là dependency backend nhỏ phát hiện khi tích hợp, không được giải quyết bằng cache trình duyệt hoặc dữ liệu giả trong production path.

## 4. Màn hình và route mục tiêu

| Route | Mục đích | UI tham chiếu | API chính |
|---|---|---|---|
| `/products` | Danh sách mọi Product cho admin, trạng thái sync và hành động | `a-products` | Admin product list còn thiếu; detail/actions đã có |
| `/products/new` | Tạo Product và tự sync Fineract | `a-products`/form hiện tại | Create → core-sync |
| `/products/:id` | Xem/sửa, retry sync, activate/deactivate/archive | `a-products` | Admin product detail/actions |
| `/loans` | Quản lý tất cả hồ sơ; lọc chờ thẩm định, đã duyệt, đã từ chối | `a-loans`, `a-approve` | Admin application list |
| `/loans/:applicationNumber/review` | Thẩm định đầy đủ và quyết định | `a-approve` | Review detail, assessments, approve/reject |
| `/loans/evaluation` | Giải thích chính sách AI v10 hiện hành | visual cũ của Rule Engine | Chỉ đọc từ policy đã xác nhận; chưa có mutation API |

Các route `/disbursement`, `/loans/overdue` cũ không được trình bày như chức năng đã tích hợp.
Menu tổng thể vẫn được giữ để người dùng hình dung cấu trúc hệ thống, nhưng mục chưa có backend phải bị khóa và gắn nhãn
“Sắp triển khai”; không điều hướng giả sang một chức năng khác.

## 5. Luồng Product và Fineract

### 5.1. Tạo và tự đồng bộ

1. Admin nhập code, tên, mô tả, min/max amount, min/max term, annual rate và repayment method.
2. Web validate quan hệ min ≤ max và dữ liệu bắt buộc.
3. `POST /api/v1/admin/loan-products` trả Product cùng `version` thật.
4. Web tạo một ý định sync và gọi `POST /api/v1/admin/loan-products/{id}/core-sync` bằng đúng version vừa nhận.
5. Nếu sync `SUCCEEDED`, hiển thị sẵn sàng kích hoạt và dùng `product.version` mới nhất trong response.
6. Nếu `PENDING/PROCESSING/RETRY_PENDING`, hiển thị trạng thái đang xử lý và refetch detail có giới hạn.
7. Nếu `FAILED`, giữ Product đã tạo, hiển thị `errorCode`, hướng dẫn phù hợp và nút retry.

Không rollback/xóa Product local khi Fineract lỗi. Không tự tăng version ở frontend.

### 5.2. Kích hoạt và cập nhật

- Activate chỉ khả dụng khi `coreSyncStatus=SYNCED` và dùng version hiện tại.
- Sau update cấu hình, hiển thị trạng thái cần đồng bộ lại theo response backend và thực hiện lại orchestration nếu nghiệp vụ backend yêu cầu.
- Khi nhận version conflict, refetch detail, thông báo dữ liệu đã đổi và không tự gửi lại mutation làm mất thay đổi người khác.

## 6. Luồng thẩm định và quyết định

1. Mở danh sách mặc định không truyền `status`, `page=0`, `size=20`; tab “Tất cả” vẫn là một page có giới hạn.
2. Các tab `PENDING_REVIEW`, `APPROVED`, `REJECTED` gửi đúng filter; chỉ `PENDING_REVIEW` có hành động thẩm định.
3. Mở detail bằng `applicationNumber`; không dùng database ID trên URL.
4. Hiển thị các khối dễ đọc:
   - yêu cầu vay và điều khoản snapshot;
   - thông tin tài chính tự khai;
   - eligibility/KYC và nguồn dữ liệu;
   - lịch sử tín dụng nội bộ;
   - schedule từ Fineract;
   - assessment AI và trạng thái xử lý;
   - lịch sử chuyển trạng thái gần nhất.
5. Trước các tab chi tiết, hiển thị cạnh nhau điều khoản lúc nộp và điều khoản sau thẩm định.
   `requestedAmount` và `requestedTermMonths` giữ nguyên; chỉ lãi suất và schedule đổi theo backend.
6. Nếu assessment `FAILED/RETRY_PENDING`, admin được retry đúng điều kiện; response `202 ACCEPTED` chỉ là đã nhận yêu cầu, không phải kết quả mới.
7. Poll `resultPath`/assessment detail khi trạng thái còn `PENDING/PROCESSING/RETRY_PENDING`, dừng ở `SUCCEEDED/FAILED` hoặc hết thời hạn.
8. Chỉ cho approve khi evidence hợp lệ và status Application đúng; gửi `applicationVersion`, `assessmentId`, `POLICY_APPROVED` và expiry tùy chọn.
9. Reject yêu cầu reason code phù hợp, detail khi cần và cùng idempotency rule.
10. Sau quyết định, invalidate danh sách/detail; nếu approve, hiển thị contract number, document hash, expiry và trạng thái `PENDING_SIGNATURE`.

## 7. API contract sử dụng

| Method | Endpoint | Mục đích | Điểm bắt buộc |
|---|---|---|---|
| POST | `/api/v1/admin/loan-products` | Tạo Product | Response `201`, giữ version |
| GET | `/api/v1/admin/loan-products/{id}` | Admin detail | Dùng refetch sau conflict/action |
| PUT | `/api/v1/admin/loan-products/{id}` | Cập nhật | Body có version |
| POST | `/api/v1/admin/loan-products/{id}/core-sync` | Sync Fineract | Body `{version}`; đọc command status/error |
| POST | `/api/v1/admin/loan-products/{id}/activate` | Kích hoạt | Body `{version}` mới nhất |
| POST | `/api/v1/admin/loan-products/{id}/deactivate` | Tạm ngưng | Body `{version}` mới nhất |
| POST | `/api/v1/admin/loan-products/{id}/archive` | Lưu trữ | Body `{version}` mới nhất |
| GET | `/api/v1/admin/loan-applications` | Danh sách hồ sơ | `status` tùy chọn, luôn có page/size |
| GET | `/api/v1/admin/loan-applications/{number}/review` | Review detail | Nguồn dữ liệu duyệt; schedule gồm danh sách `periods` đã snapshot |
| GET | `/api/v1/admin/loan-applications/{number}/assessments` | Lịch sử assessment | PageResponse, không coi phần tử đầu luôn mới nhất |
| GET | `/api/v1/admin/loan-applications/{number}/assessments/{id}` | Assessment detail | Dùng polling sau retry |
| POST | `/api/v1/admin/loan-applications/{number}/scoring-retry` | Yêu cầu retry | Idempotency-Key + assessment version; response 202 |
| POST | `/api/v1/admin/loan-applications/{number}/approve` | Duyệt và tạo Contract | Idempotency-Key + application version + assessment ID |
| POST | `/api/v1/admin/loan-applications/{number}/reject` | Từ chối | Idempotency-Key + version + reason |

## 8. State, cache và hiệu năng

- Một RTK Query API slice cho Loan base URL; chia endpoint theo module, không tạo nhiều Redux store.
- Tag tối thiểu: `LoanProduct`, `LoanProductList`, `AdminApplication`, `AdminApplicationList`, `CreditAssessment`.
- Filter danh sách nằm trên query string để reload/back vẫn giữ ngữ cảnh; không có `status` là tab “Tất cả”.
- Modal/form state giữ local hoặc React Hook Form; không đưa vào Redux slice.
- Idempotency key tạo khi người dùng bắt đầu một mutation; retry cùng ý định giữ nguyên key, thao tác mới tạo key mới.
- Poll 2 giây, tối đa 60 giây trong local integration; dừng khi tab ẩn nếu implementation hỗ trợ và cho phép bấm tải lại thủ công.
- Danh sách luôn phân trang; không request `size=100` để né pagination.

## 9. Mapping trạng thái cho người đọc

| Backend | Nhãn UI |
|---|---|
| `DRAFT` | Bản nháp sản phẩm |
| `NOT_SYNCED/PENDING/PROCESSING/RETRY_PENDING` | Chưa đồng bộ/Đang đồng bộ/Chờ thử lại |
| `SYNCED` | Đã sẵn sàng trên core |
| `SUBMITTED/ELIGIBILITY_PENDING/SCORING/SCORING_RETRY_PENDING` | Đã nộp/Đang kiểm tra/Đang chấm điểm/Chờ chấm lại |
| `PENDING_REVIEW` | Chờ admin thẩm định |
| `APPROVED/REJECTED/WITHDRAWN` | Đã duyệt/Từ chối/Người vay đã rút |
| Assessment `SUCCEEDED/FAILED` | Chấm điểm thành công/Chấm điểm chưa thành công |
| Contract `PENDING_SIGNATURE` | Chờ người vay đọc và ký |

Không hiển thị `READY`, `PENDING_APPROVAL` hoặc status chỉ có trong HTML cũ nếu backend không trả giá trị đó.

## 10. Cấu trúc code dự kiến

```text
src/
├── app/
│   ├── store.ts
│   └── providers.tsx
├── lib/api/
│   ├── baseQuery.ts
│   ├── errors.ts
│   └── idempotency.ts
└── features/
    ├── products/
    │   ├── api/
    │   ├── components/
    │   ├── hooks/
    │   ├── pages/
    │   ├── schemas/
    │   └── types/
    └── loan-review/
        ├── api/
        ├── components/
        ├── hooks/
        ├── mappers/
        ├── pages/
        └── types/
```

- Di chuyển dần từ `component`, `hook`, `constant.ts`; không đổi tên unrelated feature.
- `LoanEvaluationPage` cũ không được giữ direct AI client trong Loan feature.
- Comment tiếng Việt tại orchestration create→sync, version conflict, idempotency và polling; không comment JSX hiển nhiên.

## 11. Failure path bắt buộc

- Loan Service offline/network timeout.
- Validation 400/422 theo field.
- `CORE_LENDING_UNAVAILABLE` khi Fineract lỗi.
- Sync Product thất bại nhưng Product local vẫn tồn tại.
- Version conflict khi update/action/decision/retry.
- Assessment timeout/failed/retry accepted nhưng chưa có kết quả.
- Application đã được admin khác quyết định.
- Idempotency trả lại kết quả cũ; UI không tạo duplicate Contract.
- Response có status mới chưa biết: hiển thị fallback an toàn và ghi nhận cho debug, không crash.

## 12. Kiểm thử

### Unit/component

- Mapper status và formatter tiền/ngày.
- Product form min/max/rate/term.
- Orchestrator create→sync success/failure/retry và dùng version response.
- Assessment polling dừng đúng terminal/timeout/unmount.
- Approve/reject chống bấm lặp và giữ idempotency key.
- Loading/empty/error/success và version conflict.

### Integration thủ công

1. Chạy Loan Service bằng actor admin, Fineract và AI theo hướng dẫn backend.
2. Tạo Product, quan sát tự sync, activate.
3. Dùng mobile/backend fixture nộp hồ sơ và chờ `PENDING_REVIEW`.
4. Web mở queue/detail/assessment.
5. Thử một retry hợp lệ khi assessment lỗi hoặc dùng fixture lỗi.
6. Approve và kiểm tra contract response; chạy lại cùng idempotency key không tạo Contract thứ hai.
7. Tạo hồ sơ khác và reject với reason code.

## 13. Acceptance criteria

- [ ] `bản-đẹp.html` được dùng cho visual nhưng không còn luồng web gọi thẳng AI/Fineract.
- [ ] Product create tự sync; chỉ lỗi mới yêu cầu admin retry thủ công.
- [ ] Product nhập và hiển thị đủ `min <= base <= max <= 20%/năm`.
- [ ] Product action luôn dùng version backend mới nhất.
- [ ] Admin list được cả Product chưa active qua API admin phân trang.
- [ ] Danh sách tất cả/lọc trạng thái, detail và assessment dùng API thật và có pagination.
- [ ] Retry response 202 hiển thị là “đã tiếp nhận”, sau đó polling kết quả cuối.
- [ ] Approve tạo đúng một Contract; reject không tạo Contract.
- [ ] Admin nhìn thấy so sánh base/final rate và hai schedule mà không phải chuyển tab.
- [ ] Không hiển thị disbursement/overdue hoặc thao tác sửa AI policy như chức năng thật khi backend chưa có.
- [ ] File tuân thủ ngưỡng trách nhiệm; logic khó có comment tiếng Việt.
- [ ] Type-check, test, build và checklist frontend đều đạt.

## 14. Điều kiện bắt đầu và bàn giao

Chỉ bắt đầu code khi Thái đổi `status: APPROVED`, điền `approved_by: Thai` và ngày duyệt. Khi code/test xong, agent chuyển `READY_FOR_REVIEW`, ghi file thực tế, lệnh kiểm tra, kết quả từng AC và known limitation. Chỉ Thái chuyển `ACCEPTED`.

## 15. Tiến độ triển khai ngày 2026-08-09

Đã hoàn thành trong lượt tích hợp đầu:

- Redux Toolkit/RTK Query store, error mapping và idempotency utility;
- Product admin list phân trang, create tự sync, retry sync và lifecycle action dùng version backend;
- hàng đợi thẩm định, review detail, assessment retry, approve/reject;
- ẩn/redirect các route servicing và xóa direct AI config client;
- `npm run build` đạt.

Cập nhật đồng bộ danh sách/menu ngày 2026-08-09:

- `/loans` mặc định hiển thị tab “Tất cả”, có thêm bộ lọc chờ thẩm định/đã duyệt/đã từ chối;
- bỏ thuật ngữ triển khai như “Loan Service” khỏi nội dung dành cho người dùng;
- khôi phục cấu trúc menu quản trị từ visual reference; mục chưa có backend vẫn hiện nhưng bị khóa và ghi “Sắp triển khai”;
- Loan API chấp nhận `status` tùy chọn và danh sách luôn phân trang.

Cập nhật trang chi tiết thẩm định ngày 2026-08-09:

- giữ điều hướng sang page riêng và chia nội dung thành bốn tab: tổng quan, thông tin thẩm định,
  lịch trả dự kiến và lịch sử xử lý;
- thay toàn bộ JSON eligibility, lịch sử tín dụng, tài chính và schedule bằng nhãn tiếng Việt,
  số tiền/phần trăm/ngày được định dạng cho người dùng nghiệp vụ;
- chỉ render khối duyệt/từ chối khi Application còn `PENDING_REVIEW`; hồ sơ `APPROVED`, `REJECTED`
  hoặc trạng thái cuối không còn thấy form quyết định và nút tạo Contract;
- retry assessment dùng đúng `assessmentId` mà review detail xác nhận là bằng chứng hiện hành,
  không mặc định phần tử đầu tiên của danh sách assessment là mới nhất;
- API review trước đây chỉ trả số tổng hợp của schedule; contract đã được mở rộng ở cập nhật kế tiếp.

Cập nhật lịch trả và chính sách AI ngày 2026-08-09:

- Loan review response đã bổ sung `periods` từ snapshot bất biến; tab lịch trả hiển thị đủ ngày, gốc,
  lãi, phí, phạt, tổng trả và dư nợ của từng kỳ;
- mở lại menu “Chính sách đánh giá AI” dưới dạng chỉ đọc, trình bày đúng rule engine v10 hiện tại;
- loại bỏ thao tác lưu giả `/config/product` và tuyên bố blockchain không có API hỗ trợ.

Còn phải hoàn thiện trước khi đổi `READY_FOR_REVIEW`: Product edit/detail riêng, polling assessment có giới hạn,
component test và kiểm thử UI end-to-end với Loan/Fineract/AI đang chạy.

## 16. Đồng bộ định giá rủi ro ngày 2026-09-05

- Product form và bảng quản trị dùng đủ `minAnnualInterestRate`, base `annualInterestRate` và
  `maxAnnualInterestRate`; client kiểm tra đúng thứ tự và trần 20% trước khi gửi.
- Trang thẩm định có khối so sánh luôn hiển thị giữa lịch ban đầu và lịch sau đánh giá;
  Product principal/term không tự thay đổi vì backend không có contract đó.
- Hồ sơ AI auto-approved vẫn đọc được nguồn quyết định và điều khoản cuối nhưng không hiện lại
  form duyệt thủ công; hồ sơ `PENDING_REVIEW` mới cho admin duyệt hoặc từ chối.
- Hash visual reference được cập nhật theo file hiện có; thay đổi này không sửa design token toàn cục.
- Căn cứ nghiệp vụ/pháp lý của trần lãi suất và nghĩa vụ công khai được đối chiếu tại
  [`LEGAL-COMPLIANCE.md`](../../finora-platform/docs/LEGAL-COMPLIANCE.md); web chỉ trình bày dữ liệu Loan đã chốt,
  không tự tính hoặc tự sửa quy tắc pháp lý.

## 17. Bằng chứng kiểm tra tương thích ngày 2026-09-05

- `npm.cmd run build`: đạt; TypeScript và Vite tạo production bundle thành công.
- Luồng API thật đã xác nhận Product có khung 8%–12,5%–20%; hồ sơ hạng C được Loan áp
  `finalAnnualInterestRate=13%`, tăng `0,5` điểm phần trăm và tính lại đủ 24 kỳ qua Fineract.
- Admin duyệt bằng đúng application version/assessment hiện hành; backend tạo đúng một Contract
  `CLICK_WRAP_TEXT_V2` với lãi suất cuối, tổng nghĩa vụ và đủ 24 kỳ.
- Chưa đánh dấu kiểm thử UI trực quan đạt vì môi trường automation hiện tại không cung cấp browser.
  Cần mở `/loans/LA-939518AC4CE245BDAB58` khi chạy local để đối chiếu khối so sánh trên viewport thật.
