export function CandleIcon({ size = 14 }: { size?: number }) {
  const h = size * (22 / 14)
  return (
    <svg width={size} height={h} viewBox="0 0 14 22" fill="none">
      <path d="M7 1C7 1 12 6.5 12 10.5C12 13.8 9.8 16.5 7 16.5C4.2 16.5 2 13.8 2 10.5C2 6.5 7 1 7 1Z" fill="#E8A44A" opacity="0.9"/>
      <path d="M7 5C7 5 10.5 9 10.5 11.5C10.5 13.2 8.9 14.5 7 14.5C5.1 14.5 3.5 13.2 3.5 11.5C3.5 9 7 5 7 5Z" fill="#F5C97A"/>
      <rect x="4.5" y="16.5" width="5" height="4" rx="1.2" fill="#6B4226"/>
      <rect x="3" y="20" width="8" height="2" rx="1" fill="#3D2B1F"/>
    </svg>
  )
}

export default CandleIcon
