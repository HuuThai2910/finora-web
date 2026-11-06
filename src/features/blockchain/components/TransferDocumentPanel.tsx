import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { useTransferDocumentDownload } from '@/features/secondary-market';
import { useTransferDocumentVerify } from '../hooks/useTransferDocumentVerify';
import type { PdfHashCheck } from '../mappers/documentHash';
import {
  BC_HASH, BC_RESULT, BC_RESULT_DESCRIPTION, BC_RESULT_HEAD, BC_STACK_ROW, BC_VERIFY_MAIN,
} from '../styles';
import { VerifyResults } from './VerifyResults';
import { ErrorToast } from '@/components/ErrorToast';

/** Kết quả so hash tệp PDF; nhãn và màu tách khỏi kết quả sổ cái để không lẫn hai lớp kiểm. */
function PdfHashResult({ pdf }: { pdf: PdfHashCheck }) {
  return (
    <div className={BC_RESULT}>
      <div className={BC_RESULT_HEAD}>
        <h4>{pdf.matched ? 'Tệp PDF còn nguyên vẹn' : 'Tệp PDF đã khác bản được neo'}</h4>
        <StatusPill tone={pdf.matched ? 'success' : 'danger'}>
          {pdf.matched ? 'PDF khớp hash' : 'PDF không khớp hash'}
        </StatusPill>
      </div>
      <p className={BC_RESULT_DESCRIPTION}>
        {pdf.matched
          ? 'SHA-256 của tệp PDF vừa tải về trùng với hash ghi trong dữ liệu nguồn của bằng chứng.'
          : 'SHA-256 của tệp PDF vừa tải về khác hash ghi trong dữ liệu nguồn. Không dùng tệp này cho tới khi kiểm tra xong.'}
      </p>
      <dl className="ui-rows bc-rows mt-1">
        <div className={BC_STACK_ROW}><dt>Hash đã neo (documentHash)</dt><dd><span className={BC_HASH}>{pdf.expected}</span></dd></div>
        <div className={BC_STACK_ROW}><dt>SHA-256 của tệp tải về</dt><dd><span className={BC_HASH}>{pdf.actual}</span></dd></div>
      </dl>
    </div>
  );
}

/**
 * Thao tác riêng của proof NOTE_TRANSFER_DOCUMENT trong ngăn chi tiết: tải PDF giấy xác nhận chuyển nhượng đã ký và
 * xác minh văn bản (hash của tệp PDF so với hash đã neo, rồi dữ liệu nguồn so với sổ cái). Trang cha đặt `key` theo
 * proof để kết quả của proof trước không lẫn sang.
 */
export function TransferDocumentPanel({ proofId, tradeReference }: { proofId: string; tradeReference: string }) {
  const pdfDownload = useTransferDocumentDownload();
  const { state, verify } = useTransferDocumentVerify(proofId, tradeReference);
  const running = state.status === 'running';

  return (
    <div className="bc-verify grid gap-3">
      <div className={BC_VERIFY_MAIN}>
        <div>
          <h4>Giấy xác nhận chuyển nhượng</h4>
          <p>
            Tải tệp PDF đã ký số của giao dịch <span className="ui-mono">{tradeReference}</span>, hoặc xác minh tệp đang
            lưu còn đúng với bằng chứng đã ghi.
          </p>
        </div>
        {/* Hai nút Tải PDF và Xác minh văn bản cùng hàng; màn hẹp thì xếp dọc. */}
        <div className="bc-doc-actions flex flex-none flex-wrap gap-2 max-[760px]:flex-col">
          <button
            type="button"
            className="ui-btn ghost"
            disabled={pdfDownload.downloading}
            onClick={() => void pdfDownload.download(tradeReference)}
          >
            <Icon name="file" />
            {pdfDownload.downloading ? 'Đang tải...' : 'Tải PDF'}
          </button>
          <button type="button" className="ui-btn primary" disabled={running} onClick={() => void verify()}>
            <Icon name="shieldCheck" />
            {running ? 'Đang xác minh...' : 'Xác minh văn bản'}
          </button>
        </div>
      </div>
      {pdfDownload.error != null && !pdfDownload.downloading && <ErrorToast error={pdfDownload.error} />}
      {running && <div className="ui-empty" aria-busy="true">Đang tải văn bản và tính SHA-256...</div>}
      {(state.status === 'done' || state.status === 'error') && state.pdf && (
        <div className="bc-results grid gap-3" role="status"><PdfHashResult pdf={state.pdf} /></div>
      )}
      {state.status === 'error' && <ErrorNotice error={state.error} />}
      {state.status === 'done' && <VerifyResults result={state.verification} />}
    </div>
  );
}
