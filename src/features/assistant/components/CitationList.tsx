import { Icon } from '@/components/Icon';
import { CITATION_KIND_LABELS } from '../constants';
import { formatCheckedAt, safeExternalUrl } from '../mappers/display';
import type { AssistantCitation } from '../types';

/**
 * Dòng "Căn cứ" dưới câu trả lời. Nhãn loại (luật / chính sách FINORA / chưa xác minh) luôn hiện bằng
 * chữ để người đọc không nhầm chính sách nội bộ với quy định pháp luật (LAW-CONSUMER-2023, spec mục 2).
 * Link văn bản mở tab mới với `noopener noreferrer` để trang ngoài không điều khiển được tab quản trị.
 */
export function CitationList({ citations }: { citations: AssistantCitation[] }) {
  if (citations.length === 0) return null;
  return (
    <section className="as-cite" aria-label="Căn cứ">
      <h3>Căn cứ</h3>
      <ul>
        {citations.map((citation) => {
          const url = safeExternalUrl(citation.url);
          return (
            <li key={citation.id}>
              <span className={`as-cite-kind ${citation.kind === 'CHUA_XAC_MINH' ? 'warn' : ''}`}>
                {CITATION_KIND_LABELS[citation.kind] ?? citation.kind}
              </span>
              {url ? (
                <a className="ui-link" href={url} target="_blank" rel="noopener noreferrer">
                  {citation.label}
                  <Icon name="externalLink" />
                  <span className="ui-sr-only"> (mở tab mới)</span>
                </a>
              ) : (
                <span>{citation.label}</span>
              )}
              <small>Kiểm ngày {formatCheckedAt(citation.checkedAt)}</small>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
