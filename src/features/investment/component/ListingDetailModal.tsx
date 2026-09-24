import { Fragment, useEffect, useState } from 'react';
import { toUiApiError } from '@/lib/api/errors';
import {
  useActivateNotesMutation,
  useFinalizeCommitmentsMutation,
  useGetCommitmentNotesQuery,
  useGetFundingProgressQuery,
} from '../api/investmentApi';
import { useInvestorNames } from '../hooks/useInvestorNames';
import { useListingStage } from '../hooks/useListingStage';
import { COMMITMENT_LABEL, COMMITMENT_TONE, NOTE_STATUS_LABEL, statusLabel, statusTone } from '../constant';
import { describeFundingWindow, type ListingStageView } from '../stage';
import type { MarketListing } from '../types';
import {
  estimateNoteCount,
  formatDateTime,
  formatMoney,
  formatMonths,
  formatPercent,
  formatRate,
  repaymentLabel,
} from '../formatters';
import { FundingBar } from './FundingTable';
import { StageStepper } from './StageStepper';

interface Props {
  listing: MarketListing;
  onClose: () => void;
  onApprove: (listing: MarketListing) => void;
}

type Message = { tone: 'ok' | 'error'; text: string };

/** Câu dẫn ở chân modal: nói rõ bước kế tiếp hoặc vì sao không còn gì để làm. */
function nextStepHint(listing: MarketListing, stage: ListingStageView): string {
  if (stage.terminal === 'CLOSED') {
    return 'Khoản đã đóng vì hết hạn; muốn gọi lại phải niêm yết lại từ finora-loan.';
  }
  if (stage.terminal === 'CANCELLED') return 'finora-loan đã rút khoản vay khỏi sàn.';
  if (stage.pending) return 'Đang kiểm tra trạng thái phần vốn…';
  switch (stage.nextAction) {
    case 'APPROVE':
      return 'Bước tiếp: chốt mệnh giá Note rồi mở gọi vốn.';
    case 'FINALIZE':
      return 'Bước tiếp: khóa vốn. Sau bước này nhà đầu tư không hủy lệnh được nữa.';
    case 'ACTIVATE_NOTES':
      return `Bước tiếp: phát hành Note mệnh giá ${formatMoney(listing.noteDenomination)} đ cho từng phần vốn.`;
    case null:
      return listing.status === 'OPEN'
        ? 'Đang gọi vốn — không có thao tác quản trị ở chặng này.'
        : 'Đã phát hành Note. Khoản vay chuyển sang theo dõi dòng tiền.';
  }
}

const NOTE_TONE: Record<'ACTIVE' | 'CLOSED' | 'DEFAULTED', string> = {
  ACTIVE: 'is-funded',
  CLOSED: 'is-closed',
  DEFAULTED: 'is-cancelled',
};

