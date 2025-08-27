"use client";
import AdminSidebar from "./admin-sidebar";
import DashboardNavbar from "../components/DashboardNavbar";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import "bootstrap/dist/css/bootstrap.min.css";
import { ThemeProvider } from "../components/ThemeContext";

export default function AdminLayout({ children }) {
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
    if (pathname.startsWith("/admin/dashboard")) setActiveText("Dashboard");
    else if (pathname.startsWith("/admin/users")) setActiveText("User Management");
    else if (pathname.startsWith("/admin/analytics")) setActiveText("Analytics");
    else if (pathname.startsWith("/admin/health-record")) setActiveText("Health Record");
    else if (pathname.startsWith("/admin/logs")) setActiveText("System Logs");
    else if (pathname.startsWith("/admin/settings")) setActiveText("Settings");
    else setActiveText("Dashboard");
  }, [pathname]);

  if (!isLoggedIn) return null;

  return (
    <ThemeProvider>
      <div className="d-flex" style={{ minHeight: "100vh", background: "var(--background)" }}>
        <AdminSidebar setActiveText={setActiveText} />
        <div className="flex-grow-1">
          <DashboardNavbar role="admin" activeText={activeText} />
          <main className="p-4">{children}</main>
        </div>
      </div>
    </ThemeProvider>
  );
}
