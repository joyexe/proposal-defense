'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Row, Col, Badge, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faExclamationTriangle, 
  faCircle, 
  faEye,
  faReply,
  faPhone
} from '@fortawesome/free-solid-svg-icons';
import { 
  getUserProfile, 
  getCounselorTodayAppointments, 
  getCounselorReferralsCount, 
  getCounselorActiveCases,
  getMentalHealthAlerts,
  updateAppointment, 
  markAppointmentCompleted, 
  markAppointmentInProgress, 
  cancelAppointment,
  createAppointment,
  getAppointments
} from '../../utils/api';
import { FaCalendarAlt, FaExclamationCircle, FaFileAlt, FaUserMd } from 'react-icons/fa';
import { getCounselorUpcomingAppointments, getRecentActivities, updateCounselorAppointmentDocumentation, searchICD11Codes, detectMentalHealthRealtime, saveMentalHealthDiagnosis } from "../../utils/api";

export default function CounselorDashboard() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [appointmentBatch, setAppointmentBatch] = useState(0);
  const [alertBatch, setAlertBatch] = useState(0);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayVisits: 0,
    pendingVisits: 0,
    activeCases: 0,
    referralsSent: 0
  });
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAddNotesModal, setShowAddNotesModal] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [mentalHealthAlerts, setMentalHealthAlerts] = useState([]);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);
  const [showDiagnosisOptions, setShowDiagnosisOptions] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [suggestedDiagnoses, setSuggestedDiagnoses] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [activities, setActivities] = useState([]);
  const [activityBatch, setActivityBatch] = useState(0);
  
  // Mental Health Documentation States
  const [mentalHealthDiagnoses, setMentalHealthDiagnoses] = useState([]);
  const [selectedMentalHealthDiagnosis, setSelectedMentalHealthDiagnosis] = useState(null);
  const [isDetectingMentalHealth, setIsDetectingMentalHealth] = useState(false);
  const [riskLevel, setRiskLevel] = useState('low');
  const [interventions, setInterventions] = useState([]);
  const [showMentalHealthOptions, setShowMentalHealthOptions] = useState(true);
  
  // Follow-up Appointment States
  const [followUpChecked, setFollowUpChecked] = useState(false);
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);
  const [followUpCreated, setFollowUpCreated] = useState(false);
  
  const batchSize = 4;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const [profile, todayAppointments, referralsData, activeCasesData, alertsData] = await Promise.all([
          getUserProfile(),
          getCounselorTodayAppointments(),
          getCounselorReferralsCount(),
          getCounselorActiveCases(),
          getMentalHealthAlerts('active')
        ]);
        setUserProfile(profile);
        setMentalHealthAlerts(alertsData);
        
        // Sort appointments: upcoming first, then in_progress, both sorted by time
        const sortedAppointments = todayAppointments.sort((a, b) => {
          // First sort by status: upcoming comes before in_progress
          if (a.status === 'upcoming' && b.status === 'in_progress') return -1;
          if (a.status === 'in_progress' && b.status === 'upcoming') return 1;
          
          // If same status, sort by time (earliest first)
          const timeA = new Date(`2000-01-01T${a.time}`);
          const timeB = new Date(`2000-01-01T${b.time}`);
          return timeA - timeB;
        });
        
        setAppointments(sortedAppointments);
        
        // Calculate stats from appointments
        // Active Cases: ALL mental health appointments with upcoming or in_progress status (from API)
        const activeCases = activeCasesData.active_cases_count || 0;
        
        // Today's Appointments: all appointments for today
        const todaysAppointments = todayAppointments.length;
        
        // Alert Flags: mental health appointments with in_progress status (high risk)
        const alertFlags = todayAppointments.filter(apt => 
          apt.service_type === 'mental' && apt.status === 'in_progress'
        ).length;
        
        setStats({
          todayVisits: activeCases, // Active Cases count
          pendingVisits: todaysAppointments, // Today's Appointments count
          activeCases: alertFlags, // Alert Flags count
          referralsSent: referralsData.referrals_count || 0 // AMIETI Engagement count
        });
        

      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // Real-time appointment update listener for chatbot-created appointments
  useEffect(() => {
    const handleAppointmentUpdate = async () => {
      try {
        // Fetch fresh appointment data
        const [todayAppointments, referralsData, activeCasesData, alertsData] = await Promise.all([
          getCounselorTodayAppointments(),
          getCounselorReferralsCount(),
          getCounselorActiveCases(),
          getMentalHealthAlerts('active')
        ]);
        
        // Sort appointments: upcoming first, then in_progress, both sorted by time
        const sortedAppointments = todayAppointments.sort((a, b) => {
          // First sort by status: upcoming comes before in_progress
          if (a.status === 'upcoming' && b.status === 'in_progress') return -1;
          if (a.status === 'in_progress' && b.status === 'upcoming') return 1;
          
          // If same status, sort by time (earliest first)
          const timeA = new Date(`2000-01-01T${a.time}`);
          const timeB = new Date(`2000-01-01T${b.time}`);
          return timeA - timeB;
        });
        
        setAppointments(sortedAppointments);
        setMentalHealthAlerts(alertsData);
        
        // Recalculate stats
        const activeCases = activeCasesData.active_cases_count || 0;
        const todaysAppointments = todayAppointments.length;
        const alertFlags = todayAppointments.filter(apt => 
          apt.service_type === 'mental' && apt.status === 'in_progress'
        ).length;
        
        setStats({
          todayVisits: activeCases,
          pendingVisits: todaysAppointments,
          activeCases: alertFlags,
          referralsSent: referralsData.referrals_count || 0
        });
        

      } catch (error) {
        console.error('Error updating counselor appointments:', error);
      }
    };

    window.addEventListener('counselor-appointment-updated', handleAppointmentUpdate);
    return () => window.removeEventListener('counselor-appointment-updated', handleAppointmentUpdate);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper function to format time to 12-hour format
  function to12Hour(time) {
    if (!time) return '';
    let [h, m] = time.split(':');
    h = parseInt(h, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  }

  // Helper function to get status badge
  function getStatusBadge(status) {
    if (!status) return <span>-</span>;
    const styleBase = {
      borderRadius: 12,
      padding: "2px 12px",
      fontSize: 14,
      fontWeight: 500,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      border: undefined,
      background: undefined,
      color: undefined,
    };
    if (status.toLowerCase() === "upcoming") {
      return <span style={{ ...styleBase, background: '#fff', color: '#14b8a6', border: '1.5px solid #14b8a6' }}>Upcoming</span>;
    }
    if (status.toLowerCase() === "completed") {
      return <span style={{ ...styleBase, color: '#16a34a', border: '1.5px solid #16a34a', background: '#fff' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#16a34a' }}>✓</span> Completed
      </span>;
    }
    if (status.toLowerCase() === "cancelled") {
      return <span style={{ ...styleBase, background: "#fde8e8", color: "#e11d48", border: "1.5px solid #e11d48" }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>✗</span> Cancelled
      </span>;
    }
    if (status.toLowerCase() === "in_progress" || status.toLowerCase() === "in progress") {
      return <span style={{ ...styleBase, background: "#dbeafe", color: "#2563eb", border: "1.5px solid #2563eb" }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>•</span> In Progress
      </span>;
    }
    return <span style={styleBase}>{status}</span>;
  }

  // Helper function to get priority badge
  function getPriorityBadge(severity) {
    if (!severity) return <span>-</span>;
    const styleBase = {
      borderRadius: 12,
      padding: "2px 12px",
      fontSize: 14,
      fontWeight: 500,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      border: undefined,
      background: undefined,
      color: undefined,
    };
    
    if (severity.toLowerCase() === "high") {
      return <span style={{ ...styleBase, background: '#fef2f2', color: '#dc2626', border: '1.5px solid #dc2626' }}>High Priority</span>;
    }
    if (severity.toLowerCase() === "medium") {
      return <span style={{ ...styleBase, background: '#fffbeb', color: '#d97706', border: '1.5px solid #d97706' }}>Moderate Priority</span>;
    }
    if (severity.toLowerCase() === "low") {
      return <span style={{ ...styleBase, background: '#eff6ff', color: '#2563eb', border: '1.5px solid #2563eb' }}>Low Priority</span>;
    }
    return <span style={{ ...styleBase, background: '#f3f4f6', color: '#6b7280', border: '1.5px solid #6b7280' }}>Unknown Priority</span>;
  }

  const handleSaveDocumentation = async () => {
    if (!selectedAppointment) return;
    try {
      // Save appointment documentation first
      const response = await updateCounselorAppointmentDocumentation(
        selectedAppointment.id,
        additionalNotes,
        selectedMentalHealthDiagnosis?.code || '',
        selectedMentalHealthDiagnosis?.name || ''
      );
      
      // Check if the response is successful
      if (response && response.status === 'success') {
      
      // Save mental health diagnosis if selected
      if (selectedMentalHealthDiagnosis) {
        try {
          await saveMentalHealthDiagnosis(
            selectedAppointment.id,
            selectedMentalHealthDiagnosis.code,
            selectedMentalHealthDiagnosis.name,
              selectedMentalHealthDiagnosis.risk_level || 'low',
            selectedMentalHealthDiagnosis.confidence_score || 0.8,
              selectedMentalHealthDiagnosis.interventions || []
          );
        } catch (mentalHealthError) {
          console.error('Failed to save mental health diagnosis:', mentalHealthError);
          // Continue with appointment documentation even if mental health save fails
        }
      }
      
              // Refresh appointments and update stats in real-time
        const [todayAppointments, referralsData, activeCasesData] = await Promise.all([
          getCounselorTodayAppointments(),
          getCounselorReferralsCount(),
          getCounselorActiveCases()
        ]);
        
        // Sort appointments: upcoming first, then in_progress, both sorted by time
        const sortedAppointments = todayAppointments.sort((a, b) => {
          // First sort by status: upcoming comes before in_progress
          if (a.status === 'upcoming' && b.status === 'in_progress') return -1;
          if (a.status === 'in_progress' && b.status === 'upcoming') return 1;
          
          // If same status, sort by time (earliest first)
          const timeA = new Date(`2000-01-01T${a.time}`);
          const timeB = new Date(`2000-01-01T${b.time}`);
          return timeA - timeB;
        });
        
        setAppointments(sortedAppointments);
        
        // Update the selected appointment with fresh data from the same source
        const updatedAppointment = todayAppointments.find(apt => apt.id === selectedAppointment.id);
        if (updatedAppointment) {
          setSelectedAppointment(updatedAppointment);
        }
        
        // Update stats in real-time
        // Active Cases: ALL mental health appointments with upcoming or in_progress status (from API)
        const activeCases = activeCasesData.active_cases_count || 0;
        
        // Today's Appointments: all appointments for today
        const todaysAppointments = todayAppointments.length;
        
        // Alert Flags: mental health appointments with in_progress status (high risk)
        const alertFlags = todayAppointments.filter(apt => 
          apt.service_type === 'mental' && apt.status === 'in_progress'
        ).length;
        
        // Referrals Sent: from API
        const referralsSent = referralsData.referrals_count || 0;
        
        setStats({
          todayVisits: todaysAppointments,
          pendingVisits: alertFlags,
          activeCases: activeCases,
          referralsSent: referralsSent
        });
        
        setShowAddNotesModal(false);
        setAdditionalNotes('');
        setSelectedDiagnosis(null);
        setSelectedMentalHealthDiagnosis(null);
        setRiskLevel('low');
        setInterventions([]);
        setShowDiagnosisOptions(true);
      } else {
        alert('Failed to save documentation. Please try again.');
      }
    } catch (err) {
      alert('Failed to save documentation. Please try again.');
    }
  };

  const handleStatusUpdate = async (action) => {
    if (!selectedAppointment) return;
    try {
      if (action === 'completed') {
        await markAppointmentCompleted(selectedAppointment.id);
      } else if (action === 'in_progress') {
        await markAppointmentInProgress(selectedAppointment.id);
      } else if (action === 'cancelled') {
        await cancelAppointment(selectedAppointment.id);
      }
      // Refresh appointments and update stats in real-time
      const [todayAppointments, referralsData, activeCasesData] = await Promise.all([
        getCounselorTodayAppointments(),
        getCounselorReferralsCount(),
        getCounselorActiveCases()
      ]);
      
      // Sort appointments: upcoming first, then in_progress, both sorted by time
      const sortedAppointments = todayAppointments.sort((a, b) => {
        // First sort by status: upcoming comes before in_progress
        if (a.status === 'upcoming' && b.status === 'in_progress') return -1;
        if (a.status === 'in_progress' && b.status === 'upcoming') return 1;
        
        // If same status, sort by time (earliest first)
        const timeA = new Date(`2000-01-01T${a.time}`);
        const timeB = new Date(`2000-01-01T${b.time}`);
        return timeA - timeB;
      });
      
      setAppointments(sortedAppointments);
      
      // Update stats in real-time
      // Active Cases: ALL mental health appointments with upcoming or in_progress status (from API)
      const activeCases = activeCasesData.active_cases_count || 0;
      
      // Today's Appointments: all appointments for today
      const todaysAppointments = todayAppointments.length;
      
      // Alert Flags: mental health appointments with in_progress status (high risk)
      const alertFlags = todayAppointments.filter(apt => 
        apt.service_type === 'mental' && apt.status === 'in_progress'
      ).length;
      
      setStats({
        todayVisits: activeCases, // Active Cases count
        pendingVisits: todaysAppointments, // Today's Appointments count
        activeCases: alertFlags, // Alert Flags count
        referralsSent: referralsData.referrals_count || 0 // AMIETI Engagement count
      });
      
      // Close modal
      setSelectedAppointment(null);
    } catch (err) {
      alert('Failed to update status. Please try again.');
    }
  };

  // ICD-11 Search and Documentation Functions
  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        const response = await searchICD11Codes(query);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.search_results || []);
          setShowSearchResults(true);
        } else {
          // Fallback to mock results if API fails
          const mockResults = [
            { code: '6A70.0', name: 'Generalized anxiety disorder', confidence: '95%' },
            { code: '6A70.1', name: 'Panic disorder', confidence: '88%' },
            { code: '6A70.2', name: 'Social anxiety disorder', confidence: '76%' }
          ].filter(item => 
            item.code.toLowerCase().includes(query.toLowerCase()) ||
            item.name.toLowerCase().includes(query.toLowerCase())
          );
          setSearchResults(mockResults);
          setShowSearchResults(true);
        }
      } catch (error) {
        console.error('Error searching ICD-11 codes:', error);
        setSearchResults([]);
        setShowSearchResults(false);
      }
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSearchResultSelect = (diagnosis) => {
    setSelectedDiagnosis(diagnosis);
    setShowDiagnosisOptions(false);
    setShowSearchResults(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleDiagnosisSelect = (diagnosis) => {
    setSelectedDiagnosis(diagnosis);
    setShowDiagnosisOptions(false);
  };

  const handleChangeDiagnosis = () => {
    setShowDiagnosisOptions(true);
    setSelectedDiagnosis(null);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handleCloseModal = () => {
    setShowAddNotesModal(false);
    setAdditionalNotes('');
    setSelectedDiagnosis(null);
    setSelectedMentalHealthDiagnosis(null);
    setRiskLevel('low');
    setInterventions([]);
    setShowDiagnosisOptions(true);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setSuggestedDiagnoses([]);
    setMentalHealthDiagnoses([]);
    setFollowUpChecked(false);
    setFollowUpCreated(false);
  };

  // Detect mental health conditions based on patient reason and mental health assessment
  const detectMentalHealthConditions = async () => {
    if (!selectedAppointment) return;
    
    setIsDetectingMentalHealth(true);
    try {
      let studentReason = selectedAppointment.reason || '';
      let isFollowUp = false;
      
      // For follow-up appointments, extract the original diagnosis for better detection
      if (studentReason.toLowerCase().includes('follow-up appointment for mental health assessment')) {
        isFollowUp = true;
        const diagnosisMatch = studentReason.match(/- (.+)$/);
        if (diagnosisMatch) {
          const originalDiagnosis = diagnosisMatch[1];
          console.log('Follow-up appointment detected. Original diagnosis:', originalDiagnosis);
          // Use the original diagnosis for detection instead of the full follow-up text
          studentReason = originalDiagnosis;
        }
      }
      
      console.log('Sending to API - studentReason:', studentReason, 'additionalNotes:', additionalNotes);
      
      const response = await detectMentalHealthRealtime(studentReason, additionalNotes);
      console.log('API Response:', response);
      
      if (response && response.suggested_diagnoses && response.suggested_diagnoses.length > 0) {
        console.log('Setting mental health diagnoses from API:', response.suggested_diagnoses);
        setMentalHealthDiagnoses(response.suggested_diagnoses);
      } else {
        console.log('API returned no diagnoses, using fallback for:', selectedAppointment.reason);
        useFallbackMentalHealthSuggestions(selectedAppointment.reason || '');
      }
    } catch (error) {
      console.error('Error detecting mental health conditions:', error);
      console.log('Using fallback due to API error for:', selectedAppointment.reason);
      const studentReason = selectedAppointment.reason || '';
      useFallbackMentalHealthSuggestions(studentReason);
    } finally {
      setIsDetectingMentalHealth(false);
    }
  };

  const useFallbackMentalHealthSuggestions = (studentReason) => {
    // Handle follow-up appointments by extracting the original diagnosis
    if (studentReason.toLowerCase().includes('follow-up appointment for mental health assessment')) {
      // Extract the diagnosis from the follow-up reason
      const diagnosisMatch = studentReason.match(/- (.+)$/);
      const originalDiagnosis = diagnosisMatch ? diagnosisMatch[1].toLowerCase() : '';
      
      if (originalDiagnosis.includes('suicidal') || originalDiagnosis.includes('suicide')) {
        setMentalHealthDiagnoses([
          { 
            code: '6A72', 
            name: 'Suicidal ideation', 
            confidence: '95%', 
            risk_level: 'high',
            interventions: [
              'Immediate safety assessment and crisis intervention',
              'Dialectical Behavior Therapy (DBT) for adolescents',
              'Safety planning with family involvement',
              'Regular suicide risk assessment protocols',
              'Crisis hotline and emergency services referral'
            ]
          },
          { 
            code: '6A70', 
            name: 'Depressive disorder', 
            confidence: '88%', 
            risk_level: 'high',
            interventions: [
              'Comprehensive depression assessment',
              'Cognitive Behavioral Therapy (CBT)',
              'Medication evaluation if indicated',
              'Regular suicide risk assessment',
              'Family psychoeducation and support'
            ]
          },
          { 
            code: '6A73', 
            name: 'Non-suicidal self-injury', 
            confidence: '76%', 
            risk_level: 'high',
            interventions: [
              'Safety assessment and harm reduction strategies',
              'Dialectical Behavior Therapy (DBT) skills training',
              'Regular monitoring and check-ins',
              'Family involvement and support',
              'Referral to specialized mental health services'
            ]
          }
        ]);
        return;
      }
    }
    
    if (studentReason.toLowerCase().includes('anxiety') || studentReason.toLowerCase().includes('worried') || studentReason.toLowerCase().includes('kabado')) {
      setMentalHealthDiagnoses([
        { 
          code: '6B00', 
          name: 'Anxiety or fear-related disorders', 
          confidence: '95%', 
          risk_level: 'moderate',
          interventions: [
            'Anxiety assessment and psychoeducation',
            'Relaxation techniques and stress management',
            'Cognitive Behavioral Therapy (CBT)',
            'Gradual exposure therapy',
            'Regular check-ins and progress monitoring'
          ]
        },
        { 
          code: '6B00.0', 
          name: 'Generalized anxiety disorder, mild', 
          confidence: '88%', 
          risk_level: 'low',
          interventions: [
            'Anxiety education and normalization',
            'Basic relaxation techniques',
            'Lifestyle modification recommendations',
            'Regular check-ins',
            'Referral to school counselor if needed'
          ]
        },
        { 
          code: '6B00.1', 
          name: 'Panic disorder', 
          confidence: '76%', 
          risk_level: 'moderate',
          interventions: [
            'Panic disorder assessment',
            'Breathing techniques and grounding exercises',
            'Cognitive Behavioral Therapy (CBT)',
            'Medication evaluation if indicated',
            'Regular monitoring of panic attacks'
          ]
        }
      ]);
    } else if (studentReason.toLowerCase().includes('sad') || studentReason.toLowerCase().includes('depressed') || studentReason.toLowerCase().includes('lungkot')) {
      setMentalHealthDiagnoses([
        { 
          code: '6A70', 
          name: 'Depressive disorder', 
          confidence: '95%', 
          risk_level: 'high',
          interventions: [
            'Comprehensive depression assessment',
            'Cognitive Behavioral Therapy (CBT)',
            'Medication evaluation if indicated',
            'Regular suicide risk assessment',
            'Family psychoeducation and support'
          ]
        },
        { 
          code: '6A70.0', 
          name: 'Mild depressive episode', 
          confidence: '88%', 
          risk_level: 'moderate',
          interventions: [
            'Depression screening and assessment',
            'Supportive counseling and psychoeducation',
            'Behavioral activation strategies',
            'Social support enhancement',
            'Regular mood monitoring'
          ]
        },
        { 
          code: '6A70.1', 
          name: 'Moderate depressive episode', 
          confidence: '76%', 
          risk_level: 'moderate',
          interventions: [
            'Comprehensive depression assessment',
            'Cognitive Behavioral Therapy (CBT)',
            'Medication evaluation if indicated',
            'Regular suicide risk assessment',
            'Family psychoeducation and support'
          ]
        }
      ]);
    } else if (studentReason.toLowerCase().includes('stress') || studentReason.toLowerCase().includes('pressure') || studentReason.toLowerCase().includes('nai-stress')) {
      setMentalHealthDiagnoses([
        { 
          code: 'QD85', 
          name: 'Problems related to life-management difficulty', 
          confidence: '95%', 
          risk_level: 'moderate',
          interventions: [
            'Stress management techniques',
            'Time management and organization skills',
            'Coping strategy development',
            'Supportive counseling',
            'Lifestyle modification guidance'
          ]
        },
        { 
          code: '6B43', 
          name: 'Adjustment disorder', 
          confidence: '88%', 
          risk_level: 'low',
          interventions: [
            'Supportive counseling',
            'Problem-solving skills development',
            'Social support enhancement',
            'Regular monitoring',
            'Gradual return to normal activities'
          ]
        },
        { 
          code: 'QD85.0', 
          name: 'Problems related to education and literacy', 
          confidence: '76%', 
          risk_level: 'low',
          interventions: [
            'Academic support and tutoring',
            'Study skills development',
            'Time management training',
            'Stress reduction techniques',
            'Regular academic check-ins'
          ]
        }
      ]);
    } else if (studentReason.toLowerCase().includes('suicide') || studentReason.toLowerCase().includes('kill myself') || studentReason.toLowerCase().includes('gusto ko mamatay')) {
      setMentalHealthDiagnoses([
        { 
          code: 'MB26.0', 
          name: 'Suicidal ideation', 
          confidence: '95%', 
          risk_level: 'high',
          interventions: [
            'Immediate safety assessment and crisis intervention',
            'Referral to emergency mental health services',
            'Safety planning with student and family',
            'Follow-up within 24-48 hours',
            'Consider hospitalization if risk is imminent'
          ]
        },
        { 
          code: 'MB26.1', 
          name: 'Non-suicidal self-injury', 
          confidence: '88%', 
          risk_level: 'high',
          interventions: [
            'Safety assessment and harm reduction strategies',
            'Dialectical Behavior Therapy (DBT) skills training',
            'Regular monitoring and check-ins',
            'Family involvement and support',
            'Referral to specialized mental health services'
          ]
        },
        { 
          code: '6A70', 
          name: 'Depressive disorder', 
          confidence: '76%', 
          risk_level: 'high',
          interventions: [
            'Comprehensive depression assessment',
            'Cognitive Behavioral Therapy (CBT)',
            'Medication evaluation if indicated',
            'Regular suicide risk assessment',
            'Family psychoeducation and support'
          ]
        }
      ]);
    } else {
      setMentalHealthDiagnoses([
        { 
          code: '6B43', 
          name: 'Adjustment disorder', 
          confidence: '50%', 
          risk_level: 'low',
          interventions: [
            'Supportive counseling',
            'Problem-solving skills development',
            'Social support enhancement',
            'Regular monitoring',
            'Gradual return to normal activities'
          ]
        },
        { 
          code: 'QD85', 
          name: 'Problems related to life-management difficulty', 
          confidence: '45%', 
          risk_level: 'moderate',
          interventions: [
            'Stress management techniques',
            'Time management and organization skills',
            'Coping strategy development',
            'Supportive counseling',
            'Lifestyle modification guidance'
          ]
        },
        { 
          code: '6B00.0', 
          name: 'Generalized anxiety disorder, mild', 
          confidence: '40%', 
          risk_level: 'low',
          interventions: [
            'Anxiety education and normalization',
            'Basic relaxation techniques',
            'Lifestyle modification recommendations',
            'Regular check-ins',
            'Referral to school counselor if needed'
          ]
        }
      ]);
    }
  };

  const handleMentalHealthDiagnosisSelect = (diagnosis) => {
    setSelectedMentalHealthDiagnosis(diagnosis);
    setRiskLevel(diagnosis.risk_level || 'low');
    setInterventions(diagnosis.interventions || []);
    setShowDiagnosisOptions(false);
  };

  const handleChangeMentalHealthDiagnosis = () => {
    setSelectedMentalHealthDiagnosis(null);
    setShowDiagnosisOptions(true);
    
    // For high-risk cases, ensure mental health detection is triggered
    if (selectedAppointment?.risk_level === 'high' && additionalNotes) {
      detectMentalHealthConditions();
    }
  };

  // Function to fetch full appointment data when modal opens
  const handleViewAppointment = async (appointment) => {
    try {
      // Fetch all appointments to get the full data including client email
      const allAppointments = await getCounselorTodayAppointments();
      const fullAppointment = allAppointments.find(apt => apt.id === appointment.id);
      if (fullAppointment) {
        setSelectedAppointment(fullAppointment);
      } else {
        setSelectedAppointment(appointment);
      }
    } catch (err) {
      console.error('Error fetching full appointment data:', err);
      setSelectedAppointment(appointment);
    }
  };

  // Function to check for existing follow-up appointments in the database
  const checkForExistingFollowUp = async (appointment) => {
    try {
      // Fetch all appointments to check for existing follow-ups
      const allAppointments = await getAppointments();
      
      // Check if there's a follow-up appointment for this client
      const followUpExists = allAppointments.some(apt => 
        apt.name === appointment.name &&
        apt.reason && apt.reason.toLowerCase().includes('follow-up')
      );
      
      if (followUpExists) {
        setFollowUpCreated(true);
      }
    } catch (error) {
      console.error('Error checking for existing follow-up:', error);
    }
  };

  // Function to open Add Documentation modal with existing data if available
  const handleOpenAddDocumentation = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAddNotesModal(true);

    // Reset follow-up checked state, but don't reset followUpCreated
    setFollowUpChecked(false);
    setIsCreatingFollowUp(false);

    // Check if a follow-up appointment already exists for this appointment
    if (appointment.risk_level === 'high') {
      // Check if this appointment is already a follow-up appointment
      if (appointment.reason && appointment.reason.toLowerCase().includes('follow-up')) {
        setFollowUpCreated(true);
      } else {
        // Check if there's a follow-up appointment for this client in the appointments list
        // This will catch follow-ups that were created in the current session
        const followUpExists = appointments.some(apt => 
          apt.name === appointment.name &&
          apt.reason && apt.reason.toLowerCase().includes('follow-up')
        );
        
        if (followUpExists) {
          setFollowUpCreated(true);
        } else {
          // Check if this appointment has a follow-up flag or if a follow-up was created recently
          // We can check if the appointment has been documented with follow-up information
          if (appointment.documentation && appointment.documentation.toLowerCase().includes('follow-up')) {
            setFollowUpCreated(true);
          } else {
            // Check if there's a follow-up appointment in the database for this client
            // We'll do this asynchronously to avoid blocking the modal opening
            checkForExistingFollowUp(appointment);
          }
        }
      }
    }
    
    // Populate form with existing data if available
    if (appointment.documentation) {
      setAdditionalNotes(appointment.documentation);
    } else {
      setAdditionalNotes('');
    }
    
    if (appointment.diagnosis_code && appointment.diagnosis_name) {
      setSelectedDiagnosis({
        code: appointment.diagnosis_code,
        name: appointment.diagnosis_name
      });
      

      
      // For high-risk cases, set up the full mental health diagnosis with interventions
      if (appointment.risk_level === 'high') {
        // Create a mental health diagnosis object with interventions for high-risk cases
        const mentalHealthDiagnosis = {
          code: appointment.diagnosis_code,
          name: appointment.diagnosis_name,
          confidence: appointment.confidence_score ? `${Math.round(appointment.confidence_score * 100)}%` : '95%',
          risk_level: appointment.risk_level,
          interventions: [
            'Immediate safety assessment and crisis intervention',
            'Dialectical Behavior Therapy (DBT) for adolescents',
            'Safety planning with family involvement',
            'Regular suicide risk assessment protocols',
            'Crisis hotline and emergency services referral'
          ]
        };
        setSelectedMentalHealthDiagnosis(mentalHealthDiagnosis);
      setShowDiagnosisOptions(false);
      } else {
        setSelectedMentalHealthDiagnosis(null);
        setShowDiagnosisOptions(false);
      }
    } else {
      setSelectedDiagnosis(null);
      setSelectedMentalHealthDiagnosis(null);
      setShowDiagnosisOptions(true);
      
      // For high-risk cases or follow-up appointments without diagnosis, trigger detection immediately
      if ((appointment.risk_level === 'high' || appointment.reason?.toLowerCase().includes('follow-up')) && appointment.reason) {
        // Trigger detection after a short delay to ensure state is set
        setTimeout(() => {
          detectMentalHealthConditions();
        }, 100);
      }
    }
  };

  // Helper function to calculate follow-up date and time (1 week after appointment)
  const calculateFollowUpDateTime = (appointmentDate, appointmentTime) => {
    if (!appointmentDate) return null;
    const date = new Date(appointmentDate);
    date.setDate(date.getDate() + 7); // Add 7 days
    
    const dateString = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    if (appointmentTime) {
      // Format the time properly to avoid duplication
      const formattedTime = formatTimeForDisplay(appointmentTime);
      return `${dateString} at ${formattedTime}`;
    }
    
    return dateString;
  };

  // Helper function to format time for display
  const formatTimeForDisplay = (time) => {
    if (!time) return '';
    const timeStr = time.toString();
    
    // If time is already in 12-hour format (contains AM/PM), return as is
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
      return timeStr;
    }
    
    // If it's in 24-hour format, convert it
    if (timeStr.includes(':')) {
      const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
    }
    
    // If it's just a number, assume it's hours in 24-hour format
    const hour = parseInt(timeStr, 10);
    if (!isNaN(hour)) {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}:00 ${ampm}`;
    }
    
    return timeStr;
  };

  // Function to create follow-up appointment
  const createFollowUpAppointment = async () => {
    if (!selectedAppointment || !followUpChecked) return;
    
    // Check multiple possible properties for service type
    const serviceType = selectedAppointment.service_type || 
                       selectedAppointment.type || 
                       selectedAppointment.appointment_type ||
                       selectedAppointment.category;
    
    // For counselor dashboard, all appointments are mental health related
    // Only block if explicitly marked as physical health
    if (serviceType && serviceType.toLowerCase() === 'physical') {
      alert('Follow-up appointments are only available for mental health service type.');
      setFollowUpChecked(false);
      return;
    }
    
    // Check if follow-up has already been created
    if (followUpCreated) {
      alert('Follow-up appointment has already been created for this case.');
      return;
    }
    
    setIsCreatingFollowUp(true);
    try {
      // Fetch all appointments to get the full appointment data with client_id and provider_id
      const allAppointments = await getAppointments();
      const fullAppointment = allAppointments.find(apt => apt.id === selectedAppointment.id);
      
      if (!fullAppointment) {
        throw new Error('Unable to find full appointment data');
      }
      
      // Extract client and provider IDs from the full appointment data
      let clientId = fullAppointment.client_id;
      let providerId = fullAppointment.provider_id;
    
    // If IDs are not directly available, try to extract from nested objects
      if (!clientId && fullAppointment.client) {
        clientId = typeof fullAppointment.client === 'object' ? fullAppointment.client.id : fullAppointment.client;
    }
    
      if (!providerId && fullAppointment.provider) {
        providerId = typeof fullAppointment.provider === 'object' ? fullAppointment.provider.id : fullAppointment.provider;
    }
    
    // Validate that we have the required IDs
    if (!clientId || !providerId) {
        console.error('Missing client_id or provider_id:', { clientId, providerId, fullAppointment });
      alert('Error: Missing client or provider information. Please try again.');
      return;
    }
    
      // Check multiple possible date field names for the current appointment
      const currentAppointmentDate = fullAppointment.date || 
                                   fullAppointment.appointment_date || 
                                   fullAppointment.scheduled_date ||
                                   fullAppointment.appointmentDate ||
                                   fullAppointment.created_date;
      
      // Calculate follow-up date (1 week after current appointment)
      const currentDate = currentAppointmentDate ? new Date(currentAppointmentDate) : new Date();
      const followUpDate = new Date(currentDate);
      followUpDate.setDate(followUpDate.getDate() + 7);
      
      const followUpDateString = followUpDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Create follow-up appointment data
      
      // Create follow-up appointment data
      const followUpData = {
        client_id: clientId,
        provider_id: providerId,
        date: followUpDateString,
        time: fullAppointment.time,
        reason: `Follow-up appointment for mental health assessment - ${selectedMentalHealthDiagnosis?.name || 'High-risk case'}`,
        status: 'upcoming',
        service_type: 'mental'
      };
      
      // Create the follow-up appointment
      const response = await createAppointment(followUpData);
      
      if (response && response.id) {
        // Show success message
        alert('Follow-up appointment created successfully!');
        
        // Refresh appointments list
        const updatedAppointments = await getCounselorTodayAppointments();
        setAppointments(updatedAppointments);
        
        // Set follow-up as created and uncheck the checkbox
        setFollowUpChecked(false);
        setFollowUpCreated(true);
      } else {
        throw new Error('No response ID received from API');
      }
    } catch (error) {
      console.error('Error creating follow-up appointment:', error);
      console.error('Error details:', error.message, error.stack);
      alert('Error creating follow-up appointment. Please try again.');
    } finally {
      setIsCreatingFollowUp(false);
    }
  };

  // Effect to handle follow-up appointment creation when checkbox is checked
  useEffect(() => {
    if (followUpChecked && selectedAppointment && selectedMentalHealthDiagnosis?.risk_level === 'high' && !followUpCreated) {
      createFollowUpAppointment();
    }
  }, [followUpChecked]);

  // Detect mental health conditions when modal opens
  useEffect(() => {
    if (showAddNotesModal && selectedAppointment) {
      detectMentalHealthConditions();
    }
  }, [showAddNotesModal, selectedAppointment]);

  // Detect mental health conditions when mental health assessment changes
  useEffect(() => {
    if (showAddNotesModal && selectedAppointment && additionalNotes) {
      const timeoutId = setTimeout(() => {
        detectMentalHealthConditions();
      }, 1000); // Debounce for 1 second
      
      return () => clearTimeout(timeoutId);
    }
  }, [additionalNotes]);

  return (
    <div className="container-fluid p-4" style={{ backgroundColor: "#f8fafc", minHeight: "100vh" }}>
      {/* Top Section with Welcome and Notification */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h2 className="fw-bold mb-1" style={{ fontSize: "1.8rem", color: "#171717" }}>
                Welcome, Counselor {userProfile?.full_name || ""}!
              </h2>
              <p className="text-muted mb-0" style={{ fontSize: "1rem" }}>
                Mental health monitoring and support.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="row g-3 align-items-end mb-3">
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Active Cases</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{stats.todayVisits}</div>
            <div className="text-secondary small mt-1">Students under mental health follow-up or counseling</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Today's Appointments</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{stats.pendingVisits}</div>
            <div className="text-secondary small mt-1">Total counseling sessions scheduled for today</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>Alert Flags</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{stats.activeCases}</div>
            <div className="text-secondary small mt-1">New high-risk detected from AMIETI</div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="bg-white rounded-4 shadow-sm p-3 h-100 d-flex flex-column justify-content-center align-items-start" style={{ minHeight: 90 }}>
            <div className="text-muted mb-1" style={{ fontSize: 15 }}>AMIETI Engagement</div>
            <div className="fw-bold" style={{ fontSize: 28, color: '#222' }}>{stats.referralsSent}</div>
            <div className="text-secondary small mt-1">Students who interacted with AMIETI chatbot</div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="row g-4">
        {/* Left Column - Today's Appointment and Key Insights */}
        <div className="col-lg-6">
          {/* Today's Appointment Section */}
          <div className="shadow-sm" style={{ borderRadius: 16, background: "#e6f7ec", border: '2px solid #a8e6cf' }}>
            <div className="p-4">
              <div className="fw-bold fs-5 mb-2">Today's Appointment</div>
              
              <div className="d-flex flex-column gap-3">
                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-success" role="status" style={{ color: '#43c463' }}>
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : appointments.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted">No appointments scheduled for today</p>
                  </div>
                ) : (
                  appointments.slice(appointmentBatch * batchSize, (appointmentBatch + 1) * batchSize).map((appointment, index) => (
                    <div key={appointment.id || index} className="d-flex align-items-center p-3" style={{ borderRadius: 12, position: 'relative' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#20B2AA', marginRight: 18, flexShrink: 0 }} />
                      
                      {/* First Column - Name and Role */}
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="fw-semibold" style={{ color: '#222', fontSize: 17, marginBottom: 2 }}>{appointment.name}</div>
                        <div className="text-muted" style={{ fontSize: 14 }}>{appointment.role}</div>
                      </div>
                      
                      {/* Second Column - Time and Created Time */}
                      <div className="text-center" style={{ minWidth: 120 }}>
                        <div className="text-muted" style={{ fontSize: 15 }}>{appointment.time}</div>
                        <div className="text-muted" style={{ fontSize: 13 }}>{appointment.created_time}</div>
                      </div>
                      
                      {/* Third Column - View Button */}
                      <div className="ms-3">
                        <button className="btn btn-sm" 
                                style={{ 
                                  background: '#43c463', 
                                  color: 'white', 
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '4px 12px',
                                  fontSize: '0.8rem'
                                  }}
                                  onClick={() => handleViewAppointment(appointment)}>
                          View
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <button
                className="btn w-100 mt-2"
                style={{ borderRadius: 10, background: '#43c463', color: '#fff', fontWeight: 600, fontSize: 15 }}
                onClick={() => setAppointmentBatch(b => b + 1)}
                disabled={((appointmentBatch + 1) * batchSize) >= appointments.length}
              >
                View More Appointments
              </button>
            </div>
          </div>

          {/* Key Insights Section */}
          <div className="bg-white rounded-4 shadow-sm p-4 mt-4" style={{ minHeight: 120 }}>
            <div className="fw-bold mb-2" style={{ fontSize: 18, color: '#222' }}>Key Insights</div>
            <ul className="mb-0" style={{ fontSize: 15, color: '#222', fontWeight: 600, paddingLeft: 18 }}>
              <li>Mental health sessions increased by 15% this week</li>
              <li>Anxiety-related appointments are most common</li>
              <li>Student engagement with AMIE chatbot is high</li>
            </ul>
          </div>
        </div>

        {/* Right Column - Attention Required */}
        <div className="col-lg-6">
          {/* Attention Required Section */}
          <div className="card" style={{ 
            backgroundColor: "#fff", 
            borderRadius: "12px", 
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            border: "1px solid #e9ecef"
          }}>
            <div className="card-body px-4 pt-4 pb-3">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                  <h5 className="fw-bold mb-1" style={{ color: "#171717" }}>
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-danger me-2" />
                    Attention Required
                  </h5>
                  <p className="text-muted mb-0" style={{ fontSize: "0.9rem" }}>
                    Priority alerts from AMIETI and student assessments
                  </p>
                </div>
              </div>

              <div className="d-flex flex-column gap-3">
                {mentalHealthAlerts.length > 0 ? (
                  mentalHealthAlerts.slice(alertBatch * batchSize, (alertBatch + 1) * batchSize).map((alert, index) => (
                    <div key={alert.id} className="d-flex align-items-center justify-content-between p-3" style={{ borderRadius: 12, border: '1px solid #e9ecef', background: '#fff' }}>
                      <div className="flex-grow-1">
                        <div className="fw-semibold" style={{ color: '#222', fontSize: 17, marginBottom: 2 }}>
                          {alert.student?.full_name || alert.student?.username || 'Unknown Student'}
                        </div>
                        <div className="text-muted" style={{ fontSize: 14 }}>{alert.title}</div>
                      </div>
                      {getPriorityBadge(alert.severity)}
                    </div>
                  ))
                ) : (
                  <div className="d-flex align-items-center justify-content-center p-4" style={{ borderRadius: 12, border: '1px solid #e9ecef', background: '#fff' }}>
                    <div className="text-center">
                      <div className="text-muted" style={{ fontSize: 14 }}>No active alerts at the moment</div>
                    </div>
                  </div>
                )}
              </div>

              <button
                className="btn w-100 mt-2"
                style={{ borderRadius: 10, background: '#43c463', color: '#fff', fontWeight: 600, fontSize: 15 }}
                onClick={() => setAlertBatch(b => b + 1)}
                disabled={((alertBatch + 1) * batchSize) >= mentalHealthAlerts.length}
              >
                View More Alerts
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540, minWidth: 540, width: "100%" }}>
            <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#e6f0ea", minHeight: 520 }}>
              <div className="mb-3">
                <span className="fw-bold" style={{ fontSize: 20 }}>
                  Appointment Details
                </span>
                <div className="text-muted" style={{ fontSize: 15 }}>Complete information about this appointment</div>
              </div>
              <div className="row mb-2">
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>
                    <span style={{ background: '#fef9c3', borderRadius: '50%', width: 24, height: 24, display: 'inline-block', marginRight: 8, verticalAlign: 'middle' }}></span>
                    {(() => {
                      // Handle different data structures
                      if (selectedAppointment.client && typeof selectedAppointment.client === 'object') {
                        // If client is an object with full_name
                        if (selectedAppointment.client.full_name) {
                          const role = selectedAppointment.client.role;
                          const name = selectedAppointment.client.full_name;
                          if (role === 'clinic') return `Nurse ${name}`;
                          if (role === 'faculty') return `Teacher ${name}`;
                          if (role === 'student') return `Student ${name}`;
                          return name;
                        }
                      } else if (selectedAppointment.name) {
                        // If appointment has direct name and role properties
                        const role = selectedAppointment.role;
                        const name = selectedAppointment.name;
                        if (role === 'clinic') return `Nurse ${name}`;
                        if (role === 'faculty') return `Teacher ${name}`;
                        if (role === 'student') return `Student ${name}`;
                        return name;
                      } else if (typeof selectedAppointment.client === 'string') {
                        return selectedAppointment.client;
                      }
                      return 'Unknown';
                    })()}
                  </div>
                </div>
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Type</div>
                  <div style={{ fontSize: 14 }}>
                    {(() => {
                      // Check multiple possible properties for service type
                      const type = selectedAppointment.service_type || 
                                  selectedAppointment.type || 
                                  selectedAppointment.appointment_type ||
                                  selectedAppointment.category;
                      
                      if (!type) {
                        // If no service type is found, try to infer from other properties
                        if (selectedAppointment.reason && selectedAppointment.reason.toLowerCase().includes('mental')) {
                          return <span style={{ background: '#99f6e4', color: '#222', borderRadius: 12, padding: '2px 12px', fontSize: 14, fontWeight: 500 }}>Mental Health</span>;
                        }
                        if (selectedAppointment.reason && selectedAppointment.reason.toLowerCase().includes('physical')) {
                          return <span style={{ background: '#bbf7d0', color: '#222', borderRadius: 12, padding: '2px 12px', fontSize: 14, fontWeight: 500 }}>Physical Health</span>;
                        }
                        // Default to Mental Health for counselor dashboard appointments
                        return <span style={{ background: '#99f6e4', color: '#222', borderRadius: 12, padding: '2px 12px', fontSize: 14, fontWeight: 500 }}>Mental Health</span>;
                      }
                      
                      if (type.toLowerCase() === 'mental' || type === 'Mental Health') return <span style={{ background: '#99f6e4', color: '#222', borderRadius: 12, padding: '2px 12px', fontSize: 14, fontWeight: 500 }}>Mental Health</span>;
                      if (type.toLowerCase() === 'physical' || type === 'Physical Health') return <span style={{ background: '#bbf7d0', color: '#222', borderRadius: 12, padding: '2px 12px', fontSize: 14, fontWeight: 500 }}>Physical Health</span>;
                      return <span style={{ background: '#e0ece3', color: '#222', borderRadius: 12, padding: '2px 12px', fontSize: 14, fontWeight: 500 }}>{type}</span>;
                    })()}
                  </div>
                </div>
              </div>
              <div className="row mb-2">
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Date & Time</div>
                  <div style={{ fontSize: 14 }}>
                    <i className="bi bi-calendar-event me-2"></i>
                    {(() => {
                      // Check multiple possible date field names
                      const appointmentDate = selectedAppointment.date || 
                                            selectedAppointment.appointment_date || 
                                            selectedAppointment.scheduled_date;
                      
                      if (!appointmentDate) {
                        // If no date is found, show today's date as fallback
                        const today = new Date();
                        return `Today, ${today.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`;
                      }
                      
                      const date = new Date(appointmentDate);
                      const today = new Date();
                      const tomorrow = new Date(today);
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      
                      if (date.toDateString() === today.toDateString()) {
                        return `Today, ${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`;
                      } else if (date.toDateString() === tomorrow.toDateString()) {
                        return `Tomorrow, ${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}`;
                      } else {
                        return date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                      }
                    })()}
                  </div>
                  <div style={{ fontSize: 14 }}>
                    <i className="bi bi-clock me-2"></i>
                    {(() => {
                      if (!selectedAppointment.time) return '-';
                      const time = selectedAppointment.time.toString();
                      
                      // Check if time is already in 12-hour format (contains AM/PM)
                      if (time.includes('AM') || time.includes('PM')) {
                        // If it already has AM/PM, return as is
                        return time;
                      }
                      
                      // If it's in 24-hour format, convert it
                      if (time.includes(':')) {
                        return to12Hour(time);
                      }
                      
                      // If it's just a number, assume it's hours in 24-hour format
                      const hour = parseInt(time, 10);
                      if (!isNaN(hour)) {
                        return to12Hour(`${hour}:00`);
                      }
                      
                      return time;
                    })()}
                  </div>
                </div>
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Status</div>
                  <div>{getStatusBadge(selectedAppointment.status)}</div>
                </div>
              </div>
              <div className="row mb-2">
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Location</div>
                  <div style={{ fontSize: 14 }}><i className="bi bi-geo-alt me-2"></i>Counseling Office, Room 2</div>
                </div>
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Contact Information</div>
                  <div style={{ fontSize: 14 }}>
                    <i className="bi bi-envelope me-2"></i>
                    {(() => {
                      // Handle different data structures for email
                      if (selectedAppointment.client && typeof selectedAppointment.client === 'object' && selectedAppointment.client.email) {
                        return selectedAppointment.client.email;
                      } else if (selectedAppointment.email) {
                        return selectedAppointment.email;
                      } else if (selectedAppointment.client_email) {
                        return selectedAppointment.client_email;
                      }
                      return 'No email available';
                    })()}
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Patient Reason</div>
                <div style={{ fontSize: 14, background: '#e0ece3', borderRadius: 6, padding: '6px 10px', minHeight: 32 }}>
                  {selectedAppointment.reason
                    ? selectedAppointment.reason.split('\n').map((line, idx) => (
                        <div key={idx} style={{ marginBottom: 4 }}>{line}</div>
                      ))
                    : 'No reason provided.'}
                </div>
              </div>
              <div className="mb-3">
                <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Mental Health Coding</div>
                <div style={{ fontSize: 14, background: '#e0ece3', borderRadius: 6, padding: '6px 10px', minHeight: 32 }}>
                  {selectedAppointment.diagnosis_code && selectedAppointment.diagnosis_name
                    ? `${selectedAppointment.diagnosis_code} - ${selectedAppointment.diagnosis_name}`
                    : 'No diagnosis code assigned.'}
                </div>
              </div>
              {/* Documentation */}
              <div className="mb-3">
                <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Documentation</div>
                <div style={{ fontSize: 14, background: '#e0ece3', borderRadius: 6, padding: '6px 10px', minHeight: 80 }}>
                  {selectedAppointment.documentation
                    ? selectedAppointment.documentation.split('\n').map((line, idx) => (
                        <div key={idx} style={{ marginBottom: 4 }}>{line}</div>
                      ))
                    : 'Provider\'s documentation for this appointment is not yet completed.'}
                </div>
              </div>
              {/* Action buttons row 1 */}
              <div className="d-flex justify-content-start gap-2 mb-3">
                <button type="button" className="btn btn-success px-2 flex-grow-1" style={{ fontWeight: 700, background: '#22c55e', color: '#222', border: 'none', minWidth: 100, fontSize: 14 }} onClick={() => handleStatusUpdate('completed')}>Mark as Completed</button>
                <button type="button" className="btn btn-warning px-2 flex-grow-1" style={{ fontWeight: 700, background: '#fde047', color: '#222', border: 'none', minWidth: 100, fontSize: 14 }} onClick={() => handleStatusUpdate('in_progress')}>Mark as In progress</button>
                <button type="button" className="btn px-2 flex-grow-1" style={{ fontWeight: 600, background: '#ff7043', color: '#fff', border: 'none', minWidth: 100, fontSize: 14 }} onClick={() => handleStatusUpdate('cancelled')}>Cancel Appointment</button>
              </div>
              {/* Action buttons row 2 */}
              <div className="d-flex justify-content-between align-items-center gap-2">
                <button type="button" className="btn btn-cancel-light-green px-4" onClick={() => setSelectedAppointment(null)}>Close</button>
                <button type="button" className="btn btn-teal px-4 d-flex align-items-center" style={{ background: '#14b8a6', color: '#fff', fontWeight: 600, border: 'none' }} onClick={() => handleOpenAddDocumentation(selectedAppointment)}>
                  <span style={{ fontSize: 20, marginRight: 8, lineHeight: 1, fontWeight: 700 }}>+</span> {selectedAppointment?.documentation ? 'Edit' : 'Add'} documentation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Documentation Modal */}
      {showAddNotesModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540, minWidth: 540, width: "100%" }}>
            <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#f6fff4" }}>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="fw-bold" style={{ fontSize: 22 }}>{selectedAppointment?.documentation ? 'Edit' : 'Add'} Documentation</span>
              </div>
              <div className="mb-3" style={{ fontSize: 15, color: "#222" }}>{selectedAppointment?.documentation ? 'Edit' : 'Add'} documentation for the appointment</div>
              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ fontSize: 15 }}>Patient Reason</label>
                <input type="text" className="form-control" value={selectedAppointment?.reason ? selectedAppointment.reason : 'No reason provided.'} disabled style={{ background: '#e0ece3', fontSize: 15 }} />
              </div>
              <div className="mb-3">
                <label className="form-label fw-semibold" style={{ fontSize: 15 }}>Mental Health Coding</label>
                {showDiagnosisOptions && !selectedMentalHealthDiagnosis ? (
                  <div className="position-relative">
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Search ICD-11 or type code..." 
                      style={{ fontSize: 15 }}
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                    {showSearchResults && searchResults.length > 0 && (
                       <ul className="list-group position-absolute w-100" style={{ zIndex: 10, maxHeight: 180, overflowY: 'auto', top: '100%', background: '#e6f0ea', border: '1px solid #ced4da' }}>
                         {searchResults.map(item => (
                           <li
                             key={item.code}
                             className="list-group-item list-group-item-action"
                             style={{ cursor: 'pointer', background: '#e6f0ea', border: 'none' }}
                             onMouseDown={() => handleSearchResultSelect(item)}
                           >
                             <div style={{ fontSize: 13, color: '#6c757d' }}>
                               <span style={{ fontWeight: 700, color: '#222' }}>{item.code}</span> - {item.name} ({item.confidence})
                             </div>
                           </li>
                         ))}
                       </ul>
                     )}
                  </div>
                ) : selectedDiagnosis && selectedAppointment?.risk_level !== 'high' ? (
                  // Show simple diagnosis for non-high-risk cases only
                  <div className="p-3" style={{ background: '#e0ece3', borderRadius: 6, border: '1px solid #d1e7dd' }}>
                    <div style={{ fontSize: 13, color: '#6c757d', display: 'flex', alignItems: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={true}
                        style={{ marginRight: '8px' }}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            handleChangeDiagnosis();
                          }
                        }}
                      />
                      <span>{selectedDiagnosis.code} - {selectedDiagnosis.name}</span>
                    </div>
                  </div>
                ) : null}
              </div>
              {showDiagnosisOptions && !selectedMentalHealthDiagnosis && (
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{ fontSize: 15 }}>
                    Suggested Diagnoses
                    {isDetectingMentalHealth && <span style={{ fontSize: 12, color: '#6c757d', marginLeft: 8 }}>(Detecting...)</span>}
                  </label>
                  <div style={{ fontSize: 13, color: '#6c757d' }}>
                    {mentalHealthDiagnoses.length > 0 ? (
                      mentalHealthDiagnoses.map((diagnosis, index) => (
                        <div key={index} style={{ 
                          marginBottom: '4px', 
                          display: 'flex', 
                          alignItems: 'flex-start',
                          gap: '12px'
                        }}>
                            <input 
                            type="checkbox" 
                              style={{ marginTop: '2px' }}
                              checked={selectedMentalHealthDiagnosis?.code === diagnosis.code}
                            onChange={(e) => {
                              if (e.target.checked) {
                                handleMentalHealthDiagnosisSelect(diagnosis);
                              } else {
                                handleChangeMentalHealthDiagnosis();
                              }
                            }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ color: '#222', fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                                {diagnosis.code} - {diagnosis.name}
                              </div>
                              <div style={{ color: '#6c757d', fontSize: '12px', marginBottom: '8px' }}>
                                Confidence: <span style={{ fontWeight: '600', color: '#222' }}>{diagnosis.confidence}</span> | 
                                Risk Level: 
                                <span style={{ 
                                  color: diagnosis.risk_level === 'high' ? '#dc3545' : 
                                         diagnosis.risk_level === 'moderate' ? '#fd7e14' : '#28a745',
                                  fontWeight: '600',
                                  marginLeft: '4px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: diagnosis.risk_level === 'high' ? '#f8d7da' : 
                                                 diagnosis.risk_level === 'moderate' ? '#fff3cd' : '#d4edda'
                                }}>
                                  {diagnosis.risk_level === 'high' ? 'High' : 
                                   diagnosis.risk_level === 'moderate' ? 'Moderate' : 'Low'}
                                </span>
                              </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: '#6c757d', fontStyle: 'italic', padding: '12px', textAlign: 'center' }}>
                        {isDetectingMentalHealth ? 'Analyzing symptoms and detecting mental health conditions...' : 'Detecting mental health conditions based on patient reason...'}
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* Show selected diagnosis with interventions when selected */}
              {selectedMentalHealthDiagnosis && (
                <div className="mb-3">
                  <div className="p-3" style={{ 
                    background: '#e0ece3', 
                    borderRadius: 6, 
                    border: '1px solid #d1e7dd',
                    marginBottom: '8px'
                  }}>
                    <div style={{ 
                        display: 'flex',
                        alignItems: 'flex-start',
                      gap: '12px'
                    }}>
                      <input 
                        type="checkbox" 
                        style={{ marginTop: '2px' }}
                        checked={true}
                        onChange={(e) => {
                          if (!e.target.checked) {
                            handleChangeMentalHealthDiagnosis();
                          }
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#222', fontWeight: '600', fontSize: 15, marginBottom: '4px' }}>
                          {selectedMentalHealthDiagnosis.code} - {selectedMentalHealthDiagnosis.name}
                        </div>
                        <div style={{ color: '#222', fontSize: 14, marginBottom: '8px' }}>
                          Confidence: <span style={{ fontWeight: '600', color: '#222' }}>{selectedMentalHealthDiagnosis.confidence}</span> | 
                          Risk Level: 
                        <span style={{ 
                            color: selectedMentalHealthDiagnosis.risk_level === 'high' ? '#dc3545' : 
                                   selectedMentalHealthDiagnosis.risk_level === 'moderate' ? '#fd7e14' : '#28a745',
                            fontWeight: '600',
                            marginLeft: '4px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: selectedMentalHealthDiagnosis.risk_level === 'high' ? '#f8d7da' : 
                                           selectedMentalHealthDiagnosis.risk_level === 'moderate' ? '#fff3cd' : '#d4edda'
                          }}>
                            {selectedMentalHealthDiagnosis.risk_level === 'high' ? 'High' : 
                             selectedMentalHealthDiagnosis.risk_level === 'moderate' ? 'Moderate' : 'Low'}
                          </span>
                        </div>
                        {/* Intervention Recommendations - Show when selected */}
                        {selectedMentalHealthDiagnosis.interventions && selectedMentalHealthDiagnosis.interventions.length > 0 && (
                          <div style={{ marginTop: '8px' }}>
                            <div style={{ fontSize: 15, fontWeight: '600', color: '#222', marginBottom: '4px' }}>
                              Intervention Recommendations:
                            </div>
                            <div style={{ 
                              fontSize: 14, 
                              color: '#222',
                              padding: '8px'
                            }}>

                              
                              {/* Filter out follow-up interventions and show them separately */}
                              {selectedMentalHealthDiagnosis.interventions
                                .filter(intervention => 
                                  !intervention.toLowerCase().includes('follow-up') && 
                                  !intervention.toLowerCase().includes('follow up') &&
                                  !intervention.toLowerCase().includes('followup')
                                )
                                .map((intervention, idx) => (
                                  <div key={idx} style={{ marginBottom: '2px', paddingLeft: '8px' }}>
                                    • {intervention}
                                  </div>
                                ))}
                              
                              {/* Show follow-up appointment checkbox for high-risk cases at the end */}
                              {selectedMentalHealthDiagnosis.risk_level === 'high' && selectedAppointment && (
                                <div style={{ 
                                  marginTop: '8px', 
                                  paddingLeft: '8px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  <input
                                    type="checkbox"
                                    checked={followUpChecked || followUpCreated}
                                    onChange={(e) => setFollowUpChecked(e.target.checked)}
                                    disabled={followUpCreated}
                                    style={{ margin: 0 }}
                                  />
                                  <span style={{ 
                                    color: '#dc3545',
                                    fontWeight: '600',
                                    fontSize: '14px'
                                  }}>
                                    Follow-up Appointment Required: {(() => {
                                      // Check multiple possible date field names
                                      const appointmentDate = selectedAppointment.date || 
                                                            selectedAppointment.appointment_date || 
                                                            selectedAppointment.scheduled_date ||
                                                            selectedAppointment.appointmentDate ||
                                                            selectedAppointment.created_date;
                                      
                                      if (appointmentDate) {
                                        return calculateFollowUpDateTime(appointmentDate, selectedAppointment.time);
                                      } else {
                                        // If no date is found, calculate from today's date
                                        const today = new Date();
                                        const followUpDate = new Date(today);
                                        followUpDate.setDate(followUpDate.getDate() + 7);
                                        
                                        const dateString = followUpDate.toLocaleDateString('en-US', { 
                                          weekday: 'long', 
                                          year: 'numeric', 
                                          month: 'long', 
                                          day: 'numeric' 
                                        });
                                        
                                        const timeString = selectedAppointment.time || '7:00 AM';
                                        return `${dateString} at ${timeString}`;
                                      }
                                    })()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Mental Health Assessment - Last Section */}
              <div className="mb-4">
                <label className="form-label fw-semibold" style={{ fontSize: 15 }}>Mental Health Assessment</label>
                <div className="text-muted mb-2" style={{ fontSize: 14 }}>Document your assessment, observations, and interventions for accurate patient record documentation.</div>
                <textarea className="form-control" rows={4} value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} placeholder="Enter documentation for this appointment..." style={{ fontSize: 15 }} />
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-cancel-light-green px-4" onClick={handleCloseModal}>Cancel</button>
                <button type="button" className="btn btn-success px-4" style={{ background: '#22c55e', color: '#fff', fontWeight: 700 }} onClick={handleSaveDocumentation}>Save Documentation</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .btn-cancel-light-green {
          background-color: #e6f0ea !important;
          color: #171717 !important;
          border: 2px solid #38813A !important;
          font-weight: 600 !important;
          transition: background 0.2s, color 0.2s, border 0.2s;
        }
        .btn-cancel-light-green:hover, .btn-cancel-light-green:focus {
          background-color: #d1e7dd !important;
          color: #222 !important;
          border: 2.5px solid #2e7d32 !important;
        }
        /* Custom checkbox styling */
        input[type="checkbox"] {
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          width: 16px;
          height: 16px;
          border: 2px solid #ccc;
          border-radius: 3px;
          background-color: white;
          cursor: pointer;
          position: relative;
          transition: all 0.2s ease;
        }
        input[type="checkbox"]:checked {
          background-color: #22c55e;
          border-color: #22c55e;
        }
        input[type="checkbox"]:checked::after {
          content: '';
          position: absolute;
          left: 4px;
          top: 1px;
          width: 4px;
          height: 8px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
      `}</style>
    </div>
  );
} 