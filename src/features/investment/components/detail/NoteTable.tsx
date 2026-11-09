import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Pager } from '@/components/Pager';
import { StatusPill } from '@/components/StatusPill';
import { FUNDING_PAGE_SIZE, NOTE_STATUS_LABEL, NOTE_STATUS_TONE } from '../../constants';
import { useCommitmentNotes } from '../../hooks/useCommitmentNotes';
import type { ListingInvestor, NoteStatus } from '../../types';
import { formatMoney } from '../../formatters';
import { TABLE_CARD } from '../../styles';
import { InvestorLink } from '../InvestorLink';

interface Props {
  /** Chỉ phần vốn đã khóa mới sinh Note. */
  commitments: ListingInvestor[];
  nameOf: (investorId: string) => string;
}

const SUMMARY: NoteStatus[] = ['ACTIVE', 'CLOSED', 'DEFAULTED'];

/**
 * Mọi Note đã phát hành của khoản vay, kèm người góp vốn sinh ra Note đó. Note có thể đã
 * được bán trên chợ thứ cấp; backend không trả người nắm giữ hiện tại nên cột ghi rõ là
 * người góp vốn.
 */
export function NoteTable({ commitments, nameOf }: Props) {
  const { notes, isLoading, error, retry } = useCommitmentNotes(commitments);
  const [page, setPage] = useState(0);

  if (error) return <ErrorNotice error={error} onRetry={retry} />;
  if (isLoading) return <div className="ui-card ui-empty" aria-busy="true">Đang tải danh sách phần vốn...</div>;
  if (notes.length === 0) return <div className="ui-card ui-empty">Khoản vay chưa có phần vốn nào.</div>;

  const current = Math.min(page, Math.ceil(notes.length / FUNDING_PAGE_SIZE) - 1);
  const rows = notes.slice(current * FUNDING_PAGE_SIZE, (current + 1) * FUNDING_PAGE_SIZE);

  return (
    <div className={`ui-card fd-table-card ${TABLE_CARD}`}>
      <p className="fd-note-sum flex flex-wrap gap-x-4.5 gap-y-1.5 mx-1 mb-2.5 text-secondary text-[13px]">
        {SUMMARY.map((status) => (
          <span key={status}>
            {NOTE_STATUS_LABEL[status]} <b className="text-primary font-semibold">{notes.filter((item) => item.note.status === status).length}</b>
          </span>
        ))}
      </p>
      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Mã phần vốn</th>
              <th>Người góp vốn</th>
              <th className="num">Mệnh giá</th>
              <th className="num">Dư nợ gốc</th>
              <th className="num">Lãi đã nhận</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ note, commitment }) => (
              <tr key={note.noteNumber}>
                <td><span className="ui-mono">{note.noteNumber}</span></td>
                <td><InvestorLink userId={commitment.investorId} name={nameOf(commitment.investorId)} /></td>
                <td className="num">{formatMoney(note.principalAmount)} đ</td>
                <td className="num">{formatMoney(note.outstandingPrincipal)} đ</td>
                <td className="num">{formatMoney(note.interestReceived)} đ</td>
                <td>
                  <StatusPill tone={NOTE_STATUS_TONE[note.status] ?? 'neutral'} small>
                    {NOTE_STATUS_LABEL[note.status] ?? note.status}
                  </StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager page={current} size={FUNDING_PAGE_SIZE} total={notes.length} unit="phần vốn" onPage={setPage} />
    </div>
  );
}
