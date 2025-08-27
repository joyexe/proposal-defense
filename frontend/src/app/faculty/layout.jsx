"use client";
import FacultySidebar from "./faculty-sidebar";
import DashboardNavbar from "../components/DashboardNavbar";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import "bootstrap/dist/css/bootstrap.min.css";
import "./faculty-sidebar.css";
import { ThemeProvider } from "../components/ThemeContext";

export default function FacultyLayout({ children }) {
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
    if (pathname.startsWith("/faculty/settings")) setActiveText("Settings");
    else if (pathname.startsWith("/faculty/notification")) setActiveText("Notifications Center");
    else if (pathname.startsWith("/faculty/dashboard")) setActiveText("Dashboard");
    else if (pathname.startsWith("/faculty/health-record")) setActiveText("Permit Requests");
    else if (pathname.startsWith("/faculty/appointment")) setActiveText("Appointments");
    else if (pathname.startsWith("/faculty/bulletin")) setActiveText("Bulletin");
    else setActiveText("Dashboard");
  }, [pathname]);

  if (!isLoggedIn) return null;

  return (
    <ThemeProvider>
      <div className="d-flex" style={{ minHeight: "100vh", background: "var(--background)" }}>
        <FacultySidebar setActiveText={setActiveText} />
        <div className="flex-grow-1">
          <DashboardNavbar role="faculty" activeText={activeText} />
          <main className="p-4">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
