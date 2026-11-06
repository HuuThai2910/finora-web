import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { groupEvidence, type EvidenceGroup } from '../mappers/evidenceDisplay';
import type { EkycDraft, EkycEvidenceItem } from '../types';
import { EvidenceTile, type ZoomImage } from './EvidenceTile';
import { EvidenceZoomFields } from './EvidenceZoomFields';
import { REVIEW_CARD, REVIEW_CARD_HEAD, REVIEW_CARD_TITLE, REVIEW_EMPTY_LINE, REVIEW_SUB_HEAD } from './reviewStyles';

/**
 * Cột tối thiểu của lưới theo nhóm: ảnh thẻ rộng hơn ảnh khung hình. Màn hẹp ảnh thẻ chiếm cả hàng (co về 145px thì
 * không đọc được chữ trên thẻ), khung hình và tệp khác về 140px.
 */
const GALLERY_COLUMNS: Record<EvidenceGroup['key'], string> = {
  card: 'grid-cols-[repeat(auto-fill,minmax(260px,1fr))] max-[760px]:grid-cols-[minmax(0,1fr)]',
  liveness: 'grid-cols-[repeat(auto-fill,minmax(180px,1fr))] max-[760px]:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]',
  other: 'grid-cols-[repeat(auto-fill,minmax(180px,1fr))] max-[760px]:grid-cols-[repeat(auto-fill,minmax(140px,1fr))]',
};

const CARD_KINDS: ReadonlySet<string> = new Set(['CCCD_FRONT', 'CCCD_BACK']);

interface EvidenceGalleryProps {
  attemptId: string;
  evidence: EkycEvidenceItem[];
  /** Bản nháp của lượt, hiện cạnh ảnh thẻ khi phóng to; `null` khi lượt không có bản nháp. */
  draft: EkycDraft | null;
}

/**
 * Ảnh thẻ, video và khung hình liveness của một lượt. Ảnh bấm để phóng to trong hộp thoại (đọc chữ trên
 * thẻ, so chân dung với khung hình); hộp thoại dùng lại object URL của ô ảnh nên không tải lại tệp.
 */
export function EvidenceGallery({ attemptId, evidence, draft }: EvidenceGalleryProps) {
  const [zoom, setZoom] = useState<ZoomImage | null>(null);
  const groups = groupEvidence(evidence);
  const zoomFields = zoom && draft && CARD_KINDS.has(zoom.kind) ? draft : null;

  return (
    <section className={REVIEW_CARD} aria-labelledby="ekrEvidenceTitle">
      <div className={REVIEW_CARD_HEAD}>
        <h2 id="ekrEvidenceTitle" className={REVIEW_CARD_TITLE}>Ảnh và video bằng chứng</h2>
        <span className="ekr-card-aside text-muted text-[12px]">Mỗi lần mở tệp được ghi vào nhật ký truy cập</span>
      </div>

      {groups.length === 0 ? (
        <p className={REVIEW_EMPTY_LINE}>Lượt này chưa có tệp bằng chứng nào.</p>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="ekr-group [.ekr-group+&]:mt-1">
            <h3 className={REVIEW_SUB_HEAD}>{group.title}</h3>
            <div
              className={`ekr-gallery ${group.key} grid gap-3 ${GALLERY_COLUMNS[group.key]}`}
            >
              {group.items.map((item) => (
                <EvidenceTile key={String(item.evidenceId)} attemptId={attemptId} item={item} onZoom={setZoom} />
              ))}
            </div>
          </div>
        ))
      )}

      {zoom ? (
        <Modal
          title={zoom.caption}
          wide
          onClose={() => setZoom(null)}
          footer={<button type="button" className="ui-btn ghost" onClick={() => setZoom(null)}>Đóng</button>}
        >
          {zoomFields ? (
            <div className="ekr-zoom-layout grid grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-4 [align-items:start] max-[760px]:grid-cols-[minmax(0,1fr)]">
              <img className="ekr-zoom-img block max-w-full max-h-[64vh] mx-auto object-contain" src={zoom.url} alt={zoom.caption} />
              <EvidenceZoomFields draft={zoomFields} />
            </div>
          ) : (
            <img className="ekr-zoom-img block max-w-full max-h-[64vh] mx-auto object-contain" src={zoom.url} alt={zoom.caption} />
          )}
        </Modal>
      ) : null}
    </section>
  );
}
