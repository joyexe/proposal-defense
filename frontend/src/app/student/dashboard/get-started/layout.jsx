// Custom layout for get-started: no sidebar, no navbar, just the content
export default function Layout({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background:
          "linear-gradient(to right, #d6eaff 0%, rgba(214,234,255,0.0) 40%), linear-gradient(rgba(60,140,108,0.45), rgba(60,140,108,0.45)), url(/img/ietischool.jpg) center/cover no-repeat",
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  );
} 