import { useState } from 'react';
import type { AdminLoanReviewDetail } from '../types';
import {
  APPLICATION_STATUS_LABELS,
  formatBusinessLabel,
  formatDate,
  formatDateTime,
  formatMoney,
  formatMonths,
  formatPercent,
} from '../formatters';

type ReviewTab = 'overview' | 'assessment' | 'schedule' | 'history';

const TABS: Array<{ id: ReviewTab; label: string }> = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'assessment', label: 'Thông tin thẩm định' },
  { id: 'schedule', label: 'Lịch trả dự kiến' },
  { id: 'history', label: 'Lịch sử xử lý' },
];

type Props = {
  application: AdminLoanReviewDetail;
  assessmentAction?: React.ReactNode;
  decisionPanel?: React.ReactNode;
};

function DataList({ children }: { children: React.ReactNode }) {
  return <dl className="review-data">{children}</dl>;
}

function DataItem({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {hint ? <span className="review-field-hint">{hint}</span> : null}
    </div>
  );
}

function OverviewTab({ application }: { application: AdminLoanReviewDetail }) {
  const financial = application.financialInformation;
  return (
    <div className="review-grid">
      <article className="review-card">
        <div className="review-card-heading">
          <div>
            <span className="review-eyebrow">Khoản vay đề nghị</span>
            <h2>Điều khoản người vay đã chọn</h2>
          </div>
          <span className="review-status-pill">{APPLICATION_STATUS_LABELS[application.status]}</span>
        </div>
        <DataList>
          <DataItem label="Người vay" value={application.borrowerId} />
          <DataItem label="Số tiền đề nghị" value={formatMoney(application.requestedAmount)} />
          <DataItem label="Kỳ hạn" value={`${application.requestedTermMonths} tháng`} />
          <DataItem label="Lãi suất cố định" value={`${formatPercent(application.annualInterestRate)}/năm`} />
          <DataItem label="Mục đích vay" value={formatBusinessLabel(application.purposeCode)} hint={application.purposeDetail ?? undefined} />
          <DataItem label="Phương thức trả" value={formatBusinessLabel(application.repaymentMethod)} />
        </DataList>
      </article>

      <article className="review-card">
        <div className="review-card-heading">
          <div>
            <span className="review-eyebrow">Thông tin tự khai</span>
            <h2>Khả năng tài chính</h2>
          </div>
        </div>
        <DataList>
          <DataItem label="Thu nhập hằng tháng" value={formatMoney(financial.declaredMonthlyIncome)} />
          <DataItem label="Thu nhập quy đổi năm" value={formatMoney(financial.annualIncomeSnapshot)} />
          <DataItem label="Nghĩa vụ nợ mỗi tháng" value={formatMoney(financial.monthlyDebtObligations)} />
          <DataItem label="Tỷ lệ nợ trên thu nhập (DTI)" value={formatPercent(financial.dtiSnapshot)} />
          <DataItem label="Thâm niên làm việc" value={formatMonths(financial.employmentLengthMonths)} />
          <DataItem label="Trình độ học vấn" value={formatBusinessLabel(financial.educationLevel)} />
          <DataItem label="Tình trạng nhà ở" value={formatBusinessLabel(financial.homeOwnership)} />
          <DataItem label="Nguồn thông tin" value={formatBusinessLabel(financial.informationSource)} />
        </DataList>
      </article>
    </div>
  );
}

