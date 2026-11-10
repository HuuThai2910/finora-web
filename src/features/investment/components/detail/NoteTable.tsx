import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Pager } from '@/components/Pager';
import { SearchBox } from '@/components/SearchBox';
import { StatusPill } from '@/components/StatusPill';
import { useActorNames } from '@/features/loan';
import { FUNDING_PAGE_SIZE, NOTE_STATUS_LABEL, NOTE_STATUS_TONE } from '../../constants';
import { useCommitmentNotes } from '../../hooks/useCommitmentNotes';
import type { ListingInvestor } from '../../types';
import { formatMoney, parseDecimal } from '../../formatters';
import { InvestorLink } from '../InvestorLink';

interface Props {
  /** Chỉ phần vốn đã khóa mới sinh Note. */
  commitments: ListingInvestor[];
  nameOf: (investorId: string) => string;
}

/**
 * Mọi phần vốn (Note) đã phát hành của khoản vay: người đang nắm giữ (đã tính chuyển nhượng trên Chợ, `holderId` của
 * API quản trị) và người góp vốn ban đầu sinh ra phần đó. Ô tìm lọc ngay trên dữ liệu đã tải (đã đủ mọi phần vốn).
 *
 * Người nhận chuyển nhượng không nằm trong danh sách góp vốn nên tra tên riêng (cần quyền Xem "Khách hàng"); chưa tra
 * được thì chỉ ghi "Nhà đầu tư", không hiện mã.
 */
export function NoteTable({ commitments, nameOf }: Props) {
  const { notes, isLoading, error, retry } = useCommitmentNotes(commitments);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const investorIds = new Set(commitments.map((item) => item.investorId));
  const buyers = useActorNames(notes
    .map(({ note }) => note.holderId)
    .filter((holderId): holderId is string => !!holderId && !investorIds.has(holderId)));
  // Backend cũ chưa có holderId: coi như người góp ban đầu vẫn giữ.
  const holderOf = (note: { holderId?: string | null }, originId: string) => note.holderId ?? originId;
  const holderName = (holderId: string): string => {
    if (investorIds.has(holderId)) return nameOf(holderId);
    const actor = buyers.names[holderId];
    return actor ? actor.fullName ?? actor.email : 'Nhà đầu tư';
  };

  if (error) return <ErrorNotice error={error} onRetry={retry} />;
  if (isLoading) return <div className="ui-card ui-empty" aria-busy="true">Đang tải danh sách phần vốn...</div>;
  if (notes.length === 0) return <div className="ui-card ui-empty">Khoản vay chưa có phần vốn nào.</div>;

  const needle = query.toLocaleLowerCase('vi-VN');
  const matched = needle
    ? notes.filter(({ note, commitment }) =>
        `${note.noteNumber} ${holderName(holderOf(note, commitment.investorId))} ${nameOf(commitment.investorId)}`
          .toLocaleLowerCase('vi-VN').includes(needle))
    : notes;
  const count = Math.max(1, Math.ceil(matched.length / FUNDING_PAGE_SIZE));
  const current = Math.min(page, count - 1);
  const rows = matched.slice(current * FUNDING_PAGE_SIZE, (current + 1) * FUNDING_PAGE_SIZE);
  const outstanding = notes.reduce((sum, { note }) => sum + (parseDecimal(note.outstandingPrincipal) ?? 0), 0);

  return (
    <article className="ui-card lr-card px-3.5 pt-3.5 pb-3 max-[760px]:px-2.5">
      <SearchBox
        className="mb-3 w-80 max-[760px]:w-full"
        value={query}
        onSearch={(next) => {
          setQuery(next);
          setPage(0);
        }}
        label="Tìm phần vốn"
        placeholder="Tìm mã phần vốn hoặc người nắm giữ"
        delay={150}
      />
      {matched.length === 0 ? (
        <div className="ui-empty">Không có phần vốn nào khớp "{query}".</div>
      ) : (
        <>
          <div className="ui-table-wrap">
            <table className="ui-table [&_tfoot_td]:border-t [&_tfoot_td]:border-t-line [&_tfoot_td]:bg-[#f8faff] [&_tfoot_td]:font-semibold">
              <thead>
                <tr>
                  <th>Mã phần vốn</th>
                  <th>Người đang nắm giữ</th>
                  <th className="hide-sm max-[760px]:hidden">Người góp ban đầu</th>
                  <th className="num">Dư nợ gốc</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ note, commitment }) => {
                  const holderId = holderOf(note, commitment.investorId);
                  const transferred = holderId !== commitment.investorId;
                  return (
                  <tr key={note.noteNumber}>
                    <td><span className="ui-mono">{note.noteNumber}</span></td>
                    <td>
                      <InvestorLink userId={holderId} name={holderName(holderId)} />
                      {transferred && <span className="ui-sub">nhận chuyển nhượng</span>}
                    </td>
                    <td className="hide-sm max-[760px]:hidden text-muted">
                      {nameOf(commitment.investorId)}
                    </td>
                    <td className="num">
                      {formatMoney(note.outstandingPrincipal)} đ
                      <span className="ui-sub">lãi đã nhận {formatMoney(note.interestReceived)} đ</span>
                    </td>
                    <td>
                      <StatusPill tone={NOTE_STATUS_TONE[note.status] ?? 'neutral'} small dot>
                        {NOTE_STATUS_LABEL[note.status] ?? note.status}
                      </StatusPill>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
              {!needle && (
                <tfoot>
                  <tr>
                    <td>Tổng {notes.length} phần vốn</td>
                    <td />
                    <td className="hide-sm max-[760px]:hidden" />
                    <td className="num">{formatMoney(outstanding)} đ</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <Pager page={current} size={FUNDING_PAGE_SIZE} total={matched.length} unit="phần vốn" onPage={setPage} />
        </>
      )}
    </article>
  );
}
