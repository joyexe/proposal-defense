"use client";
import StudentSidebar from "./student-sidebar";
import DashboardNavbar from "../components/DashboardNavbar";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import "bootstrap/dist/css/bootstrap.min.css";
import { ThemeProvider } from "../components/ThemeContext";

export default function StudentLayout({ children }) {
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
    if (pathname.startsWith("/student/settings")) setActiveText("Settings");
    else if (pathname.startsWith("/student/amieti")) setActiveText("AMIETI");
    else if (pathname.startsWith("/student/notification")) setActiveText("Notifications Center");
    else if (pathname.startsWith("/student/dashboard")) setActiveText("Dashboard");
    else if (pathname.startsWith("/student/health-record")) setActiveText("Permit Requests");
    else if (pathname.startsWith("/student/appointment")) setActiveText("Appointments");
    else if (pathname.startsWith("/student/bulletin")) setActiveText("Bulletin");
    else setActiveText("Dashboard");
  }, [pathname]);

  if (!isLoggedIn) return null;

  return (
    <ThemeProvider>
      <div className="d-flex" style={{ minHeight: "100vh", background: "var(--background)" }}>
        <StudentSidebar setActiveText={setActiveText} />
        <div className="flex-grow-1">
          <DashboardNavbar role="student" activeText={activeText} />
          <main className="p-4">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
