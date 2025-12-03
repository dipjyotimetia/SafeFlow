interface IconProps {
  className?: string;
}

export function UpIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Up Bank Logo */}
      <rect width="32" height="32" rx="4" fill="#FF7A64" />
      <path
        d="M16 8L16 20M16 8L10 14M16 8L22 14"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="24" r="2" fill="white" />
    </svg>
  );
}
