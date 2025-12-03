interface IconProps {
  className?: string;
}

export function MacquarieIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Macquarie Logo */}
      <rect width="32" height="32" rx="4" fill="#000000" />
      <text
        x="16"
        y="20"
        textAnchor="middle"
        fill="white"
        fontSize="8"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        MQG
      </text>
    </svg>
  );
}
