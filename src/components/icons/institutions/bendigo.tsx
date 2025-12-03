interface IconProps {
  className?: string;
}

export function BendigoIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bendigo Bank Logo */}
      <rect width="32" height="32" rx="4" fill="#BE1E2D" />
      <circle cx="16" cy="16" r="8" fill="white" />
      <circle cx="16" cy="16" r="5" fill="#BE1E2D" />
    </svg>
  );
}
