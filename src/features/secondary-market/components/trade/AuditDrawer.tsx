import type { ReactNode } from 'react';
import { Drawer } from '@/components/Drawer';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { MOCK_LEDGER_NOTICE, useVerifyProofMutation, type Proof } from '@/features/blockchain';
import { formatDateTime } from '@/utils';
import { CopyIconButton } from '../CopyIconButton';

interface Props {
  proof: Proof;
  documentNumber: string | null;
  onClose: () => void;
}

type CheckTone = 'success' | 'warning' | 'danger' | 'neutral';

/** Kết quả đối chiếu bản ghi FINORA với sổ cái, theo mã backend trả về (lưu trên proof hoặc của lần bấm vừa rồi). */
const CHECK_COPY: Record<string, { tone: CheckTone; title: string; description: string }> = {
  MATCHED: {
    tone: 'success', title: 'Khớp với sổ cái',
    description: 'Mã băm đang lưu trùng với mã băm đã ghi trên Hyperledger Fabric.',
  },
  MISMATCHED: {
    tone: 'danger', title: 'Không khớp với sổ cái',
    description: 'Bản ghi đang lưu khác bằng chứng trên sổ cái; cần chuyển cho kỹ thuật hoặc kiểm toán kiểm tra.',
  },
  MISSING_ON_CHAIN: {
    tone: 'danger', title: 'Không có trên sổ cái',
    description: 'Sổ cái không trả về bằng chứng tương ứng với bản ghi này.',
  },
  NOT_CONFIRMED: {
    tone: 'neutral', title: 'Chưa được sổ cái xác nhận',
    description: 'Bằng chứng vẫn đang chờ ghi lên sổ cái.',
  },
  LEDGER_UNAVAILABLE: {
    tone: 'warning', title: 'Chưa kết nối được sổ cái',
    description: 'Không đối chiếu được lúc này; dữ liệu giao dịch không bị ảnh hưởng.',
  },
  NOT_ON_CHAIN_MOCK: {
    tone: 'warning', title: 'Sổ cái giả lập',
    description: 'Bằng chứng ghi trên sổ cái chạy thử nên không đối chiếu được với Hyperledger Fabric.',
  },
};

const CHECK_BOX: Record<CheckTone, string> = {
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  neutral: 'bg-surface-muted text-secondary',
};
const ROWS = 'grid [&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:gap-3 [&>div]:py-1.75 '
  + '[&>div]:text-[13px] [&_dt]:text-secondary [&_dd]:text-right [&_dd]:font-medium [&_dd]:tabular-nums';
const HASH = 'min-w-0 flex-1 rounded-md bg-surface-muted px-2 py-1.5 font-mono text-[12px] leading-normal break-all text-primary';
const SECTION = 'border-b border-b-divider py-3.5 last:border-b-0';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt>{label}</dt><dd>{children}</dd></div>;
}

/** Mã dài (mã băm, mã giao dịch): nhãn trên, giá trị dưới trong khung xám, nút chép bên phải. */
function LongCode({ label, value, what }: { label: string; value: string; what: string }) {
  return (
    <div className="block!">
      <dt>{label}</dt>
      <dd className="mt-1 flex items-start gap-1 text-left! font-normal!">
        <span className={HASH}>{value}</span>
        <CopyIconButton value={value} what={what} />
      </dd>
    </div>
  );
}

function CheckBox({ code }: { code: string }) {
  const copy = CHECK_COPY[code] ?? { tone: 'neutral' as const, title: code, description: '' };
  return (
    <div className={`mt-1.5 rounded-md px-3 py-2.5 text-[13px] ${CHECK_BOX[copy.tone]}`} role="status">
      <b className="block font-semibold">{copy.title}</b>
      <span className="text-secondary">{copy.description}</span>
    </div>
  );
}

