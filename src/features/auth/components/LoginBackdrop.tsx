import './LoginBackdrop.css';

/** Sóng nền: mỗi đường vẽ hai chu kỳ liền nhau để trượt -50% là lặp không thấy mối nối. */
const WAVES = [
  'M0 70 C 150 30 300 30 450 70 S 750 110 900 70 S 1200 30 1350 70 S 1650 110 1800 70 V160 H0Z',
  'M0 90 C 200 120 250 120 450 95 S 700 60 900 90 C 1100 120 1150 120 1350 95 S 1600 60 1800 90 V160 H0Z',
  'M0 112 C 150 129 300 135 450 115 S 750 95 900 112 C 1050 129 1200 135 1350 115 S 1650 95 1800 112 V160 H0Z',
];

/**
 * Nền chung của cả màn đăng nhập (nửa video lẫn nửa form): một mảng tròn mờ trôi chậm ở góc phải trên
 * và sóng xanh ở đáy, cùng tông với app mobile và video. Trải cả trang để thẻ đăng nhập trắng nằm trên
 * nền xanh, không chìm vào một nửa trang trắng trơn. Không có mảng nào nằm sau video, vì nền video
 * (bản nhúng) là màu phẳng: mảng tròn bị video che một nửa sẽ lộ thành vệt cắt.
 */
export function LoginBackdrop() {
  return (
    <div className="lb" aria-hidden="true">
      <div className="lb-blob" />
      <div className="lb-waves">
        {WAVES.map((d, i) => (
          <svg key={d} className={`lb-wave lb-wave-${i}`} viewBox="0 0 1800 160" preserveAspectRatio="none">
            <path d={d} />
          </svg>
        ))}
      </div>
    </div>
  );
}
