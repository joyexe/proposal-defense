const CloudDivider = ({ style }) => (
  <div
    style={{
      width: "100%",
      overflow: "hidden",
      lineHeight: 0,
      marginTop: '-40px', // Pull up to sit just below the buttons
      ...style,
    }}
  >
    <svg
      viewBox="0 0 1440 120" // Standard full-width viewBox
      preserveAspectRatio="none"
      style={{ display: "block", width: "100%", height: 120 }}
    >
      <path
        d="M0,120
          Q 60,60 120,120
          Q 180,80 240,120
          Q 300,100 360,120
          Q 420,80 480,120
          Q 540,100 600,120
          Q 660,80 720,120
          Q 780,100 840,120
          Q 900,80 960,120
          Q 1020,100 1080,120
          Q 1140,80 1200,120
          Q 1260,100 1320,120
          Q 1380,60 1440,120
          L1440,120 L0,120 Z"
        fill="#fff"
      />
      {/* Left side: Overlapping ellipses, now fully visible */}
      <ellipse cx="-120" cy="40" rx="200" ry="80" fill="#fff" />
      <ellipse cx="40" cy="80" rx="120" ry="50" fill="#fff" />
      {/* Right side: Overlapping ellipses, now fully visible */}
      <ellipse cx="1500" cy="40" rx="200" ry="80" fill="#fff" />
      <ellipse cx="1400" cy="80" rx="120" ry="50" fill="#fff" />
      {/* Center clouds remain */}
      <ellipse cx="300" cy="110" rx="90" ry="35" fill="#fff" />
      <ellipse cx="500" cy="110" rx="80" ry="30" fill="#fff" />
      <ellipse cx="700" cy="115" rx="90" ry="35" fill="#fff" />
      <ellipse cx="900" cy="110" rx="80" ry="30" fill="#fff" />
      <ellipse cx="1100" cy="115" rx="90" ry="35" fill="#fff" />
    </svg>
  </div>
);

export default CloudDivider; 