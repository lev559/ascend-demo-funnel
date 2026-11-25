// Brand illustrations (inline SVG, Night shift palette)
import { avatarSrc } from "../lib/avatars";

export function ReasonArt({ kind }) {
  const bg = <rect width="160" height="96" fill="#2A2346" />;
  if (kind === "notes") return (
    <svg viewBox="0 0 160 96" aria-hidden="true">{bg}
      <rect x="26" y="22" width="44" height="56" rx="4" fill="#FFD166" transform="rotate(-8 48 50)" />
      <rect x="62" y="18" width="44" height="56" rx="4" fill="#7CC6B8" transform="rotate(5 84 46)" />
      <rect x="96" y="26" width="40" height="52" rx="4" fill="#B9A8FF" transform="rotate(-3 116 52)" />
      <rect x="70" y="32" width="26" height="3" fill="#1C1730" /><rect x="70" y="40" width="20" height="3" fill="#1C1730" /><rect x="104" y="38" width="22" height="3" fill="#1C1730" />
    </svg>);
  if (kind === "phone") return (
    <svg viewBox="0 0 160 96" aria-hidden="true">{bg}
      <rect x="62" y="12" width="38" height="72" rx="8" fill="#1C1730" stroke="#B9A8FF" strokeWidth="3" />
      <rect x="69" y="22" width="24" height="10" rx="2" fill="#FFB36B" /><rect x="69" y="36" width="24" height="10" rx="2" fill="#5B5470" /><rect x="69" y="50" width="24" height="10" rx="2" fill="#5B5470" />
      <path d="M112 38v24m-7-7 7 7 7-7" stroke="#FFB36B" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="40" cy="30" r="9" fill="#FFB36B" opacity=".85" />
    </svg>);
  if (kind === "fork") return (
    <svg viewBox="0 0 160 96" aria-hidden="true">{bg}
      <path d="M80 90V52M80 52 46 22M80 52l34-30" stroke="#B9A8FF" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="46" cy="22" r="8" fill="#7CC6B8" /><circle cx="114" cy="22" r="8" fill="#FFB36B" /><circle cx="80" cy="52" r="6" fill="#fff" />
    </svg>);
  return (
    <svg viewBox="0 0 160 96" aria-hidden="true">{bg}
      <rect x="28" y="22" width="72" height="30" rx="15" fill="#B9A8FF" /><rect x="60" y="48" width="72" height="30" rx="15" fill="#FFB36B" />
      <circle cx="50" cy="37" r="3.5" fill="#1C1730" /><circle cx="64" cy="37" r="3.5" fill="#1C1730" /><circle cx="78" cy="37" r="3.5" fill="#1C1730" />
    </svg>);
}

export function CoachAvatar({ id, size = 40 }) {
  return <img className="avatar" src={avatarSrc(id)} width={size} height={size} alt="" />;
}

// Small option icons for the general questions (48×48, light quiz screens)
const N = "#1C1730", L = "#B9A8FF", S = "#7CC6B8", Y = "#FFD166", A = "#FFB36B", P = "#5B3FD9";
const moon = (k) => (
  <g><circle cx="24" cy="24" r="14" fill="#E9E4F4" />
    {k === 4 ? <circle cx="24" cy="24" r="14" fill={Y} />
      : <path d={`M24 10a14 14 0 0 1 0 28a${[0, 9, 0.01, 9][k]} 14 0 0 ${k === 3 ? 1 : 0} 0-28z`} fill={Y} />}</g>);
