interface IconProps {
  className?: string;
}

export function INGIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* ING Lion Logo */}
      <rect width="32" height="32" rx="4" fill="#FF6200" />
      <text
        x="16"
        y="20"
        textAnchor="middle"
        fill="white"
        fontSize="10"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        ING
      </text>
    </svg>
  );
}
