function BrandMark({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="brand-water" x1="32" y1="5" x2="32" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8DE6F5" />
          <stop offset="0.46" stopColor="#31A9CF" />
          <stop offset="1" stopColor="#147348" />
        </linearGradient>
      </defs>
      <path
        d="M32 4C25.2 15.4 11 27.6 11 39.2A21 21 0 0 0 53 39.2C53 27.6 38.8 15.4 32 4Z"
        fill="url(#brand-water)"
      />
      <path
        d="M31.8 55.5C20.9 52.8 16.8 44.5 18 34.4c8.7 2.5 13.4 8.6 13.8 17.1 1.3-12 7-20.3 16.7-24.5 2.3 12.8-2.8 24.4-16.7 28.5Z"
        fill="#13844F"
      />
      <path
        d="M31.8 51.5c-1-10.2-4.8-17.8-11.4-22.8m12.6 23.3c3.7-9.2 8.5-15.5 14.7-19.1"
        stroke="#B8F0C5"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default BrandMark;