const pie = (frac) => {
  const a = frac * 2 * Math.PI, x = 24 + 15 * Math.sin(a), y = 24 - 15 * Math.cos(a);
  return (<g><circle cx="24" cy="24" r="17" fill="#fff" stroke={N} strokeWidth="2.5" />
    {frac >= 0.5 ? <path d={`M24 24V9A15 15 0 1 1 ${x} ${y}z`} fill={A} /> : <path d={`M24 24V9A15 15 0 0 1 ${x} ${y}z`} fill={A} />}
    <circle cx="24" cy="24" r="2.5" fill={N} /></g>);
};
const ICONS = {
  moon1: moon(1), moon2: moon(2), moon3: moon(3), moon4: moon(4),
  friends: <g><rect x="5" y="9" width="26" height="17" rx="8.5" fill={L} /><rect x="17" y="22" width="26" height="17" rx="8.5" fill={A} /><circle cx="13" cy="17.5" r="2" fill={N} /><circle cx="19" cy="17.5" r="2" fill={N} /></g>,
  book: <g><path d="M24 14c-5-4-12-4-17-2v24c5-2 12-2 17 2z" fill={S} /><path d="M24 14c5-4 12-4 17-2v24c-5-2-12-2-17 2z" fill={Y} /><path d="M24 14v24" stroke={N} strokeWidth="2" /></g>,
  planner: <g><rect x="13" y="5" width="22" height="38" rx="5" fill={N} /><rect x="17" y="12" width="14" height="5" rx="1.5" fill={A} /><rect x="17" y="20" width="14" height="5" rx="1.5" fill={L} /><rect x="17" y="28" width="14" height="5" rx="1.5" fill="#5B5470" /></g>,
  spark: <g><path d="M24 6c1.5 9 4 11.5 13 13-9 1.5-11.5 4-13 13-1.5-9-4-11.5-13-13 9-1.5 11.5-4 13-13z" fill={L} /><path d="M37 29c.7 4 1.8 5 5.5 5.6-3.7.7-4.8 1.8-5.5 5.6-.7-3.8-1.8-4.9-5.5-5.6 3.7-.6 4.8-1.6 5.5-5.6z" fill={A} /></g>,
  blank: <circle cx="24" cy="24" r="14" fill="none" stroke="#9C94B3" strokeWidth="2.5" strokeDasharray="5 5" />,
  sunrise: <g><path d="M10 32a14 14 0 0 1 28 0z" fill={A} /><path d="M5 32h38" stroke={N} strokeWidth="2.5" strokeLinecap="round" /><path d="M24 9v5M11 15l3 3M37 15l-3 3" stroke={A} strokeWidth="2.5" strokeLinecap="round" /></g>,
  noon: <g><circle cx="24" cy="24" r="9" fill={Y} />{[0, 45, 90, 135, 180, 225, 270, 315].map((d) => <path key={d} d="M24 7v5" stroke={Y} strokeWidth="3" strokeLinecap="round" transform={`rotate(${d} 24 24)`} />)}</g>,
  evening: <g><path d="M30 8a15 15 0 1 0 10 25A13 13 0 0 1 30 8z" fill={L} /><circle cx="36" cy="12" r="2" fill={A} /><circle cx="41" cy="20" r="1.4" fill={A} /></g>,
  battery: <g><rect x="6" y="15" width="32" height="18" rx="4" fill="none" stroke={N} strokeWidth="2.5" /><rect x="39" y="20" width="4" height="8" rx="1.5" fill={N} /><rect x="9.5" y="18.5" width="7" height="11" rx="1.5" fill={A} /></g>,
  partner: <g><circle cx="18" cy="24" r="11" fill={L} /><circle cx="30" cy="24" r="11" fill={A} opacity=".9" /></g>,
  family: <g><circle cx="14" cy="28" r="8" fill={S} /><circle cx="34" cy="28" r="8" fill={Y} /><circle cx="24" cy="18" r="9" fill={L} /></g>,
  pro: <g><path d="M8 12a5 5 0 0 1 5-5h22a5 5 0 0 1 5 5v15a5 5 0 0 1-5 5H20l-8 7v-7h1a5 5 0 0 1-5-5z" fill={S} /><path d="M17 19l5 5 9-9" stroke={N} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>,
  alone: <g><circle cx="24" cy="24" r="16" fill="none" stroke="#9C94B3" strokeWidth="2" strokeDasharray="4 4" /><circle cx="24" cy="24" r="7" fill={L} /></g>,
  pie5: pie(5 / 60), pie15: pie(15 / 60), pie30: pie(30 / 60),
  sun: <g><circle cx="24" cy="24" r="9" fill={A} />{[0, 60, 120, 180, 240, 300].map((d) => <path key={d} d="M24 6v5" stroke={A} strokeWidth="3" strokeLinecap="round" transform={`rotate(${d} 24 24)`} />)}</g>,
  moon: <path d="M29 7a17 17 0 1 0 12 28A15 15 0 0 1 29 7z" fill={L} />,
  sunday: <g><rect x="8" y="10" width="32" height="30" rx="5" fill="#fff" stroke={N} strokeWidth="2.5" /><path d="M8 18h32" stroke={N} strokeWidth="2.5" /><path d="M16 6v7M32 6v7" stroke={N} strokeWidth="2.5" strokeLinecap="round" /><text x="24" y="35" textAnchor="middle" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="700" fontSize="14" fill={P}>S</text></g>,
  phone: <g><rect x="14" y="5" width="20" height="38" rx="5" fill={N} /><circle cx="24" cy="21" r="6" fill={S} /><rect x="19" y="32" width="10" height="3" rx="1.5" fill="#5B5470" /></g>,
  checklist: <g><rect x="6" y="6" width="36" height="36" rx="7" fill="#fff" />{[13, 22, 31].map((y, i) => <g key={y}><rect x="11" y={y} width="6" height="6" rx="1.5" fill="none" stroke={N} strokeWidth="2" /><rect x="21" y={y + 2} width={[16, 12, 14][i]} height="2.5" rx="1.2" fill="#9C94B3" /></g>)}</g>,
  loop: <g><circle cx="24" cy="24" r="17" fill="#fff" /><path d="M15 24a9 9 0 1 1 3 6.7" stroke={P} strokeWidth="3" fill="none" strokeLinecap="round" /><path d="M14 27l4 4 3-5" stroke={P} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>,
};

export function OptArt({ name, size = 40 }) {
  if (!ICONS[name]) return null;
  return <svg className="oart" viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">{ICONS[name]}</svg>;
}
