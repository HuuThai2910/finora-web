/**
 * Bộ icon nét 2px dùng chung (cùng kiểu với icon sidebar). Không dùng ký tự Unicode làm icon.
 */
const PATHS = {
  refresh: ['M21 12a9 9 0 1 1-2.64-6.36', 'M21 3v6h-6'],
  arrowRight: ['M5 12h14', 'm13 6 6 6-6 6'],
  chevronLeft: ['m15 18-6-6 6-6'],
  chevronRight: ['m9 18 6-6-6-6'],
  close: ['M18 6 6 18', 'm6 6 12 12'],
  eye: ['M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6'],
  userCheck: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'm17 11 2 2 4-4'],
  lock: ['M5 11h14v11H5Z', 'M7 11V7a5 5 0 0 1 10 0v4'],
  unlock: ['M5 11h14v11H5Z', 'M7 11V7a5 5 0 0 1 9.9-1'],
  clock: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18', 'M12 7v5l3 2'],
  alert: ['M12 9v4', 'M12 17h.01', 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16h16V8Z', 'M14 2v6h6', 'M8 13h8', 'M8 17h6'],
  list: ['M4 6h16', 'M4 12h16', 'M4 18h10'],
  checkCircle: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18', 'm8 12 3 3 5-6'],
  xCircle: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18', 'm15 9-6 6', 'm9 9 6 6'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  logout: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4', 'm16 17 5-5-5-5', 'M21 12H9'],
  chevronDown: ['m6 9 6 6 6-6'],
  arrowUp: ['M12 19V5', 'm5 12 7-7 7 7'],
  arrowDown: ['M12 5v14', 'm19 12-7 7-7-7'],
  trend: ['M3 3v18h18', 'm7 15 4-4 3 3 6-6'],
  checkSquare: ['M9 11l3 3 8-8', 'M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11'],
  calendar: ['M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z', 'M3 9h18', 'M8 2v4', 'M16 2v4'],
  userPlus: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M19 8v6', 'M22 11h-6'],
  bars: ['M4 19V9', 'M10 19V5', 'M16 19v-7', 'M22 19H2'],
  funnel: ['M3 4h18l-7 8v6l-4 2v-8Z'],
  shieldCheck: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10', 'm9 12 2 2 4-5'],
  bolt: ['M13 2 4 14h7l-1 8 9-12h-7l1-8Z'],
  idCard: ['M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z', 'M9 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4', 'M14 10h4', 'M14 14h4'],
  repeat: ['m17 2 4 4-4 4', 'M3 11V10a4 4 0 0 1 4-4h14', 'm7 22-4-4 4-4', 'M21 13v1a4 4 0 0 1-4 4H3'],
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name].map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/** Ba chấm ngang của nút menu dòng: vẽ bằng chấm tròn cho đều nét. */
export function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}
