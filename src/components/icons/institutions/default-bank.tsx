interface IconProps {
  className?: string;
}

export function DefaultBankIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Generic Bank Icon */}
      <rect width="32" height="32" rx="4" fill="#6B7280" />
      <path
        d="M16 8L6 14H26L16 8Z"
        fill="white"
      />
      <rect x="8" y="15" width="3" height="8" fill="white" />
      <rect x="14.5" y="15" width="3" height="8" fill="white" />
      <rect x="21" y="15" width="3" height="8" fill="white" />
      <rect x="6" y="23" width="20" height="2" fill="white" />
    </svg>
  );
}
