import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { toUiApiError } from '@/lib/api/errors';
import { useEvidenceFile, type EvidenceFileState } from '../hooks/useEvidenceFile';
import {
  evidenceCaption,
  evidenceMediaKind,
  formatBytes,
  formatEvidenceText,
  type EvidenceMediaKind,
} from '../mappers/evidenceDisplay';
import type { EkycEvidenceItem } from '../types';

export interface ZoomImage {
  url: string;
  caption: string;
}

interface EvidenceTileProps {
  attemptId: string;
  item: EkycEvidenceItem;
  onZoom: (image: ZoomImage) => void;
}

/** Video lỗi định dạng (ví dụ .mov trình duyệt không giải mã được) thì cho tải về để xem bằng ứng dụng khác. */
function EvidenceVideo({ url, caption }: { url: string; caption: string }) {
  const [unplayable, setUnplayable] = useState(false);
  if (unplayable) {
    return (
      <div className="ekr-tile-state">
        <strong>Trình duyệt không phát được video này</strong>
        <a className="ui-btn soft" href={url} download>Tải video về máy</a>
      </div>
    );
  }
  // Tệp đã nằm trong bộ nhớ (object URL) nên `preload="auto"` không tải thêm gì, chỉ để hiện khung đầu thay vì ô đen.
  return <video src={url} controls muted playsInline preload="auto" aria-label={caption} onError={() => setUnplayable(true)} />;
}

interface TileBodyProps {
  state: EvidenceFileState;
  media: EvidenceMediaKind;
  item: EkycEvidenceItem;
  caption: string;
  onRequest: () => void;
  onReload: () => void;
  onZoom: (image: ZoomImage) => void;
}

function TileBody({ state, media, item, caption, onRequest, onReload, onZoom }: TileBodyProps) {
  switch (state.status) {
    case 'deleted':
      return (
        <div className="ekr-tile-state">
          <Icon name="clock" />
          <strong>Đã xoá theo hạn lưu</strong>
          <small>hoặc do người dùng rút lại đồng ý</small>
        </div>
      );
    case 'idle':
      return (
        <div className="ekr-tile-state">
          <Icon name="file" />
          <button type="button" className="ui-btn soft" onClick={onRequest}>
            {media === 'text' ? 'Xem nội dung' : 'Tải tệp'}
          </button>
        </div>
      );
    case 'loading':
      return <div className="ekr-tile-state" aria-busy="true">Đang tải tệp...</div>;
    case 'error': {
      const uiError = toUiApiError(state.error);
      return (
        <div className="ekr-tile-state error" role="alert">
          <strong>Không tải được tệp</strong>
          <small>{[uiError.code, uiError.traceId && `mã truy vết ${uiError.traceId}`].filter(Boolean).join(', ')}</small>
          <button type="button" className="ui-btn soft" onClick={onReload}>Thử lại</button>
        </div>
      );
    }
    case 'ready':
      if (state.text != null) return <pre className="ekr-text">{formatEvidenceText(state.text, item.contentType)}</pre>;
      if (!state.url) return null;
      if (media === 'image') {
        const url = state.url;
        return (
          <button type="button" className="ekr-zoom-btn" aria-label={`Phóng to: ${caption}`} onClick={() => onZoom({ url, caption })}>
            <img src={url} alt={caption} />
          </button>
        );
      }
      if (media === 'video') return <EvidenceVideo url={state.url} caption={caption} />;
      return (
        <div className="ekr-tile-state">
          <a className="ui-btn soft" href={state.url} download>Lưu tệp về máy</a>
        </div>
      );
    default:
      return null;
  }
}

/**
 * Một tệp bằng chứng. Ảnh và video tải ngay khi mở trang (người duyệt cần xem để quyết định);
 * tệp văn bản/khác chỉ tải khi bấm, vì mỗi lần tải đều được ghi nhật ký truy cập.
 */
export function EvidenceTile({ attemptId, item, onZoom }: EvidenceTileProps) {
  const media = evidenceMediaKind(item.contentType);
  const [requested, setRequested] = useState(media === 'image' || media === 'video');
  const { state, reload } = useEvidenceFile(attemptId, item, { enabled: requested, asText: media === 'text' });
  const caption = evidenceCaption(item);
  const playing = media === 'video' && state.status === 'ready';

  return (
    <figure className={`ekr-tile ${media}`}>
      <div className={playing ? 'ekr-media dark' : 'ekr-media'}>
        <TileBody
          state={state}
          media={media}
          item={item}
          caption={caption}
          onRequest={() => setRequested(true)}
          onReload={reload}
          onZoom={onZoom}
        />
      </div>
      <figcaption>
        <span>{caption}</span>
        <span className="ekr-muted">{formatBytes(item.sizeBytes)}</span>
      </figcaption>
    </figure>
  );
}
