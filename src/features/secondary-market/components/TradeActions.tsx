import { useState } from 'react';
import { Drawer } from '@/components/Drawer';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Modal } from '@/components/Modal';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { InvestorLink, NOTE_STATUS_LABEL, NOTE_STATUS_TONE } from '@/features/investment';
import { useActorNames } from '@/features/loan';
import { toast } from '@/lib/toast';
import { formatDateTime } from '@/utils';
import { useGetTradeNotesQuery, useRetryTradeSettlementMutation } from '../api/orderBookApi';
import { formatMoneyVnd } from '../formatters';
import type { AdminTrade } from '../types';

/** Ngăn "Note của lần khớp": người đang giữ từng Note và lịch sử chuyển nhượng, mới nhất trước. */
function TradeNotesDrawer({ trade, onClose }: { trade: AdminTrade; onClose: () => void }) {
  const notes = useGetTradeNotesQuery(trade.tradeReference);
  const rows = notes.data ?? [];
  const { displayName } = useActorNames(rows.flatMap((note) => [
    note.currentHolderId, ...note.transfers.flatMap((item) => [item.sellerId, item.buyerId]),
  ]));

  return (
    <Drawer title="Note của lần khớp" subtitle={trade.tradeReference} onClose={onClose}>
      {notes.error ? (
        <ErrorNotice error={notes.error} onRetry={notes.refetch} />
      ) : notes.isLoading ? (
        <p className="ui-empty" aria-busy="true">Đang tải Note...</p>
      ) : rows.length === 0 ? (
        <p className="ui-empty">
          {trade.settlementStatus === 'SETTLED'
            ? 'Lần khớp này chưa ghi lần chuyển Note nào.'
            : 'Chưa chuyển Note nào vì thanh toán của lần khớp chưa xong.'}
        </p>
      ) : (
        <ul className="grid gap-3">
          {rows.map((note) => (
            <li key={note.noteId} className="sm-note rounded-md border border-line px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="ui-mono font-semibold">{note.noteNumber}</span>
                <StatusPill tone={NOTE_STATUS_TONE[note.status as keyof typeof NOTE_STATUS_TONE] ?? 'neutral'} small>
                  {NOTE_STATUS_LABEL[note.status as keyof typeof NOTE_STATUS_LABEL] ?? 'Không rõ'}
                </StatusPill>
              </div>
              <p className="mt-1 text-[13px]">
                <span className="text-muted">Đang giữ: </span>
                <InvestorLink userId={note.currentHolderId} name={displayName(note.currentHolderId)} />
                <span className="text-muted"> · Gốc còn lại {formatMoneyVnd(note.outstandingPrincipal)}</span>
              </p>
              <h3 className="mt-2 mb-1 text-[12px] font-semibold text-secondary">Lịch sử chuyển nhượng</h3>
              <ol className="grid gap-1 text-[13px]">
                {note.transfers.map((item, index) => (
                  <li key={`${item.transferredAt}-${index}`} className="leading-normal">
                    <span className="text-muted">{formatDateTime(item.transferredAt)}: </span>
                    <InvestorLink userId={item.sellerId} name={displayName(item.sellerId)} />
                    {' → '}
                    <InvestorLink userId={item.buyerId} name={displayName(item.buyerId)} />
                    <span className="text-muted"> · giá {formatMoneyVnd(item.price)}</span>
                    {item.tradeReference && <span className="ui-mono text-muted"> · {item.tradeReference}</span>}
                  </li>
                ))}
              </ol>
              <p className="mt-1 text-[12px] text-muted">Phát hành lúc {formatDateTime(note.issuedAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </Drawer>
  );
}

/** Hộp xác nhận gửi thanh toán lại một lần khớp "Cần đối soát". */
function RetrySettlementModal({ trade, onClose }: { trade: AdminTrade; onClose: () => void }) {
  const [retry, { isLoading }] = useRetryTradeSettlementMutation();

  const confirm = async () => {
    const result = await retry(trade.tradeReference);
    if ('error' in result) {
      toast.error(result.error);
      return;
    }
    toast.success(`Đã gửi thanh toán lại lần khớp ${trade.tradeReference}. Kết quả cập nhật sau ít phút.`);
    onClose();
  };

  return (
    <Modal
      title="Gửi thanh toán lại"
      subtitle={trade.tradeReference}
      onClose={onClose}
      busy={isLoading}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={isLoading}>Hủy</button>
          <button type="button" className="ui-btn primary" onClick={confirm} disabled={isLoading}>
            {isLoading ? 'Đang gửi...' : 'Gửi thanh toán lại'}
          </button>
        </>
      )}
    >
      <p className="text-[14px]">
        Dịch vụ thanh toán đã từ chối chuyển {formatMoneyVnd(trade.amount)} cho lần khớp này. Hãy kiểm tra ví của hai
        bên trước khi gửi lại.
      </p>
      <p className="mt-2 text-[13px] text-muted">
        Hệ thống gửi lại đúng lệnh cũ, nên nếu lần trước tiền đã chuyển thì sẽ không chuyển thêm lần nữa.
      </p>
    </Modal>
  );
}

/** Nút thao tác ở cột Thanh toán: xem Note của lần khớp, và gửi thanh toán lại khi lần khớp cần đối soát. */
export function TradeActions({ trade }: { trade: AdminTrade }) {
  const { canAct } = usePermission();
  const [open, setOpen] = useState<'notes' | 'retry' | null>(null);
  const canRetry = trade.settlementStatus === 'FAILED' && canAct('secondary-market');

  return (
    <div className="sm-trade-actions mt-1 flex flex-wrap gap-x-3 gap-y-1">
      <button type="button" className="ui-link text-[12px]" onClick={() => setOpen('notes')}>Xem Note</button>
      {canRetry && (
        <button type="button" className="ui-link text-[12px]" onClick={() => setOpen('retry')}>Gửi thanh toán lại</button>
      )}
      {open === 'notes' && <TradeNotesDrawer trade={trade} onClose={() => setOpen(null)} />}
      {open === 'retry' && <RetrySettlementModal trade={trade} onClose={() => setOpen(null)} />}
    </div>
  );
}
