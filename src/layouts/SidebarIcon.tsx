import type { SidebarIconName } from './adminNavigation';

const ICON_PATHS: Record<SidebarIconName, string[]> = {
  home: ['M3 11.5 12 4l9 7.5', 'M5 10v10h14V10', 'M9 20v-6h6v6'],
  chart: ['M4 19V9', 'M10 19V5', 'M16 19v-7', 'M22 19H2'],
  file: ['M14 2H6a2 2 0 0 0-2 2v16h16V8Z', 'M14 2v6h6', 'M8 13h8', 'M8 17h6'],
  loan: ['M4 7h16v12H4Z', 'M8 11h8', 'M8 15h5', 'M7 4h10v3'],
  check: ['M20 6 9 17l-5-5', 'M21 12a9 9 0 1 1-5.3-8.2'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20', 'M12 6v6l4 2'],
  workflow: ['M5 4v16', 'M19 4v16', 'M5 8h8a3 3 0 0 1 3 3v5h3', 'M2 8h6', 'M16 16h6'],
  grid: ['M4 4h6v6H4Z', 'M14 4h6v6h-6Z', 'M4 14h6v6H4Z', 'M14 14h6v6h-6Z'],
  identity: ['M4 5h16v14H4Z', 'M8 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4', 'M6 16c.5-2 3.5-2 4 0', 'M13 9h4', 'M13 13h4'],
  users: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M22 21v-2a4 4 0 0 0-3-3.87'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10', 'M9 12l2 2 4-5'],
  alert: ['M12 3 2 21h20Z', 'M12 9v4', 'M12 17h.01'],
  scan: ['M3 7V3h4', 'M17 3h4v4', 'M21 17v4h-4', 'M7 21H3v-4', 'M8 12h8'],
  chain: ['M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7', 'M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7'],
  download: ['M12 3v12', 'M7 10l5 5 5-5', 'M5 21h14'],
};

export function SidebarIcon({ name }: { name: SidebarIconName }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name].map((path) => <path d={path} key={path} />)}
    </svg>
  );
}
