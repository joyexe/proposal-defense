"use client";
import CounselorSidebar from "./counselor-sidebar";
import DashboardNavbar from "../components/DashboardNavbar";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import "bootstrap/dist/css/bootstrap.min.css";
import { ThemeProvider } from "../components/ThemeContext";

export default function CounselorLayout({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeText, setActiveText] = useState('Dashboard');
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      setIsLoggedIn(true);
    }
  }, [router]);

  useEffect(() => {
    // Set navbar text based on section prefix
    if (pathname.startsWith("/counselor/settings")) setActiveText("Settings");
    else if (pathname.startsWith("/counselor/dashboard")) setActiveText("Dashboard");
    else if (pathname.startsWith("/counselor/notification")) setActiveText("Notifications Center");
    else if (pathname.startsWith("/counselor/appointment")) setActiveText("Appointments");
    else if (pathname.startsWith("/counselor/analytics")) setActiveText("Analytics");
    else if (pathname.startsWith("/counselor/bulletin")) setActiveText("Bulletin");
    else setActiveText("Dashboard");
  }, [pathname]);

  if (!isLoggedIn) return null;

  return (
    <ThemeProvider>
      <div className="d-flex" style={{ minHeight: "100vh", background: "var(--background)" }}>
        <CounselorSidebar setActiveText={setActiveText} />
        <div className="flex-grow-1">
          <DashboardNavbar role="counselor" activeText={activeText} />
          <main className="p-4">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
