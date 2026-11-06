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
  /** Loại tệp, để hộp phóng to ảnh thẻ hiện kèm các trường đọc được. */
  kind: EkycEvidenceItem['kind'];
}

interface EvidenceTileProps {
  attemptId: string;
  item: EkycEvidenceItem;
  onZoom: (image: ZoomImage) => void;
}

/** Khung trạng thái trong ô (chờ bấm tải, đang tải, lỗi, đã xoá); lớp `error` tô đỏ cả tiêu đề. */
const TILE_STATE =
  'grid justify-items-center content-center gap-1 p-3 text-muted text-[12px] text-center [&_svg]:size-4.5 [&_strong]:text-secondary [&_strong]:text-[13px] [&_strong]:font-semibold [&.error]:text-danger [&.error_strong]:text-danger [&_.ui-btn]:mt-1';

/** Video chiếm hai cột (màn hẹp cả hàng); tệp văn bản và tệp khác luôn chiếm cả hàng. */
const TILE_SPAN: Record<EvidenceMediaKind, string> = {
  image: '',
  video: 'col-[span_2] max-[760px]:col-span-full',
  text: 'col-span-full',
  other: 'col-span-full',
};

/** Ảnh thẻ theo tỉ lệ thẻ 85,6 × 54 mm; ảnh khác tỉ lệ vẫn hiện đủ nhờ object-fit. */
const MEDIA_BASE = 'grid overflow-hidden border border-line rounded-md in-[.ekr-gallery.card]:aspect-[85.6/54]';

/** Khung theo loại tệp: video cao hơn ảnh, nền tối khi đang phát; văn bản/tệp khác cao theo nội dung, nền trắng. */
const MEDIA_BOX: Record<EvidenceMediaKind, string> = {
  image: 'h-55 place-items-center bg-surface-muted in-[.ekr-gallery.card]:h-auto',
  video: 'h-75 place-items-center bg-surface-muted [&.dark]:bg-[#0b1730]',
  text: 'min-h-18 place-items-stretch bg-white',
  other: 'min-h-18 place-items-stretch bg-white',
};

const MEDIA_FILL = 'block w-full h-full object-contain';

/** Video lỗi định dạng (ví dụ .mov trình duyệt không giải mã được) thì cho tải về để xem bằng ứng dụng khác. */
function EvidenceVideo({ url, caption }: { url: string; caption: string }) {
  const [unplayable, setUnplayable] = useState(false);
  if (unplayable) {
    return (
      <div className={`ekr-tile-state ${TILE_STATE}`}>
        <strong>Trình duyệt không phát được video này</strong>
        <a className="ui-btn soft" href={url} download>Tải video về máy</a>
      </div>
    );
  }
  // Tệp đã nằm trong bộ nhớ (object URL) nên `preload="auto"` không tải thêm gì, chỉ để hiện khung đầu thay vì ô đen.
  return (
    <video
      className={MEDIA_FILL}
      src={url}
      controls
      muted
      playsInline
      preload="auto"
      aria-label={caption}
      onError={() => setUnplayable(true)}
    />
  );
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
        <div className={`ekr-tile-state ${TILE_STATE}`}>
          <Icon name="clock" />
          <strong>Đã xoá theo hạn lưu</strong>
          <small>hoặc do người dùng rút lại đồng ý</small>
        </div>
      );
    case 'idle':
      return (
        <div className={`ekr-tile-state ${TILE_STATE}`}>
          <Icon name="file" />
          <button type="button" className="ui-btn soft" onClick={onRequest}>
            {media === 'text' ? 'Xem nội dung' : 'Tải tệp'}
          </button>
        </div>
      );
    case 'loading':
      return <div className={`ekr-tile-state ${TILE_STATE}`} aria-busy="true">Đang tải tệp...</div>;
    case 'error': {
      const uiError = toUiApiError(state.error);
      return (
        <div className={`ekr-tile-state error ${TILE_STATE}`} role="alert">
          <strong>Không tải được tệp</strong>
          <small>{[uiError.code, uiError.traceId && `mã truy vết ${uiError.traceId}`].filter(Boolean).join(', ')}</small>
          <button type="button" className="ui-btn soft" onClick={onReload}>Thử lại</button>
        </div>
      );
    }
    case 'ready':
      if (state.text != null) {
        return (
          <pre
            className="ekr-text max-h-80 py-2.5 px-3 overflow-auto text-primary font-[ui-monospace,SFMono-Regular,Consolas,'Liberation_Mono',monospace] text-[12px] leading-normal whitespace-pre-wrap wrap-anywhere"
          >
            {formatEvidenceText(state.text, item.contentType)}
          </pre>
        );
      }
      if (!state.url) return null;
      if (media === 'image') {
        const url = state.url;
        return (
          <button
            type="button"
            className="ekr-zoom-btn block w-full h-full cursor-zoom-in"
            aria-label={`Phóng to: ${caption}`}
            onClick={() => onZoom({ url, caption, kind: item.kind })}
          >
            <img className={MEDIA_FILL} src={url} alt={caption} />
          </button>
        );
      }
      if (media === 'video') return <EvidenceVideo url={state.url} caption={caption} />;
      return (
        <div className={`ekr-tile-state ${TILE_STATE}`}>
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
    <figure className={[`ekr-tile ${media}`, 'grid gap-1.5 min-w-0', TILE_SPAN[media]].filter(Boolean).join(' ')}>
      <div className={`${playing ? 'ekr-media dark' : 'ekr-media'} ${MEDIA_BASE} ${MEDIA_BOX[media]}`}>
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
      <figcaption className="flex justify-between gap-2 text-secondary text-[12px]">
        <span>{caption}</span>
        <span className="ekr-muted text-muted">{formatBytes(item.sizeBytes)}</span>
      </figcaption>
    </figure>
  );
}
