import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { fromListState } from '@/lib/navigation';
import { APPLICATION_STATUS_LABELS, formatMoney, formatPercent, formatScore } from '../formatters';
import {
  applicationStatusTone,
  formatCompactDateTime,
  recommendationTone,
  unscoredLabel,
} from '../mappers/applicationListDisplay';
import { SERVICING_FLAG_LABELS } from '../constant';
import type { AdminLoanReviewSummary } from '../types';
import { ApplicationPurposeCell } from './ApplicationPurposeCell';

interface ApplicationTableProps {
  applications: AdminLoanReviewSummary[];
  /** Đổi ID người vay thành tên (tra từ finora-user). */
  displayName: (actorId: string | null | undefined) => string;
  /** Người vay đã xác minh eKYC; chưa tra được thì coi là chưa biết, không gắn dấu. */
  isVerified: (actorId: string) => boolean;
  /** Tô màu điểm theo khuyến nghị (chỉ ở tab Chờ thẩm định). */
  toneScores: boolean;
  /** Mở thẳng tab này của trang hồ sơ (vd. "servicing" khi đang lọc khoản vay quá hạn). */
  openTab?: string;
}

/** Dấu xác minh eKYC cạnh tên người vay (mockup loans.html). */
function VerifiedIcon() {
  return (
    <svg className="loan-verified flex-none size-3.5 text-brand" viewBox="0 0 24 24" role="img" aria-label="Đã xác minh danh tính">
      <path fill="currentColor" d="M12 2 14.4 4l3.1-.3.9 3 2.6 1.8-1.2 2.9 1.2 2.9-2.6 1.8-.9 3-3.1-.3L12 22l-2.4-2-3.1.3-.9-3L3 15.5l1.2-2.9L3 9.6l2.6-1.8.9-3 3.1.3Z" />
      <path d="m8.5 12 2.4 2.4 4.6-4.8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Cột Người vay ẩn ở màn hẹp để bảng không phải cuộn ngang.
const HIDE_SM = 'hide-sm max-[760px]:hidden';

// Màu điểm theo khuyến nghị (lớp tone do recommendationTone trả về), chỉ gắn khi bảng bật `toneScores`.
const SCORE = 'loan-score font-bold tabular-nums [&.success]:text-success [&.warning]:text-warning [&.danger]:text-danger';

const reviewPath = (applicationNumber: string, tab?: string) =>
  `/loans/${encodeURIComponent(applicationNumber)}/review${tab ? `?tab=${tab}` : ''}`;

/** Bảng hồ sơ vay. Cả dòng bấm được để mở hồ sơ; nút cuối dòng giữ cho người dùng bàn phím và đọc màn hình. */
export function ApplicationTable({ applications, displayName, isVerified, toneScores, openTab }: ApplicationTableProps) {
  const navigate = useNavigate();
  // Nhớ URL danh sách (tab, trang) để chi tiết quay về đúng chỗ.
  const listState = fromListState(useLocation());
  const open = (applicationNumber: string) => navigate(reviewPath(applicationNumber, openTab), { state: listState });

  return (
    <div className="ui-table-wrap">
      <table className="ui-table list loan-table [&_td]:px-2.5 [&_th]:px-2.5">
        <thead>
          <tr>
            <th>Hồ sơ</th>
            <th>Trạng thái</th>
            <th className={HIDE_SM}>Người vay</th>
            <th className="num">Số tiền vay</th>
            <th className="num">Điểm</th>
            <th><span className="ui-sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => {
            const assessment = application.assessment;
            const borrower = displayName(application.borrowerId);
            const rate = application.finalAnnualInterestRate ?? application.annualInterestRate;
            const isPending = application.status === 'PENDING_REVIEW';
            return (
              <tr
                key={application.applicationNumber}
                className="clickable"
                tabIndex={0}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('a')) return;
                  open(application.applicationNumber);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && event.target === event.currentTarget) {
                    open(application.applicationNumber);
                  }
                }}
              >
                <td>
                  <ApplicationPurposeCell
                    applicationNumber={application.applicationNumber}
                    applicationCode={application.applicationCode}
                    purposeCode={application.purposeCode ?? null}
                    borrower={borrower}
                  />
                </td>
                <td>
                  <StatusPill tone={applicationStatusTone(application.status)} dot>
                    {APPLICATION_STATUS_LABELS[application.status] ?? application.status}
                  </StatusPill>
                  <span className="ui-sub">nộp {formatCompactDateTime(application.submittedAt)}</span>
                  {/* Nhãn cảnh báo việc sau giải ngân đang mở (quá hạn, chờ duyệt cơ cấu, sự cố). */}
                  {(application.servicingFlags?.length ?? 0) > 0 && (
                    <span className="loan-flags mt-1 flex flex-wrap gap-1">
                      {application.servicingFlags!.map((flag) => (
                        <StatusPill key={flag} tone={SERVICING_FLAG_LABELS[flag]?.tone ?? 'warning'} small>
                          {SERVICING_FLAG_LABELS[flag]?.label ?? 'Cần xử lý'}
                        </StatusPill>
                      ))}
                    </span>
                  )}
                </td>
                <td className={HIDE_SM}>
                  <span className="ui-person">
                    <Avatar name={borrower.replace(/^#/, '')} />
                    <span
                      className="loan-borrower inline-block max-w-45 overflow-hidden text-ellipsis align-middle"
                      title={borrower}
                    >
                      {borrower}
                    </span>
                    {isVerified(application.borrowerId) && <VerifiedIcon />}
                  </span>
                </td>
                <td className="num">
                  <span className="strong">{formatMoney(application.requestedAmount)}</span>
                  <span className="ui-sub">{application.requestedTermMonths} tháng, lãi {formatPercent(rate)}/năm</span>
                </td>
                <td className="num">
                  {assessment?.evaluationScore != null ? (
                    <>
                      <span className={toneScores ? `${SCORE} ${recommendationTone(assessment.aiRecommendation)}` : SCORE}>
                        {formatScore(assessment.evaluationScore)}
                      </span>
                      <span className="ui-sub">hạng {assessment.creditGrade ?? '-'}</span>
                    </>
                  ) : (
                    <span className="ui-sub">{unscoredLabel(assessment?.status ?? null)}</span>
                  )}
                </td>
                <td className="num">
                  <Link className="ui-btn soft" to={reviewPath(application.applicationNumber, openTab)} state={listState}>
                    {isPending ? 'Thẩm định' : 'Chi tiết'}
                    <Icon name="arrowRight" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
