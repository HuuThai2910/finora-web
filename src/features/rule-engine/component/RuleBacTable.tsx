import type { AiTruong, RuleBac } from '../types';
import { dinhDangNguong, donViNguong, laNguongVoCuc } from './ruleEngineForm';
import { IconInfinity, IconPlus, IconTrash } from './ruleIcons';

/**
 * Bảng bậc (ngưỡng → điểm) của một luật đọc trường số.
 *
 * Bậc cuối có thể là "còn lại" (ngưỡng = `mocVoCuc`, JSON không có Infinity):
 * khi sửa, ô ngưỡng đó hiện chữ thay vì số 1000000000, kèm nút chuyển qua lại.
 * Thêm bậc luôn chèn TRƯỚC bậc cuối để bậc "còn lại" giữ nguyên vị trí.
 */

interface RuleBacTableProps {
  bac: RuleBac[];
  editing: boolean;
  nghichDao: boolean;
  truong: AiTruong | undefined;
  diemToiDa: number;
  mocVoCuc: number;
  onChange: (bac: RuleBac[]) => void;
}

export default function RuleBacTable({
  bac, editing, nghichDao, truong, diemToiDa, mocVoCuc, onChange,
}: RuleBacTableProps) {
  const donVi = donViNguong(truong);

  function sua(k: number, cot: 0 | 1, giaTri: number) {
    const moi = bac.map(b => [...b] as RuleBac);
    moi[k][cot] = giaTri;
    onChange(moi);
  }

  function them() {
    const moi = bac.map(b => [...b] as RuleBac);
    if (moi.length === 0) {
      onChange([[0, 20], [mocVoCuc, 0]]);
      return;
    }

    const daCo = new Set(moi.map(b => b[0]));
    const cuoi = moi[moi.length - 1];
    const laVoCuc = laNguongVoCuc(cuoi[0], mocVoCuc);

    if (laVoCuc) {
      // Bậc cuối đang là "còn lại": chèn một bậc số MỚI trước bậc cuối để ô nhập số hiện ra, chữ "còn lại" giữ ở cuối
      const truocCuoi = moi.length >= 2 ? moi[moi.length - 2] : null;
      const buocNhay = truong?.la_ty_le ? 0.1 : 1;
      let nguongMoi = 0;
      let diemMoi = Math.max(0, cuoi[1]);

      if (truocCuoi) {
        if (nghichDao) {
          nguongMoi = Number((truocCuoi[0] + buocNhay).toFixed(2));
          while (daCo.has(nguongMoi) && nguongMoi < mocVoCuc) {
            nguongMoi = Number((nguongMoi + buocNhay).toFixed(2));
          }
        } else {
          // Thuận: giảm dần
          if (truocCuoi[0] > buocNhay) {
            nguongMoi = Number((truocCuoi[0] - buocNhay).toFixed(2));
            while (daCo.has(nguongMoi) && nguongMoi > 0) {
              nguongMoi = Number((nguongMoi - buocNhay).toFixed(2));
            }
          }
          if (daCo.has(nguongMoi) || nguongMoi <= 0) {
            nguongMoi = Number((truocCuoi[0] + buocNhay).toFixed(2));
            while (daCo.has(nguongMoi)) {
              nguongMoi = Number((nguongMoi + buocNhay).toFixed(2));
            }
          }
        }
        diemMoi = Math.round((truocCuoi[1] + cuoi[1]) / 2);
      } else {
        nguongMoi = 1;
        while (daCo.has(nguongMoi)) {
          nguongMoi = Number((nguongMoi + buocNhay).toFixed(2));
        }
        diemMoi = Math.min(diemToiDa, cuoi[1] + 5);
      }

      moi.splice(moi.length - 1, 0, [nguongMoi, diemMoi]);
    } else {
      // Bậc cuối là số cụ thể: thêm bậc mới ở cuối, đảm bảo không trùng
      const buocNhay = truong?.la_ty_le ? 0.1 : 1;
      let nguongMoi = nghichDao
        ? Number((cuoi[0] + buocNhay).toFixed(2))
        : Math.max(0, Number((cuoi[0] - buocNhay).toFixed(2)));
      while (daCo.has(nguongMoi)) {
        nguongMoi = Number((nguongMoi + buocNhay).toFixed(2));
      }
      const diemMoi = Math.max(0, cuoi[1] - 5);
      moi.push([nguongMoi, diemMoi]);
    }

    onChange(moi);
  }

  function xoa(k: number) {
    onChange(bac.filter((_, j) => j !== k));
  }

  function suaThanhNhapSo(k: number) {
    const daCo = new Set(bac.map((b, idx) => (idx !== k ? b[0] : -999999)));
    const truoc = k > 0 ? bac[k - 1][0] : 0;
    const buocNhay = truong?.la_ty_le ? 0.1 : 1;
    let giaTri = nghichDao
      ? Number((truoc + buocNhay).toFixed(2))
      : Math.max(0, Number((truoc - buocNhay).toFixed(2)));

    // Không bao giờ tạo giá trị trùng với bậc trước hoặc các bậc khác
    if (daCo.has(giaTri) || giaTri === truoc) {
      if (nghichDao) {
        giaTri = Number((truoc + buocNhay).toFixed(2));
        while (daCo.has(giaTri) && giaTri < mocVoCuc) {
          giaTri = Number((giaTri + buocNhay).toFixed(2));
        }
      } else {
        if (truoc > buocNhay) {
          let thu = Number((truoc - buocNhay).toFixed(2));
          while (daCo.has(thu) && thu > 0) {
            thu = Number((thu - buocNhay).toFixed(2));
          }
          giaTri = thu;
        }
        if (daCo.has(giaTri) || giaTri === truoc) {
          let thu = Number((truoc + buocNhay).toFixed(2));
          while (daCo.has(thu)) {
            thu = Number((thu + buocNhay).toFixed(2));
          }
          giaTri = thu;
        }
      }
    }
    sua(k, 0, giaTri);
  }

  // Thống kê các ngưỡng xuất hiện để phát hiện trùng lặp
  const demNguong: Record<number, number> = {};
  bac.forEach(([n], idx) => {
    const laCuoi = idx === bac.length - 1;
    if (!(laCuoi && laNguongVoCuc(n, mocVoCuc))) {
      demNguong[n] = (demNguong[n] || 0) + 1;
    }
  });

  return (
    <table className="rule-table">
      <thead>
        <tr>
          <th>
            Ngưỡng
            {donVi && <span className="rule-unit"> ({donVi})</span>}
          </th>
          <th className="rule-th-score">Điểm</th>
          {editing && <th className="rule-th-tool" />}
        </tr>
      </thead>
      <tbody>
        {bac.map(([nguong, diem], k) => {
          const laCuoi = k === bac.length - 1;
          const voCuc = laCuoi && laNguongVoCuc(nguong, mocVoCuc);
          const biTrung = editing && !voCuc && (demNguong[nguong] ?? 0) > 1;
          return (
            <tr key={k}>
              <td>
                {!editing ? (
                  voCuc ? (
                    <div className="rule-vo-cuc-view">
                      <span>còn lại</span>
                      <span className="rule-vo-cuc-note">
                        Áp dụng cho mọi giá trị còn lại không thuộc các ngưỡng trên
                      </span>
                    </div>
                  ) : (
                    dinhDangNguong(nguong, mocVoCuc, nghichDao)
                  )
                ) : voCuc ? (
                  <div className="rule-vo-cuc-wrap">
                    <span className="rule-nguong-edit">
                      <span className="rule-vo-cuc">
                        <IconInfinity className="rule-vo-cuc-icon" />
                        còn lại
                      </span>
                      <button
                        type="button"
                        className="rule-link-btn"
                        title="Đổi thành ngưỡng số cụ thể"
                        onClick={() => suaThanhNhapSo(k)}
                      >
                        Nhập số
                      </button>
                    </span>
                    <span className="rule-vo-cuc-note">
                      Áp dụng cho mọi giá trị còn lại không thuộc các ngưỡng trên
                    </span>
                  </div>
                ) : (
                  <div className="rule-nguong-col">
                    <span className="rule-nguong-edit">
                      <input
                        type="number"
                        className={`policy-input rule-input rule-input-num${biTrung ? ' rule-input-duplicate' : ''}`}
                        aria-label={`Ngưỡng bậc ${k + 1}`}
                        title={biTrung ? 'Ngưỡng này đang bị trùng với bậc khác' : undefined}
                        step="any"
                        value={nguong}
                        onChange={e => sua(k, 0, Number(e.target.value))}
                      />
                      {laCuoi && (
                        <button
                          type="button"
                          className="rule-link-btn"
                          title="Áp dụng cho mọi giá trị còn lại"
                          onClick={() => sua(k, 0, mocVoCuc)}
                        >
                          Còn lại
                        </button>
                      )}
                    </span>
                    {biTrung && (
                      <span className="rule-nguong-error">
                        Trùng ngưỡng với bậc khác
                      </span>
                    )}
                  </div>
                )}
              </td>
              <td className="rule-td-score">
                {editing ? (
                  <input
                    type="number"
                    className="policy-input rule-input rule-input-num"
                    aria-label={`Điểm bậc ${k + 1}`}
                    min="0"
                    max={diemToiDa}
                    value={diem}
                    onChange={e => sua(k, 1, Number(e.target.value))}
                  />
                ) : (
                  <strong>{diem}</strong>
                )}
              </td>
              {editing && (
                <td className="rule-td-tool">
                  <button
                    type="button"
                    className="rule-tool-btn rule-tool-danger"
                    aria-label={`Xóa bậc ${k + 1}`}
                    title={bac.length <= 2 ? 'Luật phải có ít nhất 2 bậc' : 'Xóa bậc này'}
                    onClick={() => xoa(k)}
                    disabled={bac.length <= 2}
                  >
                    <IconTrash />
                  </button>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
      {editing && (
        <tfoot>
          <tr>
            <td colSpan={3}>
              <button type="button" className="rule-add-bac-btn" onClick={them}>
                <IconPlus />
                Thêm bậc
              </button>
            </td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}