/**
 * Ngăn Kiểm toán mở từ cột Tiến trình của chi tiết giao dịch: những gì đã ghi lên blockchain cho giấy xác nhận của lần
 * khớp (bản ghi, mã băm đã neo, biên nhận của sổ cái) và kết quả đối chiếu, cùng nguồn với trang Kiểm toán. Sổ cái giả
 * lập (MOCK) thì nói rõ không có biên nhận Fabric và không đối chiếu được.
 */
export function AuditDrawer({ proof, documentNumber, onClose }: Props) {
  const [verify, verification] = useVerifyProofMutation();
  const mock = proof.provider === 'MOCK';
  const receipt = proof.receipt;
  const onChain = receipt?.kind === 'FABRIC_ON_CHAIN' && receipt.onChain;
  const checkCode = verification.data?.chain.result ?? proof.chainCheck?.status ?? null;

  return (
    <Drawer
      wide={false}
      title={<h2>Kiểm toán</h2>}
      subtitle={documentNumber
        ? <span className="text-muted text-[12.5px]">Giấy xác nhận <span className="ui-mono text-[12px]">{documentNumber}</span></span>
        : undefined}
      onClose={onClose}
    >
      <div className="-mt-1.5">
        <section className={SECTION}>
          <h3>Bản ghi trên blockchain</h3>
          <dl className={ROWS}>
            <Fact label="Mốc">Giấy xác nhận chuyển nhượng</Fact>
            <Fact label="Sổ cái">{mock ? 'Sổ cái giả lập (chạy thử)' : 'Hyperledger Fabric'}</Fact>
            <Fact label="Trạng thái">
              {proof.status === 'CONFIRMED'
                ? <StatusPill tone="success" dot small>Đã ghi sổ</StatusPill>
                : <StatusPill tone="neutral" dot small>Đang ghi sổ</StatusPill>}
            </Fact>
            <Fact label="Ghi sổ lúc">{formatDateTime(receipt?.confirmedAt ?? proof.updatedAt)}</Fact>
          </dl>
        </section>

        <section className={SECTION}>
          <h3>Dữ liệu đã neo</h3>
          <dl className={ROWS}>
            <LongCode label="Mã băm SHA-256" value={proof.hash.value} what="mã băm" />
            <Fact label="Tính từ">Tệp PDF giấy xác nhận đã đóng dấu số</Fact>
          </dl>
        </section>

        <section className={SECTION}>
          <h3>Biên nhận của sổ cái</h3>
          {onChain && receipt ? (
            <dl className={ROWS}>
              {receipt.transactionId && <LongCode label="Mã giao dịch" value={receipt.transactionId} what="mã giao dịch" />}
              {receipt.blockReference && <Fact label="Block">#{receipt.blockReference}</Fact>}
              <Fact label="Xác nhận lúc">{formatDateTime(receipt.confirmedAt)}</Fact>
            </dl>
          ) : (
            <p className="rounded-md bg-warning-bg px-3 py-2.5 text-warning text-[13px]">
              {mock ? MOCK_LEDGER_NOTICE : 'Chưa có biên nhận của sổ cái cho bằng chứng này.'}
            </p>
          )}
        </section>

        <section className={SECTION}>
          <h3>Đối chiếu</h3>
          {mock ? (
            <CheckBox code="NOT_ON_CHAIN_MOCK" />
          ) : (
            <>
              {checkCode ? (
                <CheckBox code={checkCode} />
              ) : (
                <p className="text-muted text-[13px]">Chưa đối chiếu lần nào với sổ cái.</p>
              )}
              {verification.error && <div className="mt-2"><ErrorNotice error={verification.error} /></div>}
              <button
                type="button"
                className="ui-btn ghost mt-3 h-9 w-full"
                disabled={verification.isLoading}
                onClick={() => void verify({ proofId: proof.proofId })}
              >
                {verification.isLoading ? 'Đang đối chiếu...' : 'Đối chiếu lại'}
              </button>
            </>
          )}
        </section>
      </div>
    </Drawer>
  );
}
