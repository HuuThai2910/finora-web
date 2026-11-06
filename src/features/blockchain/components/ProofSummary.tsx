import { Icon } from '@/components/Icon';
import { StatusPill, type PillTone } from '@/components/StatusPill';
import { formatDateTime } from '@/utils';
import { MOCK_LEDGER_NOTICE } from '../constants';
import { aggregateLabel, proofTypeLabel } from '../mappers/proofDisplay';
import { BC_ICON } from '../styles';
import type { Proof } from '../types';

interface SummaryCopy {
  title: string;
  description: string;
  label: string;
  tone: PillTone;
  className: string;
}

/** Kết luận nghiệp vụ ngắn gọn; chi tiết hash/Fabric được giữ ở phần kỹ thuật bên dưới. */
function summaryCopy(proof: Proof): SummaryCopy {
  if (proof.status === 'DEAD_LETTER') {
    return {
      title: 'Chưa thể ghi nhận bằng chứng',
      description: 'Hệ thống đã dừng gửi sau nhiều lần không thành công. Cần xử lý lỗi trước khi đưa lại hàng đợi.',
      label: 'Cần xử lý', tone: 'danger', className: 'danger',
    };
  }
  if (proof.status === 'PENDING' || proof.status === 'PROCESSING') {
    return {
      title: 'Đang ghi nhận bằng chứng',
      description: 'Giao dịch nghiệp vụ đã hoàn tất; hệ thống đang ghi dấu vân tay dữ liệu lên sổ cái.',
      label: 'Đang xử lý', tone: 'info', className: 'info',
    };
  }
  if (proof.provider === 'MOCK') {
    return {
      // Câu cảnh báo duy nhất của bằng chứng MOCK (thay câu tiếng Anh backend gắn vào biên nhận).
      title: 'Đã ghi nhận trong môi trường chạy thử',
      description: MOCK_LEDGER_NOTICE,
      label: 'Bản demo', tone: 'warning', className: 'warning',
    };
  }
  if (proof.chainCheck?.status === 'MISMATCHED' || proof.chainCheck?.status === 'MISSING_ON_CHAIN') {
    return {
      title: 'Phát hiện dữ liệu cần kiểm tra',
      description: proof.chainCheck.status === 'MISMATCHED'
        ? 'Bản ghi trong hệ thống không còn khớp với bằng chứng trên sổ cái.'
        : 'Không tìm thấy bằng chứng tương ứng trên sổ cái.',
      label: 'Không khớp', tone: 'danger', className: 'danger',
    };
  }
  if (proof.chainCheck?.status === 'MATCHED') {
    return {
      title: 'Dữ liệu đã được xác minh',
      description: 'Bản ghi trong hệ thống khớp với bằng chứng đã ghi trên Hyperledger Fabric.',
      label: 'Đã xác minh', tone: 'success', className: 'success',
    };
  }
  return {
    title: 'Đã ghi lên sổ cái',
    description: 'Bằng chứng đã được ghi nhận. Bạn có thể bấm “Kiểm tra lại” để đối chiếu dữ liệu hiện tại.',
    label: 'Đã ghi nhận', tone: 'success', className: 'success',
  };
}

/** Tóm tắt dễ đọc dành cho quản trị viên nghiệp vụ trước khi hiển thị dữ liệu kiểm toán kỹ thuật. */
export function ProofSummary({ proof }: { proof: Proof }) {
  const summary = summaryCopy(proof);
  const recordedAt = proof.receipt?.confirmedAt ?? proof.createdAt;

  return (
    <section
      className={
        `bc-summary ${summary.className} grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg border border-line bg-surface-muted p-3.5 `
        + 'max-[520px]:grid-cols-[1fr] [&.danger]:border-[#edc3c9] [&.danger]:bg-[#fff6f7] [&.info]:border-[#bfd6f8] '
        + '[&.info]:bg-[#f4f8ff] [&.success]:border-[#b9e4d0] [&.success]:bg-[#f2fbf7] [&.warning]:border-[#ead9aa] '
        + '[&.warning]:bg-[#fffaf0]'
      }
      aria-labelledby="bc-summary-title"
    >
      <div
        className={`bc-summary-icon ${BC_ICON} in-[.bc-summary.danger]:text-danger in-[.bc-summary.warning]:text-warning`}
      >
        <Icon name="shieldCheck" />
      </div>
      <div className="bc-summary-copy min-w-0">
        <div className="bc-summary-title-row flex flex-wrap items-center justify-between gap-2">
          <h3 id="bc-summary-title" className="text-[15px] font-bold">{summary.title}</h3>
          <StatusPill tone={summary.tone}>{summary.label}</StatusPill>
        </div>
        <p className="mt-1 text-[13px] leading-normal text-secondary">{summary.description}</p>
        <dl
          className={
            'bc-summary-facts mt-3 grid grid-cols-3 gap-2 max-[760px]:grid-cols-[1fr] [&_div]:min-w-0 [&_dt]:text-[11px] '
            + '[&_dt]:text-muted [&_dd]:mt-0.5 [&_dd]:text-[12px] [&_dd]:font-semibold [&_dd]:text-primary [&_dd]:wrap-anywhere'
          }
        >
          <div><dt>Nghiệp vụ</dt><dd>{proofTypeLabel(proof.proofType)}</dd></div>
          <div><dt>{aggregateLabel(proof.aggregateType)}</dt><dd>{proof.aggregateId}</dd></div>
          <div><dt>Ghi nhận lúc</dt><dd>{formatDateTime(recordedAt)}</dd></div>
        </dl>
      </div>
    </section>
  );
}
