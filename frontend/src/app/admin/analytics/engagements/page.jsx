"use client";

import React, { useState, useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend as ChartLegend
} from "chart.js";
import { useRouter } from "next/navigation";
import { getChatbotMentalHealthAnalytics } from "../../../utils/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, ChartLegend);

export default function AdminEngagementsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [engagementData, setEngagementData] = useState(null);
  const [timeRange, setTimeRange] = useState('month'); // Default to show all months

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const apiTimeRange = timeRange === 'month' ? 12 : timeRange; // Use 12 months for "All Months" option
        const engagement = await getChatbotMentalHealthAnalytics(apiTimeRange);
        setEngagementData(engagement);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange]);

  const handleTimeRangeChange = (newRange) => {
    if (newRange === 'month') {
      setTimeRange('month');
    } else {
      setTimeRange(parseInt(newRange));
    }
  };

  // Data for AMIETI Engagement Trends (line chart) - use API data or fallback
  const engagementLineData = engagementData && engagementData.labels && engagementData.datasets ? {
    labels: engagementData.labels,
    datasets: engagementData.datasets.map(dataset => ({
      ...dataset,
      fill: false,
      tension: 0.3,
      pointRadius: 4,
      pointBackgroundColor: dataset.backgroundColor,
      pointBorderColor: dataset.backgroundColor,
    }))
  } : {
    labels: ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
    datasets: [
      {
        label: "Check-ins",
        data: [23, 28, 25, 32, 29, 35, 38, 36, 42, 40, 46, 0],
        fill: false,
        borderColor: "#2dd4bf",
        backgroundColor: "#2dd4bf",
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#2dd4bf",
        pointBorderColor: "#2dd4bf",
      },
      {
        label: "Conversations",
        data: [45, 52, 48, 61, 58, 67, 73, 69, 82, 78, 89, 0],
        fill: false,
        borderColor: "#f472b6",
        backgroundColor: "#f472b6",
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#f472b6",
        pointBorderColor: "#f472b6",
      },
    ],
  };
  const engagementLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#ddd',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          title: function(context) {
            // Show month with correct year in tooltip title
            const monthIndex = context[0].dataIndex;
            const monthLabel = context[0].label;
            
            // Calculate correct year based on month index
            // September 2024 (index 0) to August 2025 (index 11)
            let year = 2024;
            if (monthIndex >= 4) { // January 2025 onwards (index 4-11)
              year = 2025;
            }
            return monthLabel + ' ' + year;
          },
          label: function(context) {
            return context.dataset.label + ': ' + context.parsed.y + ' interactions';
          }
        }
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    animation: {
      duration: 1500,
      easing: 'easeInOutQuart'
    },
    elements: {
      point: {
        radius: 4,  // Visible points
        hoverRadius: 6,  // Larger on hover
        borderWidth: 2,
        backgroundColor: function(context) {
          return context.dataset.pointBackgroundColor || context.dataset.backgroundColor;
        },
        borderColor: function(context) {
          return context.dataset.pointBorderColor || '#fff';
        }
      },
      line: {
        tension: 0.3,
        borderWidth: 2,
        fill: false
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Months',
          font: { size: 14, weight: 'bold' },
          color: '#333'
        },
        stacked: false, // Disable stacking to show individual values
        grid: {
          display: false, // Hide vertical grid lines
          color: 'rgba(0,0,0,0.1)',
          drawBorder: false
        },
        ticks: {
          font: { size: 12 },
          color: '#666'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Interactions',
          font: { size: 14, weight: 'bold' },
          color: '#333'
        },
        stacked: false, // Disable stacking to show individual values
        grid: {
          display: true, // Show horizontal grid lines
          color: 'rgba(0,0,0,0.1)',
          drawBorder: false,
          lineWidth: 1
        },
        ticks: {
          stepSize: 1,
          callback: function(value) {
            return Math.round(value);
          },
          font: { size: 12 },
          color: '#666'
        }
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
          <div style={{ position: 'relative', width: 180 }}>
            <select 
              className="form-select" 
              style={{ borderRadius: 8, appearance: 'none', paddingRight: 32 }} 
              value={timeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
              aria-label="Select time range"
            >
              <option value="month">All Months</option>
              <option value={1}>Current Month</option>
              <option value={3}>Last 3 Months</option>
              <option value={6}>Last 6 Months</option>
              <option value={12}>Last Year</option>
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
            <button className={`nav-link w-100 border bg-light text-dark`} style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '8px 0 0 8px' }} onClick={() => router.push('/admin/analytics')}>
              Mental Health
            </button>
          </li>
          <li className="nav-item flex-fill">
            <button className={`nav-link w-100 border bg-light text-dark`} style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0' }} onClick={() => router.push('/admin/analytics/physical-health')}>
              Physical Health
            </button>
          </li>
          <li className="nav-item flex-fill">
            <button className={`nav-link w-100 border bg-success text-white`} style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0 8px 8px 0' }}>
              AMIETI Chatbot
            </button>
          </li>
        </ul>
      </div>
      {/* Metrics cards */}
      <div className="row g-3 align-items-end mb-3">
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Total Mental Health Records</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>357</div>
            <div className="text-secondary small mt-1">+24 from last quarter</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Anxiety Reports</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>142</div>
            <div className="text-secondary small mt-1">+15% from last quarter</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Depression Reports</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>98</div>
            <div className="text-secondary small mt-1">+8% from last quarter</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>High Alert Flags</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#e53935' }}>14</div>
            <div className="text-danger small mt-1">Require immediate attention</div>
          </div>
        </div>
      </div>
      {/* AMIETI Engagement Trends */}
      <div className="bg-white rounded-4 shadow-sm p-4 mb-4" style={{ minHeight: 340 }}>
        <div className="fw-bold mb-2" style={{ fontSize: 20, color: '#38813A' }}>AMIETI Engagement Trends</div>
        <div className="text-muted mb-3" style={{ fontSize: 14 }}>Monthly check-ins and conversations</div>
        
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 220 }}>
            <div className="text-center text-muted">
              <div className="mb-2">Loading...</div>
              <div style={{ fontSize: 14 }}>Please wait while we load the data.</div>
            </div>
          </div>
        ) : (
          <>
            {/* Custom Legend */}
            <div className="d-flex justify-content-center align-items-center gap-4 mb-3 flex-wrap" style={{ fontSize: 14, fontFamily: 'sans-serif' }}>
              {engagementLineData.datasets.map((dataset, index) => (
                <span key={index} className="d-flex align-items-center" style={{ 
                  padding: '4px 8px', 
                  borderRadius: 6, 
                  backgroundColor: 'rgba(255,255,255,0.8)',
                  border: '1px solid rgba(0,0,0,0.1)'
                }}>
                  <span 
                    style={{ 
                      width: 12, 
                      height: 12, 
                      background: dataset.backgroundColor, 
                      display: 'inline-block', 
                      borderRadius: 3, 
                      marginRight: 6 
                    }}
                  ></span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>
                    {dataset.label}
                  </span>
                </span>
              ))}
            </div>
            
            {/* Chart */}
        <div className="w-100" style={{ minHeight: 220, overflow: 'hidden' }}>
          <Line data={engagementLineData} options={engagementLineOptions} height={220} />
        </div>
          </>
        )}
      </div>
      {/* AI-Powered Predictive Analytics */}
      <div className="row">
        <div className="col-lg-12">
          <div className="bg-white rounded-4 shadow-sm p-4" style={{ minHeight: 120 }}>
            <div className="fw-bold mb-2" style={{ fontSize: 18 }}>AI-Powered Predictive Analytics</div>
            {predictiveInsights && predictiveInsights.overall_insights ? (
              <div>
                {/* Algorithm Performance */}
                <div className="mb-3">
                  <div className="fw-semibold mb-1" style={{ fontSize: 14, color: '#666' }}>Algorithm Performance:</div>
                  <div className="d-flex gap-3 flex-wrap">
                    {predictiveInsights.Check_ins?.combined_insights?.best_model && (
                      <span className="badge bg-primary" style={{ fontSize: 12 }}>
                        {predictiveInsights.Check_ins.combined_insights.best_model.name}: 
                        {(predictiveInsights.Check_ins.combined_insights.best_model.accuracy * 100).toFixed(1)}% accuracy
                      </span>
                    )}
                    {predictiveInsights.Conversations?.combined_insights?.best_model && (
                      <span className="badge bg-success" style={{ fontSize: 12 }}>
                        {predictiveInsights.Conversations.combined_insights.best_model.name}: 
                        {(predictiveInsights.Conversations.combined_insights.best_model.accuracy * 100).toFixed(1)}% accuracy
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Trend Analysis */}
                <div className="mb-3">
                  <div className="fw-semibold mb-1" style={{ fontSize: 14, color: '#666' }}>Trend Analysis:</div>
                  <ul className="mb-0" style={{ fontSize: 14, color: '#444', paddingLeft: 18 }}>
                    {predictiveInsights.overall_insights.trends.map((trend, index) => (
                      <li key={index}>
                        <strong>{trend[0]}:</strong> {trend[1]} trend 
                        {predictiveInsights[trend[0]]?.combined_insights?.trend?.strength && 
                          ` (strength: ${(predictiveInsights[trend[0]].combined_insights.trend.strength * 100).toFixed(1)}%)`
                        }
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Growth Projections */}
                <div className="mb-3">
                  <div className="fw-semibold mb-1" style={{ fontSize: 14, color: '#666' }}>Growth Projections (Next 3 Months):</div>
                  <ul className="mb-0" style={{ fontSize: 14, color: '#444', paddingLeft: 18 }}>
                    {predictiveInsights.overall_insights.growth_rates.map((growth, index) => (
                      <li key={index}>
                        <strong>{growth[0]}:</strong> {(growth[1] * 100).toFixed(1)}% 
                        {growth[1] > 0 ? ' increase' : ' decrease'} expected
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* AI Recommendations */}
                <div>
                  <div className="fw-semibold mb-1" style={{ fontSize: 14, color: '#666' }}>AI Recommendations:</div>
                  <ul className="mb-0" style={{ fontSize: 14, color: '#444', paddingLeft: 18 }}>
                    {predictiveInsights.overall_insights.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-muted" style={{ fontSize: 14 }}>
                Loading predictive analytics...
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Key Insights section, same style as clinic analytics */}
      <div className="row">
        <div className="col-lg-6">
          <div className="bg-white rounded-4 shadow-sm p-4" style={{ minHeight: 120 }}>
            <div className="fw-bold mb-2" style={{ fontSize: 18 }}>Key Insights</div>
            <ul className="mb-0" style={{ fontSize: 15, color: '#444', paddingLeft: 18 }}>
              {engagementData?.summary?.predictive_insights?.key_insights ? (
                engagementData.summary.predictive_insights.key_insights.map((insight, index) => (
                  <li key={index}>{insight}</li>
                ))
              ) : (
                <>
                  <li>Rule-based chatbot conversations are increasing engagement</li>
                  <li>Daily mood check-ins remain the most popular feature</li>
                  <li>Students are actively using the "Chat with me" feature</li>
                  <li>Conversations are leading to better mental health support</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
