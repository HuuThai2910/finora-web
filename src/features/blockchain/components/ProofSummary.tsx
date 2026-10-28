import { Icon } from '@/components/Icon';
import { StatusPill, type PillTone } from '@/components/StatusPill';
import { formatDateTime } from '@/utils';
import { aggregateLabel, proofTypeLabel } from '../mappers/proofDisplay';
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
      title: 'Đã ghi nhận trong môi trường demo',
      description: 'Dấu vân tay dữ liệu đã được tạo để thử luồng, nhưng chưa được ghi lên Hyperledger Fabric.',
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
    <section className={`bc-summary ${summary.className}`} aria-labelledby="bc-summary-title">
      <div className="bc-summary-icon"><Icon name="shieldCheck" /></div>
      <div className="bc-summary-copy">
        <div className="bc-summary-title-row">
          <h3 id="bc-summary-title">{summary.title}</h3>
          <StatusPill tone={summary.tone}>{summary.label}</StatusPill>
        </div>
        <p>{summary.description}</p>
        <dl className="bc-summary-facts">
          <div><dt>Nghiệp vụ</dt><dd>{proofTypeLabel(proof.proofType)}</dd></div>
          <div><dt>{aggregateLabel(proof.aggregateType)}</dt><dd>{proof.aggregateId}</dd></div>
          <div><dt>Ghi nhận lúc</dt><dd>{formatDateTime(recordedAt)}</dd></div>
        </dl>
      </div>
    </section>
  );
}