function AssessmentTab({ application, action }: { application: AdminLoanReviewDetail; action?: React.ReactNode }) {
  const { assessment, eligibility, creditProfile } = application;
  return (
    <div className="review-assessment-layout">
      <article className="review-card review-ai-card">
        <div className="review-card-heading">
          <div>
            <span className="review-eyebrow">Kết quả đánh giá tự động</span>
            <h2>Đánh giá rủi ro tín dụng</h2>
          </div>
          {action}
        </div>
        {assessment ? (
          <>
            <div className="review-score-summary">
              <div className="review-score-circle">
                <strong>{assessment.riskScore ?? '—'}</strong>
                <span>điểm rủi ro</span>
              </div>
              <div>
                <strong className="review-grade">Hạng {assessment.creditGrade ?? '—'}</strong>
                <p>{formatBusinessLabel(assessment.aiRecommendation)}</p>
                <span className="review-muted">Mô hình {assessment.actualModelVersion ?? 'chưa xác định'} · {formatBusinessLabel(assessment.status)}</span>
              </div>
            </div>
            <DataList>
              <DataItem label="Xác suất rủi ro dự kiến" value={formatPercent(assessment.pdProbability, true)} />
              <DataItem label="Điểm đánh giá" value={assessment.evaluationScore ?? '—'} />
              <DataItem label="Hạn mức AI gợi ý" value={formatMoney(assessment.suggestedLimit)} />
              <DataItem label="Lý do cảnh báo" value={assessment.rejectionReason || 'Không ghi nhận cảnh báo riêng'} />
            </DataList>
          </>
        ) : <p className="review-empty-inline">Hồ sơ chưa có kết quả đánh giá tự động.</p>}
      </article>

      <div className="review-grid">
        <article className="review-card">
          <div className="review-card-heading">
            <div><span className="review-eyebrow">Điều kiện đầu vào</span><h2>Danh tính và điều kiện vay</h2></div>
          </div>
          {eligibility ? (
            <DataList>
              <DataItem label="Kết quả kiểm tra" value={formatBusinessLabel(eligibility.result)} />
              <DataItem label="Trạng thái định danh" value={formatBusinessLabel(eligibility.kycStatus)} />
              <DataItem label="Tuổi tại thời điểm nộp" value={`${eligibility.age} tuổi`} />
              <DataItem label="Nguồn hồ sơ" value={formatBusinessLabel(eligibility.profileSource)} />
              <DataItem label="Lý do cần lưu ý" value={eligibility.reasonCode ? formatBusinessLabel(eligibility.reasonCode) : 'Không có'} />
              <DataItem label="Kiểm tra lúc" value={formatDateTime(eligibility.checkedAt)} />
            </DataList>
          ) : <p className="review-empty-inline">Chưa có kết quả kiểm tra điều kiện.</p>}
        </article>

        <article className="review-card">
          <div className="review-card-heading">
            <div><span className="review-eyebrow">Dữ liệu trong FINORA</span><h2>Lịch sử tín dụng nội bộ</h2></div>
          </div>
          {creditProfile ? (
            <DataList>
              <DataItem label="Đã có lịch sử nội bộ" value={creditProfile.hasInternalCreditHistory ? 'Có' : 'Chưa có'} />
              <DataItem label="Lần trễ hạn trong 2 năm" value={creditProfile.internalDelinquenciesLast2Years} />
              <DataItem label="Khoản vay từng vỡ nợ" value={creditProfile.internalDefaultedLoanCount} />
              <DataItem label="Khoản vay đã hoàn tất" value={creditProfile.completedLoanCount} />
              <DataItem label="Nguồn dữ liệu" value={formatBusinessLabel(creditProfile.source)} />
              <DataItem label="Ý nghĩa" value={creditProfile.hasInternalCreditHistory ? 'Số liệu được tổng hợp từ hoạt động vay tại FINORA.' : 'Người vay chưa phát sinh lịch sử tín dụng tại FINORA.'} />
            </DataList>
          ) : <p className="review-empty-inline">Chưa có dữ liệu lịch sử tín dụng nội bộ.</p>}
        </article>
      </div>
    </div>
  );
}

