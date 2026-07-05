// MeetBot brand mark — blue gradient square with bold white "M"
export default function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mbGrad" x1="16" y1="0" x2="16" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4E9CFB" />
          <stop offset="1" stopColor="#2163EE" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="7" fill="url(#mbGrad)" />
      {/* Bold geometric M */}
      <path
        d="M7.5 24V8h4.4l4.1 8.6L20.1 8h4.4v16h-3.9v-9.3l-3.2 6.6h-2.8l-3.2-6.6V24H7.5z"
        fill="#fff"
      />
    </svg>
  )
}
