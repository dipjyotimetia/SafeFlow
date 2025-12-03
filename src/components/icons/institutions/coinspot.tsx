interface IconProps {
  className?: string;
}

export function CoinSpotIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* CoinSpot Logo */}
      <rect width="32" height="32" rx="4" fill="#2962FF" />
      <circle cx="16" cy="16" r="8" stroke="white" strokeWidth="2" fill="none" />
      <text
        x="16"
        y="20"
        textAnchor="middle"
        fill="white"
        fontSize="10"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        C
      </text>
    </svg>
  );
}
