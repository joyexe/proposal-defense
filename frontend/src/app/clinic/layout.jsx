"use client";
import ClinicSidebar from "./clinic-sidebar";
import DashboardNavbar from "../components/DashboardNavbar";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import "bootstrap/dist/css/bootstrap.min.css";
import { ThemeProvider } from "../components/ThemeContext";

export default function ClinicLayout({ children }) {
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
    if (pathname.startsWith("/clinic/settings")) setActiveText("Settings");
    else if (pathname.startsWith("/clinic/notification")) setActiveText("Notifications Center");
    else if (pathname.startsWith("/clinic/dashboard")) setActiveText("Dashboard");
    else if (pathname.startsWith("/clinic/medical-examination")) setActiveText("Medical Examination");
    else if (pathname.startsWith("/clinic/health-record")) setActiveText("Permit Requests");
    else if (pathname.startsWith("/clinic/appointment")) setActiveText("Appointments");
    else if (pathname.startsWith("/clinic/analytics")) setActiveText("Analytics");
    else if (pathname.startsWith("/clinic/bulletin")) setActiveText("Bulletin");
    else if (pathname.startsWith("/clinic/inventory")) setActiveText("Inventory");
    else setActiveText("Dashboard");
  }, [pathname]);

  if (!isLoggedIn) return null;

  return (
    <ThemeProvider>
      <div className="d-flex" style={{ minHeight: "100vh", background: "var(--background)" }}>
        <ClinicSidebar setActiveText={setActiveText} />
        <div className="flex-grow-1">
          <DashboardNavbar role="clinic" activeText={activeText} />
          <main className="p-4">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
