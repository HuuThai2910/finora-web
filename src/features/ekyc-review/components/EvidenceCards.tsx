import { useState, type ReactNode } from 'react';
import { Modal } from '@/components/Modal';
import { ReviewCard, ReviewRows } from '@/features/loan';
import { cardTypeLabel } from '../mappers/attemptDisplay';
import { toDraftRows } from '../mappers/draftDisplay';
import { frameRank } from '../mappers/evidenceDisplay';
import type { UserItem } from '@/features/user';
import type { EkycAttemptDetail, EkycEvidenceItem } from '../types';
import { EvidenceTile, type ZoomImage } from './EvidenceTile';

/** Ảnh phóng to dùng lại object URL của ô ảnh nên không tải lại tệp (mỗi lần tải được ghi nhật ký truy cập). */
function useZoom(): [ReactNode, (image: ZoomImage) => void] {
  const [zoom, setZoom] = useState<ZoomImage | null>(null);
  const modal = zoom ? (
    <Modal
      title={zoom.caption}
      wide
      onClose={() => setZoom(null)}
      footer={<button type="button" className="ui-btn ghost" onClick={() => setZoom(null)}>Đóng</button>}
    >
      <img className="block max-w-full max-h-[64vh] mx-auto object-contain" src={zoom.url} alt={zoom.caption} />
    </Modal>
  ) : null;
  return [modal, setZoom];
}

/**
 * Trường không kiểm chứng được bằng mã QR hay dòng mã máy đọc nên cần soi với ảnh: chỉ có nguồn AI thì "AI đọc", có
 * người dùng tự sửa thì "Người dùng sửa".
 */
function unverifiedTag(sources: string[]): string | null {
  if (sources.includes('USER')) return 'Người dùng sửa';
  if (sources.length > 0 && sources.every((source) => source === 'AI')) return 'AI đọc';
  return null;
}

const GENDER: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ' };

/** `YYYY-MM-DD` → `dd/mm/yyyy` bằng tách chuỗi, không qua `Date` để không lệch ngày theo múi giờ. */
const birthDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

/**
 * Lượt tự xác minh không lưu bản nháp: thông tin đã ghi vào hồ sơ khách lúc xác minh, nên lấy từ hồ sơ (không có nguồn
 * đọc nên không gắn nhãn). Chưa có số định danh trong hồ sơ thì không có gì để hiện.
 */
function profileRows(profile: UserItem | null | undefined): Array<{ key: string; label: string; value: ReactNode }> {
  if (!profile?.idNumber) return [];
  const missing = <span className="font-normal text-muted">Chưa cập nhật</span>;
  return [
    { key: 'idNumber', label: 'Số định danh', value: profile.idNumber },
    { key: 'fullName', label: 'Họ và tên', value: profile.fullName || missing },
    { key: 'dateOfBirth', label: 'Ngày sinh', value: profile.dateOfBirth ? birthDate(profile.dateOfBirth) : missing },
    { key: 'gender', label: 'Giới tính', value: (profile.gender && GENDER[profile.gender]) || missing },
    { key: 'placeOfOrigin', label: 'Quê quán', value: profile.placeOfOrigin || missing },
    { key: 'address', label: 'Nơi thường trú', value: profile.address || missing },
  ];
}

/**
 * Thẻ "Giấy tờ": ảnh mặt trước, mặt sau xếp dọc bên trái, cạnh đó là các trường đọc từ thẻ để soi từng trường với ảnh.
 * Chỉ trường do AI điền (hoặc người dùng sửa) mới có chữ cam; trường hệ thống không thu thập thì không hiện.
 */
export function DocumentCard({ attempt, profile }: { attempt: EkycAttemptDetail; profile?: UserItem | null }) {
  const [zoomModal, onZoom] = useZoom();
  const images = attempt.evidence
    .filter((item) => item.kind === 'CCCD_FRONT' || item.kind === 'CCCD_BACK')
    .sort((a, b) => (a.kind === 'CCCD_FRONT' ? -1 : 1) - (b.kind === 'CCCD_FRONT' ? -1 : 1));
  const fields = attempt.draft ? toDraftRows(attempt.draft).filter((row) => row.collected) : [];

  const fallback = attempt.draft ? [] : profileRows(profile);

  const rows = [
    { key: 'cardType', label: 'Loại thẻ', value: cardTypeLabel(attempt.cardType) },
    ...fallback,
    ...fields.map((row) => {
      const tag = row.unverified ? unverifiedTag(row.sources.map((source) => source.code)) : null;
      return {
        key: row.key,
        label: row.label,
        value: row.value ? (
          <>
            <span>{row.value}</span>
            {tag && <span className="ml-1.5 text-[12px] font-medium text-warning">{tag}</span>}
          </>
        ) : <span className="font-normal text-muted">Không đọc được</span>,
      };
    }),
  ];

  return (
    <ReviewCard title="Giấy tờ">
      <div className="grid grid-cols-[240px_minmax(0,1fr)] gap-6 [align-items:start] max-[760px]:grid-cols-[minmax(0,1fr)]">
        <div className="grid gap-2.5 max-[760px]:grid-cols-2">
          {images.length > 0
            ? images.map((item) => <EvidenceTile key={String(item.evidenceId)} attemptId={attempt.attemptId} item={item} onZoom={onZoom} />)
            : <p className="text-[13px] text-muted">Lượt này không có ảnh thẻ.</p>}
        </div>
        <div className="min-w-0 [&_.lr-val]:max-w-65 [&_.lr-val]:justify-self-end max-[760px]:[&_.lr-val]:max-w-none">
          <ReviewRows rows={rows} />
          {!attempt.draft && fallback.length === 0 && (
            <p className="mt-2 text-[13px] text-muted">Lượt này không lưu bản nháp thông tin đọc từ thẻ.</p>
          )}
        </div>
      </div>
      {zoomModal}
    </ReviewCard>
  );
}

/** Thẻ "Khuôn mặt": video rồi các khung hình theo thứ tự động tác. Lượt chưa quay video thì không có thẻ. */
export function FaceCard({ attempt }: { attempt: EkycAttemptDetail }) {
  const [zoomModal, onZoom] = useZoom();
  const items: EkycEvidenceItem[] = [
    ...attempt.evidence.filter((item) => item.kind === 'LIVENESS_VIDEO'),
    ...attempt.evidence.filter((item) => item.kind === 'LIVENESS_FRAME').sort((a, b) => frameRank(a.label) - frameRank(b.label)),
  ];
  if (items.length === 0) return null;

  return (
    <ReviewCard title="Khuôn mặt">
      <div className="grid grid-cols-5 gap-2.5 max-[1180px]:grid-cols-[repeat(auto-fill,minmax(140px,1fr))] max-[760px]:grid-cols-3 max-[480px]:grid-cols-2">
        {items.map((item) => <EvidenceTile key={String(item.evidenceId)} attemptId={attempt.attemptId} item={item} onZoom={onZoom} />)}
      </div>
      {zoomModal}
    </ReviewCard>
  );
}
