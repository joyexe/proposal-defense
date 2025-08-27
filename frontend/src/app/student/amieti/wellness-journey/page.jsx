'use client';
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { getMoodData, checkMoodSubmission, submitMood, getWellnessProfile, getDailyTasks, completeDailyTask, getWeeklyGoals, progressWeeklyGoal, getAchievements } from "../../../utils/api";
import { FaSmile, FaRegSmile, FaMeh, FaFrown, FaAngry, FaTrophy } from "react-icons/fa";

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

// Helper function for pagination (same as admin logs)
function getPagedData(data, page, perPage) {
  const start = (page - 1) * perPage;
  return data.slice(start, start + perPage);
}

export default function StudentGamificationPage() {
  const router = useRouter();
  // State for real-time data
  const [profile, setProfile] = useState(null);
  const [dailyTasks, setDailyTasks] = useState([]);
  const [weeklyGoals, setWeeklyGoals] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [todayMood, setTodayMood] = useState(null);
  const [moodLoading, setMoodLoading] = useState(true);
  const [moodDates, setMoodDates] = useState([]);
  useEffect(() => {
    setMoodLoading(true);
    checkMoodSubmission()
      .then((data) => {
        if (typeof data === 'object' && data !== null && ('mood' in data || 'note' in data)) {
          let moodValue = data.mood;
          if (typeof moodValue === 'string' && moodValue.startsWith("{'mood': ")) {
            try {
              const jsonStr = moodValue.replace(/'/g, '"');
              const parsed = JSON.parse(jsonStr);
              moodValue = parsed.mood;
            } catch (e) {}
          }
          setTodayMood(typeof moodValue === 'string' ? moodValue : '');
        } else if (typeof data === 'string') {
          setTodayMood(data);
        } else {
          setTodayMood('');
        }
      })
      .finally(() => setMoodLoading(false));
    getMoodData()
      .then((data) => {
        // Extract and sort dates
        const dates = (Array.isArray(data.data) ? data.data : []).map(entry => entry.date).sort();
        setMoodDates(dates);
      });
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [profileData, dailyTasksData, weeklyGoalsData, achievementsData] = await Promise.all([
          getWellnessProfile(),
          getDailyTasks(),
          getWeeklyGoals(),
          getAchievements(),
        ]);
        setProfile(profileData);
        setDailyTasks(dailyTasksData);
        setWeeklyGoals(weeklyGoalsData);
        setAchievements(achievementsData);
      } catch (e) {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      const achievementsData = await getAchievements();
      setAchievements(achievementsData);
    }, 5000); // every 5 seconds
    return () => clearInterval(interval);
  }, []);

  // Handlers for completing tasks and progressing goals
  const handleCompleteTask = async (id) => {
    try {
      // Optimistic UI: mark as complete immediately
      setDailyTasks(prev => prev.map(t => t.id === id ? { ...t, completed: true, complete: true } : t));
      await completeDailyTask(id);
      // Fetch updated data after completion
      const [updatedTasks, updatedProfile, updatedAchievements] = await Promise.all([
        getDailyTasks(),
        getWellnessProfile(),
        getAchievements(),
      ]);
      setDailyTasks(updatedTasks);
      setProfile(updatedProfile);
      setAchievements(updatedAchievements); // <-- ensure real-time update
      setAchievementsPage(1); // <-- always show the first page after update
    } catch (error) {
      alert('Failed to complete task: ' + (error?.message || error));
      setDailyTasks(prev => prev.map(t => t.id === id ? { ...t, completed: false, complete: false } : t));
      console.error('Complete task error:', error);
    }
  };
  const handleProgressGoal = async (id) => {
    await progressWeeklyGoal(id);
    const updatedGoals = await getWeeklyGoals();
    setWeeklyGoals(updatedGoals);
    const updatedProfile = await getWellnessProfile();
    setProfile(updatedProfile);
    const updatedAchievements = await getAchievements();
    setAchievements(updatedAchievements);
  };

  // Default tasks and goals for display
  const DEFAULT_DAILY_TASKS = [
    { id: 'mindful-meditation', title: 'Mindful Meditation', desc: '10 minutes of peaceful meditation', type: 'Mental', xp: 10, complete: false },
    { id: 'active-achievement', title: 'Active Achievement', desc: '30 minutes of physical activity', type: 'Physical', xp: 20, complete: false },
    { id: 'hydration-goal', title: 'Hydration Goal', desc: 'Drink 8 glasses of water', type: 'Physical', xp: 5, complete: false },
    { id: 'mood-check-in', title: 'Mood Check-In', desc: 'Reflect on your emotions today', type: 'Mental', xp: 8, complete: false },
    { id: 'gratitude-practice', title: 'Gratitude Practice', desc: 'Write down 3 things you\'re grateful for', type: 'Mental', xp: 12, complete: false },
    { id: 'nature-connection', title: 'Nature Connection', desc: 'Spend 15 minutes outdoors', type: 'Mental', xp: 10, complete: false },
  ];
  const DEFAULT_WEEKLY_GOALS = [
    { id: 'meditation-master', title: 'Meditation Master', subtitle: 'Meditate 5 times this week', icon: '🧘', iconColor: '#9c27b0', progress: 0, goal: 5, xp: 50, completed: false },
    { id: 'active-lifestyle', title: 'Active Lifestyle', subtitle: 'Exercise 4 times this week', icon: '🏃', iconColor: '#ff9800', progress: 0, goal: 4, xp: 60, completed: false },
    { id: 'transformation-seeker', title: 'Transformation Seeker', subtitle: 'Reach Level 2 in your journey', icon: '🦋', iconColor: '#43a047', progress: 0, goal: 10, xp: 120, completed: false },
  ];
  // For display, merge backend data with defaults
  const displayDailyTasks = dailyTasks.length > 0
    ? dailyTasks.map(task => {
        // Find the default for description/type/xp fallback
        const defaultTask = DEFAULT_DAILY_TASKS.find(dt => dt.title === (task.title || task.task));
        return {
          ...defaultTask,
          ...task,
          title: task.title || task.task, // support both keys
          desc: defaultTask ? defaultTask.desc : '',
          type: defaultTask ? defaultTask.type : '',
          xp: task.xp || (defaultTask ? defaultTask.xp : 0),
          id: task.id, // always use backend id
          complete: task.completed,
        };
      })
    : DEFAULT_DAILY_TASKS;

  // Instead of merging with DEFAULT_WEEKLY_GOALS, use backend weeklyGoals directly for display
  const displayWeeklyGoals = weeklyGoals.map(goal => ({
    id: goal.id,
    title: goal.goal, // backend uses 'goal' for the name
    subtitle: goal.goal === 'Meditation Master' ? 'Meditate 5 times this week' : goal.goal === 'Active Lifestyle' ? 'Exercise 4 times this week' : goal.goal === 'Transformation Seeker' ? 'Reach Level 2 in your journey' : '',
    icon: goal.goal === 'Meditation Master' ? '🧘' : goal.goal === 'Active Lifestyle' ? '🏃' : goal.goal === 'Transformation Seeker' ? '🦋' : '',
    iconColor: goal.goal === 'Meditation Master' ? '#9c27b0' : goal.goal === 'Active Lifestyle' ? '#ff9800' : goal.goal === 'Transformation Seeker' ? '#43a047' : '#222',
    progress: goal.progress,
    goal: goal.target,
    xp: goal.xp,
    completed: goal.completed,
  }));

  // Map achievement titles to emoji/icons
  const achievementIcons = {
    'Mindful Meditation': '🧘',
    'Active Achievement': '🏆',
    'Hydration Goal': '💧',
    'Mood Check-In': '😊',
    'Gratitude Practice': '🙏',
    'Nature Connection': '🌳',
    'Meditation Master': '🧘',
    'Active Lifestyle': '🏃',
    'Transformation Seeker': '🦋',
    // Fallback for weekly goals with week in title
    'Meditation Master (Weekly)': '🧘',
    'Active Lifestyle (Weekly)': '🏃',
    'Transformation Seeker (Weekly)': '🦋',
  };

  // Map achievement titles to their subtitles/descriptions for Achievements card
  const achievementSubtitles = {
    'Mindful Meditation': '10 minutes of peaceful meditation',
    'Active Achievement': '30 minutes of physical activity',
    'Hydration Goal': 'Drink 8 glasses of water',
    'Mood Check-In': 'Reflect on your emotions today',
    'Gratitude Practice': 'Write down 3 things you\'re grateful for',
    'Nature Connection': 'Spend 15 minutes outdoors',
    'Meditation Master': 'Meditate 5 times this week',
    'Active Lifestyle': 'Exercise 4 times this week',
    'Transformation Seeker': 'Reach Level 2 in your journey',
    // Fallback for weekly goals with week in title
    'Meditation Master (Weekly)': 'Meditate 5 times this week',
    'Active Lifestyle (Weekly)': 'Exercise 4 times this week',
    'Transformation Seeker (Weekly)': 'Reach Level 2 in your journey',
  };

  // Helper to get icon and subtitle for achievements, even if title includes week/date
  function getAchievementIcon(title) {
    if (achievementIcons[title]) return achievementIcons[title];
    if (title.startsWith('Meditation Master')) return '🧘';
    if (title.startsWith('Active Lifestyle')) return '🏃';
    if (title.startsWith('Transformation Seeker')) return '🦋';
    return '🏅';
  }
  function getAchievementSubtitle(title) {
    if (achievementSubtitles[title]) return achievementSubtitles[title];
    if (title.startsWith('Meditation Master')) return 'Meditate 5 times this week';
    if (title.startsWith('Active Lifestyle')) return 'Exercise 4 times this week';
    if (title.startsWith('Transformation Seeker')) return 'Reach Level 2 in your journey';
    return '';
  }

  const [achievementsPage, setAchievementsPage] = useState(1);
  const achievementsPerPage = 6;
  
  const handlePageChange = (page) => {
    const totalPages = Math.ceil(achievements.length / achievementsPerPage);
    if (page >= 1 && page <= totalPages) setAchievementsPage(page);
  };

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

  // In the Achievements card rendering:
  // Show the 'No Earn Achievements today or this week' message only if there are no completed daily tasks and no filtered achievements
  const hasCompletedDailyTask = displayDailyTasks.some(task => task.complete);

  // Only show completed tasks from today's Daily Wellness Tasks in Achievements card
  const completedDailyTasks = displayDailyTasks.filter(task => task.complete);

  // Show all completed tasks from achievements in Achievements card, including duplicates by title
  const completedAchievements = achievements; // No filtering by title, show all

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
                className="nav-link w-100 border bg-light text-dark"
                onClick={() => router.push("/student/amieti")}
                style={{ fontWeight: 600, fontSize: '1rem', borderRadius: '8px 0 0 8px' }}
          >
            Mood Tracker
          </button>
            </li>
            <li className="nav-item flex-fill">
          <button
                className="nav-link w-100 border bg-success text-white"
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
      <div className="row g-4 mb-4" style={{ width: '100%' }}>
        <div className="col-lg-6 d-flex align-items-stretch">
          <div className="card shadow-sm mb-4" style={{ borderRadius: 24, width: '100%', minHeight: 500, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="card-body text-center">
              <div className="fw-bold text-teal" style={{ fontSize: 28, marginBottom: 16 }}>Your Progress</div>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
                <div style={{
                  background: 'radial-gradient(circle at 60% 40%, #b2f7ef 60%, #e0ffe7 100%)',
                  borderRadius: '50%',
                  width: 220,
                  height: 140,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 32px #0001',
                }}>
                  <img src={profile?.level >= 2 ? "/img/caterpillarstage.png" : "/img/eggstage.png"} alt={profile?.level >= 2 ? "Caterpillar Stage" : "Egg Stage"} width={140} height={90} style={{ objectFit: 'contain' }}} />
                </div>
              </div>
              <div className="fw-bold" style={{ fontSize: 22, marginBottom: 28, fontWeight: 700 }}>{profile?.level >= 2 ? "Caterpillar Stage" : "Egg Stage"}</div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                <span style={{ background: '#b2f7ef', color: '#00bfae', borderRadius: 16, padding: '4px 18px', fontWeight: 600, fontSize: 16, border: '1px solid #00bfae' }}>Level {profile?.level || 1}</span>
              </div>
              <div className="mb-4" style={{ color: '#00bfae', fontWeight: 500, fontSize: 16 }}>Your journey begins!</div>
              <div className="mt-4 mb-0" style={{ width: '100%', padding: '0 24px' }}>
                <div className="d-flex justify-content-between mb-3" style={{ fontSize: 14 }}>
                  <span>
                    {profile?.level === 2 ? 'Progress to Level 3' : `Progress to Level 2`}
                  </span>
                  <span>
                    {profile?.level === 2
                      ? `${profile?.xp || 0} XP / 2000 XP`
                      : `${profile?.xp || 0} XP / 1000 XP`}
                  </span>
                </div>
                <div className="progress" style={{ height: 8, borderRadius: 8, background: '#e0e0e0' }}>
                  <div className="progress-bar" role="progressbar"
                    style={{
                      width: profile?.level === 2
                        ? `${Math.min(100, ((profile?.xp || 0) - 1000) / 2000 * 100)}%`
                        : `${Math.min(100, (profile?.xp || 0) / 1000 * 100)}%`,
                      background: '#1de9b6'
                    }}
                    aria-valuenow={profile?.level === 2 ? (profile?.xp || 0) - 1000 : (profile?.xp || 0)}
                    aria-valuemin={0}
                    aria-valuemax={profile?.level === 2 ? 2000 : 1000}
                  ></div>
                </div>
                <div className="text-center mt-4" style={{ fontSize: 14, color: '#222' }}>
                  {profile?.level === 2 ? '2000 XP until next transformation!' : '1000 XP until next transformation!'}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6 d-flex align-items-stretch">
          <div className="card shadow-sm mb-4" style={{ borderRadius: 24, width: '100%', minHeight: 500, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="card-body">
              <div className="fw-bold" style={{ fontSize: 28, marginBottom: 8 }}>Daily Wellness Tasks</div>
              <div className="text-muted mb-4" style={{ fontSize: 16 }}>Track your wellness journey progress</div>
              <div className="row g-2">
                {displayDailyTasks.map((task, idx) => {
                  const type = task.title === 'Nature Connection' ? 'Mental' : task.type;
                  const isCompleted = !!task.complete;
                  const completeGreen = '#43c463';
                  const isButtonEnabled = !isCompleted && task.id && !isNaN(Number(task.id));
                  return (
                    <div className="col-6" key={idx} style={{ position: 'relative' }}>
                      <div className="p-3 h-100 d-flex flex-column justify-content-between align-items-stretch" style={{ background: isCompleted ? '#e6fbe6' : '#fff', borderRadius: 16, boxShadow: '0 2px 8px #0001', border: isCompleted ? `2px solid ${completeGreen}` : '1px solid #eee', minHeight: 110, position: 'relative' }}>
                        {/* Check/Uncheck Circle */}
                        <span style={{ position: 'absolute', top: 14, right: 18, zIndex: 2 }}>
                          {isCompleted ? (
                            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="13" cy="13" r="12" fill={completeGreen} stroke={completeGreen} strokeWidth="2" />
                              <path d="M8 13.5L12 17L18 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : (
                            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="13" cy="13" r="12" fill="#fff" stroke={completeGreen} strokeWidth="2" />
                            </svg>
                          )}
                        </span>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <span className="fw-bold" style={{ fontSize: 22 }}>{task.title === 'Mindful Meditation' ? '🧘' : task.title === 'Active Achievement' ? '🏆' : task.title === 'Hydration Goal' ? '💧' : task.title === 'Mood Check-In' ? '😊' : task.title === 'Gratitude Practice' ? '🙏' : '🌳'}</span>
                          <span className="fw-semibold" style={{ fontSize: 16 }}>{task.title}</span>
                        </div>
                        <div className="text-muted mb-2" style={{ fontSize: 14, marginLeft: 36 }}>{task.desc}</div>
                        <div className="d-flex align-items-center justify-content-between mt-auto w-100">
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge" style={{ background: type === 'Mental' ? '#e0f7fa' : '#e8f5e9', color: type === 'Mental' ? '#00bcd4' : '#43a047', fontWeight: 500, fontSize: 13, borderRadius: 8, minWidth: 60, textAlign: 'center' }}>{type}</span>
                            <span className="badge" style={{ background: '#fff', color: '#222', fontWeight: 500, fontSize: 13, borderRadius: 8, minWidth: 48, textAlign: 'center', border: '1px solid #eee' }}>+{task.xp}XP</span>
                          </div>
                          <button
                            className="btn btn-sm btn-progress-light-green"
                            style={{
                              background: isCompleted ? completeGreen : '#e6fbe6',
                              borderRadius: 8,
                              fontWeight: 500,
                              fontSize: 15,
                              boxShadow: isCompleted ? '0 1px 2px #0001' : '0 2px 6px #43c46322',
                              border: isCompleted ? 'none' : `1.5px solid ${completeGreen}`,
                              color: isCompleted ? '#fff' : completeGreen,
                              padding: '6px 18px',
                              minWidth: 90
                            }}
                            onClick={() => isButtonEnabled ? handleCompleteTask(Number(task.id)) : null}
                            disabled={!isButtonEnabled}
                          >
                            {isCompleted ? 'Completed' : 'Complete'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="row g-4" style={{ width: '100%' }}>
        <div className="col-lg-6">
          <div className="card shadow-sm mb-4" style={{ borderRadius: 24, width: '100%', display: 'block', marginBottom: 0, paddingBottom: 0 }}>
            <div className="card-body" style={{ paddingBottom: 0 }}>
              <div className="fw-bold" style={{ fontSize: 28, marginBottom: 8 }}>Weekly Goals</div>
              <div className="text-muted mb-4" style={{ fontSize: 16 }}>Track your wellness journey progress</div>
              <div style={{ marginBottom: 0, paddingBottom: 0 }}>
                {displayWeeklyGoals.map((goal, idx) => (
                  <div key={goal.id} style={{ marginBottom: idx === displayWeeklyGoals.length - 1 ? 0 : 16 }}>
                    <div key={idx} className="mb-4 p-3" style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px #0001', border: '1px solid #eee', position: 'relative' }}>
                      {/* Check/Uncheck Circle */}
                      <span style={{ position: 'absolute', top: 18, right: 22, zIndex: 2 }}>
                        {goal.progress === goal.goal ? (
                          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="13" cy="13" r="12" fill="#43c463" stroke="#43c463" strokeWidth="2" />
                            <path d="M8 13.5L12 17L18 10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : (
                          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="13" cy="13" r="12" fill="#fff" stroke="#43c463" strokeWidth="2" />
                          </svg>
                        )}
                      </span>
                      <div className="d-flex align-items-center mb-2">
                        <span style={{ fontSize: 32, color: goal.iconColor, marginRight: 16 }}>{goal.icon}</span>
                        <div>
                          <div className="fw-bold" style={{ fontSize: 20 }}>{goal.title}</div>
                          <div className="text-muted" style={{ fontSize: 15 }}>{goal.subtitle}</div>
                        </div>
                      </div>
                      <div className="d-flex align-items-center justify-content-between mb-2" style={{ fontSize: 14 }}>
                        <span>{goal.progress}/{goal.goal}</span>
                        <span className="fw-semibold text-muted" style={{ fontSize: 15, background: '#fff', borderRadius: 8, padding: '2px 12px', border: '1px solid #eee', minWidth: 56, textAlign: 'center' }}>+{goal.xp}XP</span>
                      </div>
                      <div className="progress mb-2" style={{ height: 8, borderRadius: 8, background: '#eee' }}>
                        <div className="progress-bar" role="progressbar" style={{ width: `${(goal.progress/goal.goal)*100}%`, background: '#1de9b6' }} aria-valuenow={goal.progress} aria-valuemin={0} aria-valuemax={goal.goal}></div>
                      </div>
                      <button className="btn btn-sm btn-progress-light-green"
                        style={{ background: '#d0f5e8', borderRadius: 8, fontWeight: 500, fontSize: 15, boxShadow: '0 1px 2px #0001', border: 'none' }}
                        onClick={() => (goal.id && !goal.completed && goal.progress < goal.goal) ? handleProgressGoal(goal.id) : null}
                        disabled={!(goal.id && !goal.completed && goal.progress < goal.goal)}
                      >
                        + 1 Progress
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-6 d-flex align-items-stretch">
          <div className="card shadow-sm mb-4" style={{ borderRadius: 24, width: '100%', minHeight: 500, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="card-body">
              <div className="fw-bold" style={{ fontSize: 28, marginBottom: 8 }}>Achievements</div>
              <div className="mb-3" style={{ color: '#000000', fontWeight: 600, fontSize: 16 }}>
                <span style={{ fontSize: 20, marginRight: 6 }}><FaTrophy style={{ color: '#ff9800' }} /></span>Earned Achievements ({achievements.length})
              </div>
              <div className="row g-3">
                {achievements.length === 0 ? (
                  <div className="col-12">
                    <div style={{
                      background: '#fffde7',
                      border: '2px solid #fff9c4',
                      borderRadius: 16,
                      boxShadow: '0 2px 8px #0001',
                      minHeight: 110,
                      padding: '18px 10px 18px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      color: '#bdbdbd',
                      fontWeight: 600,
                      fontSize: 18
                    }}>
                      No Earn Achievements today or this week
                    </div>
                  </div>
                ) : (
                  getPagedData(achievements, achievementsPage, achievementsPerPage).map((ach, idx) => (
                    <div className="col-6" key={idx}>
                      <div style={{
                        background: '#fffde7',
                        border: '2px solid #fff9c4',
                        borderRadius: 16,
                        boxShadow: '0 2px 8px #0001',
                        minHeight: 110,
                        padding: '18px 10px 18px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}>
                        {/* Icon */}
                        <span style={{ fontSize: 36, color: ach.iconColor || '#43c463', marginBottom: 8 }}>{getAchievementIcon(ach.title)}</span>
                        {/* Title */}
                        <div className="fw-bold text-center" style={{ fontSize: 18, color: '#222', marginBottom: 2 }}>{ach.title}</div>
                        {/* Subtitle/Description */}
                        <div className="text-center mb-1" style={{ fontSize: 14, color: '#6c757d', marginBottom: 6 }}>
                          {`Completed ${getAchievementSubtitle(ach.title) || ach.subtitle || ach.description || ''}`}
                        </div>
                        {/* Earned badge */}
                        <div style={{ background: '#fff9c4', color: '#e6b800', fontWeight: 600, fontSize: 15, borderRadius: 12, padding: '2px 12px', margin: '5px 0 0 0', textAlign: 'center', marginBottom: 4 }}>Earned!</div>
                        {/* Date */}
                        <div style={{ color: '#6c757d', fontSize: 12, marginTop: 2 }}>{ach.earnedAt || (ach.date_earned ? ach.date_earned.split('T')[0] : '')}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {/* Pagination for Achievements */}
              {(() => {
                const totalPages = Math.ceil(achievements.length / achievementsPerPage);
                return totalPages > 1 ? (
                  <nav aria-label="Page navigation example" className="d-flex justify-content-center mt-4">
                    <ul className="pagination">
                      <li className={`page-item ${achievementsPage === 1 ? 'disabled' : ''}`}>
                        <a className="page-link" href="#" aria-label="Previous" onClick={e => { e.preventDefault(); handlePageChange(achievementsPage - 1); }}>
                          <span aria-hidden="true">Previous</span>
                        </a>
                      </li>
                      {/* Compact pagination with ellipsis */}
                      {totalPages <= 7 ? (
                        Array.from({ length: totalPages }, (_, i) => (
                          <li key={i + 1} className={`page-item ${achievementsPage === i + 1 ? 'active' : ''}`}>
                            <a className="page-link" href="#" onClick={e => { e.preventDefault(); handlePageChange(i + 1); }}>{i + 1}</a>
                          </li>
                        ))
                      ) : (
                        <>
                          <li className={`page-item ${achievementsPage === 1 ? 'active' : ''}`}>
                            <a className="page-link" href="#" onClick={e => { e.preventDefault(); handlePageChange(1); }}>1</a>
                          </li>
                          {achievementsPage > 4 && <li className="page-item disabled"><span className="page-link">...</span></li>}
                          {Array.from({ length: 5 }, (_, i) => achievementsPage - 2 + i)
                            .filter(page => page > 1 && page < totalPages)
                            .map(page => (
                              <li key={page} className={`page-item ${achievementsPage === page ? 'active' : ''}`}>
                                <a className="page-link" href="#" onClick={e => { e.preventDefault(); handlePageChange(page); }}>{page}</a>
                              </li>
                            ))}
                          {achievementsPage < totalPages - 3 && <li className="page-item disabled"><span className="page-link">...</span></li>}
                          <li className={`page-item ${achievementsPage === totalPages ? 'active' : ''}`}>
                            <a className="page-link" href="#" onClick={e => { e.preventDefault(); handlePageChange(totalPages); }}>{totalPages}</a>
                          </li>
                        </>
                      )}
                      <li className={`page-item ${achievementsPage === totalPages ? 'disabled' : ''}`}>
                        <a className="page-link" href="#" aria-label="Next" onClick={e => { e.preventDefault(); handlePageChange(achievementsPage + 1); }}>
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
            </div>
          </div>
        </div>
        </div>
      </div>
    );
  }
  