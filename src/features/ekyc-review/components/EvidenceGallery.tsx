import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { groupEvidence } from '../mappers/evidenceDisplay';
import type { EkycEvidenceItem } from '../types';
import { EvidenceTile, type ZoomImage } from './EvidenceTile';

interface EvidenceGalleryProps {
  attemptId: string;
  evidence: EkycEvidenceItem[];
}

/**
 * Ảnh thẻ, video và khung hình liveness của một lượt. Ảnh bấm để phóng to trong hộp thoại (đọc chữ trên
 * thẻ, so chân dung với khung hình); hộp thoại dùng lại object URL của ô ảnh nên không tải lại tệp.
 */
export function EvidenceGallery({ attemptId, evidence }: EvidenceGalleryProps) {
  const [zoom, setZoom] = useState<ZoomImage | null>(null);
  const groups = groupEvidence(evidence);

  return (
    <section className="ui-card ekr-card" aria-labelledby="ekrEvidenceTitle">
      <div className="ekr-card-head">
        <h2 id="ekrEvidenceTitle">Ảnh và video bằng chứng</h2>
        <span className="ekr-card-aside">Mỗi lần mở tệp được ghi vào nhật ký truy cập</span>
      </div>

      {groups.length === 0 ? (
        <p className="ekr-muted ekr-empty-line">Lượt này chưa có tệp bằng chứng nào.</p>
      ) : (
        groups.map((group) => (
          <div key={group.key} className="ekr-group">
            <h3 className="ekr-sub-head">{group.title}</h3>
            <div className={`ekr-gallery ${group.key}`}>
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
          <img className="ekr-zoom-img" src={zoom.url} alt={zoom.caption} />
        </Modal>
      ) : null}
    </section>
  );
}
