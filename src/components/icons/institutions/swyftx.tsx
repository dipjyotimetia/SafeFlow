interface IconProps {
  className?: string;
}

export function SwyftxIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Swyftx Logo */}
      <rect width="32" height="32" rx="4" fill="#00C2FF" />
      <path
        d="M10 20C10 20 14 16 16 16C18 16 22 12 22 12"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M10 12C10 12 14 16 16 16C18 16 22 20 22 20"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