/** Danh sách Note của một phần vốn, chỉ tải khi quản trị mở dòng. */
function CommitmentNotes({ commitmentId }: { commitmentId: number }) {
  const { data, isLoading, isError, refetch } = useGetCommitmentNotesQuery(commitmentId);

  if (isLoading) return <div className="inv-notes-state">Đang tải Note&hellip;</div>;
  if (isError) {
    return (
      <div className="inv-notes-state is-error">
        Không tải được Note.{' '}
        <button type="button" className="inv-link" onClick={() => refetch()}>Thử lại</button>
      </div>
    );
  }
  if (!data || data.length === 0) return <div className="inv-notes-state">Phần vốn này chưa có Note.</div>;

  return (
    <ul className="inv-notes">
      {data.map((note) => (
        <li key={note.noteNumber} className="inv-note">
          <span className="inv-note-number">{note.noteNumber}</span>
          <span className="inv-note-cell">
            <span className="inv-note-label">Mệnh giá</span>
            {formatMoney(note.principalAmount)} đ
          </span>
          <span className="inv-note-cell">
            <span className="inv-note-label">Dư nợ gốc</span>
            {formatMoney(note.outstandingPrincipal)} đ
          </span>
          <span className="inv-note-cell">
            <span className="inv-note-label">Lãi đã nhận</span>
            {formatMoney(note.interestReceived)} đ
          </span>
          <span className={`inv-status ${NOTE_TONE[note.status] ?? 'is-closed'}`}>
            {NOTE_STATUS_LABEL[note.status] ?? note.status}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Chi tiết một khoản vay trên sàn: chặng hiện tại, tiến độ, điều khoản, nhà đầu tư và
 * nút hành động duy nhất của chặng.
 *
 * Khóa vốn và phát hành Note gọi từ đây thay vì từ bảng, vì chỉ ở đây mới biết chắc
 * khoản đang ở bước nào — bảng chỉ biết listing đã đủ vốn, không biết đã khóa hay chưa.
 */
export function ListingDetailModal({ listing, onClose, onApprove }: Props) {
  const { stage, investors, investorsLoading, investorsError, refetchInvestors } = useListingStage(listing);
  const progress = useGetFundingProgressQuery(listing.listingId);
  const [finalize, finalizeState] = useFinalizeCommitmentsMutation();
  const [activate, activateState] = useActivateNotesMutation();
  const [message, setMessage] = useState<Message | null>(null);
  const [expandedCommitment, setExpandedCommitment] = useState<number | null>(null);

  // Tên lấy từ finora-user và ghép ở đây; Investment Service không lưu dữ liệu cá nhân.
  const { names, isLoading: namesLoading } = useInvestorNames(investors.map((item) => item.investorId));

  const busy = finalizeState.isLoading || activateState.isLoading;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, busy]);

  const handleFinalize = async () => {
    setMessage(null);
    try {
      const result = await finalize(listing.listingId).unwrap();
      setMessage({
        tone: 'ok',
        text:
          result.finalizedCount === 0
            ? 'Mọi phần vốn đã được khóa từ trước, không có gì thay đổi.'
            : `Đã khóa ${result.finalizedCount} phần vốn. Nhà đầu tư không hủy lệnh được nữa; bước tiếp là phát hành Note.`,
      });
    } catch (error) {
      setMessage({ tone: 'error', text: toUiApiError(error).message });
    }
  };

  const handleActivate = async () => {
    setMessage(null);
    try {
      const result = await activate(listing.listingId).unwrap();
      setMessage({
        tone: 'ok',
        text:
          result.issuedNoteCount === 0
            ? 'Notes đã được phát hành trước đó, không tạo thêm.'
            : `Đã phát hành ${result.issuedNoteCount} Note. Mỗi nhà đầu tư giờ nắm quyền sở hữu theo mệnh giá cố định.`,
      });
    } catch (error) {
      setMessage({ tone: 'error', text: toUiApiError(error).message });
    }
  };

  const live = investors.filter((item) => item.status !== 'CANCELLED');
  const funded = listing.status === 'FULLY_FUNDED';
  const notesIssued = stage.steps[4] === 'done';
  const fundingWindow = describeFundingWindow(listing.fundingClosesAt);
  const maxNotes = estimateNoteCount(listing.targetAmount, listing.noteDenomination);
  const progressData = progress.data;
  const investorColumns = notesIssued ? 8 : 7;

  return (
    <div className="inv-modal-backdrop" role="presentation" onClick={busy ? undefined : onClose}>
      <div
        className="inv-modal is-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="inv-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="inv-detail-head">
          <div>
            <span className="inv-eyebrow">Khoản vay #{listing.loanId}</span>
            <h2 id="inv-detail-title" className="inv-modal-title">{listing.purpose}</h2>
            <p className="inv-modal-note">
              {listing.region}
              <span className="inv-dot" aria-hidden="true" />
              hạng {listing.creditGrade} · điểm {listing.creditScore}
              <span className="inv-dot" aria-hidden="true" />
              {formatRate(listing.annualInterestRate)}
              <span className="inv-dot" aria-hidden="true" />
              {formatMonths(listing.termMonths)}
            </p>
          </div>
          <span className={`inv-status ${statusTone(listing.status)}`}>{statusLabel(listing.status)}</span>
        </header>

        <StageStepper stage={stage} />

        <div className="inv-detail-cards">
          <section className="inv-detail-card" aria-labelledby="inv-progress-title">
            <h3 id="inv-progress-title" className="inv-detail-heading">Tiến độ gọi vốn</h3>
            {listing.status === 'DRAFT' ? (
              <p className="inv-muted">
                Chưa mở gọi vốn. Mục tiêu tạm tính {formatMoney(listing.targetAmount)} đ theo mệnh giá
                đề xuất {formatMoney(listing.noteDenomination)} đ — chốt lại khi duyệt.
              </p>
            ) : (
              <>
                <div className="inv-progress-big">
                  <strong>{formatPercent(listing.fundedPercent)}</strong>
                  <span>{formatMoney(listing.committedAmount)} / {formatMoney(listing.targetAmount)} đ</span>
                </div>
                <FundingBar percent={listing.fundedPercent} funded={funded} />
                <dl className="inv-kv">
                  <div>
                    <dt>Còn thiếu</dt>
                    <dd>{formatMoney(listing.remainingAmount)} đ</dd>
                  </div>
                  <div>
                    <dt>Nhà đầu tư</dt>
                    <dd>{progressData ? progressData.investorCount : '…'}</dd>
                  </div>
                  <div>
                    <dt>Note đã cam kết</dt>
                    <dd>{progressData ? `${progressData.committedNoteCount} / ${maxNotes ?? '—'}` : '…'}</dd>
                  </div>
                  <div>
                    <dt>{progressData?.fullyFundedAt ? 'Đủ vốn lúc' : 'Hạn gọi vốn'}</dt>
                    <dd>
                      {progressData?.fullyFundedAt
                        ? formatDateTime(progressData.fullyFundedAt)
                        : formatDateTime(listing.fundingClosesAt)}
                      {listing.status === 'OPEN' && (
                        <span className={`inv-desc inv-next is-${fundingWindow.tone}`}> · {fundingWindow.label}</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </>
            )}
          </section>

          <section className="inv-detail-card" aria-labelledby="inv-terms-title">
            <h3 id="inv-terms-title" className="inv-detail-heading">Điều khoản</h3>
            <dl className="inv-kv">
              <div>
                <dt>Lãi suất</dt>
                <dd>{formatRate(listing.annualInterestRate)}</dd>
              </div>
              <div>
                <dt>Kỳ hạn</dt>
                <dd>{formatMonths(listing.termMonths)}</dd>
              </div>
              <div>
                <dt>Phương thức trả nợ</dt>
                <dd>{repaymentLabel(listing.repaymentMethod)}</dd>
              </div>
              <div>
                <dt>Mệnh giá Note</dt>
                <dd>{formatMoney(listing.noteDenomination)} đ</dd>
              </div>
              <div>
                <dt>Đầu tư tối thiểu</dt>
                <dd>{formatMoney(listing.minInvestmentAmount)} đ</dd>
              </div>
              <div>
                <dt>Số Note tối đa</dt>
                <dd>{maxNotes ?? '—'}</dd>
              </div>
            </dl>
          </section>
        </div>

        <section aria-labelledby="inv-investors-title">
          <h3 id="inv-investors-title" className="inv-detail-heading">
            Nhà đầu tư đã góp vốn
            {live.length > 0 && <span className="inv-desc"> · {live.length} người đang góp</span>}
          </h3>

          {investorsLoading && <div className="inv-empty">Đang tải danh sách nhà đầu tư&hellip;</div>}

          {investorsError && (
            <div className="inv-error" role="alert">
              Không tải được danh sách nhà đầu tư.{' '}
              <button type="button" className="inv-link" onClick={refetchInvestors}>Thử lại</button>
            </div>
          )}

          {!investorsLoading && !investorsError && investors.length === 0 && (
            <div className="inv-empty">
              {listing.status === 'DRAFT'
                ? 'Khoản vay chưa lên sàn nên chưa ai góp vốn được.'
                : 'Chưa có ai góp vốn vào khoản vay này.'}
            </div>
          )}

          {!investorsLoading && !investorsError && investors.length > 0 && (
            <div className="inv-table-wrap">
              <table className="inv-table inv-table-compact">
                <thead>
                  <tr>
                    <th className="inv-col-index">#</th>
                    <th>Nhà đầu tư</th>
                    <th className="inv-num">Số tiền</th>
                    <th className="inv-num">Số Note</th>
                    <th className="inv-num">Tỷ lệ</th>
                    <th>Trạng thái</th>
                    <th>Thời điểm</th>
                    {notesIssued && <th><span className="inv-sr-only">Note</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {investors.map((investor, index) => {
                    const expanded = expandedCommitment === investor.commitmentId;
                    const canShowNotes = notesIssued && investor.status === 'FINALIZED';
                    return (
                      <Fragment key={investor.commitmentId}>
                        <tr className={investor.status === 'CANCELLED' ? 'is-muted' : undefined}>
                          <td className="inv-col-index">{index + 1}</td>
                          <td>
                            <div className="inv-name">
                              {names[investor.investorId] ?? (
                                <span className="inv-desc">
                                  {namesLoading ? 'Đang tra tên…' : 'Không tra được tên'}
                                </span>
                              )}
                            </div>
                            <div className="inv-desc inv-investor-id">{investor.investorId}</div>
                          </td>
                          <td className="inv-num">{formatMoney(investor.amount)} đ</td>
                          <td className="inv-num">{investor.noteCount}</td>
                          <td className="inv-num">{formatPercent(investor.sharePercent)}</td>
                          <td>
                            <span className={`inv-status ${COMMITMENT_TONE[investor.status]}`}>
                              {COMMITMENT_LABEL[investor.status]}
                            </span>
                          </td>
                          <td className="inv-desc">{formatDateTime(investor.createdAt)}</td>
                          {notesIssued && (
                            <td className="inv-col-actions">
                              {canShowNotes && (
                                <button
                                  type="button"
                                  className="inv-btn sm inv-btn-ghost"
                                  aria-expanded={expanded}
                                  onClick={() => setExpandedCommitment(expanded ? null : investor.commitmentId)}
                                >
                                  {expanded ? 'Ẩn Note' : `Xem ${investor.noteCount} Note`}
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                        {expanded && (
                          <tr className="inv-notes-row">
                            <td colSpan={investorColumns}>
                              <CommitmentNotes commitmentId={investor.commitmentId} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {message && (
          <div
            className={message.tone === 'ok' ? 'inv-notice' : 'inv-error'}
            role={message.tone === 'ok' ? 'status' : 'alert'}
          >
            {message.text}
          </div>
        )}

        <footer className="inv-modal-actions inv-modal-actions-split">
          <span className="inv-next-hint">{nextStepHint(listing, stage)}</span>
          <div className="inv-actions">
            <button type="button" className="inv-btn inv-btn-ghost" disabled={busy} onClick={onClose}>
              Đóng
            </button>
            {stage.nextAction === 'APPROVE' && (
              <button type="button" className="inv-btn inv-btn-brand" onClick={() => onApprove(listing)}>
                Duyệt lên sàn
              </button>
            )}
            {stage.nextAction === 'FINALIZE' && (
              <button type="button" className="inv-btn inv-btn-brand" disabled={busy} onClick={handleFinalize}>
                {finalizeState.isLoading ? 'Đang khóa vốn…' : 'Khóa vốn'}
              </button>
            )}
            {stage.nextAction === 'ACTIVATE_NOTES' && (
              <button type="button" className="inv-btn inv-btn-brand" disabled={busy} onClick={handleActivate}>
                {activateState.isLoading ? 'Đang phát hành…' : 'Phát hành Notes'}
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
