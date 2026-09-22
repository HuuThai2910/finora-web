import { useEffect, useId, useRef, useState } from 'react';
import { useListingStage } from '../hooks/useListingStage';
import type { MarketListing } from '../types';
import { formatMoney } from '../formatters';

interface Props {
  listing: MarketListing;
  /** Đang chạy một thao tác trên khoản này — khóa nút để không bấm chồng. */
  busy: boolean;
  onViewDetail: (listing: MarketListing) => void;
  onApprove: (listing: MarketListing) => void;
  onFinalize: (listing: MarketListing) => void;
  onActivateNotes: (listing: MarketListing) => void;
}

/** Ba chấm dọc — cùng ký hiệu với cột Thao tác ở các trang quản trị khác. */
function DotsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="12" cy="19" r="1.9" />
    </svg>
  );
}

function MenuItem({
  label,
  hint,
  disabled = false,
  onSelect,
}: {
  label: string;
  hint?: string;
  disabled?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button type="button" role="menuitem" className="inv-menu-item" disabled={disabled} onClick={onSelect}>
      <span className="inv-menu-item-label">{label}</span>
      {hint && <span className="inv-menu-item-hint">{hint}</span>}
    </button>
  );
}

/**
 * Hai bước giải ngân của khoản đã đủ vốn, mở hay khóa theo chặng thật.
 *
 * Chỉ dựng khi menu mở, nên không tải phần vốn cho mọi dòng của bảng; kết quả được RTK
 * Query cache lại và dùng chung với màn chi tiết.
 */
function FundedItems({
  listing,
  onFinalize,
  onActivateNotes,
}: {
  listing: MarketListing;
  onFinalize: () => void;
  onActivateNotes: () => void;
}) {
  const { stage, investorsError } = useListingStage(listing);

  if (investorsError) {
    return <MenuItem label="Không kiểm tra được phần vốn" hint="Mở chi tiết để thử lại" disabled />;
  }
  if (stage.pending) {
    return <MenuItem label={'Đang kiểm tra phần vốn…'} disabled />;
  }

  const finalized = stage.steps[3] === 'done';
  const issued = stage.steps[4] === 'done';

  return (
    <>
      <MenuItem
        label="Khóa vốn"
        hint={finalized ? 'Đã khóa — nhà đầu tư không hủy được nữa' : 'Chốt phần vốn, sau đó không hủy được'}
        disabled={stage.nextAction !== 'FINALIZE'}
        onSelect={onFinalize}
      />
      <MenuItem
        label="Phát hành Notes"
        hint={
          issued
            ? 'Đã phát hành'
            : stage.nextAction === 'ACTIVATE_NOTES'
              ? `Xé vốn thành Note mệnh giá ${formatMoney(listing.noteDenomination)} đ`
              : 'Cần khóa vốn trước'
        }
        disabled={stage.nextAction !== 'ACTIVATE_NOTES'}
        onSelect={onActivateNotes}
      />
    </>
  );
}

/**
 * Menu thao tác của một khoản vay trên sàn.
 *
 * Xem chi tiết luôn có. Duyệt chỉ hiện ở chặng chờ duyệt. Khóa vốn và phát hành Note chỉ
 * hiện khi đã đủ vốn, và trong hai bước đó chỉ bước kế tiếp bấm được — đây là thứ tự bắt
 * buộc của Saga giải ngân, nên menu không bao giờ cho bấm thứ backend sẽ từ chối.
 */
export function ListingActionMenu({ listing, busy, onViewDetail, onApprove, onFinalize, onActivateNotes }: Props) {
  const [open, setOpen] = useState(false);
  // Toạ độ tuyệt đối của menu trên màn hình. Bảng nằm trong khung `overflow-x: auto`
  // nên menu định vị thường sẽ bị khung cắt mất; đặt `position: fixed` để thoát ra.
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor({ top: rect.bottom + 4, right: Math.max(window.innerWidth - rect.right, 8) });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;

    // Đưa tiêu điểm vào mục đầu tiên bấm được để bàn phím dùng được menu ngay.
    listRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();

    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    // Esc trả tiêu điểm về nút mở, nếu không người dùng bàn phím bị rơi về đầu trang.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    // Toạ độ đã chốt lúc mở, nên cuộn hay đổi kích thước là phải đóng, nếu không menu
    // sẽ trôi khỏi nút. `capture` để bắt cả cuộn ngang bên trong khung bảng.
    const handleReflow = () => setOpen(false);

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleReflow, true);
    window.addEventListener('resize', handleReflow);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleReflow, true);
      window.removeEventListener('resize', handleReflow);
    };
  }, [open]);

  // Đang chạy một thao tác thì đóng menu, để trạng thái trên nút không bị menu che.
  useEffect(() => {
    if (busy) setOpen(false);
  }, [busy]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div className="inv-menu" ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        className="inv-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Thao tác cho khoản vay #${listing.loanId}`}
        disabled={busy}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        {busy ? <span className="inv-menu-busy" aria-hidden="true">&hellip;</span> : <DotsIcon />}
      </button>

      {open && anchor && (
        <div
          className="inv-menu-list"
          id={menuId}
          ref={listRef}
          role="menu"
          aria-label={`Thao tác cho khoản vay #${listing.loanId}`}
          style={{ top: anchor.top, right: anchor.right }}
        >
          <MenuItem
            label="Xem chi tiết"
            hint="Tiến độ, điều khoản và ai đã góp vốn"
            onSelect={() => run(() => onViewDetail(listing))}
          />

          {listing.status === 'DRAFT' && (
            <MenuItem
              label="Duyệt lên sàn"
              hint="Chốt mệnh giá Note rồi mở gọi vốn"
              onSelect={() => run(() => onApprove(listing))}
            />
          )}

          {listing.status === 'FULLY_FUNDED' && (
            <FundedItems
              listing={listing}
              onFinalize={() => run(() => onFinalize(listing))}
              onActivateNotes={() => run(() => onActivateNotes(listing))}
            />
          )}
        </div>
      )}
    </div>
  );
}
