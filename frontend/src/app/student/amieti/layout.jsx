"use client";
import React from "react";

export default function Layout({ children }) {
  return (
    <div className="container-fluid px-0" style={{ background: "#f8fafc", minHeight: "100vh", width: "100%" }}>
      <div className="row m-0" style={{ width: "100%" }}>
        <div className="p-0" style={{ width: "100%" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
