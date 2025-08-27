"use client";
import { useEffect, useState } from "react";
import { getMoodData, checkMoodSubmission, submitMood, getWellnessProfile, getDailyTasks, getAchievements, getWeekMoods, getLatestMoodRecommendation } from "../../utils/api";
import Image from 'next/image';
import { useRouter } from "next/navigation";

const moodOptions = [
  { label: 'Happy', img: '/img/happy.png' },
  { label: 'Good', img: '/img/good.png' },
  { label: 'Neutral', img: '/img/neutral.png' },
  { label: 'Sad', img: '/img/sad.png' },
  { label: 'Angry', img: '/img/angry.png' },
];

function getMoodIcon(label, size = 32) {
  if (!label) return null;
  const found = moodOptions.find((m) => m.label.toLowerCase() === label.toLowerCase());
  return found ? (
    <Image src={found.img} alt={label} width={size} height={size} style={{ objectFit: 'contain', width: 'auto', height: 'auto' }} />
  ) : null;
}

// Helper to capitalize first letter
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export default function AmietiDashboardPage() {
  const router = useRouter();
  // Mood history state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  // Daily mood check-in state
  const [selectedMood, setSelectedMood] = useState(null);
  const [moodNote, setMoodNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [moodLoading, setMoodLoading] = useState(true);
  const [todayMood, setTodayMood] = useState(null);
  const [todayNote, setTodayNote] = useState("");
  const [profile, setProfile] = useState(null);
  const [dailyTasks, setDailyTasks] = useState([]);
  const [moodDates, setMoodDates] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [weekMoods, setWeekMoods] = useState([]);
  const [latestRecommendation, setLatestRecommendation] = useState("");
  // Add state for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  // Helper function for pagination (same as admin logs)
  function getPagedData(data, page, perPage) {
    const start = (page - 1) * perPage;
    return data.slice(start, start + perPage);
  }

  // Helper to get start and end of week (Monday to Sunday)
  function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0,0,0,0);
    return d;
  }
  function getEndOfWeek(date) {
    const start = getStartOfWeek(date);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end;
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getWellnessProfile(),
      getDailyTasks(),
      getAchievements(),
    ]).then(([profileData, dailyTasksData, achievementsData]) => {
      setProfile(profileData);
      setDailyTasks(dailyTasksData);
      setAchievements(achievementsData);
    }).finally(() => setLoading(false));
    
    // Check if user is authenticated before making API calls
    const token = localStorage.getItem('token');
    if (!token) {
      
      return;
    }
    
    setLoadingHistory(true);
    getMoodData()
      .then((data) => {
        setHistory(Array.isArray(data.data) ? data.data : []);
        // Extract and sort dates
        const dates = (Array.isArray(data.data) ? data.data : []).map(entry => entry.date).sort();
        setMoodDates(dates);
      })
      .finally(() => setLoadingHistory(false));
    setMoodLoading(true);
    checkMoodSubmission()
      .then((data) => {
        if (typeof data === 'object' && data !== null && ('mood' in data || 'note' in data)) {
          let moodValue = data.mood;
          let noteValue = data.note;
          if (typeof moodValue === 'string' && moodValue.startsWith("{'mood': ")) {
            try {
              const jsonStr = moodValue.replace(/'/g, '"');
              const parsed = JSON.parse(jsonStr);
              moodValue = parsed.mood;
              noteValue = parsed.note;
            } catch (e) {}
          }
          setTodayMood(typeof moodValue === 'string' ? moodValue : '');
          setTodayNote(typeof noteValue === 'string' ? noteValue : '');
        } else if (typeof data === 'string') {
          setTodayMood(data);
          setTodayNote('');
        } else {
          setTodayMood('');
          setTodayNote('');
        }
      })
      .finally(() => setMoodLoading(false));

    // Fetch week moods for This Week's Pattern
    const today = new Date();
    const start = getStartOfWeek(today);
    const end = getEndOfWeek(today);
    const startStr = toLocalISODate(start);
    const endStr = toLocalISODate(end);
    getWeekMoods({ start: startStr, end: endStr })
      .then((data) => {
        setWeekMoods(Array.isArray(data.week) ? data.week : []);
      });
    // Add debug logs for recommendation fetch
    getLatestMoodRecommendation().then((data) => {
      setLatestRecommendation(data.recommendation || "");
    });
  }, []);

  // Listen for real-time mood updates from chatbot and other components
  useEffect(() => {
    const handleMoodUpdate = async (event) => {
      const { mood, note, date, type } = event.detail;
      
      // Update today's mood and note
      setTodayMood(mood);
      setTodayNote(note);
      
      // Add new mood to history state for real-time update
      const todayStr = new Date().toISOString().slice(0, 10);
      setHistory(prev => [
        { mood: mood, note: note, date: todayStr },
        ...prev.filter(entry => entry.date !== todayStr)
      ]);
      
      // Update moodDates for day streak calculation
      setMoodDates(prev => {
        const newDates = [...prev];
        if (!newDates.includes(todayStr)) {
          newDates.push(todayStr);
          newDates.sort();
        }
        return newDates;
      });
      
      // Check if user is authenticated before making API calls
      const token = localStorage.getItem('token');
      if (!token) {

        return;
      }
      
      // Update weekMoods for real-time This Week's Pattern
      const today = new Date();
      const start = getStartOfWeek(today);
      const end = getEndOfWeek(today);
      const startStr = toLocalISODate(start);
      const endStr = toLocalISODate(end);
      
      // Add the new mood to weekMoods state immediately
      setWeekMoods(prev => {
        const todayStr = toLocalISODate(today);
        const existingIndex = prev.findIndex(entry => entry.date === todayStr);
        
        if (existingIndex >= 0) {
          // Update existing entry
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], mood: mood };
          return updated;
        } else {
          // Add new entry
          return [...prev, { date: todayStr, mood: mood }];
        }
      });
      
      // Update recommendation if survey was completed
      if (type === 'survey-completed' && event.detail.recommendation) {
        setLatestRecommendation(event.detail.recommendation);
      } else {
        // Fetch fresh recommendation
        try {
          const rec = await getLatestMoodRecommendation();
          setLatestRecommendation(rec.recommendation || "");
        } catch (error) {
          console.error('Error fetching recommendation:', error);
        }
      }
      
      // Also fetch fresh data from server to ensure consistency
      try {
        const weekData = await getWeekMoods({ start: startStr, end: endStr });
        setWeekMoods(Array.isArray(weekData.week) ? weekData.week : []);
      } catch (error) {
        console.error('Error fetching updated week moods:', error);
      }
    };

    window.addEventListener('mood-updated', handleMoodUpdate);
    return () => window.removeEventListener('mood-updated', handleMoodUpdate);
  }, []);

  const handleMoodSubmit = async () => {
    if (selectedMood === null) return;
    setLoading(true);
    const moodLabel = moodOptions[selectedMood].label.toLowerCase(); // ensure lowercase
    try {
      await submitMood({ mood: moodLabel, note: moodNote });
      setTodayMood(moodLabel);
      setTodayNote(moodNote);
      
      // Add new mood to history state for real-time update
      const todayStr = new Date().toISOString().slice(0, 10);
      setHistory(prev => [
        { mood: moodLabel, note: moodNote, date: todayStr },
        ...prev.filter(entry => entry.date !== todayStr)
      ]);
      
      // Update moodDates for day streak calculation
      setMoodDates(prev => {
        const newDates = [...prev];
        if (!newDates.includes(todayStr)) {
          newDates.push(todayStr);
          newDates.sort();
        }
        return newDates;
      });
      
      // Update weekMoods for real-time This Week's Pattern
      const today = new Date();
      const start = getStartOfWeek(today);
      const end = getEndOfWeek(today);
      const startStr = toLocalISODate(start);
      const endStr = toLocalISODate(end);
      
      // Add the new mood to weekMoods state immediately
      setWeekMoods(prev => {
        const todayStr = toLocalISODate(today);
        const existingIndex = prev.findIndex(entry => entry.date === todayStr);
        
        if (existingIndex >= 0) {
          // Update existing entry
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], mood: moodLabel };
          return updated;
        } else {
          // Add new entry
          return [...prev, { date: todayStr, mood: moodLabel }];
        }
      });
      
      // Also fetch fresh data from server to ensure consistency
      try {
        const weekData = await getWeekMoods({ start: startStr, end: endStr });
        setWeekMoods(Array.isArray(weekData.week) ? weekData.week : []);
      } catch (error) {
        console.error('Error fetching updated week moods:', error);
      }
      
      // Refresh recommendation after mood submit
      try {
        const rec = await getLatestMoodRecommendation();
        setLatestRecommendation(rec.recommendation || "");
      } catch (error) {
        console.error('Error fetching recommendation:', error);
      }
      
      // Dispatch real-time update event
      const moodUpdateEvent = new CustomEvent('mood-updated', {
        detail: {
          mood: moodLabel,
          note: moodNote,
          date: new Date().toISOString().slice(0, 10),
          type: 'mood-submitted'
        }
      });
      window.dispatchEvent(moodUpdateEvent);
      
      // Reset form
      setSelectedMood(null);
      setMoodNote("");
      
    } catch (err) {
      alert("Failed to submit mood. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });
  }

  // Dashboard stats (static for now, can be dynamic)
  const stats = [
    { label: 'Day Streak', value: 4, sub: 'This week', icon: '🔥', days: ['M','T','W','T','F','S','S'] },
    { label: 'Current Level', value: 1, sub: '0/100 XP to next level', icon: '', days: [] },
    { label: 'Tasks Completed', value: 1, sub: 'Keep it Up!', icon: '', days: [] },
    { label: 'Mood Tracked', value: '', sub: 'Track Today', icon: '😊', days: [] },
  ];

  // --- Day Streak Calculation ---
  function calculateDayStreak(dates) {
    if (!dates || dates.length === 0) return 0;
    // Convert to Date objects and sort ascending
    const dateSet = new Set(dates);
    let streak = 1;
    let today = new Date();
    let todayStr = today.toISOString().slice(0, 10);
    if (!dateSet.has(todayStr)) return 0;
    // Go backwards from today
    for (let i = 1; i < 7; i++) {
      let prev = new Date(today);
      prev.setDate(today.getDate() - i);
      let prevStr = prev.toISOString().slice(0, 10);
      if (dateSet.has(prevStr)) {
        streak++;
        if (streak > 7) {
          streak = 1;
          break;
        }
      } else {
        break;
      }
    }
    return streak;
  }
  const dayStreak = calculateDayStreak(moodDates);

  // Helper to get start of week (Monday, 0:00 local time)
  function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0 (Sun) - 6 (Sat)
    // Calculate how many days to subtract to get to Monday
    const diff = (day === 0 ? -6 : 1) - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0,0,0,0);
    return d;
  }

  // Get moods for this week (Mon-Sun)
  function getThisWeekMoods(history) {
    const today = new Date();
    const startOfWeek = getStartOfWeek(today);
    // Build a map: YYYY-MM-DD -> mood
    const moodMap = {};
    history.forEach(entry => {
      let mood = entry.mood;
      if (typeof mood === 'string' && mood.startsWith("{'mood': ")) {
        try {
          const jsonStr = mood.replace(/'/g, '"');
          const parsed = JSON.parse(jsonStr);
          mood = parsed.mood;
        } catch (e) {}
      }
      moodMap[entry.date] = mood;
    });
    // For each day of this week, get the mood (always 7 days)
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      weekDays.push({
        date: dateStr,
        mood: moodMap[dateStr] || null
      });
    }
    return weekDays;
  }
  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  // Helper to get ISO date string (YYYY-MM-DD) in local time
  function toLocalISODate(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Build the 7 days for this week (Monday to Sunday) in LOCAL time
  const today = new Date();
  const startOfWeek = getStartOfWeek(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    // Use local date (YYYY-MM-DD)
    return d;
  });

  // Map moods to each day by date - use weekMoods state for real-time updates
  const weekMoodMap = {};
  weekMoods.forEach(entry => {
    weekMoodMap[entry.date] = entry;
  });

  const handlePageChange = (page) => {
    const totalPages = Math.ceil(history.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="w-100" style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <div className="mb-3">
        <h5 className="fw-bold mb-1" style={{ letterSpacing: 1 }}>Meet AMIETI</h5>
        <div className="text-muted mb-3" style={{ fontSize: 15 }}>
          Chat with AMIETI, track your mood, and manage your wellness journey
        </div>
        <div className="d-flex align-items-center mb-4">
          <ul className="nav nav-pills w-100">
            <li className="nav-item flex-fill">
              <button
                className="nav-link w-100 border bg-success text-white"
                style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '8px 0 0 8px' }}
              >
                Mood Tracker
              </button>
            </li>
            <li className="nav-item flex-fill">
              <button
                className="nav-link w-100 border bg-light text-dark"
                onClick={() => router.push("/student/amieti/wellness-journey")}
                style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '0 8px 8px 0' }}
              >
                Wellness Journey
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div className="row g-3 mb-4" style={{ width: "100%" }}>
        <div className="col-md-3 d-flex align-items-stretch">
          <div className="bg-white rounded-4 shadow-sm p-3 w-100 h-100 d-flex flex-column align-items-center justify-content-center text-center position-relative">
            <div className="d-flex align-items-center justify-content-center mb-1" style={{ gap: 8 }}>
              <span className="fw-bold" style={{ fontSize: '1.25rem', color: '#222', fontWeight: 700 }}>{dayStreak}</span>
            </div>
            <div className="fw-bold mb-1" style={{ color: '#ff9800', fontSize: '1.25rem', fontWeight: 700 }}>Day Streak</div>
            <div className="d-flex align-items-center justify-content-center mb-2" style={{ gap: 6 }}>
              <span style={{ fontSize: 13, color: '#222' }}>📅</span>
              <span style={{ fontSize: 13, color: '#222' }}>This week</span>
            </div>
            <span className="position-absolute" style={{ top: 12, right: 18 }}>
              <span style={{ background: '#ffe0b2', color: '#ff9800', fontWeight: 600, fontSize: 13, borderRadius: 8, padding: '2px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 15, marginRight: 3 }}>🏆</span> Best: {Math.min(profile?.best_streak ?? 0, 7)}
              </span>
            </span>
          </div>
        </div>
        <div className="col-md-3 d-flex align-items-stretch">
          <div className="bg-white rounded-4 shadow-sm p-3 w-100 h-100 d-flex flex-column align-items-center justify-content-center text-center">
            <div className="fw-bold mb-1" style={{ fontSize: '1.25rem', color: '#222', fontWeight: 700 }}>{profile?.level ?? 1}</div>
            <div className="fw-bold mb-1" style={{ fontSize: '1.25rem', color: '#222', fontWeight: 700 }}>Current Level</div>
            <div className="mb-2" style={{ fontSize: 13 }}>
              {profile?.level === 2 ? '2000 XP to next level' : '1000 XP to next level'}
            </div>
          </div>
        </div>
        <div className="col-md-3 d-flex align-items-stretch">
          <div className="bg-white rounded-4 shadow-sm p-3 w-100 h-100 d-flex flex-column align-items-center justify-content-center text-center">
            <div className="fw-bold mb-1" style={{ fontSize: '1.25rem', color: '#222', fontWeight: 700 }}>{achievements.length}</div>
            <div className="fw-bold mb-1" style={{ fontSize: '1.25rem', color: '#222', fontWeight: 700 }}>Tasks Completed</div>
            <div className="mb-2" style={{ fontSize: 13 }}>Keep it Up!</div>
          </div>
        </div>
        <div className="col-md-3 d-flex align-items-stretch">
          <div className="bg-white rounded-4 shadow-sm p-3 w-100 h-100 d-flex flex-column align-items-center justify-content-center text-center">
            {!moodLoading && (
              <div className="fw-bold mb-1" style={{ fontSize: '1.25rem', color: '#222', fontWeight: 700 }}>
                {todayMood ? getMoodIcon(todayMood, 40) : getMoodIcon('Happy', 40)}
              </div>
            )}
            <div className="fw-bold mb-1" style={{ fontSize: '1.25rem', color: '#222', fontWeight: 700 }}>Mood Tracked</div>
            <div className="mb-2" style={{ fontSize: 13 }}>Track Today</div>
          </div>
        </div>
      </div>
      <div className="row g-4" style={{ width: "100%" }}>
        <div className="col-lg-5">
          {/* --- Daily Mood Check-in (copied from dashboard) --- */}
          <div className="card shadow-sm" style={{ borderRadius: 16 }}>
            <div className="card-body">
              <div className="fw-bold fs-5 mb-2">Daily Mood Check-in</div>
              <div className="mb-1" style={{ fontSize: 13, color: "#6c757d" }}>How are you feeling today?</div>
              {moodLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : todayMood ? (
                <>
                  <div className="d-flex align-items-center gap-3 mb-2 mt-3">
                    <div className="d-flex flex-column align-items-center">
                      <div style={{
                        background: '#e6f7f0',
                        borderRadius: 16,
                        border: '1.5px solid #b2e5d6',
                        padding: 16,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 70,
                      }}>
                        {getMoodIcon(todayMood, 40)}
                        <div className="fw-semibold" style={{ color: '#20bfa9', fontSize: 16, marginTop: 8, marginBottom: 0 }}>{typeof todayMood === 'string' ? capitalize(todayMood) : ''}</div>
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-2">
                      <div className="fw-bold fs-5 mb-1">Today's Mood</div>
                      {todayNote && todayNote.trim() !== "" && (
                        <div className="text-muted mt-2" style={{ fontSize: 15 }}>{todayNote}</div>
                      )}
                    </div>
                  </div>
                  <div className="bg-light border rounded p-2 mb-4 mt-3" style={{ fontSize: 14 }}>
                    <span className="fw-semibold">Coming Up</span><br />
                    Your wellness check-in is due tomorrow
                  </div>
                </>
              ) : (
                <>
                  <div className="d-flex gap-3 mb-3 justify-content-center">
                    {moodOptions.map((mood, idx) => (
                      <div
                        key={mood.label}
                        onClick={() => setSelectedMood(idx)}
                        style={{
                          cursor: 'pointer',
                          background: selectedMood === idx ? '#c6efe2' : '#e6f7f0',
                          borderRadius: 16,
                          padding: 16,
                          minWidth: 70,
                          minHeight: 70,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: selectedMood === idx ? '0 2px 12px rgba(32,191,169,0.10)' : '0 1px 4px rgba(0,0,0,0.04)',
                          border: selectedMood === idx ? '2px solid #20bfa9' : '1.5px solid #b2e5d6',
                          transition: 'all 0.2s',
                          outline: selectedMood === idx ? '2px solid #20bfa9' : 'none',
                          margin: 4,
                        }}
                        tabIndex={0}
                        role="button"
                        aria-pressed={selectedMood === idx}
                      >
                        <Image src={mood.img} alt={mood.label} width={40} height={40} style={{ marginBottom: 8, width: 'auto', height: 'auto' }} />
                        <span style={{ fontSize: 16, color: '#20bfa9', fontWeight: 500 }}>{mood.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mb-3">
                    <label htmlFor="moodNote" className="form-label">Mood Note (optional)</label>
                    <textarea
                      className="form-control"
                      id="moodNote"
                      name="moodNote"
                      placeholder="Add a note about how you're feeling (optional)"
                      value={moodNote || ""}
                      onChange={e => setMoodNote(e.target.value)}
                      style={{ borderRadius: 10, background: "#f6fef9" }}
                      rows={2}
                      disabled={loading}
                      autoComplete="off"
                      aria-label="Mood note"
                    />
                  </div>
                  <button
                    className="btn btn-success w-100"
                    style={{ borderRadius: 10 }}
                    onClick={handleMoodSubmit}
                    disabled={selectedMood === null || loading}
                    type="button"
                  >
                    {loading ? "Submitting..." : "Submit Mood"}
                  </button>
                </>
              )}
            </div>
          </div>
          {/* Mood Insights Card - moved here below Daily Mood Check-in */}
          <div className="mt-4" style={{ width: '100%' }}>
            <div className="bg-white rounded-4 shadow-sm p-4 w-100" style={{ minHeight: 220 }}>
              <div className="fw-bold fs-5 mb-1" style={{ color: '#222' }}>Mood Insights</div>
              <div className="text-muted mb-3" style={{ fontSize: 14 }}>Review your past mood check-ins</div>
              {/* This Week's Pattern */}
              <div className="mb-3 p-3" style={{ background: '#e6f7f0', borderRadius: 16, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', border: 'none' }}>
                <div className="fw-semibold mb-2" style={{ color: '#38813A', fontSize: 15 }}>This Week's Pattern</div>
                <div className="d-flex align-items-center justify-content-center gap-3" style={{ width: '100%' }}>
                  {/* Days and moods */}
                  {weekDays.map((d, idx) => {
                    const dateStr = toLocalISODate(d);
                    const entry = weekMoodMap[dateStr] || { mood: null };
                    return (
                      <div key={dateStr} className="d-flex flex-column align-items-center" style={{ minWidth: 36 }}>
                        <div style={{
                          background: '#e6f7f0',
                          borderRadius: '50%',
                          border: '1.5px solid #b2e5d6',
                          padding: 8,
                          width: 48,
                          height: 48,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 24
                        }}>
                          {entry.mood ? getMoodIcon(entry.mood, 28) : (
                            <span style={{
                              display: 'inline-block',
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: '#e0e0e0',
                              color: '#bdbdbd',
                              fontSize: 28,
                              lineHeight: '28px',
                              textAlign: 'center',
                            }}> </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{dayLabels[idx]}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Recommendations */}
              <div className="mt-2 p-3" style={{ background: '#fff8f0', borderRadius: 12, border: 'none' }}>
                <div className="fw-semibold mb-2" style={{ color: '#ff9800', fontSize: 15 }}>Recommendations</div>
                <div style={{ fontSize: 14, color: '#444' }}>
                  {latestRecommendation ? latestRecommendation : 'No recommendation yet. Complete your daily mood check-in and survey!'}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="bg-white rounded-4 shadow-sm p-4 mb-0 w-100" style={{ minHeight: 420 }}>
            <div className="fw-bold fs-5 mb-1">Mood History</div>
            <div className="text-muted mb-3" style={{ fontSize: 14 }}>Review your past mood check-ins</div>
            {loadingHistory ? (
              <div className="text-center py-5">
                <div className="spinner-border text-success" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : history.length === 0 ? (
              <div className="alert alert-info">No mood history found.</div>
            ) : (
              <>
                <div className="d-flex flex-column gap-2">
                {(() => {
                  const totalPages = Math.ceil(history.length / itemsPerPage);
                  const pagedHistory = getPagedData(history, currentPage, itemsPerPage);
                  return (
                    <>
                      {pagedHistory.map((entry, idx) => {
                        let mood = entry.mood;
                        let note = entry.note;
                        if (typeof mood === 'string' && mood.startsWith("{'mood': ")) {
                          try {
                            const jsonStr = mood.replace(/'/g, '"');
                            const parsed = JSON.parse(jsonStr);
                            mood = parsed.mood;
                            note = parsed.note;
                          } catch (e) {}
                        }
                        return (
                          <div key={entry.date + '-' + idx} className="d-flex align-items-center justify-content-between bg-white border rounded-3 px-3 py-2" style={{ minHeight: 56 }}>
                            <div className="d-flex align-items-center gap-3">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{
                                  background: '#e6f7f0',
                                  borderRadius: '50%',
                                  border: '1.5px solid #b2e5d6',
                                  padding: 8,
                                  width: 48,
                                  height: 48,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>
                                  {getMoodIcon(mood, 32)}
                                </div>
                                <div>
                                  <div className="fw-semibold" style={{ fontSize: 16 }}>{capitalize(mood)}</div>
                                  {note && <div className="text-muted small" style={{ fontSize: 13 }}>{note}</div>}
                                </div>
                              </div>
                            </div>
                            <div className="text-end text-success small" style={{ minWidth: 80, fontSize: 13 }}>
                              {formatDate(entry.date)}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
                </div>
                {/* Pagination */}
                {(() => {
                  const totalPages = Math.ceil(history.length / itemsPerPage);
                  return totalPages > 1 ? (
                    <nav aria-label="Page navigation example" className="d-flex justify-content-center mt-4">
                      <ul className="pagination">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <a className="page-link" href="#" aria-label="Previous" onClick={e => { e.preventDefault(); handlePageChange(currentPage - 1); }}>
                            <span aria-hidden="true">Previous</span>
                          </a>
                        </li>
                        {/* Compact pagination with ellipsis */}
                        {totalPages <= 7 ? (
                          Array.from({ length: totalPages }, (_, i) => (
                            <li key={i + 1} className={`page-item ${currentPage === i + 1 ? 'active' : ''}`}>
                              <a className="page-link" href="#" onClick={e => { e.preventDefault(); handlePageChange(i + 1); }}>{i + 1}</a>
                            </li>
                          ))
                        ) : (
                          <>
                            <li className={`page-item ${currentPage === 1 ? 'active' : ''}`}>
                              <a className="page-link" href="#" onClick={e => { e.preventDefault(); handlePageChange(1); }}>1</a>
                            </li>
                            {currentPage > 4 && <li className="page-item disabled"><span className="page-link">...</span></li>}
                            {Array.from({ length: 5 }, (_, i) => currentPage - 2 + i)
                              .filter(page => page > 1 && page < totalPages)
                              .map(page => (
                                <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                                  <a className="page-link" href="#" onClick={e => { e.preventDefault(); handlePageChange(page); }}>{page}</a>
                                </li>
                              ))}
                            {currentPage < totalPages - 3 && <li className="page-item disabled"><span className="page-link">...</span></li>}
                            <li className={`page-item ${currentPage === totalPages ? 'active' : ''}`}>
                              <a className="page-link" href="#" onClick={e => { e.preventDefault(); handlePageChange(totalPages); }}>{totalPages}</a>
                            </li>
                          </>
                        )}
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <a className="page-link" href="#" aria-label="Next" onClick={e => { e.preventDefault(); handlePageChange(currentPage + 1); }}>
                            <span aria-hidden="true">Next</span>
                          </a>
                        </li>
                      </ul>
                    </nav>
                  ) : null;
                })()}
                <style>{`
                  .pagination .page-item .page-link {
                    border-radius: 6px;
                    margin: 0 2px;
                    color: #198754;
                    border: 1px solid #b2e6b2;
                    background: #fff;
                    transition: background 0.2s, color 0.2s;
                  }
                  .pagination .page-item.active .page-link {
                    background: #198754;
                    color: #fff;
                    border-color: #198754;
                  }
                  .pagination .page-item .page-link:hover:not(.active) {
                    background: #d4f8d4;
                    color: #198754;
                  }
                  .pagination .page-item.disabled .page-link {
                    color: #bdbdbd;
                    background: #f8f9fa;
                    border-color: #e0e0e0;
                    cursor: not-allowed;
                  }
                `}</style>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
