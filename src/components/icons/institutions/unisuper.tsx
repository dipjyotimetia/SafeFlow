interface IconProps {
  className?: string;
}

export function UniSuperIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* UniSuper Logo */}
      <rect width="32" height="32" rx="4" fill="#00205B" />
      <path
        d="M10 12V18C10 20.2 12.8 22 16 22C19.2 22 22 20.2 22 18V12"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="16" cy="10" r="2" fill="white" />
    </svg>
  );
}