function ScheduleTab({ application }: { application: AdminLoanReviewDetail }) {
  const schedule = application.schedule;
  return (
    <article className="review-card">
      <div className="review-card-heading">
        <div>
          <span className="review-eyebrow">Do hệ thống lõi tính toán</span>
          <h2>Lịch trả nợ dự kiến</h2>
        </div>
      </div>
      <p className="review-explanation">
        Đây là lịch dự kiến tại thời điểm nộp hồ sơ. Lịch chính thức chỉ được chốt theo ngày giải ngân thực tế.
      </p>
      <DataList>
        <DataItem label="Ngày giải ngân dự kiến" value={formatDate(schedule.expectedDisbursementDate)} />
        <DataItem label="Tổng tiền gốc" value={formatMoney(schedule.totalPrincipal)} />
        <DataItem label="Tổng tiền lãi" value={formatMoney(schedule.totalInterest)} />
        <DataItem label="Tổng phí" value={formatMoney(schedule.totalFees)} />
        <DataItem label="Tổng tiền phạt dự kiến" value={formatMoney(schedule.totalPenalties)} />
        <DataItem label="Tổng số tiền phải trả" value={formatMoney(schedule.totalRepayment)} />
        <DataItem label="Kỳ trả đầu tiên" value={formatMoney(schedule.firstInstallment)} />
        <DataItem label="Kỳ trả cao nhất" value={formatMoney(schedule.maximumInstallment)} />
      </DataList>
      <div className="review-schedule-heading">
        <h3>Chi tiết {schedule.periods.length} kỳ trả</h3>
        <span>Khoản phí hoặc phạt bằng 0 vẫn được giữ để đối chiếu đúng dữ liệu đã lưu.</span>
      </div>
      <div className="review-table-wrap review-schedule-table-wrap">
        <table className="review-table review-schedule-table">
          <thead>
            <tr>
              <th>Kỳ</th>
              <th>Từ ngày</th>
              <th>Đến hạn</th>
              <th>Số ngày</th>
              <th>Gốc</th>
              <th>Lãi</th>
              <th>Phí</th>
              <th>Phạt</th>
              <th>Tổng trả</th>
              <th>Dư nợ còn lại</th>
            </tr>
          </thead>
          <tbody>
            {schedule.periods.map((period) => (
              <tr key={period.period}>
                <td><strong>{period.period}</strong></td>
                <td>{formatDate(period.fromDate)}</td>
                <td>{formatDate(period.dueDate)}</td>
                <td>{period.daysInPeriod}</td>
                <td>{formatMoney(period.principal)}</td>
                <td>{formatMoney(period.interest)}</td>
                <td>{formatMoney(period.fees)}</td>
                <td>{formatMoney(period.penalties)}</td>
                <td><strong>{formatMoney(period.totalDue)}</strong></td>
                <td>{formatMoney(period.outstandingBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {schedule.periods.length === 0 ? (
        <p className="review-empty-inline">Snapshot chưa có chi tiết từng kỳ.</p>
      ) : null}
      <details className="review-technical">
        <summary>Thông tin đối soát kỹ thuật</summary>
        <p>Phiên bản cách tính: {schedule.calculationPolicyVersion}</p>
        <p>Tính lúc: {formatDateTime(schedule.calculatedAt)}</p>
      </details>
    </article>
  );
}

function HistoryTab({ application }: { application: AdminLoanReviewDetail }) {
  return (
    <article className="review-card">
      <div className="review-card-heading">
        <div><span className="review-eyebrow">Dấu vết xử lý</span><h2>Lịch sử trạng thái hồ sơ</h2></div>
      </div>
      {application.recentHistory.length === 0 ? (
        <p className="review-empty-inline">Chưa có lịch sử xử lý.</p>
      ) : (
        <ol className="review-timeline">
          {application.recentHistory.map((item) => (
            <li key={item.id}>
              <span className="review-timeline-dot" />
              <div>
                <strong>{APPLICATION_STATUS_LABELS[item.toStatus]}</strong>
                <p>{item.fromStatus ? `Chuyển từ ${APPLICATION_STATUS_LABELS[item.fromStatus]}` : 'Hồ sơ được khởi tạo'}</p>
                {item.reasonDetail ? <p>{item.reasonDetail}</p> : null}
                <span>{formatDateTime(item.createdAt)} · {formatBusinessLabel(item.actorType)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </article>
  );
}

/** Biến response nghiệp vụ thành các tab dễ đọc; không đưa JSON kỹ thuật trực tiếp cho admin. */
export default function LoanReviewContent({ application, assessmentAction, decisionPanel }: Props) {
  const [activeTab, setActiveTab] = useState<ReviewTab>('overview');
  return (
    <>
      <div className="review-detail-tabs" role="tablist" aria-label="Nội dung hồ sơ vay">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {activeTab === 'overview' ? <OverviewTab application={application} /> : null}
        {activeTab === 'assessment' ? (
          <>
            <AssessmentTab application={application} action={assessmentAction} />
            {decisionPanel}
          </>
        ) : null}
        {activeTab === 'schedule' ? <ScheduleTab application={application} /> : null}
        {activeTab === 'history' ? <HistoryTab application={application} /> : null}
      </div>
    </>
  );
}
