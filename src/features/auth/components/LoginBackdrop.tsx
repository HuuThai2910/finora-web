/**
 * Sóng nền: mỗi đường vẽ hai chu kỳ liền nhau để trượt -50% là lặp không thấy mối nối. Ba lớp trượt khác tốc độ
 * (lớp giữa chạy ngược chiều), lớp trên đậm màu hơn.
 */
const WAVES = [
  {
    d: 'M0 70 C 150 30 300 30 450 70 S 750 110 900 70 S 1200 30 1350 70 S 1650 110 1800 70 V160 H0Z',
    slide: 'animate-[lb-slide_43s_linear_infinite]',
    fill: 'fill-[rgba(26,96,224,0.07)]',
  },
  {
    d: 'M0 90 C 200 120 250 120 450 95 S 700 60 900 90 C 1100 120 1150 120 1350 95 S 1600 60 1800 90 V160 H0Z',
    slide: 'animate-[lb-slide_31s_linear_infinite_reverse]',
    fill: 'fill-[rgba(26,96,224,0.1)]',
  },
  {
    d: 'M0 112 C 150 129 300 135 450 115 S 750 95 900 112 C 1050 129 1200 135 1350 115 S 1650 95 1800 112 V160 H0Z',
    slide: 'animate-[lb-slide_22s_linear_infinite]',
    fill: 'fill-[rgba(26,96,224,0.14)]',
  },
];

/**
 * Nền chung của cả màn đăng nhập (nửa video lẫn nửa form): một mảng tròn mờ trôi chậm ở góc phải trên
 * và sóng xanh ở đáy, cùng tông với app mobile và video. Trải cả trang để thẻ đăng nhập trắng nằm trên
 * nền xanh, không chìm vào một nửa trang trắng trơn. Không có mảng nào nằm sau video, vì nền video
 * (bản nhúng) là màu phẳng: mảng tròn bị video che một nửa sẽ lộ thành vệt cắt.
 *
 * Nằm dưới cả hai nửa trang, trong .login-wrapper (isolation: isolate). Mọi vòng lặp chạy bằng transform để
 * trình duyệt dồn lên GPU, không đụng layout.
 */
export function LoginBackdrop() {
  return (
    <div className="lb absolute inset-0 -z-1 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Mảng tròn mờ trôi chậm ở góc phải trên, sau đầu nhân vật. */}
      <div className="lb-blob absolute -top-40 -right-35 size-130 rounded-[50%] bg-[radial-gradient(circle_at_40%_40%,rgba(26,96,224,0.15),rgba(26,96,224,0)_70%)] blur-sm animate-[lb-drift_18s_ease-in-out_infinite_alternate] motion-reduce:animate-none" />
      <div className="lb-waves absolute right-0 bottom-0 left-0 h-30 overflow-hidden">
        {WAVES.map((wave, i) => (
          <svg
            key={wave.d}
            className={`lb-wave lb-wave-${i} absolute bottom-0 left-0 w-[200%] h-full ${wave.slide} motion-reduce:animate-none`}
            viewBox="0 0 1800 160"
            preserveAspectRatio="none"
          >
            <path className={wave.fill} d={wave.d} />
          </svg>
        ))}
      </div>
    </div>
  );
}
