interface IconProps {
  className?: string;
}

export function HostplusIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Hostplus Logo */}
      <rect width="32" height="32" rx="4" fill="#00205B" />
      <path
        d="M10 16H22M16 10V22"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
