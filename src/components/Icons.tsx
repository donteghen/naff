// Small line icons (24px grid, 2px stroke), drawn inline so nothing extra is downloaded.

type IconProps = { size?: number; className?: string };

function Svg({ size = 20, className = "", children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export const IconBell = (p: IconProps) => <Svg {...p}><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 003.4 0" /></Svg>;
export const IconTruck = (p: IconProps) => <Svg {...p}><path d="M14 18V6a2 2 0 00-2-2H4a2 2 0 00-2 2v11a1 1 0 001 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 001-1v-3.65a1 1 0 00-.22-.62l-3.48-4.35A1 1 0 0017.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></Svg>;
export const IconBox = (p: IconProps) => <Svg {...p}><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></Svg>;
export const IconUser = (p: IconProps) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></Svg>;
export const IconUsers = (p: IconProps) => <Svg {...p}><circle cx="9" cy="8" r="4" /><path d="M2 21a7 7 0 0114 0" /><path d="M16 4a4 4 0 010 8M22 21a7 7 0 00-4-6.3" /></Svg>;
export const IconChart = (p: IconProps) => <Svg {...p}><path d="M3 3v18h18" /><path d="M7 16v-4M12 16V8M17 16v-7" /></Svg>;
export const IconTrend = (p: IconProps) => <Svg {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></Svg>;
export const IconSettings = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /></Svg>;
export const IconPhone = (p: IconProps) => <Svg {...p}><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" /></Svg>;
export const IconNavigate = (p: IconProps) => <Svg {...p}><path d="M3 11l19-9-9 19-2-8-8-2z" /></Svg>;
export const IconCopy = (p: IconProps) => <Svg {...p}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></Svg>;
export const IconCheck = (p: IconProps) => <Svg {...p}><path d="M20 6L9 17l-5-5" /></Svg>;
export const IconBack = (p: IconProps) => <Svg {...p}><path d="M15 18l-6-6 6-6" /></Svg>;
export const IconChevron = (p: IconProps) => <Svg {...p}><path d="M9 18l6-6-6-6" /></Svg>;
export const IconPlus = (p: IconProps) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconFlag = (p: IconProps) => <Svg {...p}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></Svg>;
export const IconPin = (p: IconProps) => <Svg {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z" /><circle cx="12" cy="10" r="3" /></Svg>;
export const IconLogout = (p: IconProps) => <Svg {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path d="M16 17l5-5-5-5M21 12H9" /></Svg>;
export const IconMenu = (p: IconProps) => <Svg {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Svg>;
export const IconClose = (p: IconProps) => <Svg {...p}><path d="M18 6L6 18M6 6l12 12" /></Svg>;
export const IconRefresh = (p: IconProps) => <Svg {...p}><path d="M21 12a9 9 0 11-3-6.7L21 8" /><path d="M21 3v5h-5" /></Svg>;
export const IconList = (p: IconProps) => <Svg {...p}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></Svg>;
export const IconShield = (p: IconProps) => <Svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>;
export const IconGrid = (p: IconProps) => <Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Svg>;
export const IconSearch = (p: IconProps) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Svg>;
export const IconClock = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
export const IconAlert = (p: IconProps) => <Svg {...p}><path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" /><path d="M12 9v4M12 17h.01" /></Svg>;
export const IconSend = (p: IconProps) => <Svg {...p}><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4 20-7z" /></Svg>;
export const IconLocate = (p: IconProps) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="7" /></Svg>;
export const IconWhatsApp = (p: IconProps) => <Svg {...p}><path d="M3 21l1.65-3.8a9 9 0 113.4 2.9L3 21" /><path d="M9 10a.5.5 0 001 0V9a.5.5 0 00-1 0v1a5 5 0 005 5h1a.5.5 0 000-1h-1a.5.5 0 000 1" /></Svg>;
export const IconLock = (p: IconProps) => <Svg {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></Svg>;
export const IconTag = (p: IconProps) => <Svg {...p}><path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L2 12V2h10l8.6 8.6a2 2 0 010 2.8z" /><circle cx="7" cy="7" r="1.5" /></Svg>;
