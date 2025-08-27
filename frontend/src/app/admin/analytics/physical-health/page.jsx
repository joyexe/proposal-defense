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
import { getPhysicalHealthTrends, getAppointments, getPermitRequests, exportPhysicalHealthPDF } from "../../../utils/api";
import { useRouter } from "next/navigation";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, ChartLegend);

export default function AdminPhysicalHealthAnalyticsPage() {
  const router = useRouter();
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('month'); // Default to show all months
  const [totalClinicVisits, setTotalClinicVisits] = useState(0);
  const [quarterDiff, setQuarterDiff] = useState(0);
  const [physicalHealthAssessments, setPhysicalHealthAssessments] = useState(0);
  const [hybridSystemStatus, setHybridSystemStatus] = useState(null);
  const [predictiveInsights, setPredictiveInsights] = useState(null);

  useEffect(() => {
    loadPhysicalHealthTrends();
    loadTotalClinicVisits();
    loadPhysicalHealthAssessments();
  }, [timeRange]);

  const loadPhysicalHealthTrends = async () => {
    try {
      setLoading(true);
      setError(null);
      const apiTimeRange = timeRange === 'month' ? 12 : timeRange; // Use 12 months for "Month" option to show Sep 2024 to Aug 2025
      const data = await getPhysicalHealthTrends(apiTimeRange);
      
      setChartData(data);
      
      // Store hybrid system status
      if (data.hybrid_system) {
        setHybridSystemStatus(data.hybrid_system);
      }
      
      // Store predictive analytics insights
      if (data.predictive_analytics) {
        setPredictiveInsights(data.predictive_analytics);
      }
    } catch (err) {
      console.error('Error loading physical health trends:', err);
      let errorMessage = 'Failed to load trends data';
      
      if (err.message.includes('Forbidden')) {
        errorMessage = 'Access denied. Please ensure you have proper permissions to view analytics data.';
      } else if (err.message.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message.includes('401')) {
        errorMessage = 'Session expired. Please login again.';
      } else {
        errorMessage = err.message || 'Failed to load trends data';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get quarter date ranges
  function getQuarterRanges() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const currentQuarter = Math.floor(month / 3) + 1;
    let startCurrent, endCurrent, startPrev, endPrev;
    if (currentQuarter === 1) {
      // Q1: Jan-Mar, previous: Oct-Dec last year
      startCurrent = new Date(year, 0, 1);
      endCurrent = new Date(year, 2, 31, 23, 59, 59, 999);
      startPrev = new Date(year - 1, 9, 1);
      endPrev = new Date(year - 1, 11, 31, 23, 59, 59, 999);
    } else {
      // Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec
      startCurrent = new Date(year, (currentQuarter - 1) * 3, 1);
      endCurrent = new Date(year, (currentQuarter * 3) - 1, 31, 23, 59, 59, 999);
      startPrev = new Date(year, (currentQuarter - 2) * 3, 1);
      endPrev = new Date(year, ((currentQuarter - 1) * 3) - 1, 31, 23, 59, 59, 999);
    }
    return { startCurrent, endCurrent, startPrev, endPrev };
  }

  const loadTotalClinicVisits = async () => {
    try {
      // Fetch all appointments and health records
      const [appointments, healthRecords] = await Promise.all([
        getAppointments(),
        getPermitRequests()
      ]);

      // Get quarter date ranges
      const { startCurrent, endCurrent, startPrev, endPrev } = getQuarterRanges();

      // Helper to check if date is in range
      const inRange = (dateStr, start, end) => {
        const d = new Date(dateStr);
        return d >= start && d <= end;
      };

      // Count completed and in_progress physical health appointments for each quarter
      const completedAppointmentsCurrent = appointments.filter(apt =>
        apt.status && (apt.status.toLowerCase() === 'completed' || apt.status.toLowerCase() === 'in_progress') &&
        apt.service_type && apt.service_type.toLowerCase() === 'physical' &&
        apt.date && inRange(apt.date, startCurrent, endCurrent)
      ).length;
      const completedAppointmentsPrev = appointments.filter(apt =>
        apt.status && (apt.status.toLowerCase() === 'completed' || apt.status.toLowerCase() === 'in_progress') &&
        apt.service_type && apt.service_type.toLowerCase() === 'physical' &&
        apt.date && inRange(apt.date, startPrev, endPrev)
      ).length;

      // Count completed health records (permit requests) for each quarter
      const healthRecordsCurrent = Array.isArray(healthRecords)
        ? healthRecords.filter(r => r.date && inRange(r.date, startCurrent, endCurrent) && r.status && r.status.toLowerCase() === 'completed').length
        : 0;
      const healthRecordsPrev = Array.isArray(healthRecords)
        ? healthRecords.filter(r => r.date && inRange(r.date, startPrev, endPrev) && r.status && r.status.toLowerCase() === 'completed').length
        : 0;

      // Total clinic visits for each quarter
      const totalCurrent = completedAppointmentsCurrent + healthRecordsCurrent;
      const totalPrev = completedAppointmentsPrev + healthRecordsPrev;
      setTotalClinicVisits(totalCurrent);
      setQuarterDiff(totalCurrent - totalPrev);
    } catch (err) {
      console.error('Error loading total clinic visits:', err);
      setTotalClinicVisits(0);
      setQuarterDiff(0);
    }
  };

  const loadPhysicalHealthAssessments = async () => {
    try {
      // Fetch all appointments and health records
      const [appointments, healthRecords] = await Promise.all([
        getAppointments(),
        getPermitRequests()
      ]);

      // Count completed physical health appointments
      const completedAppointments = appointments.filter(apt => 
        apt.status && apt.status.toLowerCase() === 'completed' &&
        apt.service_type && apt.service_type.toLowerCase() === 'physical'
      ).length;

      // Count health records (permit requests)
      const totalHealthRecords = Array.isArray(healthRecords) ? healthRecords.length : 0;

      // Total physical health assessments = completed appointments + health records
      const total = completedAppointments + totalHealthRecords;
      setPhysicalHealthAssessments(total);
    } catch (err) {
      console.error('Error loading physical health assessments:', err);
      setPhysicalHealthAssessments(0);
    }
  };

  const handleTimeRangeChange = (newRange) => {
    if (newRange === 'month') {
      setTimeRange('month');
    } else {
      setTimeRange(parseInt(newRange));
    }
  };

  // Helper function to get user-friendly labels (now handled by backend)
  const getUserFriendlyLabel = (label) => {
    // Backend now provides user-friendly labels directly
    return label;
  };

  // Calculate summary statistics from real data
  const getSummaryStats = () => {
    if (!chartData) return { totalVisits: 0, injuryReports: 0, illnessReports: 0, routineCheckups: 0, totalCases: 0, totalLegends: 0 };
    
    const totalRequests = chartData.summary?.total_requests || 0;
    const datasets = chartData.datasets || [];
    
    // Calculate different categories based on exact reasons
    let injuryReports = 0;
    let illnessReports = 0;
    let routineCheckups = 0;
    let totalCases = 0;
    let totalLegends = datasets.length; // Count total number of legends/categories
    
    datasets.forEach(dataset => {
      const total = dataset.data.reduce((sum, val) => sum + val, 0);
      const label = dataset.label.toLowerCase();
      
      // Add to total cases (all cases from graph)
      totalCases += total;
      
      // Categorize based on exact reason content
      if (label.includes('injury') || label.includes('hurt') || label.includes('pain') || 
          label.includes('cut') || label.includes('bruise') || label.includes('wound')) {
        injuryReports += total;
      } else if (label.includes('checkup') || label.includes('routine') || 
                 label.includes('physical') || label.includes('exam')) {
        routineCheckups += total;
      } else {
        illnessReports += total;
      }
    });
    
    return {
      totalVisits: totalRequests,
      injuryReports,
      illnessReports,
      routineCheckups,
      totalCases,
      totalLegends
    };
  };

  // Generate real-time predictive analytics insights based on chart data
  const generateInsights = () => {
    if (!chartData || !chartData.datasets || chartData.datasets.length === 0) {
      return [
        "Predictive Analytics System using Linear Regression, Random Forest, and Seasonal Decomposition",
        "Machine Learning algorithms for condition forecasting and outbreak detection",
        "Time Series Analysis with ARIMA modeling for trend prediction",
        "Ensemble methods for risk assessment and resource planning"
      ];
    }

    const insights = [];
    const datasets = chartData.datasets;
    const summary = chartData.summary;
    
    // Use AI predictions for all analytics instead of basic calculations
    if (predictiveInsights) {
      // 1. PEAK ACTIVITY AND TREND ANALYSIS
      if (predictiveInsights.condition_forecasts) {
        const conditionForecasts = Object.entries(predictiveInsights.condition_forecasts);
        if (conditionForecasts.length > 0) {
          // Find peak condition using AI predictions
          const peakCondition = conditionForecasts.reduce((max, [condition, data]) => {
            const avgPrediction = data.predictions.reduce((a, b) => a + b, 0) / data.predictions.length;
            return avgPrediction > max.avg ? { condition, avg: avgPrediction, data } : max;
          }, { condition: '', avg: 0, data: null });
          
          if (peakCondition.condition) {
            const userFriendlyName = getUserFriendlyLabel(peakCondition.condition);
            const overallTrends = conditionForecasts.map(([_, data]) => data.trend_direction);
            const increasingTrends = overallTrends.filter(t => t === 'increasing').length;
            const decreasingTrends = overallTrends.filter(t => t === 'decreasing').length;
            
            let trendText = '';
            if (increasingTrends > decreasingTrends) {
              trendText = `Overall increasing pattern detected across ${increasingTrends} conditions`;
            } else if (decreasingTrends > increasingTrends) {
              trendText = `Overall decreasing pattern detected across ${decreasingTrends} conditions`;
            } else {
              trendText = `Stable patterns detected across conditions`;
            }
            
            insights.push(`Peak activity predicted for ${userFriendlyName} with ${Math.round(peakCondition.avg)} avg cases. ${trendText}`);
          }
        }
      }
      
      // 2. RISK ASSESSMENT AND FORECAST
      if (predictiveInsights.condition_forecasts) {
        const conditionForecasts = Object.entries(predictiveInsights.condition_forecasts);
        const highRiskConditions = conditionForecasts
          .filter(([_, data]) => data.risk_level === 'high' || data.risk_level === 'medium')
          .map(([condition, _]) => getUserFriendlyLabel(condition))
          .slice(0, 3);
        
        const totalPredictions = conditionForecasts.reduce((total, [_, data]) => {
          return total + data.predictions.reduce((a, b) => a + b, 0);
        }, 0);
        
        const avgMonthlyPrediction = Math.round(totalPredictions / (conditionForecasts.length * 3));
        
        if (highRiskConditions.length > 0) {
          insights.push(`High-priority conditions requiring attention: ${highRiskConditions.join(', ')}. Predicted average monthly cases: ${avgMonthlyPrediction} across all conditions`);
        }
      }
      
      // 3. RESOURCE PLANNING AND BUDGET
      if (predictiveInsights.resource_predictions) {
        const resource = predictiveInsights.resource_predictions;
        let resourceText = '';
        
        if (resource.predicted_monthly_visits) {
          resourceText += `Predicted ${resource.predicted_monthly_visits} monthly clinic visits`;
        }
        
        if (resource.budget_estimates) {
          resourceText += resourceText ? `. ${resource.budget_estimates}` : resource.budget_estimates;
        }
        
        if (resourceText) {
          insights.push(resourceText);
        }
      }
      
      // 4. PRIMARY CONCERN AND SIGNIFICANT TRENDS
      if (predictiveInsights.condition_forecasts) {
        const conditionForecasts = Object.entries(predictiveInsights.condition_forecasts);
        const primaryConcern = conditionForecasts.reduce((max, [condition, data]) => {
          const avgPrediction = data.predictions.reduce((a, b) => a + b, 0) / data.predictions.length;
          return avgPrediction > max.avg ? { condition, avg: avgPrediction, trend: data.trend_direction } : max;
        }, { condition: '', avg: 0, trend: '' });
        
        const significantTrends = conditionForecasts.filter(([_, data]) => 
          data.trend_direction !== 'stable' && data.risk_level !== 'low'
        );
        
        if (primaryConcern.condition && significantTrends.length > 0) {
          const userFriendlyName = getUserFriendlyLabel(primaryConcern.condition);
          const trendInfo = significantTrends.slice(0, 2).map(([condition, data]) => {
            const userFriendlyName = getUserFriendlyLabel(condition);
            return `${userFriendlyName} (${data.trend_direction}, ${data.risk_level} risk)`;
          }).join(', ');
          
          insights.push(`Primary concern: ${userFriendlyName} (${Math.round(primaryConcern.avg)} avg cases, ${primaryConcern.trend} trend). Significant trends detected for: ${trendInfo}`);
        }
      }
      
      // 5. MODEL PERFORMANCE AND DATA ANALYSIS
      if (predictiveInsights.condition_forecasts) {
        const conditionForecasts = Object.entries(predictiveInsights.condition_forecasts);
        const avgFeatureImportance = conditionForecasts.reduce((total, [_, data]) => {
          return total + Object.values(data.feature_importance).reduce((a, b) => a + b, 0) / Object.values(data.feature_importance).length;
        }, 0) / conditionForecasts.length;
        
        const modelAccuracy = Math.round(avgFeatureImportance * 100);
        const totalCases = summary && summary.total_requests ? summary.total_requests : 0;
        const conditionsCount = datasets && datasets.length > 0 ? datasets.length : 0;
        
        insights.push(`${modelAccuracy}% accuracy based on feature importance analysis. ${totalCases} total cases analyzed with machine learning algorithms. ${conditionsCount} conditions monitored with predictive modeling`);
      }
      
      // 6. DEMOGRAPHICS AND STAFFING
      if (summary && summary.demographics) {
        let demoText = '';
        
        if (summary.demographics.level_sections && summary.demographics.level_sections.length > 0) {
          const topLevelSections = summary.demographics.level_sections.slice(0, 2).map(d => d.name).join(', ');
          demoText += `Most affected levels: ${topLevelSections}`;
        }
        
        if (summary.demographics.genders && summary.demographics.genders.length > 0) {
          const genderBreakdown = summary.demographics.genders.map(d => `${d.name}: ${d.count}`).join(', ');
          demoText += demoText ? `. Gender distribution: ${genderBreakdown}` : `Gender distribution: ${genderBreakdown}`;
        }
        
        if (predictiveInsights.resource_predictions) {
          const resource = predictiveInsights.resource_predictions;
          if (resource.staffing_needs) {
            demoText += demoText ? `. ${resource.staffing_needs}` : resource.staffing_needs;
          }
          if (resource.supply_needs) {
            demoText += demoText ? `. ${resource.supply_needs}` : resource.supply_needs;
          }
        }
        
        if (demoText) {
          insights.push(demoText);
        }
      }
    }
    
    return insights;
  };

  const summaryStats = getSummaryStats();

  // Export functionality
  const handleExport = async () => {
    try {
      // Show loading state
      const exportButton = document.querySelector('button[onClick="handleExport"]');
      if (exportButton) {
        const originalText = exportButton.innerHTML;
        exportButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Exporting...';
        exportButton.disabled = true;
      }

      const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      const timeRangeText = timeRange === 'month' ? 'All Months' : 
        timeRange === 1 ? 'Current Month' : 
        timeRange === 3 ? 'Last 3 Months' : 
        timeRange === 6 ? 'Last 6 Months' : 
        timeRange === 12 ? 'Last Year' : 'Custom Range';

      // Get time range for API call
      const apiTimeRange = timeRange === 'month' ? 12 : timeRange;
      
      // Call backend PDF export
      await exportPhysicalHealthPDF(apiTimeRange);

      // Restore button state
      if (exportButton) {
        exportButton.innerHTML = originalText;
        exportButton.disabled = false;
      }

    } catch (error) {
      console.error('Export error:', error);
      // Restore button state on error
      const exportButton = document.querySelector('button[onClick="handleExport"]');
      if (exportButton) {
        exportButton.innerHTML = '<span className="me-2" aria-hidden="true"><i className="bi bi-download" style={{ fontSize: 18, verticalAlign: "middle" }}></i></span>Export';
        exportButton.disabled = false;
      }
    }
  };

  // Calculate dynamic Y-axis range based on actual data
  const getYAxisRange = () => {
    if (!chartData || !chartData.datasets || chartData.datasets.length === 0) {
      return { min: 0, max: 5 };
    }
    
    // Find the minimum and maximum values across all datasets
    let minValue = Infinity;
    let maxValue = -Infinity;
    
    chartData.datasets.forEach(dataset => {
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
    
    // Ensure max value is at least 1 more than the actual max to avoid duplicate labels
    const adjustedMax = Math.max(maxValue + 1, 5);
    
    return {
      min: 0, // Always start from 0
      max: adjustedMax
    };
  };

  const yAxisRange = getYAxisRange();

  return (
    <div className="container-fluid py-4" style={{ background: '#fafbfc', minHeight: '100vh' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div className="fw-bold fs-5 mb-1">System Overview</div>
          <div className="text-muted" style={{ fontSize: 15 }}>Enhanced NLP-powered analytics with multi-language support</div>
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
              <option value="month">All</option>
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
            onClick={handleExport}
          >
            <span className="me-2" aria-hidden="true">
              <i className="bi bi-download" style={{ fontSize: 18, verticalAlign: 'middle' }}></i>
            </span>
            Export
          </button>
        </div>
      </div>
      
      {/* Enhanced NLP System Status */}
      {hybridSystemStatus && (
        <div className="alert alert-info mb-4" role="alert">
          <div className="d-flex align-items-center">
            <i className="bi bi-robot me-2" style={{ fontSize: 20 }}></i>
            <div>
              <strong>Enhanced NLP System Active</strong>
              <div className="small">
                Multi-language support (Tagalog/English) • Confidence scoring • Hybrid detection
                {hybridSystemStatus.enhanced_detection && ' • Enhanced condition mapping'}
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="d-flex align-items-center mb-4">
        <ul className="nav nav-pills w-100">
          <li className="nav-item flex-fill">
            <button className={`nav-link w-100 border bg-light text-dark`} style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '8px 0 0 8px' }} onClick={() => router.push('/admin/analytics')}>
              Mental Health
            </button>
          </li>
          <li className="nav-item flex-fill">
            <button className={`nav-link w-100 border bg-success text-white`} style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0' }} disabled>
              Physical Health
            </button>
          </li>
          <li className="nav-item flex-fill">
            <button className={`nav-link w-100 border bg-light text-dark`} style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0 8px 8px 0' }} onClick={() => router.push('/admin/analytics/engagements')}>
              AMIETI Chatbot
            </button>
          </li>
        </ul>
      </div>
      <div className="mb-4">
        <div className="row g-3 align-items-end mb-3">
          <div className="col-md-3">
            <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
              <div className="text-muted mb-1" style={{ fontSize: 15 }}>Total Clinic Visits</div>
              <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{totalClinicVisits}</div>
              <div className={`small mt-1 fw-semibold ${quarterDiff >= 0 ? 'text-success' : 'text-danger'}`}>{quarterDiff >= 0 ? '+' : ''}{quarterDiff} from last quarter</div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
              <div className="text-muted mb-1" style={{ fontSize: 15 }}>Total Cases</div>
              <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{summaryStats.totalCases}</div>
              <div className="text-secondary small mt-1">Physical health issues</div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
              <div className="text-muted mb-1" style={{ fontSize: 15 }}>Illness Reports</div>
              <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{summaryStats.totalLegends}</div>
              <div className="text-secondary small mt-1">Sickness and health issues</div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
              <div className="text-muted mb-1" style={{ fontSize: 15 }}>Physical Health Assessments</div>
              <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{physicalHealthAssessments}</div>
              <div className="text-secondary small mt-1">Regular health assessments</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-4 shadow-sm p-4 mb-4" style={{ minHeight: 500 }}>
          <div className="fw-bold mb-2" style={{ fontSize: 20, color: '#38813A' }}>Physical Health Trends</div>
          <div className="text-muted mb-3" style={{ fontSize: 14 }}>
          AI-powered analysis of physical health issues over time with enhanced NLP detection
          </div>
          
          {loading ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 350 }}>
              <div className="text-center">
                <div className="spinner-border text-success mb-3" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <div className="text-muted">Loading enhanced analytics data...</div>
              </div>
            </div>
          ) : error ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 350 }}>
              <div className="text-center">
                <div className="text-danger mb-3">{error}</div>
                <button className="btn btn-success" onClick={loadPhysicalHealthTrends}>
                  Retry
                </button>
              </div>
            </div>
          ) : chartData && chartData.datasets && chartData.datasets.length > 0 ? (
            <>
              {/* Dynamic Legend based on actual data - Sorted by total cases (descending) */}
              <div className="d-flex justify-content-center align-items-center gap-4 mb-3 flex-wrap" style={{ fontSize: 14, fontFamily: 'sans-serif' }}>
                {chartData.datasets.slice(0, 10).sort((a, b) => {
                  // Sort by total data values in descending order
                  const aTotal = a.data.reduce((sum, val) => sum + val, 0);
                  const bTotal = b.data.reduce((sum, val) => sum + val, 0);
                  return bTotal - aTotal;
                }).map((dataset, index) => {
                  // Simplify legend labels using helper function
                  const simplifiedLabel = getUserFriendlyLabel(dataset.label);
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
                        {simplifiedLabel}
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
              data={{
                    labels: chartData.labels || [],
                    datasets: chartData.datasets || [],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false, // We use custom legend above
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.95)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#ddd',
                    borderWidth: 1,
                    cornerRadius: 10,
                    displayColors: true,
                    padding: 12,
                    callbacks: {
                      title: function(context) {
                        // Show month with year in tooltip title
                        const monthIndex = context[0].dataIndex;
                        const monthLabel = context[0].label;
                        const currentDate = new Date();
                        const currentYear = currentDate.getFullYear();
                        
                        // Calculate the year for each month based on current date
                        const startDate = new Date(currentYear, currentDate.getMonth() - 11, 1);
                        const startYear = startDate.getFullYear();
                        
                        // Calculate year for this month index
                        const monthDate = new Date(startYear, startDate.getMonth() + monthIndex, 1);
                        const year = monthDate.getFullYear();
                        
                        return monthLabel + ' ' + year;
                      },
                      label: function(context) {
                        // Use user-friendly labels (already provided by backend)
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
                    hoverRadius: 8,  // Larger circle on hover
                    borderWidth: 2,  // Thicker border
                    backgroundColor: function(context) {
                      return context.dataset.pointBackgroundColor || context.dataset.backgroundColor;
                    },
                    borderColor: function(context) {
                      return '#fff';  // White border for better visibility
                    },
                    hoverBorderWidth: 3,  // Thick border on hover
                    hoverBackgroundColor: function(context) {
                      return context.dataset.pointBackgroundColor || context.dataset.backgroundColor;
                    }
                  },
                  line: {
                    tension: 0.3,
                    borderWidth: 2,
                    fill: true
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
                    stacked: true, // Enable stacking for X-axis
                    grid: {
                      display: false, // Remove grid lines
                      color: 'rgba(0,0,0,0.1)',
                      drawBorder: false
                    },
                    ticks: {
                      font: { size: 11 },
                      color: '#666',
                      maxRotation: 45, // Rotate labels for better readability
                      minRotation: 0
                    }
                  },
                  y: {
                    title: {
                      display: true,
                      text: 'Cases',
                      font: { size: 14, weight: 'bold' },
                      color: '#333'
                    },
                    stacked: true, // Enable stacking for proper area chart
                    min: 0,
                    max: 100, // Fixed maximum to avoid complex calculations
                    grid: {
                      display: true, // Enable grid lines for better alignment
                      color: 'rgba(0,0,0,0.1)',
                      drawBorder: false,
                      lineWidth: 1
                    },
                    ticks: {
                      stepSize: 10, // Fixed step size
                      callback: function(value) {
                        return Math.round(value);
                      },
                      font: { size: 12 },
                      color: '#666'
                    }
                  },
                },
              }}
              height={220}
            />
          </div>
            </>
          ) : (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 220 }}>
              <div className="text-center text-muted">
                <div className="mb-2">No data available</div>
                <div style={{ fontSize: 14 }}>No completed permit requests found for the selected time period.</div>
              </div>
            </div>
          )}
        </div>
        <div className="row">
          <div className="col-12">
            <div className="bg-white rounded-4 shadow-sm p-4" style={{ minHeight: 120 }}>
              <div className="fw-bold mb-2" style={{ fontSize: 18 }}>Key Insights</div>
              <ul className="mb-0" style={{ fontSize: 15, color: '#444', paddingLeft: 18 }}>
                {(() => {
                  const aiInsights = generateInsights();
                  
                  // Filter out the header text and get only the actual insights
                  const cleanInsights = aiInsights.filter(insight => 
                    !insight.includes('AI-POWERED PREDICTIVE ANALYTICS:') &&
                    !insight.includes('AI-Powered Predictive Analytics System') &&
                    !insight.includes('Random Forest') &&
                    !insight.includes('ARIMA') &&
                    !insight.includes('Machine Learning') &&
                    !insight.includes('Predictive modeling') &&
                    !insight.includes('Risk assessment') &&
                    !insight.includes('Seasonal pattern')
                  );
                  
                  return cleanInsights.map((insight, index) => (
                    <li key={index}>{insight}</li>
                  ));
                })()}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




