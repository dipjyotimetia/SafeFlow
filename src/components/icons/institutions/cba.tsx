interface IconProps {
  className?: string;
}

export function CBAIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Commonwealth Bank Diamond Logo */}
      <rect width="32" height="32" rx="4" fill="#FFCC00" />
      <path
        d="M16 6L26 16L16 26L6 16L16 6Z"
        fill="#000000"
      />
      <path
        d="M16 10L22 16L16 22L10 16L16 10Z"
        fill="#FFCC00"
      />
    </svg>
  );
}
