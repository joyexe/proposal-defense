"use client";
// import Navbar from './Navbar';
import Footer from './Footer';
import { usePathname } from 'next/navigation';
import ChatbotFloatingIcon from './ChatbotFloatingIcon';

export default function AppShell({ children }) {
  const pathname = usePathname();
  // Only show Footer on public (non-dashboard) routes
  const isDashboardRoute = (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/student') ||
    pathname.startsWith('/clinic') ||
    pathname.startsWith('/counselor') ||
    pathname.startsWith('/faculty') ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/terms-and-conditions'
  );
  const showPublicLayout = !isDashboardRoute;

  // Show chatbot only on public homepage, student pages, login, and forgot password pages
  const showChatbot = (
    pathname === '/' ||
    pathname.startsWith('/student') ||
    pathname === '/login' ||
    pathname === '/forgot-password'
  );

  return (
    <>
      {/* {showPublicLayout && <Navbar />} */}
      {children}
      {showPublicLayout && <Footer />}
      {showChatbot && <ChatbotFloatingIcon />}
    </>
  );
} 