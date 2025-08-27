"use client";

import React, { useState, useEffect } from "react";
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
import { getChatbotMentalHealthAnalytics, getMentalHealthAnalyticsSummary, generateUnifiedAdminPDFReport } from "../../../utils/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, ChartLegend);

export default function AdminEngagementsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [engagementData, setEngagementData] = useState(null);
  const [predictiveInsights, setPredictiveInsights] = useState(null);
  const [timeRange, setTimeRange] = useState('month'); // Default to show all months

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const apiTimeRange = timeRange === 'month' ? 12 : timeRange; // Use 12 months for "All Months" option
        const [summary, engagement] = await Promise.all([
          getMentalHealthAnalyticsSummary(),
          getChatbotMentalHealthAnalytics(apiTimeRange)
        ]);
        
        setAnalyticsData(summary);
        setEngagementData(engagement);
        setPredictiveInsights(engagement?.summary?.predictive_insights || null);
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

  const handleExportPDF = async () => {
    try {
      const response = await generateUnifiedAdminPDFReport(timeRange === 'month' ? 12 : timeRange);
      
      // Check if response is successful (status 200-299)
      if (response.status >= 200 && response.status < 300) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mental_physical_health_report_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('PDF generation failed:', response.status, response.statusText);
        alert('Failed to generate PDF report. Please try again.');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF report. Please try again.');
    }
  };

  // Helper function to get Y-axis range for engagement trends
  const getYAxisRange = () => {
    if (!engagementData || !engagementData.datasets || engagementData.datasets.length === 0) {
      return { min: 0, max: 5 };
    }
    
    // Find the minimum and maximum values across all datasets
    let minValue = Infinity;
    let maxValue = -Infinity;
    
    engagementData.datasets.forEach(dataset => {
      if (dataset.data && dataset.data.length > 0) {
        const datasetMin = Math.min(...dataset.data);
        const datasetMax = Math.max(...dataset.data);
        
        if (datasetMin < minValue) minValue = datasetMin;
        if (datasetMax > maxValue) maxValue = datasetMax;
      }
    });
    
    // If no valid data found, use defaults
    if (minValue === Infinity || maxValue === -Infinity) {
      return { min: 0, max: 5 };
    }
    
    // Set Y-axis to accommodate the maximum value with some padding
    let adjustedMax = Math.max(maxValue + 2, 20);
    
    // Round up to nearest 10 for cleaner tick marks
    adjustedMax = Math.ceil(adjustedMax / 10) * 10;
    
    return {
      min: 0, // Always start from 0
      max: adjustedMax
    };
  };

  const yAxisRange = getYAxisRange();

  // Chart options for engagement trends
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
        min: 0,
        max: yAxisRange.max,
        grid: {
          display: true, // Show horizontal grid lines
          color: 'rgba(0,0,0,0.1)',
          drawBorder: false,
          lineWidth: 1
        },
        ticks: {
          stepSize: Math.ceil(yAxisRange.max / 10), // Dynamic step size based on range
          callback: function(value) {
            return Math.round(value);
          },
          font: { size: 12 },
          color: '#666',
          maxTicksLimit: 11 // Limit to show reasonable number of ticks
        }
      },
    },
  };

  return (
    <div className="container-fluid py-4" style={{ background: '#fafbfc', minHeight: '100vh' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div className="fw-bold fs-5 mb-1">Mental Health Metrics</div>
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
          <button 
            className="btn btn-success px-4 fw-semibold" 
            style={{ borderRadius: 10 }}
            onClick={handleExportPDF}
          >
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
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Total Conversations</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>
              {engagementData?.summary?.total_conversations || 0}
            </div>
            <div className="text-secondary small mt-1">Chatbot conversations</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Total Check-ins</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>
              {engagementData?.summary?.total_checkins || 0}
            </div>
            <div className="text-secondary small mt-1">Daily mood check-ins</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Total Messages</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>
              {engagementData?.summary?.total_messages || 0}
            </div>
            <div className="text-secondary small mt-1">All chatbot interactions</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Active Alerts</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#e53935' }}>
              {analyticsData?.high_alerts || 0}
            </div>
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
        ) : engagementData && engagementData.datasets && engagementData.datasets.length > 0 && engagementData.labels && engagementData.labels.length > 0 ? (
          <>
            {/* Dynamic Legend - Only show Check-ins and Conversations */}
            <div className="d-flex justify-content-center align-items-center gap-4 mb-3 flex-wrap" style={{ fontSize: 14, fontFamily: 'sans-serif' }}>
              {engagementData.datasets
                .filter(dataset => dataset.label === 'Check-ins' || dataset.label === 'Conversations')
                .map((dataset, index) => (
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
            
            {/* Chart.js line chart */}
            <div className="w-100" style={{ minHeight: 220, overflow: 'hidden' }}>
              <Line
                data={{
                  labels: engagementData.labels || [],
                  datasets: engagementData.datasets || [],
                }}
                options={engagementLineOptions}
                height={220}
              />
            </div>
          </>
        ) : (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 220 }}>
            <div className="text-center text-muted">
              <div className="mb-2">No data available</div>
              <div style={{ fontSize: 14 }}>No data available found for the selected time period.</div>
            </div>
          </div>
        )}
      </div>
      {/* Key Insights section, same style as clinic analytics */}
      <div className="row">
        <div className="col-lg-6">
          <div className="bg-white rounded-4 shadow-sm p-4" style={{ minHeight: 120 }}>
            <div className="fw-bold mb-2" style={{ fontSize: 18 }}>Key Insights</div>
            <ul className="mb-0" style={{ fontSize: 15, color: '#444', paddingLeft: 18 }}>
              {(() => {
                // Debug logging
                console.log('Current predictiveInsights:', predictiveInsights);
                console.log('Key insights from predictiveInsights:', predictiveInsights?.key_insights);
                console.log('Key insights from engagementData:', engagementData?.summary?.predictive_insights?.key_insights);
                
                // Try multiple possible data structures
                const keyInsights = predictiveInsights?.key_insights || 
                                   engagementData?.summary?.predictive_insights?.key_insights ||
                                   null;
                
                console.log('Final keyInsights:', keyInsights);
                
                if (keyInsights && Array.isArray(keyInsights) && keyInsights.length > 0) {
                  return keyInsights.map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ));
                } else {
                  return (
                    <>
                      <li>Rule-based chatbot conversations are increasing engagement</li>
                      <li>Daily mood check-ins remain the most popular feature</li>
                      <li>Students are actively using the "Chat with me" feature</li>
                      <li>Conversations are leading to better mental health support</li>
                    </>
                  );
                }
              })()}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
