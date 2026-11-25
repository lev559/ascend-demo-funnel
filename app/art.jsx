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
