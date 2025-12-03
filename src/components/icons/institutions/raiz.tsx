interface IconProps {
  className?: string;
}

export function RaizIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Raiz Invest Logo */}
      <rect width="32" height="32" rx="4" fill="#00D09C" />
      <path
        d="M8 22L14 14L18 18L24 10"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="24" cy="10" r="2" fill="white" />
    </svg>
  );
}
