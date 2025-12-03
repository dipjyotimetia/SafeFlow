interface IconProps {
  className?: string;
}

export function WestpacIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Westpac W Logo */}
      <rect width="32" height="32" rx="4" fill="#D5002B" />
      <path
        d="M6 12L10 22L16 14L22 22L26 12"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
