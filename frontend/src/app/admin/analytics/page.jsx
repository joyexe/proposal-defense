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
import { getMentalHealthTrends, getRiskLevelDistribution, getMentalHealthAlertsAnalytics, getChatbotMentalHealthAnalytics, getMentalHealthAnalyticsSummary, getFlaggedKeywords, generateUnifiedAdminPDFReport } from "../../utils/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, ChartLegend);

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [riskDistributionData, setRiskDistributionData] = useState(null);
  const [alertsData, setAlertsData] = useState(null);
  const [chatbotData, setChatbotData] = useState(null);
  const [flaggedKeywordsData, setFlaggedKeywordsData] = useState(null);
  const [timeRange, setTimeRange] = useState('month'); // Default to show all months

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const apiTimeRange = timeRange === 'month' ? 12 : timeRange; // Use 12 months for "All Months" option
        const [summary, trends, riskDistribution, alerts, chatbot, flaggedKeywords] = await Promise.all([
          getMentalHealthAnalyticsSummary(),
          getMentalHealthTrends(apiTimeRange),
          getRiskLevelDistribution(apiTimeRange),
          getMentalHealthAlertsAnalytics(apiTimeRange),
          getChatbotMentalHealthAnalytics(apiTimeRange),
          getFlaggedKeywords(apiTimeRange)
        ]);
        
        setAnalyticsData(summary);
        setTrendsData(trends);
        setRiskDistributionData(riskDistribution);
        setAlertsData(alerts);
        setChatbotData(chatbot);
        setFlaggedKeywordsData(flaggedKeywords);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
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

  // Helper function to get user-friendly labels (now handled by backend)
  const getUserFriendlyLabel = (label) => {
    // Backend now provides user-friendly labels directly
    return label;
  };

  // Helper function to get Y-axis range for mental health trends (individual values)
  const getYAxisRange = () => {
    if (!trendsData || !trendsData.datasets || trendsData.datasets.length === 0) {
      return { min: 0, max: 20 };
    }
    
    // For stacked area chart, find the maximum total value across all months
    let maxTotalValue = 0;
    
    if (trendsData.labels && trendsData.labels.length > 0) {
      for (let i = 0; i < trendsData.labels.length; i++) {
        let monthTotal = 0;
        trendsData.datasets.forEach(dataset => {
          if (dataset.data && dataset.data[i] !== undefined) {
            monthTotal += dataset.data[i] || 0;
          }
        });
        if (monthTotal > maxTotalValue) maxTotalValue = monthTotal;
      }
    }
    
    // Set Y-axis to accommodate the maximum total value with some padding
    let adjustedMax = Math.max(maxTotalValue + 2, 20);
    
    return {
      min: 0, // Always start from 0
      max: adjustedMax
    };
  };

  const yAxisRange = getYAxisRange();

  // Data for the mental health trends chart (using stacked area charts)
  const lineData = trendsData && trendsData.labels && trendsData.datasets ? {
    labels: trendsData.labels,
    datasets: trendsData.datasets
      .map((dataset, index) => {
        // Use stacked area charts with fill
        return {
          label: dataset.label,
          data: dataset.data || [],
          fill: true, // Enable fill for area chart effect
          backgroundColor: dataset.backgroundColor,
          borderColor: dataset.backgroundColor,
          borderWidth: 4,
          tension: 0.3,
          pointBackgroundColor: dataset.backgroundColor,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 0, // Invisible by default
          pointHoverRadius: 5, // Visible only on hover
          stack: 'Stack 0', // Enable stacking for area chart
        };
      })
  } : {
    labels: [],
    datasets: [
      {
        label: "General Mental Health Consultation",
        data: [],
        fill: true,
        backgroundColor: "#FF6384",
        borderColor: "#FF6384",
        tension: 0.3,
        borderWidth: 4,
        pointRadius: 0,
        pointHoverRadius: 5,
        stack: 'Stack 0',
      },
    ],
  };

  const lineOptions = {
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
            // Show month with year in tooltip title
            const monthIndex = context[0].dataIndex;
            const monthLabel = context[0].label;
            
            // Calculate the correct year based on the month index
            // First 4 months (Sep-Dec) are 2024, rest (Jan-Aug) are 2025
            let year = 2024;
            if (monthIndex >= 4) { // Jan 2025 onwards
              year = 2025;
            }
            
            return monthLabel + ' ' + year;
          },
          label: function(context) {
            // Use user-friendly labels and sort by value in tooltip
            const userFriendlyLabel = getUserFriendlyLabel(context.dataset.label);
            return userFriendlyLabel + ': ' + context.parsed.y + ' cases';
          },
          afterBody: function(context) {
            // Add total cases for the month
            const total = context.reduce((sum, item) => sum + item.parsed.y, 0);
            return ['', `Total: ${total} cases`];
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
        radius: 0,  // Invisible by default
        hoverRadius: 5,  // Visible only on hover
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
        borderWidth: 4,
        fill: true
      }
    },
    // Ensure proper stacking configuration
    layout: {
      padding: {
        top: 10,
        right: 10,
        bottom: 10,
        left: 10
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
        stacked: true, // Enable stacking for area chart
        grid: {
          display: false, // Remove grid lines
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
          text: 'Cases',
          font: { size: 14, weight: 'bold' },
          color: '#333'
        },
        stacked: true, // Enable stacking for area chart
        beginAtZero: true, // Always start from 0
        min: 0,
        max: yAxisRange.max,
        grid: {
          display: true, // Enable grid lines for better alignment
          color: 'rgba(0,0,0,0.1)',
          drawBorder: false,
          lineWidth: 1
        },
        ticks: {
          stepSize: 10, // Show every 10 values for better readability
          callback: function(value) {
            return Math.round(value);
          },
          font: { size: 12 },
          color: '#666',
          maxTicksLimit: 11 // Limit to show 0,10,20,30,40,50,60
        }
      },
    },
  };

  // Data for the flagged keywords bar chart
  const barData = flaggedKeywordsData && flaggedKeywordsData.length > 0 ? {
    labels: flaggedKeywordsData.slice(0, 7).map(item => item.keyword),
    datasets: [
      {
        label: "Flagged Keywords",
        data: flaggedKeywordsData.slice(0, 7).map(item => item.count),
        backgroundColor: [
          '#FF6384', '#FFCE56', '#4BC0C0', '#36A2EB', '#FF9F40', '#9966FF', '#FF6384'
        ],
        borderRadius: 8,
        barThickness: 18,
      },
    ],
  } : {
    labels: ['Suicide', 'Depression', 'Anxiety', 'Stress', 'Sad', 'Angry', 'Lonely'],
    datasets: [
      {
        label: "Flagged Keywords",
        data: [0, 0, 0, 0, 0, 0, 0],
        backgroundColor: [
          '#FF6384', '#FFCE56', '#4BC0C0', '#36A2EB', '#FF9F40', '#9966FF', '#FF6384'
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
      tooltip: { 
        enabled: true,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.x} mentions`;
          }
        }
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { display: false },
        ticks: {
          stepSize: 1,
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

  // Generate predictive analytics insights
  const generatePredictiveInsights = () => {
    if (!trendsData || !trendsData.predictive_analytics) {
      return [
        "Mental health sessions increased by 15% this week",
        "Continue monitoring trends for early intervention",
        "Maintain current prevention programs"
      ];
    }

    const analytics = trendsData.predictive_analytics;
    const insights = [];

    // Linear Regression Insights
    if (analytics.linear_regression && !analytics.linear_regression.error) {
      const lr = analytics.linear_regression;
      if (lr.trend_direction === 'increasing') {
        insights.push(`Trend analysis shows ${lr.trend_direction} mental health cases (${lr.confidence_level} confidence)`);
      } else if (lr.trend_direction === 'decreasing') {
        insights.push(`Trend analysis shows ${lr.trend_direction} mental health cases (${lr.confidence_level} confidence)`);
      } else {
        insights.push(`Trend analysis shows ${lr.trend_direction} mental health cases (${lr.confidence_level} confidence)`);
      }
    }

    // Risk Assessment Insights
    if (analytics.risk_assessment && analytics.risk_assessment.overall) {
      const risk = analytics.risk_assessment.overall;
      if (risk.risk_level === 'high') {
        insights.push(`High risk level detected - consider increasing intervention resources`);
      } else if (risk.risk_level === 'medium') {
        insights.push(`Moderate risk level - monitor trends closely`);
      } else {
        insights.push(`Low risk level - maintain current prevention strategies`);
      }
    }

    // Wellness Predictions
    if (analytics.wellness_predictions && analytics.wellness_predictions.wellness_level) {
      const wellness = analytics.wellness_predictions.wellness_level;
      if (wellness === 'improving') {
        insights.push(`Student wellness trends are improving - continue current programs`);
      } else if (wellness === 'declining') {
        insights.push(`Student wellness trends are declining - consider additional interventions`);
      } else {
        insights.push(`Student wellness trends are stable - maintain current programs`);
      }
    }

    // Intervention Predictions
    if (analytics.intervention_predictions) {
      const intervention = analytics.intervention_predictions;
      if (intervention.counseling_needs) {
        insights.push(intervention.counseling_needs);
      }
    }

    // If no insights generated, provide default
    if (insights.length === 0) {
      insights.push("Mental health sessions increased by 15% this week");
      insights.push("Continue monitoring trends for early intervention");
      insights.push("Maintain current prevention programs");
    }

    return insights.slice(0, 3); // Limit to 3 insights
  };

  const predictiveInsights = generatePredictiveInsights();

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
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Total Mental Health Diagnoses</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>
              {analyticsData?.total_diagnoses || 0}
            </div>
            <div className="text-secondary small mt-1">Mental health diagnoses from appointments</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Top Mental Health Diagnosis</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>
              {loading ? '' : (analyticsData?.top_concern || 'No data available')}
            </div>
            <div className="text-secondary small mt-1">Most common mental health diagnosis</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Active Mental Health Alerts</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>
              {analyticsData?.active_alerts || 0}
            </div>
            <div className="text-secondary small mt-1">Active alerts requiring attention</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>High Risk Cases</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#e53935' }}>
              {analyticsData?.high_risk_cases || 0}
            </div>
            <div className="text-danger small mt-1">High risk mental health cases</div>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-4 shadow-sm p-4 mb-4" style={{ minHeight: 450 }}>
        <div className="fw-bold mb-2" style={{ fontSize: 20, color: '#38813A' }}>Mental Health Trends</div>
        <div className="text-muted mb-3" style={{ fontSize: 14 }}>Distribution of mental health issues over time</div>
        
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 350 }}>
            <div className="text-center text-muted">
              <div className="mb-2">Loading...</div>
              <div style={{ fontSize: 14 }}>Please wait while we load the data.</div>
            </div>
          </div>
        ) : trendsData && trendsData.datasets && trendsData.datasets.length > 0 && trendsData.labels && trendsData.labels.length > 0 ? (
          <>
            {/* Dynamic Legend based on actual data - Sorted by total cases (descending) */}
            <div className="d-flex justify-content-center align-items-center gap-4 mb-3 flex-wrap" style={{ fontSize: 14, fontFamily: 'sans-serif' }}>
              {lineData.datasets.slice(0, 10).sort((a, b) => {
                // Sort by total data values in descending order (highest cases first)
                const aTotal = a.data.reduce((sum, val) => sum + val, 0);
                const bTotal = b.data.reduce((sum, val) => sum + val, 0);
                return bTotal - aTotal; // Descending order
              }).map((dataset, index) => {
                // Use user-friendly labels (already provided by backend)
                const userFriendlyLabel = getUserFriendlyLabel(dataset.label);
                const totalCases = dataset.data.reduce((sum, val) => sum + val, 0);
                
                return (
                <span key={index} className="d-flex align-items-center" style={{ 
                  padding: '6px 10px', 
                  borderRadius: 8, 
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  border: '2px solid rgba(0,0,0,0.1)',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease'
                  }}>
                    <span 
                      style={{ 
                      width: 14, 
                      height: 14, 
                        background: dataset.backgroundColor, 
                        display: 'inline-block', 
                      borderRadius: 4, 
                      marginRight: 8,
                      border: '1px solid rgba(0,0,0,0.2)'
                      }}
                    ></span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>
                      {userFriendlyLabel}
                    </span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#666', marginLeft: 6 }}>
                      ({totalCases})
                  </span>
                </span>
                );
              })}
            </div>
            
            {/* Chart.js line chart with enhanced animations and stacking */}
            <div className="w-100" style={{ minHeight: 350, overflow: 'hidden' }}>
              <Line
                data={lineData}
                options={lineOptions}
                height={350}
              />
            </div>
          </>
        ) : (
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 350 }}>
            <div className="text-center text-muted">
              <div className="mb-2">No data available</div>
              <div style={{ fontSize: 14 }}>No data available found for the selected time period.</div>
            </div>
          </div>
        )}
      </div>
      <div className="row g-3">
        <div className="col-lg-6">
          <div className="bg-white rounded-4 shadow-sm p-4 mb-3" style={{ minHeight: 180 }}>
            <div className="fw-bold mb-2" style={{ fontSize: 18 }}>Risk Level Distribution</div>
            <div className="mb-2" style={{ fontSize: 15 }}>
              <div className="d-flex align-items-center mb-2">
                <span className="flex-grow-1">High Risk</span>
                <span style={{ color: '#222', fontWeight: 600, fontSize: 15 }}>
                  {`${riskDistributionData?.high?.count || 0} (${riskDistributionData?.high?.percentage || 0}%)`}
                </span>
              </div>
              <div className="progress mb-3" style={{ height: 8, borderRadius: 8, background: '#f8d7da' }}>
                <div className="progress-bar" role="progressbar" style={{ width: `${riskDistributionData?.high?.percentage || 0}%`, background: '#e53935', borderRadius: 8 }} aria-valuenow={riskDistributionData?.high?.percentage || 0} aria-valuemin={0} aria-valuemax={100}></div>
              </div>
              <div className="d-flex align-items-center mb-2">
                <span className="flex-grow-1">Moderate Risk</span>
                <span style={{ color: '#222', fontWeight: 600, fontSize: 15 }}>
                  {`${riskDistributionData?.moderate?.count || 0} (${riskDistributionData?.moderate?.percentage || 0}%)`}
                </span>
              </div>
              <div className="progress mb-3" style={{ height: 8, borderRadius: 8, background: '#fff9c4' }}>
                <div className="progress-bar" role="progressbar" style={{ width: `${riskDistributionData?.moderate?.percentage || 0}%`, background: '#ffd600', borderRadius: 8 }} aria-valuenow={riskDistributionData?.moderate?.percentage || 0} aria-valuemin={0} aria-valuemax={100}></div>
              </div>
              <div className="d-flex align-items-center">
                <span className="flex-grow-1">Low Risk</span>
                <span style={{ color: '#222', fontWeight: 600, fontSize: 15 }}>
                  {`${riskDistributionData?.low?.count || 0} (${riskDistributionData?.low?.percentage || 0}%)`}
                </span>
              </div>
              <div className="progress" style={{ height: 8, borderRadius: 8, background: '#e0f2f1' }}>
                <div className="progress-bar" role="progressbar" style={{ width: `${riskDistributionData?.low?.percentage || 0}%`, background: '#43a047', borderRadius: 8 }} aria-valuenow={riskDistributionData?.low?.percentage || 0} aria-valuemin={0} aria-valuemax={100}></div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-4 shadow-sm p-4" style={{ minHeight: 200 }}>
            <div className="fw-bold mb-3" style={{ fontSize: 18, color: '#222' }}>
              Key Insights
            </div>
            <div className="mb-3">
              {trendsData && trendsData.predictive_analytics ? (
                <div>
                  {/* Key Insights as Professional Bullet Points */}
                  {trendsData.predictive_analytics.key_insights && trendsData.predictive_analytics.key_insights.length > 0 ? (
                    <div className="mb-3">
                      <div className="row">
                        <div className="col-12">
                          <div className="d-flex flex-column gap-2">
                            {trendsData.predictive_analytics.key_insights.map((insight, index) => (
                              <div key={index} className="d-flex align-items-start p-2 rounded" 
                                   style={{ 
                                     fontSize: 13,
                                     lineHeight: 1.4
                                   }}>
                                <span className="me-2 mt-1" style={{ color: '#38813A', fontSize: 6 }}>●</span>
                                <span style={{ color: '#333', fontWeight: 400 }}>{insight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-muted text-center py-4" style={{ fontSize: 14 }}>
                      <i className="bi bi-info-circle me-2"></i>
                      Predictive insights will appear here when available
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted text-center py-4" style={{ fontSize: 14 }}>
                  <i className="bi bi-info-circle me-2"></i>
                  Predictive analytics data will appear here when available
                </div>
              )}
            </div>
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
