import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" />
      <rect x="13" y="3.5" width="7.5" height="4.5" rx="2" />
      <rect x="13" y="10" width="7.5" height="10.5" rx="2" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="2" />
    </Base>
  );
}

export function AgentIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3.5 L18.5 7.25 V16.75 L12 20.5 L5.5 16.75 V7.25 Z" />
      <circle cx="9.6" cy="11.6" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="11.6" r="1" fill="currentColor" stroke="none" />
      <path d="M12 3.5 V1.8 M9.5 14.6 h5" />
    </Base>
  );
}

export function CandlesIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M5.5 4v2.2 M5.5 15.4V20" />
      <rect x="3.4" y="6.2" width="4.2" height="9.2" rx="1.4" />
      <path d="M12 2.6v2 M12 12v8.6" />
      <rect x="9.9" y="4.6" width="4.2" height="7.4" rx="1.4" />
      <path d="M18.5 5.4v1.8 M18.5 17v3.6" />
      <rect x="16.4" y="7.2" width="4.2" height="9.8" rx="1.4" />
    </Base>
  );
}

export function PulseIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M2.8 12h4l2.2-5.6 3.6 11.2 2.6-7.4 1.4 1.8h4.6" />
    </Base>
  );
}

export function VaultIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <circle cx="12" cy="10.6" r="2.6" />
      <path d="M12 13.2v3.4" />
      <path d="M20.5 8.5h1.6 M20.5 15.5h1.6" strokeWidth={1.6} />
    </Base>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M6 10a6 6 0 0 1 12 0c0 4 1.6 5.4 1.6 5.4H4.4S6 14 6 10Z" />
      <path d="M10.2 19.2a2 2 0 0 0 3.6 0" />
    </Base>
  );
}

export function TuneIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M4 7.4h9 M17.2 7.4h2.8 M4 16.6h2.8 M11 16.6h9" />
      <circle cx="15" cy="7.4" r="2.1" />
      <circle cx="8.8" cy="16.6" r="2.1" />
    </Base>
  );
}

export function BoltIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M13.2 2.8 5.6 13.4h5l-1.8 7.8 7.6-10.6h-5z" />
    </Base>
  );
}

export function ShieldCheckIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M12 3 19 5.8v5.4c0 4.6-3 7.6-7 9.8-4-2.2-7-5.2-7-9.8V5.8Z" />
      <path d="m9.2 11.8 2 2 3.6-4" />
    </Base>
  );
}
