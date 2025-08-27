'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { getUserProfile, checkMoodSubmission, submitMood, submitMoodSurvey } from '../../../utils/api';

const moods = [
  { label: 'Happy', img: '/img/happy.png' },
  { label: 'Good', img: '/img/good.png' },
  { label: 'Neutral', img: '/img/neutral.png' },
  { label: 'Sad', img: '/img/sad.png' },
  { label: 'Angry', img: '/img/angry.png' },
];

export default function GetStarted() {
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [showMood, setShowMood] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyAnswers, setSurveyAnswers] = useState([null, null, null]);
  const [moodEntryId, setMoodEntryId] = useState(null);
  const [surveyLoading, setSurveyLoading] = useState(false);
  const [surveySubmitted, setSurveySubmitted] = useState(false);
  const [surveyError, setSurveyError] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Only fetch user profile, do not auto-redirect
    getUserProfile()
      .then((data) => {
        setFullName(data.full_name || '');
      })
      .catch(() => setFullName(''))
      .finally(() => setLoading(false));
  }, []);

  const handleGetStarted = () => {
    setShowMood(true);
  };

  // Survey UI
  if (showSurvey) {
    const moodQuestions = {
      0: [ // Happy
        'I feel enthusiastic and energized right now',
        "I'm experiencing positive thoughts about my current situation",
        'My body feels light and comfortable (e.g., smiling, relaxed posture)',
      ],
      1: [ // Good
        'I feel calm and content',
        'I can handle my daily challenges',
        'My energy level feels stable',
      ],
      2: [ // Neutral
        "I don't feel particularly positive or negative",
        'My thoughts are focused on tasks, not emotions',
        'My physical state feels neither relaxed nor tense',
      ],
      3: [ // Sad
        'I feel a heavy or tired feeling in my body',
        'Negative thoughts keep coming to my mind',
        "Activities I usually enjoy don't interest me now",
      ],
      4: [ // Angry
        'I feel physical tension (e.g., clenched jaw, fast heartbeat)',
        "I'm frustrated with people or situations around me",
        'I keep thinking about what upset me',
      ],
    };
    const surveyQuestions = moodQuestions[selectedMood] || [];
    const allAnswered = surveyAnswers.every((a) => a !== null);
    const handleSurveySubmit = async () => {
      setSurveyLoading(true);
      setSurveySubmitted(true);
      setSurveyError('');
      try {
        const surveyResponse = await submitMoodSurvey({ mood_entry_id: moodEntryId, answers: surveyAnswers });
        
        // Dispatch real-time update event for survey completion
        const moodUpdateEvent = new CustomEvent('mood-updated', {
          detail: {
            mood: moods[selectedMood].label.toLowerCase(),
            note: '',
            date: new Date().toISOString().slice(0, 10),
            type: 'survey-completed',
            recommendation: surveyResponse.recommendation,
            answers: surveyAnswers
          }
        });
        window.dispatchEvent(moodUpdateEvent);
        
        // Also dispatch the legacy event for backward compatibility
        window.dispatchEvent(new Event('survey-submitted'));
        
        setTimeout(() => {
          router.push('/student/dashboard');
        }, 1500);
      } catch (e) {
        setSurveyError(e.message || 'Failed to submit survey.');
        setSurveySubmitted(false); // Re-enable if there's an error
      } finally {
        setSurveyLoading(false);
      }
    };
    return (
      <div
        className="shadow-lg d-flex flex-column align-items-center justify-content-center"
        style={{
          background: '#fff',
          borderRadius: 32,
          padding: '32px 40px',
          maxWidth: 900,
          width: '100%',
          minHeight: 520,
          boxShadow: '0 12px 64px rgba(60,140,108,0.18)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        <h2 style={{ color: '#20bfa9', fontWeight: 500, fontSize: '1.5rem', marginBottom: 8 }}>
          Please rate your current thoughts, feelings, and body responses based on how you’re feeling right now.
        </h2>
        <div style={{ color: '#20bfa9', fontWeight: 400, fontSize: '1.1rem', marginBottom: 24 }}>
          1 = Strongly Disagree &amp; 5 = Strongly Agree
        </div>
        <div style={{
          background: '#e6f7f0',
          borderRadius: 16,
          padding: 32,
          width: '100%',
          maxWidth: 700,
          margin: '0 auto 32px auto',
          textAlign: 'left',
          border: '1.5px solid #d3d3d3',
          boxSizing: 'border-box',
        }}>
          <style jsx>{`
            input[type="radio"] {
              accent-color: #20bfa9 !important;
              -webkit-appearance: none;
              appearance: none;
              width: 20px;
              height: 20px;
              border: 2px solid #20bfa9;
              border-radius: 50%;
              background-color: white;
              cursor: pointer;
              position: relative;
            }
            input[type="radio"]:checked {
              background-color: #20bfa9;
              border-color: #20bfa9;
            }
            input[type="radio"]:checked::after {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              width: 8px;
              height: 8px;
              background-color: white;
              border-radius: 50%;
            }
            input[type="radio"]:disabled {
              opacity: 0.6;
              cursor: not-allowed;
            }
          `}</style>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '50%' }}></th>
                {[1, 2, 3, 4, 5].map((num) => (
                  <th key={num} style={{ textAlign: 'center', color: '#20bfa9', fontWeight: 500 }}>{num}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {surveyQuestions.map((q, qIdx) => (
                <tr key={qIdx}>
                  <td style={{ color: '#20bfa9', fontSize: '1.1rem', padding: '16px 0', verticalAlign: 'middle' }}>{q}</td>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <td key={num} style={{ textAlign: 'center' }}>
                      <input
                        type="radio"
                        name={`survey-q${qIdx}`}
                        value={num}
                        checked={surveyAnswers[qIdx] === num}
                        onChange={() => {
                          const updated = [...surveyAnswers];
                          updated[qIdx] = num;
                          setSurveyAnswers(updated);
                        }}
                        style={{ 
                          accentColor: '#20bfa9', 
                          width: 20, 
                          height: 20,
                          cursor: 'pointer'
                        }}
                        disabled={surveyLoading}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {surveyError && <div style={{ color: 'red', marginBottom: 12 }}>{surveyError}</div>}
        {/* Submit or Skip button */}
        {allAnswered ? (
          <span
            onClick={surveyLoading || surveySubmitted ? undefined : handleSurveySubmit}
            style={{
              color: surveyLoading || surveySubmitted ? '#ccc' : '#888', // match Skip color
              fontSize: '1.15rem', // match Skip size
              cursor: surveyLoading || surveySubmitted ? 'not-allowed' : 'pointer',
              position: 'absolute',
              bottom: 16,
              right: 40,
              background: 'none',
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
              zIndex: 10,
              opacity: surveyLoading || surveySubmitted ? 0.6 : 1,
              borderRadius: 20,
              minWidth: 120,
              textAlign: 'center',
              transition: 'opacity 0.2s',
            }}
            tabIndex={0}
            role="button"
            aria-pressed="false"
            disabled={surveyLoading || surveySubmitted}
          >
            {surveyLoading ? 'Submitting...' : surveySubmitted ? 'Submitting...' : 'Submit →'}
          </span>
        ) : (
          <span
            onClick={() => router.push('/student/dashboard')}
            style={{
              color: '#888',
              fontSize: '1.15rem',
              cursor: 'pointer',
              position: 'absolute',
              bottom: 16,
              right: 40,
              background: 'none',
              border: 'none',
              outline: 'none',
              boxShadow: 'none',
              zIndex: 10,
            }}
            tabIndex={0}
            role="button"
            aria-pressed="false"
          >
            or Skip&rarr;
          </span>
        )}
      </div>
    );
  }

  // Mood selection UI
  if (showMood) {
    const handleNext = async () => {
      if (selectedMood !== null) {
        const moodLabel = moods[selectedMood].label.toLowerCase();
        try {
          const res = await submitMood({ mood: moodLabel, note: '' });
          setMoodEntryId(res.mood_entry_id);
          setShowSurvey(true);
        } catch (e) {
          alert('Failed to submit mood. Please try again.');
        }
      } else {
        router.push('/student/dashboard');
      }
    };
    return (
      <div
        className="shadow-lg d-flex flex-column align-items-center justify-content-center"
        style={{
          background: '#fff',
          borderRadius: 32,
          padding: '32px 40px',
          maxWidth: 900,
          width: '100%',
          minHeight: 520,
          boxShadow: '0 12px 64px rgba(60,140,108,0.18)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative', // Added for absolute positioning
        }}
      >
        <h2 style={{ color: '#20bfa9', fontWeight: 500, fontSize: '2rem', marginBottom: 40 }}>
          Choose what you’ve felt overall today
        </h2>
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginBottom: 40, flexWrap: 'wrap' }}>
          {moods.map((mood, idx) => (
            <div
              key={mood.label}
              onClick={() => setSelectedMood(idx)}
              style={{
                cursor: 'pointer',
                background: selectedMood === idx ? '#c6efe2' : '#e6f7f0',
                borderRadius: 16,
                padding: 24,
                minWidth: 120,
                minHeight: 120,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: selectedMood === idx ? '0 2px 12px rgba(32,191,169,0.10)' : '0 1px 4px rgba(0,0,0,0.04)',
                border: selectedMood === idx ? '2px solid #20bfa9' : '1.5px solid #b2e5d6',
                transition: 'all 0.2s',
                outline: selectedMood === idx ? '2px solid #20bfa9' : 'none',
              }}
              tabIndex={0}
              role="button"
              aria-pressed={selectedMood === idx}
            >
              <Image
                src={mood.img}
                alt={mood.label}
                width={72}
                height={72}
                style={{ marginBottom: 12 }}
              />
              <span style={{ fontSize: 20, color: '#20bfa9', fontWeight: 500 }}>{mood.label}</span>
            </div>
          ))}
        </div>
        {/* Next text link at bottom right */}
        <span
          onClick={handleNext}
          style={{
            color: '#888', // match the subtitle text color
            fontSize: '1.15rem', // match subtitle font size
            cursor: 'pointer',
            position: 'absolute',
            bottom: 32,
            right: 40,
            background: 'none',
            border: 'none',
            outline: 'none',
            boxShadow: 'none',
            zIndex: 10,
            opacity: 1,
          }}
          tabIndex={0}
          role="button"
          aria-pressed="false"
        >
          Next &rarr;
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background:
          "linear-gradient(to right, #d6eaff 0%, rgba(214,234,255,0.0) 40%), linear-gradient(rgba(60,140,108,0.45), rgba(60,140,108,0.45)), url(/img/ietischool.jpg) center/cover no-repeat",
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="shadow-lg d-flex flex-column align-items-center justify-content-center"
        style={{
          background: '#fff',
          borderRadius: 32,
          padding: '32px 40px',
          maxWidth: 900,
          width: '100%',
          minHeight: 520,
          boxShadow: '0 12px 64px rgba(60,140,108,0.18)',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Top: Logo and AMIETI brand side by side */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          marginBottom: 140,
        }}>
          <Image
            src="/img/amietilogo.png"
            alt="AMIETI Logo"
            width={64}
            height={64}
            style={{ objectFit: 'contain', marginBottom: 0 }}
            priority
          />
          <span style={{ color: '#20bfa9', fontWeight: 700, fontSize: '2rem', letterSpacing: '0.04em' }}>
            AMIETI
          </span>
        </div>
        {/* Welcome message group */}
        <div style={{ marginBottom: 48 }}>
          <div style={{
            color: '#43c463',
            fontWeight: 700,
            fontSize: '2.1rem',
            lineHeight: 1.2,
            marginBottom: 0,
          }}>
            {loading ? 'Loading...' : `Welcome to your Health Dashboard${fullName ? ', ' + fullName.split(' ')[0] + '!' : '!'}`}
          </div>
          <div style={{
            color: '#888',
            fontSize: '1.15rem',
            fontWeight: 400,
            marginTop: 0,
            marginBottom: 12,
          }}>
            Let’s help you start strong by checking how you feel today.
          </div>
        </div>
        {/* Button below */}
        <button
          className="btn w-100 student-dashboard-get-started-btn"
          style={{
            background: '#FFE600',
            color: '#38813A', // match homepage Get Started color
            fontWeight: 600,
            fontSize: '1rem',
            borderRadius: 40,
            padding: '8px 0',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            marginTop: 0,
            maxWidth: 180,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
          onClick={handleGetStarted}
        >
          Get Started
        </button>
        {/* Spacer to keep content vertically centered if needed */}
        <div style={{ flexGrow: 2 }} />
      </div>
    </div>
  );
}
