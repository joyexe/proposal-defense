"use client";

import React from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend as ChartLegend
} from "chart.js";
import { useRouter } from "next/navigation";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, ChartLegend);

export default function AdminAnalyticsPage() {
  const router = useRouter();
  // Data for the stacked area chart (Mental Health Trends)
  const lineData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Anxiety",
        data: [30, 35, 38, 40, 42, 45],
        fill: true,
        backgroundColor: "#ffb3b3",
        borderColor: "#ff6f6f",
        tension: 0.4,
        stack: "Stack 0",
      },
      {
        label: "Depression",
        data: [18, 20, 22, 24, 25, 27],
        fill: true,
        backgroundColor: "#b3e0ff",
        borderColor: "#4fc3f7",
        tension: 0.4,
        stack: "Stack 0",
      },
      {
        label: "Stress",
        data: [22, 25, 27, 29, 30, 32],
        fill: true,
        backgroundColor: "#fff7b3",
        borderColor: "#ffe066",
        tension: 0.4,
        stack: "Stack 0",
      },
      {
        label: "General Wellness",
        data: [40, 42, 45, 48, 50, 52],
        fill: true,
        backgroundColor: "#e0e0e0",
        borderColor: "#bdbdbd",
        tension: 0.4,
        stack: "Stack 0",
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { mode: "index", intersect: false },
    },
    interaction: { mode: "nearest", axis: "x", intersect: false },
    scales: {
      x: {
        title: { display: true, text: 'Month', font: { size: 14 } },
        stacked: true,
        grid: { display: false },
      },
      y: {
        title: { display: true, text: 'Cases', font: { size: 14 } },
        stacked: true,
        beginAtZero: true,
        grid: { display: false },
        ticks: { stepSize: 30 },
      },
    },
  };

  // Data for the flagged keywords bar chart
  const barData = {
    labels: [
      "Anxiety",
      "Stress",
      "Overwhelmed",
      "Depression",
      "Tired",
      "Bullying",
      "Hopeless"
    ],
    datasets: [
      {
        label: "Flagged Keywords",
        data: [8, 4, 6, 7, 9, 11, 13],
        backgroundColor: [
          "#e53935",
          "#e53935",
          "#e53935",
          "#e53935",
          "#e53935",
          "#e53935",
          "#e53935"
        ],
        borderRadius: 8,
        barThickness: 18,
      },
    ],
  };

  const barOptions = {
    indexAxis: "y",
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { display: false },
        ticks: {
          stepSize: 2,
          callback: function(value) {
            return value + ' mentions';
          }
        },
      },
      y: {
        grid: { display: false },
      },
    },
  };

  return (
    <div className="container-fluid py-4" style={{ background: '#fafbfc', minHeight: '100vh' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div className="fw-bold fs-5 mb-1">System Overview</div>
          <div className="text-muted" style={{ fontSize: 15 }}>Key performance indicators and trends</div>
        </div>
        <div className="d-flex align-items-center gap-2">
          <div style={{ position: 'relative', width: 160 }}>
            <select className="form-select" style={{ borderRadius: 8, appearance: 'none', paddingRight: 32 }} defaultValue="Last Week" aria-label="Select time range">
              <option>Last Week</option>
              <option>Last Month</option>
              <option>Last Quarter</option>
            </select>
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
              <i className="bi bi-chevron-down"></i>
            </span>
          </div>
          <button className="btn btn-success px-4 fw-semibold" style={{ borderRadius: 10 }}>
            <span className="me-2" aria-hidden="true">
              <i className="bi bi-download" style={{ fontSize: 18, verticalAlign: 'middle' }}></i>
            </span>
            Export
          </button>
        </div>
      </div>
      <div className="d-flex align-items-center mb-4">
        <ul className="nav nav-pills w-100">
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border bg-success text-white`}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '8px 0 0 8px' }}
              onClick={() => router.push('/admin/analytics')}
            >
              Mental Health
            </button>
          </li>
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border bg-light text-dark`}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0' }}
              onClick={() => router.push('/admin/analytics/physical-health')}
            >
              Physical Health
            </button>
          </li>
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border bg-light text-dark`}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0 8px 8px 0' }}
              onClick={() => router.push('/admin/analytics/engagements')}
            >
              AMIETI Chatbot
            </button>
          </li>
        </ul>
      </div>
      <div className="row g-3 align-items-end mb-3">
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Total Mental Health Conversations</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>357</div>
            <div className="text-secondary small mt-1">Conversations with AMIETI involving mental health</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Top Concern Categories</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>Stress</div>
            <div className="text-secondary small mt-1">Common concern types detected from student</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Follow-Ups Triggered by AMIETI</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>12</div>
            <div className="text-secondary small mt-1">Students flagged and referred to counselors</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>High Alert Mentions</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#e53935' }}>14</div>
            <div className="text-danger small mt-1">Require immediate attention</div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-4 shadow-sm p-4 mb-4" style={{ minHeight: 340 }}>
        <div className="fw-bold mb-2" style={{ fontSize: 20, color: '#38813A' }}>Mental Health Trends</div>
        <div className="text-muted mb-3" style={{ fontSize: 14 }}>Distribution of mental health issues over time</div>
        <div className="d-flex justify-content-center align-items-center gap-4 mb-2" style={{ fontSize: 15, fontFamily: 'sans-serif' }}>
          <span className="d-flex align-items-center"><span style={{ width: 16, height: 16, background: '#ffb3b3', display: 'inline-block', borderRadius: 4, marginRight: 6 }}></span>Anxiety</span>
          <span className="d-flex align-items-center"><span style={{ width: 16, height: 16, background: '#b3e0ff', display: 'inline-block', borderRadius: 4, marginRight: 6 }}></span>Depression</span>
          <span className="d-flex align-items-center"><span style={{ width: 16, height: 16, background: '#fff7b3', display: 'inline-block', borderRadius: 4, marginRight: 6 }}></span>Stress</span>
          <span className="d-flex align-items-center"><span style={{ width: 16, height: 16, background: '#e0e0e0', display: 'inline-block', borderRadius: 4, marginRight: 6 }}></span>General Wellness</span>
        </div>
        <div className="w-100" style={{ minHeight: 220, overflow: 'hidden' }}>
          <Line data={lineData} options={lineOptions} height={220} />
        </div>
      </div>
      <div className="row g-3">
        <div className="col-lg-6">
          <div className="bg-white rounded-4 shadow-sm p-4 mb-3" style={{ minHeight: 180 }}>
            <div className="fw-bold mb-2" style={{ fontSize: 18 }}>Risk Level Distribution</div>
            <div className="mb-2" style={{ fontSize: 15 }}>
              <div className="d-flex align-items-center mb-2">
                <span className="flex-grow-1">High Risk</span>
                <span style={{ color: '#222', fontWeight: 600, fontSize: 15 }}>2 (50%)</span>
              </div>
              <div className="progress mb-3" style={{ height: 8, borderRadius: 8, background: '#f8d7da' }}>
                <div className="progress-bar" role="progressbar" style={{ width: '50%', background: '#e53935', borderRadius: 8 }} aria-valuenow={50} aria-valuemin={0} aria-valuemax={100}></div>
              </div>
              <div className="d-flex align-items-center mb-2">
                <span className="flex-grow-1">Moderate Risk</span>
                <span style={{ color: '#222', fontWeight: 600, fontSize: 15 }}>1 (25%)</span>
              </div>
              <div className="progress mb-3" style={{ height: 8, borderRadius: 8, background: '#fff9c4' }}>
                <div className="progress-bar" role="progressbar" style={{ width: '25%', background: '#ffd600', borderRadius: 8 }} aria-valuenow={25} aria-valuemin={0} aria-valuemax={100}></div>
              </div>
              <div className="d-flex align-items-center">
                <span className="flex-grow-1">Low Risk</span>
                <span style={{ color: '#222', fontWeight: 600, fontSize: 15 }}>1 (25%)</span>
              </div>
              <div className="progress" style={{ height: 8, borderRadius: 8, background: '#e0f2f1' }}>
                <div className="progress-bar" role="progressbar" style={{ width: '25%', background: '#43a047', borderRadius: 8 }} aria-valuenow={25} aria-valuemin={0} aria-valuemax={100}></div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-4 shadow-sm p-4" style={{ minHeight: 120 }}>
            <div className="fw-bold mb-2" style={{ fontSize: 18, color: '#222' }}>Key Insights</div>
            <ul className="mb-0" style={{ fontSize: 15, color: '#222', fontWeight: 600, paddingLeft: 18 }}>
              <li>Mental health sessions increased by 15% this week</li>
            </ul>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="bg-white rounded-4 shadow-sm p-4 mb-3" style={{ minHeight: 180 }}>
            <div className="fw-bold mb-2" style={{ fontSize: 18 }}>Flagged Keywords</div>
            <div className="mb-2" style={{ fontSize: 15 }}>Most common keywords flagged in student interactions</div>
            <div style={{ minHeight: 120 }}>
              <Bar data={barData} options={barOptions} height={120} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
