interface IconProps {
  className?: string;
}

export function RESTIcon({ className }: IconProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* REST Super Logo */}
      <rect width="32" height="32" rx="4" fill="#00A9E0" />
      <text
        x="16"
        y="20"
        textAnchor="middle"
        fill="white"
        fontSize="7"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        REST
      </text>
    </svg>
  );
}
