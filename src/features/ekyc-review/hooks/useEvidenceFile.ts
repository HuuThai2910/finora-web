import { useEffect, useState } from 'react';
import { ekycReviewApi, isEvidenceDeleted } from '../api/ekycReviewApi';
import type { EkycEvidenceItem } from '../types';

export type EvidenceFileState =
  | { status: 'idle' }
  | { status: 'loading' }
  /** `url` là object URL cho ảnh/video; `text` là nội dung khi tải dạng văn bản. */
  | { status: 'ready'; url: string | null; text: string | null }
  | { status: 'deleted' }
  | { status: 'error'; error: unknown };

interface Options {
  /** Tải ngay (ảnh, video) hay chờ người duyệt bấm (tệp văn bản). */
  enabled: boolean;
  /** Đọc nội dung thành chuỗi thay vì tạo object URL. */
  asText: boolean;
}

/**
 * Tải một tệp bằng chứng bằng `fetch` có cookie phiên rồi đổi thành object URL cho `<img>`/`<video>`.
 *
 * - Không dùng RTK Query: `Blob` không serialize được vào store, và object URL phải thu hồi đúng lúc
 *   tệp rời màn hình, nên vòng đời gắn với component hiển thị tệp.
 * - Đổi lượt/tệp hoặc rời trang: huỷ request đang chạy và `URL.revokeObjectURL` để trình duyệt nhả bộ nhớ
 *   (ảnh và video eKYC là dữ liệu nhạy cảm, không giữ lại lâu hơn lúc đang xem).
 * - Tệp đã đánh dấu xoá thì không gọi API; tệp bị xoá giữa chừng (410 `EVIDENCE_DELETED`) cũng về `deleted`.
 * - Mỗi lần tải được backend ghi nhật ký truy cập; `reload` chỉ chạy khi người duyệt bấm thử lại.
 *
 * @returns trạng thái tệp và hàm `reload` để thử tải lại sau lỗi.
 */
export function useEvidenceFile(attemptId: string, item: EkycEvidenceItem, { enabled, asText }: Options) {
  const [state, setState] = useState<EvidenceFileState>({ status: 'idle' });
  const [reloadCount, setReloadCount] = useState(0);
  const { evidenceId, deleted } = item;

  useEffect(() => {
    if (deleted || !enabled) return undefined;
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setState({ status: 'loading' });

    ekycReviewApi
      .getEvidenceFile(attemptId, evidenceId, controller.signal)
      .then(async (blob) => {
        if (asText) {
          const text = await blob.text();
          if (!controller.signal.aborted) setState({ status: 'ready', url: null, text });
          return;
        }
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ status: 'ready', url: objectUrl, text: null });
      })
      .catch((error: unknown) => {
        // Request bị huỷ do rời trang/đổi tệp: không phải lỗi để hiển thị.
        if (controller.signal.aborted) return;
        setState(isEvidenceDeleted(error) ? { status: 'deleted' } : { status: 'error', error });
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attemptId, evidenceId, deleted, enabled, asText, reloadCount]);

  const current: EvidenceFileState = deleted ? { status: 'deleted' } : state;
  return {
    state: current,
    reload: () => setReloadCount((count) => count + 1),
  };
}
