import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { useTransferDocumentDownload } from '@/features/secondary-market';
import { useTransferDocumentVerify } from '../hooks/useTransferDocumentVerify';
import type { PdfHashCheck } from '../mappers/documentHash';
import { VerifyResults } from './VerifyResults';

/** Kết quả so hash tệp PDF; nhãn và màu tách khỏi kết quả sổ cái để không lẫn hai lớp kiểm. */
function PdfHashResult({ pdf }: { pdf: PdfHashCheck }) {
  return (
    <div className="bc-result">
      <div className="bc-result-head">
        <h4>{pdf.matched ? 'Tệp PDF còn nguyên vẹn' : 'Tệp PDF đã khác bản được neo'}</h4>
        <StatusPill tone={pdf.matched ? 'success' : 'danger'}>
          {pdf.matched ? 'PDF khớp hash' : 'PDF không khớp hash'}
        </StatusPill>
      </div>
      <p className="bc-result-description">
        {pdf.matched
          ? 'SHA-256 của tệp PDF vừa tải về trùng với hash ghi trong dữ liệu nguồn của bằng chứng.'
          : 'SHA-256 của tệp PDF vừa tải về khác hash ghi trong dữ liệu nguồn. Không dùng tệp này cho tới khi kiểm tra xong.'}
      </p>
      <dl className="ui-rows bc-rows">
        <div className="bc-stack"><dt>Hash đã neo (documentHash)</dt><dd><span className="bc-hash">{pdf.expected}</span></dd></div>
        <div className="bc-stack"><dt>SHA-256 của tệp tải về</dt><dd><span className="bc-hash">{pdf.actual}</span></dd></div>
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
    <div className="bc-verify">
      <div className="bc-verify-main">
        <div>
          <h4>Giấy xác nhận chuyển nhượng</h4>
          <p>
            Tải tệp PDF đã ký số của giao dịch <span className="ui-mono">{tradeReference}</span>, hoặc xác minh tệp đang
            lưu còn đúng với bằng chứng đã ghi.
          </p>
        </div>
        <div className="bc-doc-actions">
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
      {pdfDownload.error != null && !pdfDownload.downloading && <ErrorNotice error={pdfDownload.error} />}
      {running && <div className="ui-empty" aria-busy="true">Đang tải văn bản và tính SHA-256...</div>}
      {(state.status === 'done' || state.status === 'error') && state.pdf && (
        <div className="bc-results" role="status"><PdfHashResult pdf={state.pdf} /></div>
      )}
      {state.status === 'error' && <ErrorNotice error={state.error} />}
      {state.status === 'done' && <VerifyResults result={state.verification} />}
    </div>
  );
}
