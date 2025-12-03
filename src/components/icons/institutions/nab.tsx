interface IconProps {
  className?: string;
}

export function NABIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* NAB Star Logo */}
      <rect width="32" height="32" rx="4" fill="#C20000" />
      <path
        d="M16 6L18.5 13.5H26L20 18L22.5 26L16 21L9.5 26L12 18L6 13.5H13.5L16 6Z"
        fill="white"
      />
    </svg>
  );
}
