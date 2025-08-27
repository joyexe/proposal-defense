"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import React from "react";
import { getAppointments, createAppointment, getStudents, getProviders, getProviderAvailableTimes, getUserProfile, updateAppointment, markAppointmentCompleted, markAppointmentInProgress, cancelAppointment, detectICD11Realtime, updateCounselorAppointmentDocumentation, searchICD11Codes, detectMentalHealthRealtime, saveMentalHealthDiagnosis } from '../../utils/api';

function getDaysInMonth(year, month) {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function getTypeByLabel(label) {
  if (typeof label === 'string' && label.toLowerCase().includes('consult')) return 'Consultation';
  if (typeof label === 'string' && label.toLowerCase().includes('checkup')) return 'Checkup';
  return '';
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

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

export default function CounselorAppointmentPage() {
  const [view, setView] = useState("calendar");
  const [showModal, setShowModal] = useState(false);
  const [provider, setProvider] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const modalRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showReferModal, setShowReferModal] = useState(false);
  const [referStudentName, setReferStudentName] = useState("");
  const [referTo, setReferTo] = useState("");
  const [referDate, setReferDate] = useState("");
  const [referTime, setReferTime] = useState("");
  const [referNotes, setReferNotes] = useState("");
  const [showAddNotesModal, setShowAddNotesModal] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [providers, setProviders] = useState([]);
  const [referAvailableTimes, setReferAvailableTimes] = useState([]);
  const allowedTimes = [
    '07:00', '08:00', '09:00', '10:00', '11:00',
    '13:00', '14:00', '15:00', '16:00', '17:00'
  ];
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);
  const [showDiagnosisOptions, setShowDiagnosisOptions] = useState(true);
  
  // Mental Health Detection State
  const [mentalHealthDiagnoses, setMentalHealthDiagnoses] = useState([]);
  const [selectedMentalHealthDiagnosis, setSelectedMentalHealthDiagnosis] = useState(null);
  const [isDetectingMentalHealth, setIsDetectingMentalHealth] = useState(false);
  const [showMentalHealthOptions, setShowMentalHealthOptions] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [suggestedDiagnoses, setSuggestedDiagnoses] = useState([]);
  const [isDetecting, setIsDetecting] = useState(false);

  // Follow-up Appointment States
  const [followUpChecked, setFollowUpChecked] = useState(false);
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);
  const [followUpCreated, setFollowUpCreated] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAppointments()
      .then(data => setAppointments(Array.isArray(data) ? data : []))
      .catch(err => setError(err.message || 'Failed to load appointments.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (showReferModal) {
      getStudents().then(data => {
        setStudents(data);
        setFilteredStudents(data);
      });
      getProviders().then(setProviders);
      setReferTo(""); setReferDate(""); setReferTime(""); setReferStudentName(""); setReferNotes("");
    }
  }, [showReferModal]);

  useEffect(() => {
    if (referTo) {
      getProviderAvailableTimes(referTo).then(setReferAvailableTimes);
    } else {
      setReferAvailableTimes([]);
    }
  }, [referTo]);

  useEffect(() => {
    getUserProfile().then(setUserProfile);
  }, []);

  // Auto-detect mental health conditions when Mental Health Assessment changes
  useEffect(() => {
    if (selectedAppointment && additionalNotes && additionalNotes.trim().length > 10) {
      // Debounce the detection to avoid too many API calls
      const timeoutId = setTimeout(() => {
        detectMentalHealthConditions();
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [additionalNotes, selectedAppointment]);

  useEffect(() => {
    // Listen for real-time update event
    const handler = () => {
      setLoading(true);
      getAppointments()
        .then(data => setAppointments(Array.isArray(data) ? data : []))
        .catch(err => setError(err.message || 'Failed to load appointments.'))
        .finally(() => setLoading(false));
    };
    window.addEventListener('counselor-appointment-updated', handler);
    return () => window.removeEventListener('counselor-appointment-updated', handler);
  }, []);

  const days = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
  // For calendar grid: 0=Sunday, 1=Monday, ...
  const weeks = [];
  let week = [];
  let startOffset = (firstDayOfWeek + 6) % 7; // Make Monday=0
  for (let i = 0; i < startOffset; i++) {
    week.push(null);
  }
  days.forEach((date) => {
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    week.push(date);
  });
  while (week.length < 7) week.push(null);
  weeks.push(week);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleSchedule = async (formData) => {
    try {
      await createAppointment(formData);
      const data = await getAppointments();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to schedule appointment.');
    }
  };

  // Helper to get appointments for a specific day
  function getAppointmentsForDay(dateStr) {
    if (!userProfile) return [];
    return appointments.filter((a) => a.date === dateStr).filter((a) => {
      const createdById = a.created_by && a.created_by.id ? String(a.created_by.id) : null;
      const userId = userProfile && userProfile.id ? String(userProfile.id) : null;
      const serviceType = a.service_type ? a.service_type.toLowerCase() : '';
      // Plot both Mental and Physical Health if created by CURRENT counselor
      if (userId && createdById && userId === createdById && userProfile.role === 'counselor') {
        return serviceType === 'mental' || serviceType === 'physical';
      }
      // Plot Mental Health if created by OTHER users
      if (serviceType === 'mental') {
        return userId && createdById && userId !== createdById;
      }
      return false;
    }).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }

  function handleStudentSearch(e) {
    const val = e.target.value.toLowerCase();
    setReferStudentName(val);
    setFilteredStudents(students.filter(s => s.full_name.toLowerCase().includes(val)));
  }

  function to12Hour(time) {
    let [h, m] = time.split(':');
    h = parseInt(h, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${ampm}`;
  }

  const handleSaveDocumentation = async () => {
    if (!selectedAppointment) return;
    try {
      // Save appointment documentation first
      const response = await updateCounselorAppointmentDocumentation(
        selectedAppointment.id,
        additionalNotes,
        selectedDiagnosis?.code || '',
        selectedDiagnosis?.name || ''
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
        
        // Refresh appointments and selectedAppointment
        try {
          const updatedAppointments = await getAppointments();
          setAppointments(Array.isArray(updatedAppointments) ? updatedAppointments : []);
          // Update the selected appointment with fresh data
          const updatedAppointment = updatedAppointments.find(apt => apt.id === selectedAppointment.id);
          if (updatedAppointment) {
            setSelectedAppointment(updatedAppointment);
          }
        } catch (error) {
          console.error('Error refreshing appointments:', error);
        }
        
        setShowAddNotesModal(false);
        setAdditionalNotes('');
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
      // Refresh appointments
      const updatedAppointments = await getAppointments();
      setAppointments(Array.isArray(updatedAppointments) ? updatedAppointments : []);
      // Dispatch real-time update event
      window.dispatchEvent(new Event('counselor-appointment-updated'));
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
    setShowDiagnosisOptions(true);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setSuggestedDiagnoses([]);
    setIsDetecting(false);
    
    // Reset mental health detection state
    setMentalHealthDiagnoses([]);
    setSelectedMentalHealthDiagnosis(null);
    setShowMentalHealthOptions(true);
    setIsDetectingMentalHealth(false);
  };

  const handleMentalHealthDiagnosisSelect = (diagnosis) => {
    setSelectedMentalHealthDiagnosis(diagnosis);
  };

  const handleChangeMentalHealthDiagnosis = () => {
    setSelectedMentalHealthDiagnosis(null);
    setShowDiagnosisOptions(true);
    
    // For high-risk cases, ensure mental health detection is triggered
    if (selectedAppointment?.risk_level === 'high' && additionalNotes) {
      detectMentalHealthConditions();
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
      return `${dateString} at ${appointmentTime}`;
    }
    
    return dateString;
  };

  // Helper function to format time for display
  const formatTimeForDisplay = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Function to create follow-up appointment
  const createFollowUpAppointment = async () => {
    if (!selectedAppointment || !followUpChecked) return;
    
    // Only allow follow-up appointments for mental health service type
    if (selectedAppointment.service_type !== 'mental') {
      alert('Follow-up appointments are only available for mental health service type.');
      setFollowUpChecked(false);
      return;
    }
    
    // Check if follow-up has already been created
    if (followUpCreated) {
      alert('Follow-up appointment has already been created for this case.');
      return;
    }
    
    // Extract client and provider IDs
    let clientId = selectedAppointment.client_id;
    let providerId = selectedAppointment.provider_id;
    
    // If IDs are not directly available, try to extract from nested objects
    if (!clientId && selectedAppointment.client) {
      clientId = typeof selectedAppointment.client === 'object' ? selectedAppointment.client.id : selectedAppointment.client;
    }
    
    if (!providerId && selectedAppointment.provider) {
      providerId = typeof selectedAppointment.provider === 'object' ? selectedAppointment.provider.id : selectedAppointment.provider;
    }
    
    // Validate that we have the required IDs
    if (!clientId || !providerId) {
      console.error('Missing client_id or provider_id:', { clientId, providerId, selectedAppointment });
      alert('Error: Missing client or provider information. Please try again.');
      return;
    }
    
    setIsCreatingFollowUp(true);
    try {
      // Calculate follow-up date (1 week after current appointment)
      const currentDate = new Date(selectedAppointment.date);
      const followUpDate = new Date(currentDate);
      followUpDate.setDate(followUpDate.getDate() + 7);
      
      const followUpDateString = followUpDate.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Debug: Log the appointment data
      console.log('Selected Appointment:', selectedAppointment);
      console.log('Client ID:', clientId);
      console.log('Provider ID:', providerId);
      console.log('Follow-up Date:', followUpDateString);
      console.log('Original Time:', selectedAppointment.time);
      
      // Create follow-up appointment data
      const followUpData = {
        client_id: clientId,
        provider_id: providerId,
        date: followUpDateString,
        time: selectedAppointment.time,
        reason: `Follow-up appointment for mental health assessment - ${selectedMentalHealthDiagnosis?.name || 'High-risk case'}`,
        status: 'upcoming',
        service_type: 'mental'
      };
      
      console.log('Follow-up Data:', followUpData);
      
      // Create the follow-up appointment
      const response = await createAppointment(followUpData);
      
      console.log('API Response:', response);
      
      if (response && response.id) {
        // Show success message
        alert('Follow-up appointment created successfully!');
        
        // Refresh appointments list
        const updatedAppointments = await getAppointments();
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
    console.log('Using fallback suggestions for:', studentReason);
    
    // Handle follow-up appointments by extracting the original diagnosis
    if (studentReason.toLowerCase().includes('follow-up appointment for mental health assessment')) {
      // Extract the diagnosis from the follow-up reason
      const diagnosisMatch = studentReason.match(/- (.+)$/);
      const originalDiagnosis = diagnosisMatch ? diagnosisMatch[1].toLowerCase() : '';
      console.log('Extracted original diagnosis from follow-up:', originalDiagnosis);
      
      if (originalDiagnosis.includes('suicidal') || originalDiagnosis.includes('suicide')) {
        console.log('Setting suicidal ideation diagnoses for follow-up');
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
          },
          { 
            code: '6A70.2', 
            name: 'Severe depressive episode', 
            confidence: '72%', 
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
        return;
      }
      
      // Add more follow-up diagnosis patterns
      if (originalDiagnosis.includes('depression') || originalDiagnosis.includes('depressed')) {
        console.log('Setting depression diagnoses for follow-up');
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
        return;
      }
      
      if (originalDiagnosis.includes('anxiety') || originalDiagnosis.includes('anxious')) {
        console.log('Setting anxiety diagnoses for follow-up');
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
        return;
      }
    }
    
    // Handle regular appointments (non-follow-up)
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
          code: '6A72', 
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
          code: '6A73', 
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

  // Function to open Add Documentation modal with existing data if available
  const handleOpenAddDocumentation = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAddNotesModal(true);
    
    // Reset follow-up states
    setFollowUpChecked(false);
    setFollowUpCreated(false);
    setIsCreatingFollowUp(false);
    
    // Check if a follow-up appointment already exists for this appointment
    if (appointment.service_type === 'mental' && appointment.risk_level === 'high') {
      // Calculate the expected follow-up date (1 week after this appointment)
      const currentDate = new Date(appointment.date);
      const expectedFollowUpDate = new Date(currentDate);
      expectedFollowUpDate.setDate(expectedFollowUpDate.getDate() + 7);
      const expectedFollowUpDateString = expectedFollowUpDate.toISOString().split('T')[0];
      
      // Check if there's an appointment with the same client, provider, date, and time that mentions follow-up
      const followUpExists = appointments.some(apt => 
        apt.client_id === appointment.client_id &&
        apt.provider_id === appointment.provider_id &&
        apt.date === expectedFollowUpDateString &&
        apt.time === appointment.time &&
        apt.reason && apt.reason.toLowerCase().includes('follow-up')
      );
      
      if (followUpExists) {
        setFollowUpCreated(true);
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

  return (
    <div className="col-12 p-0">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <span className="fw-bold text-black" style={{ fontSize: 22 }}>Appointments</span>
          <div className="text-muted" style={{ fontSize: 14 }}>Schedule and manage your appointments</div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-success px-4 py-2 fw-semibold" style={{ borderRadius: 8, background: '#14b8a6', color: '#fff', border: 'none' }} onClick={() => setShowReferModal(true)}>Refer a student</button>
        </div>
      </div>
      {/* Modal */}
      {showModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 700, minWidth: 700, width: "100%" }}>
            <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#e6f0ea" }} ref={modalRef}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Schedule a New Appointment</h5>
              </div>
              <div className="mb-3" style={{ fontSize: 15, color: "#222" }}>Select your provider, date, and time.</div>
              <form onSubmit={e => { e.preventDefault(); setShowModal(false); }}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Provider</label>
                  <div style={{ position: 'relative', width: '100%' }}>
                    <select className="form-select" value={provider} onChange={e => setProvider(e.target.value)} required style={{ paddingRight: 32, appearance: 'none', borderRadius: 8 }}>
                      <option value="">Select a provider</option>
                      <option value="Counselor">Counselor</option>
                      <option value="Clinic">Clinic</option>
                    </select>
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: 16, color: '#888' }}>
                      <i className="bi bi-chevron-down"></i>
                    </span>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Date</label>
                  <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Time</label>
                  <select className="form-select" value={time} onChange={e => setTime(e.target.value)} required>
                    <option value="">Select a time slot</option>
                    <option value="09:00">9:00 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="13:00">1:00 PM</option>
                    <option value="14:00">2:00 PM</option>
                    <option value="15:00">3:00 PM</option>
                    <option value="16:00">4:00 PM</option>
                    <option value="17:00">5:00 PM</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold">Notes</label>
                  <input type="text" className="form-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes for the provider" />
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-cancel-light-green px-4" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success px-4">Schedule</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {showReferModal && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.18)", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 1050, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 540, width: "100%" }}>
            <div className="modal-content modal-light-green-background p-4" style={{ borderRadius: 16, boxShadow: "0 4px 32px rgba(0,0,0,0.10)", background: "#e6f0ea" }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">Refer Student</h5>
              </div>
              <div className="mb-3" style={{ fontSize: 15, color: "#222" }}>Refer a student to nurse or counselor</div>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <form onSubmit={async e => {
                e.preventDefault();
                setError(null);
                try {
                  // Find selected student and provider objects
                  const studentObj = students.find(s => s.full_name === referStudentName);
                  const providerObj = providers.find(p => String(p.id) === String(referTo));
                  if (!studentObj || !providerObj) throw new Error('Please select a valid student and provider.');
                  let serviceType = '';
                  if (providerObj.role === 'clinic') serviceType = 'physical';
                  else if (providerObj.role === 'counselor') serviceType = 'mental';
                  // Always send date as YYYY-MM-DD string (no Date object)
                  const safeDate = referDate;
                  const newAppt = await createAppointment({
                    provider_id: providerObj.id,
                    client_id: studentObj.id,
                    date: safeDate, // always YYYY-MM-DD
                    time: referTime,
                    reason: referNotes,
                    service_type: serviceType,
                    referral: 'Direct'
                  });
                  const updatedAppointments = await getAppointments();
                  setAppointments(Array.isArray(updatedAppointments) ? updatedAppointments : []);
                  setShowReferModal(false);
                  // Real-time update: dispatch event
                  window.dispatchEvent(new Event('counselor-appointment-updated'));
                } catch (err) {
                  setError(err.message || 'Failed to send referral.');
                }
              }}>
                <div className="mb-3" style={{ position: 'relative' }}>
                  <label className="form-label fw-semibold">Student Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={referStudentName}
                    onChange={handleStudentSearch}
                    onFocus={() => setStudentDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setStudentDropdownOpen(false), 150)}
                    placeholder="Search student name..."
                    autoComplete="off"
                    required
                  />
                  {studentDropdownOpen && referStudentName.length > 0 && filteredStudents.length > 0 && (
                    <ul className="list-group position-absolute w-100" style={{ zIndex: 10, maxHeight: 180, overflowY: 'auto', top: '100%', background: '#e6f0ea', border: '1px solid #ced4da' }}>
                      {filteredStudents.map(s => (
                        <li
                          key={s.id}
                          className="list-group-item list-group-item-action"
                          style={{ cursor: 'pointer', background: '#e6f0ea', border: 'none' }}
                          onMouseDown={() => { setReferStudentName(s.full_name); setStudentDropdownOpen(false); }}
                        >
                          {s.full_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Refer to</label>
                  <select className="form-select" value={referTo} onChange={e => setReferTo(e.target.value)} required>
                    <option value="">Select provider to refer to</option>
                    {providers.map(p => (
                      <option key={p.id} value={p.id}>{p.role === 'clinic' ? `Nurse ${p.full_name}` : p.role === 'counselor' ? `Counselor ${p.full_name}` : p.full_name}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Date</label>
                  <input type="date" className="form-control" value={referDate} onChange={e => setReferDate(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Time</label>
                  <select className="form-select" value={referTime} onChange={e => setReferTime(e.target.value)} required>
                    <option value="">Select a time slot</option>
                    {referAvailableTimes.filter(t => allowedTimes.includes(t.split(':').slice(0,2).join(':'))).map(t => (
                      <option key={t} value={t}>{to12Hour(t.split(':').slice(0,2).join(':'))}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label className="form-label fw-semibold">Reason</label>
                  <input type="text" className="form-control" value={referNotes} onChange={e => setReferNotes(e.target.value)} placeholder="Reason for referral" />
                </div>
                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-cancel-light-green px-4" onClick={() => setShowReferModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-success px-4">Send Referral</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <div className="d-flex align-items-center mb-4">
        <ul className="nav nav-pills w-100">
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border ${pathname === '/counselor/appointment' ? 'bg-success text-white' : 'bg-light text-dark'}`}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '8px 0 0 8px' }}
              onClick={() => router.push('/counselor/appointment')}
            >
              Calendar
            </button>
          </li>
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border ${pathname === '/counselor/appointment/availability' ? 'bg-success text-white' : 'bg-light text-dark'}`}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0' }}
              onClick={() => router.push('/counselor/appointment/availability')}
            >
              Manage Availability
            </button>
          </li>
          <li className="nav-item flex-fill">
            <button
              className={`nav-link w-100 border ${pathname === '/counselor/appointment/schedule-lists' ? 'bg-success text-white' : 'bg-light text-dark'}`}
              style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0 8px 8px 0' }}
              onClick={() => router.push('/counselor/appointment/schedule-lists')}
            >
              List of Schedules
            </button>
          </li>
        </ul>
      </div>
      {view === 'calendar' && (
        <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto', padding: 0 }}>
          <div className="bg-white p-4 shadow-sm" style={{ width: '100%', maxWidth: '100%', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 2px 8px 0 rgba(16,30,54,.06)', paddingLeft: 0, paddingRight: 0 }}>
            <div className="d-flex justify-content-between align-items-center mb-2" style={{ paddingLeft: 32, paddingRight: 32 }}>
              <button className="btn calendar-nav-btn-green" onClick={handlePrevMonth}>
                <span style={{ fontSize: 20, fontWeight: 600, color: '#fff', lineHeight: 1 }}>&lt;</span>
              </button>
              <h4 className="fw-semibold mb-0">{monthNames[currentMonth]} {currentYear}</h4>
              <button className="btn calendar-nav-btn-green" onClick={handleNextMonth}>
                <span style={{ fontSize: 20, fontWeight: 600, color: '#fff', lineHeight: 1 }}>&gt;</span>
              </button>
            </div>
            <div className="table-responsive" style={{ overflowX: 'auto', paddingLeft: 32, paddingRight: 32 }}>
              <table className="table table-bordered mb-0" style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr className="text-center text-secondary">
                    <th style={{ width: '14.28%' }}>MON</th>
                    <th style={{ width: '14.28%' }}>TUE</th>
                    <th style={{ width: '14.28%' }}>WED</th>
                    <th style={{ width: '14.28%' }}>THU</th>
                    <th style={{ width: '14.28%' }}>FRI</th>
                    <th style={{ width: '14.28%' }}>SAT</th>
                    <th style={{ width: '14.28%' }}>SUN</th>
                  </tr>
                </thead>
                <tbody>
                  {weeks.map((week, i) => (
                    <tr key={i}>
                      {week.map((date, j) => {
                        return (
                        <td key={j} className="align-top" style={{ height: 90, verticalAlign: 'top', background: date && date.getMonth() === currentMonth ? '#fff' : '#f3f4f6' }}>
                          {date && (
                            <>
                              <div className={`fw-semibold ${date.getMonth() === currentMonth ? '' : 'text-muted'}`}>{date.getDate()}</div>
                                {getAppointmentsForDay(date.toLocaleDateString('en-CA')).map((appt, idx) => {
                                  let bgColor = '#bbf7d0'; // default green for Physical Health
                                  let textColor = '#222';
                                  if (appt.service_type && appt.service_type.toLowerCase() === 'mental') {
                                    bgColor = '#5eead4'; // teal for Mental Health
                                    textColor = '#134e4a';
                                  }
                                  // Display text logic
                                  let displayText = '';
                                  if (appt.service_type && appt.service_type.toLowerCase() === 'physical') {
                                    // For Physical Health: '4:00 PM | For Student Joy Testing'
                                    const student = appt.client || {};
                                    displayText = `${to12Hour(appt.time)} | For Student ${student.full_name || ''}`;
                                  } else {
                                    // Default/mental: '4:00 PM | With [Role] [Name]'
                                    const client = appt.client || {};
                                    let clientRole = '';
                                    if (client.role) {
                                      if (client.role.toLowerCase() === 'clinic') clientRole = 'Nurse';
                                      else if (client.role.toLowerCase() === 'faculty') clientRole = 'Teacher';
                                      else clientRole = client.role.charAt(0).toUpperCase() + client.role.slice(1);
                                    }
                                    const clientName = client.full_name || 'Unknown';
                                    displayText = `${to12Hour(appt.time)} | With ${clientRole ? clientRole + ' ' : ''}${clientName}`;
                                  }
                                return (
                                  <div
                                    key={idx}
                                    className="mt-1 px-2 py-1"
                                      style={{ background: bgColor, color: textColor, borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', boxShadow: 'none' }}
                                      onClick={() => setSelectedAppointment({ ...appt, type: appt.service_type === 'mental' ? 'Mental Health' : 'Physical Health' })}
                                  >
                                      <span style={{ color: textColor, fontSize: 14, fontWeight: 500 }}>{displayText}</span>
                                      {getStatusBadge(appt.status)}
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {view === 'availability' && (
        <div className="bg-white p-5 rounded shadow-sm text-center" style={{ minHeight: 300 }}>
          <h4 className="fw-bold mb-3">Manage Availability</h4>
          <div className="text-muted">(Placeholder: Set your available times for appointments here.)</div>
        </div>
      )}
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
                    {selectedAppointment.client && typeof selectedAppointment.client === 'object'
                      ? (selectedAppointment.client.full_name
                          ? `${selectedAppointment.client.role ? (selectedAppointment.client.role.toLowerCase() === 'clinic' ? 'Nurse ' : selectedAppointment.client.role.toLowerCase() === 'faculty' ? 'Teacher ' : selectedAppointment.client.role.charAt(0).toUpperCase() + selectedAppointment.client.role.slice(1) + ' ') : ''}${selectedAppointment.client.full_name}`
                          : 'Unknown')
                      : (typeof selectedAppointment.client === 'string' ? selectedAppointment.client : 'Unknown')}
                  </div>
                </div>
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Type</div>
                  <div style={{ fontSize: 14 }}>
                    {(() => {
                      const type = selectedAppointment.service_type || selectedAppointment.type;
                      if (!type) return <span>-</span>;
                      if (type.toLowerCase() === 'mental' || type === 'Mental Health') return <span style={{ background: '#99f6e4', color: '#222', borderRadius: 12, padding: '2px 12px', fontSize: 14, fontWeight: 500 }}>Mental Health</span>;
                      if (type.toLowerCase() === 'physical' || type === 'Physical Health') return <span style={{ background: '#bbf7d0', color: '#222', borderRadius: 12, padding: '2px 12px', fontSize: 14, fontWeight: 500 }}>Physical Health</span>;
                      return <span>{type}</span>;
                    })()}
                  </div>
                </div>
              </div>
              <div className="row mb-2">
                <div className="col-6">
                  <div className="fw-semibold mb-1" style={{ fontSize: 15 }}>Date & Time</div>
                  <div style={{ fontSize: 14 }}><i className="bi bi-calendar-event me-2"></i>{selectedAppointment.date ? new Date(selectedAppointment.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</div>
                  <div style={{ fontSize: 14 }}><i className="bi bi-clock me-2"></i>{selectedAppointment.time ? to12Hour(selectedAppointment.time) : '-'}</div>
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
                    {selectedAppointment.client && selectedAppointment.client.email ? selectedAppointment.client.email : 'No email available'}
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
                              {/* Debug: Log interventions */}
                              {(() => {
                                console.log('All interventions:', selectedMentalHealthDiagnosis.interventions);
                                return null;
                              })()}
                              
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
                              {selectedMentalHealthDiagnosis.risk_level === 'high' && selectedAppointment && selectedAppointment.date && (
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
                                    Follow-up Appointment Required: {calculateFollowUpDateTime(selectedAppointment.date, formatTimeForDisplay(selectedAppointment.time))}
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
        .calendar-nav-btn-green {
          border-radius: 8px;
          border-width: 2px;
          background: #198754 !important;
          border: 2px solid #198754 !important;
          transition: background 0.2s, box-shadow 0.2s;
          box-shadow: 0 1px 4px 0 rgba(16,30,54,.08);
          padding: 0.25rem 1.1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .calendar-nav-btn-green:hover, .calendar-nav-btn-green:focus {
          background: #157347 !important;
          border-color: #157347 !important;
          box-shadow: 0 2px 8px 0 rgba(16,30,54,.12);
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



