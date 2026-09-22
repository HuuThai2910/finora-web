# Thiết kế lại trang "Gọi vốn & Notes" (finora-web)

**Ngày:** 2026-09-12
**Phạm vi:** `finora-web/src/features/investment` ↔ `finora-investment` (không sửa backend)
**Trạng thái:** IMPLEMENTED (2026-09-12, build xanh)

---

## 1. Vấn đề của bản hiện tại

- Trạng thái nằm trong một ô `select`; quản trị không thấy ngay có bao nhiêu khoản đang chờ mình xử lý.
- Hành động chính (Duyệt lên sàn, Khóa vốn, Phát hành Notes) giấu trong menu ba chấm; với khoản đã đủ vốn menu hiện cả hai nút nên có thể bấm "Phát hành Notes" trước "Khóa vốn" và nhận lỗi `NO_FINALIZED_COMMITMENT`.
- Không nhìn ra khoản đã đủ vốn đang ở bước nào: đã khóa vốn chưa, đã phát hành Note chưa.
- Hai API đã có nhưng web chưa dùng: tham số sàn (`GET/PUT /investments/admin/settings`) và đóng khoản hết hạn (`POST /investments/admin/listings/close-expired`).
- Endpoint `/market/listings/{id}/progress` (số nhà đầu tư, số Note, thời điểm đủ vốn) và `/admin/commitments/{id}/notes` có sẵn nhưng màn chi tiết không dùng.

## 2. Luồng nghiệp vụ phải phản ánh đúng

```
Worker lấy khoản đã ký ──▶ DRAFT (chờ duyệt)
        │ quản trị chốt mệnh giá, số ngày ──▶ OPEN (đang gọi vốn)
        │        │ nhà đầu tư đặt lệnh, tổng chạm mục tiêu ──▶ FULLY_FUNDED
        │        │ hết hạn chưa đủ (worker/close-expired) ──▶ CLOSED
        │        └ finora-loan rút khoản ──▶ CANCELLED
        └ FULLY_FUNDED: Khóa vốn (commitment ACTIVE → FINALIZED)
                        rồi Phát hành Notes (chỉ nhận commitment FINALIZED)
```

Chặng của một khoản `FULLY_FUNDED` **không có trong `MarketListingResponse`**, suy ra ở client:

| Dữ liệu | Kết luận |
|---|---|
| Có phần vốn chưa hủy ở trạng thái `ACTIVE` | Chưa khóa vốn → bước tiếp: **Khóa vốn** |
| Mọi phần vốn chưa hủy đều `FINALIZED`, phần vốn đầu tiên chưa có Note | Đã khóa → bước tiếp: **Phát hành Notes** |
| Phần vốn đầu tiên đã có Note | Đã phát hành (backend phát hành theo lô, chạy lại chỉ bù phần thiếu) |

## 3. Bố cục

1. **Header** — tiêu đề, một câu giải thích khoản tự về chờ duyệt; nút *Tham số sàn* và *Tải lại*.
2. **Dải chặng** — bốn thẻ bấm được để lọc: Tất cả · Chờ duyệt · Đang gọi vốn · Đã đủ vốn, mỗi thẻ hiện số đếm thật (query `size=1`, đọc `totalElements`). Chờ duyệt và Đã đủ vốn có dấu "cần xử lý" khi > 0. Hai chip nhỏ *Đã đóng* / *Đã hủy* cho phần lưu trữ.
3. **Thanh lọc** — hạng, lãi từ, kỳ hạn tối đa (đúng ba tham số còn lại của API). Bỏ ô trạng thái vì đã có dải chặng.
4. **Bảng** — 5 cột: Khoản vay · Điều khoản · Tiến độ · Trạng thái · Hành động. Mỗi dòng nêu bước kế tiếp:
   - DRAFT: "Cần chốt mệnh giá Note" → nút **Duyệt lên sàn**.
   - OPEN: "còn X đ · N ngày"; quá hạn thì "Hết hạn — chờ đóng".
   - FULLY_FUNDED: "Chờ khóa vốn & phát hành Note" → nút **Giải ngân →** mở chi tiết.
   - CLOSED/CANCELLED: chỉ *Chi tiết*.
5. **Modal chi tiết** — stepper 5 chặng, thẻ tiến độ (từ `/progress`), thẻ điều khoản, bảng nhà đầu tư (kèm *Xem Note* từng phần vốn khi đã phát hành), chân modal có đúng một nút hành động theo chặng.
6. **Modal duyệt** — giữ như cũ, số ngày mặc định lấy từ tham số sàn.
7. **Modal tham số sàn** — mệnh giá, mức tối thiểu (phải chia hết), số ngày; ghi chú chỉ áp dụng cho khoản lên sàn sau; mục bảo trì *Đóng khoản hết hạn*.

## 4. State & cache

- Server state: RTK Query `investmentApi` (đã có). Thêm endpoint settings, close-expired; tag `FundingSettings`, `CommitmentNotes`.
- Số đếm chặng: 4 query `getMarketListings` với `size=1`, tự invalidate qua tag `MarketListingList` sau mọi mutation.
- Modal đang mở, bộ lọc đang gõ, thông báo hành động: `useState` trong `FundingPage`.
- Khóa vốn / phát hành Note gọi từ modal chi tiết; invalidate `FundingProgress`, `CommitmentNotes`, `MarketListingList`.

## 5. Trạng thái màn hình

- Loading: 5 dòng skeleton thay cho chữ "Đang tải".
- Empty theo chặng: câu gợi ý riêng (chờ duyệt rỗng → "worker sẽ tự đưa khoản đã ký về đây").
- Error: hộp lỗi + *Thử lại*; lỗi mutation hiện ngay trong modal đang mở.
- Success: thông báo có nút đóng, tự biến mất khi thao tác tiếp.

## 6. File

| File | Việc |
|---|---|
| `lib/api/investmentApi.ts` | thêm tagTypes |
| `features/investment/types.ts` | `FundingSettings`, `UpdateFundingSettingsRequest` |
| `features/investment/api/investmentApi.ts` | settings, close-expired, tag Note |
| `features/investment/stage.ts` | logic thuần suy chặng, ngày còn lại |
| `features/investment/hooks/useStageCounts.ts` | 4 query đếm |
| `features/investment/hooks/useListingStage.ts` | investors + notes → chặng |
| `component/FundingPipeline.tsx`, `StageStepper.tsx`, `FundingSettingsModal.tsx` | mới |
| `component/FundingPage.tsx`, `FundingTable.tsx`, `FundingFilters.tsx`, `ListingDetailModal.tsx` | viết lại |
| `component/ListingActionMenu.tsx` | xóa |
| `component/css/FundingPage.css` | viết lại |

## 7. Ngoài phạm vi

- Không sửa backend; contract giữ nguyên.
- Không thêm trang mới hay đổi điều hướng.
