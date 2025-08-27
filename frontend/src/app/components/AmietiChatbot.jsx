import { useEffect, useRef, useState } from 'react';
import { BsDash, BsChevronLeft, BsThreeDots, BsSend } from 'react-icons/bs';
import { getProviders, getProviderAvailableTimes, createAppointment, fetchWithAuth, startChatbotConversation, logChatbotMessage, endChatbotConversation, handleOpenUpConversation, handleChatWithMeConversation } from '../utils/api';

// Helper to format time as 12-hour (e.g., '07:00' -> '7:00 AM')
function to12Hour(time) {
  let [h, m] = time.split(':');
  h = parseInt(h, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${ampm}`;
}

// Remove MOOD_SURVEY_QUESTIONS and add moodQuestions mapping
const moodQuestions = {
  'happy': [
    'I feel enthusiastic and energized right now',
    "I'm experiencing positive thoughts about my current situation",
    'My body feels light and comfortable (e.g., smiling, relaxed posture)',
  ],
  'good': [
    'I feel calm and content',
    'I can handle my daily challenges',
    'My energy level feels stable',
  ],
  'neutral': [
    "I don't feel particularly positive or negative",
    'My thoughts are focused on tasks, not emotions',
    'My physical state feels neither relaxed nor tense',
  ],
  'sad': [
    'I feel a heavy or tired feeling in my body',
    'Negative thoughts keep coming to my mind',
    "Activities I usually enjoy don't interest me now",
  ],
  'angry': [
    'I feel physical tension (e.g., clenched jaw, fast heartbeat)',
    "I'm frustrated with people or situations around me",
    'I keep thinking about what upset me',
  ],
};

// Add a mapping for mood to emoji
const moodImages = {
  'Happy': '/img/happy.png',
  'Good': '/img/good.png',
  'Neutral': '/img/neutral.png',
  'Sad': '/img/sad.png',
  'Angry': '/img/angry.png',
};

function BotAvatar() {
  return (
    <img src="/img/amietilogo.png" alt="bot" width={28} height={28} style={{ borderRadius: '50%', marginRight: 10, border: '2px solid #b2f7ef', objectFit: 'cover' }} />
  );
}

// Add a helper to render a static survey table
function renderStaticSurveyTable(questions, answers) {
  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 480,
      margin: '0 auto 18px auto',
      textAlign: 'left',
      border: '1.5px solid #d3d3d3',
      boxSizing: 'border-box',
    }}>
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
          {questions.map((q, qIdx) => (
            <tr key={qIdx}>
              <td style={{ color: '#20bfa9', fontSize: '1rem', padding: '12px 0', verticalAlign: 'middle' }}>{q}</td>
              {[1, 2, 3, 4, 5].map((num) => (
                <td key={num} style={{ textAlign: 'center' }}>
                  <input
                    type="radio"
                    name={`static-survey-q${qIdx}`}
                    value={num}
                    checked={answers[qIdx] === num}
                    readOnly
                    style={{ accentColor: '#20bfa9', width: 20, height: 20 }}
                    disabled
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AmietiChatbot({ onClose, onScheduled }) {
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi! How can I help you today?", options: [] }
  ]);
  const [input, setInput] = useState('');
  const [flow, setFlow] = useState(null); // 'appointment', 'mood', 'general', etc.
  const [step, setStep] = useState(null);
  const [counselors, setCounselors] = useState([]);
  const [selectedCounselor, setSelectedCounselor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [mood, setMood] = useState(null);
  const [moodNote, setMoodNote] = useState('');
  const [surveyAnswers, setSurveyAnswers] = useState([null, null, null]);
  const [surveyStep, setSurveyStep] = useState(0);
  const [moodEntryId, setMoodEntryId] = useState(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [pendingBooking, setPendingBooking] = useState(null);
  const [surveyQuestions, setSurveyQuestions] = useState(moodQuestions['happy']);
  
  // New state for conversation tracking
  const [conversationId, setConversationId] = useState(null);
  const [sessionId] = useState(() => {
    // Generate a more unique session ID with timestamp
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${timestamp}-${random}`;
  });
  const [isChatDisabled, setIsChatDisabled] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingMessage, setTypingMessage] = useState('');
  const [audioContext, setAudioContext] = useState(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showChat]);

  // Initialize conversation when component mounts
  useEffect(() => {
    const initConversation = async () => {
      try {
        const response = await startChatbotConversation('general', sessionId);
        setConversationId(response.conversation_id);
        
        // Log initial bot message
        await logChatbotMessage(response.conversation_id, "Hi! How can I help you today?", 'bot');
      } catch (error) {
        console.error('Failed to initialize conversation:', error);
        // If initialization fails, try again with a new session ID
        const newSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        try {
          const retryResponse = await startChatbotConversation('general', newSessionId);
          setConversationId(retryResponse.conversation_id);
          await logChatbotMessage(retryResponse.conversation_id, "Hi! How can I help you today?", 'bot');
        } catch (retryError) {
          console.error('Failed to initialize conversation on retry:', retryError);
        }
      }
    };
    
    initConversation();
  }, [sessionId]);

  // Helper function to log messages
  const logMessage = async (content, sender = 'user', skipContextualResponse = false) => {
    if (conversationId && content.trim()) {
      try {
        const response = await logChatbotMessage(conversationId, content, sender);
        
        // Handle keyword detection response (skip if in chat_with_me flow)
        if (!skipContextualResponse && response.flagged_keywords && response.flagged_keywords.length > 0) {
          if (response.contextual_response) {
            setMessages(msgs => [...msgs, { 
              from: 'bot', 
              text: response.contextual_response,
              isContextualResponse: true 
            }]);
          }
          
          if (response.alert_created) {
            setMessages(msgs => [...msgs, { 
              from: 'bot', 
              text: "I've notified a counselor who may reach out to you soon. You're not alone in this.",
              isAlertNotification: true 
            }]);
          }
        }
        
        return response;
      } catch (error) {
        console.error('Failed to log message:', error);
      }
    }
  };

  // Initialize audio context on user interaction
  const initializeAudioContext = () => {
    try {
      // Always create a new audio context to ensure it's fresh
      const newAudioContext = new (window.AudioContext || window.webkitAudioContext)();
      setAudioContext(newAudioContext);
    } catch (error) {
      // Audio context initialization failed
    }
  };

  // Play notification sound - Simple and reliable for Opera
  const playNotificationSound = () => {
    try {
      // Create audio context on demand if not available
      let context = audioContext;
      if (!context || context.state === 'closed') {
        context = new (window.AudioContext || window.webkitAudioContext)();
        setAudioContext(context);
      }
      
      // Resume if suspended
      if (context.state === 'suspended') {
        context.resume().then(() => {
          playBeep(context);
        });
      } else {
        playBeep(context);
      }
    } catch (error) {
      // Audio not available
    }
  };

  // Helper function to play beep sound
  const playBeep = (context) => {
    try {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      // Make sound more noticeable - higher frequency and volume
      oscillator.frequency.setValueAtTime(1200, context.currentTime);
      oscillator.type = 'sine';
      
      // Increase volume significantly
      gainNode.gain.setValueAtTime(0.8, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.2);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.2);
    } catch (error) {
      // Beep sound failed
    }
  };

  // Typing animation function
  const showTypingAnimation = async (message, delay = 1000) => {
    setIsTyping(true);
    setTypingMessage(message);
    await new Promise(resolve => setTimeout(resolve, delay));
    setIsTyping(false);
    setTypingMessage('');
  };

  // Add message with typing animation
  const addMessageWithTyping = async (message, typingDelay = 1000) => {
    await showTypingAnimation(message, typingDelay);
    setMessages(msgs => [...msgs, { from: 'bot', text: message }]);
    // Play sound immediately after message appears
    setTimeout(() => {
      playNotificationSound();
    }, 50); // Small delay to ensure message is rendered first
  };

  // Check if user has already checked in today
  const checkTodayMoodEntry = async () => {
    try {
      const response = await fetchWithAuth('/api/check-mood/');
      return response.mood !== null;
    } catch (error) {
      console.error('Failed to check today\'s mood entry:', error);
      return false;
    }
  };

  // Chat with me handler
  const handleChatWithMe = async () => {
    setShowChat(true);
    initializeAudioContext();
    
    // Clear previous chat history and start fresh
    setMessages([]);
    
    // Start with user message
    setMessages([{ from: 'user', text: 'Chat with me' }]);
    
    // Start the rule-based chatbot flow
    setFlow('chat_with_me');
    setStep('greeting');
    
    try {
      // Ensure conversation is initialized
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        const initResponse = await startChatbotConversation('general', sessionId);
        currentConversationId = initResponse.conversation_id;
        setConversationId(currentConversationId);
      }
      
      // Start the conversation with the new rule-based flow
      const response = await handleChatWithMeConversation(currentConversationId, '', 'greeting');
      
      if (response && response.response) {
        await addMessageWithTyping(response.response, 600);
        
        // Update step for next interaction
        if (response.next_step) {
          setStep(response.next_step);
        }
      }
    
    await logMessage('Chat with me');
      await logMessage(response.response, 'bot');
    } catch (error) {
      console.error('Failed to start chat with me conversation:', error);
      await addMessageWithTyping("I'm sorry, I'm having trouble starting our conversation right now. Please try again.", 400);
    }
  };

  // Talk to Counselor handler
  const handleTalkToCounselor = async () => {
    setShowChat(true);
    
    // Initialize audio context on user interaction
    initializeAudioContext();
    
    // Clear previous chat history and start fresh
    setMessages([]);
    
    // Start with user message
    setMessages([{ from: 'user', text: 'Talk to Counselor via Appointment' }]);
    
    // Start appointment scheduling flow
      setFlow('appointment');
      setStep('choose_counselor');
      setLoading(true);
    
      try {
        const data = await getProviders();
        const counselors = data.filter(u => u.role === 'counselor');
        setCounselors(counselors);
      
      // Add message with typing animation and options
      await addMessageWithTyping('Please choose a counselor:', 600);
      setMessages(msgs => {
        const lastMessage = msgs[msgs.length - 1];
        if (lastMessage && lastMessage.from === 'bot' && lastMessage.text === 'Please choose a counselor:') {
          // Update the last message to include options
          const updatedMessages = [...msgs];
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
          options: counselors.map(c => c.full_name)
          };
          return updatedMessages;
        }
        return msgs;
      });
      } catch (e) {
      await addMessageWithTyping('Failed to load counselors.', 400);
      }
      setLoading(false);
    
    await logMessage('Talk to Counselor via Appointment');
    await logMessage('Please choose a counselor:', 'bot');
  };

  // Check-in Today handler
  const handleCheckInToday = async () => {
    setShowChat(true);
    
    // Initialize audio context on user interaction
    initializeAudioContext();
    
    // Clear previous chat history and start fresh
    setMessages([]);
    
    // Test sound immediately to ensure it works
    setTimeout(() => {
      playNotificationSound();
    }, 200);
    
    // Check if user has already checked in today
    const hasCheckedInToday = await checkTodayMoodEntry();
    
    if (hasCheckedInToday) {
      // User has already checked in today
      try {
        // Get today's mood entry details
        const moodResponse = await fetchWithAuth('/api/check-mood/');
        const moodData = moodResponse;
        
        // Get survey answers directly from the API response
        const answer1 = moodData.answer_1;
        const answer2 = moodData.answer_2;
        const answer3 = moodData.answer_3;
        
        // Get mood recommendation
        const recommendationResponse = await fetchWithAuth('/api/mood/latest-recommendation/');
        const recommendationData = recommendationResponse;
        
        let moodSummary = "Here's a quick look at your mood today:\n\n[MOOD_IMAGE]\n\n";
        
        // Get the mood image path
        const moodImagePath = moodImages[moodData.mood ? moodData.mood.charAt(0).toUpperCase() + moodData.mood.slice(1) : 'Happy'];
        
        moodSummary += `• Mood: ${moodData.mood ? moodData.mood.charAt(0).toUpperCase() + moodData.mood.slice(1) : 'Not recorded'}\n`;
        
        if (moodData.note && moodData.note.trim()) {
          moodSummary += `• Note: ${moodData.note}\n`;
        }
        
        // Add survey questions and answers if available
        if (answer1 && answer2 && answer3) {
          const moodKey = moodData.mood ? moodData.mood.toLowerCase() : 'happy';
          const questions = moodQuestions[moodKey] || moodQuestions['happy'];
          
          moodSummary += `• Survey Questions & Answers:\n`;
          moodSummary += `  Q1: ${questions[0]} - ${answer1}/5\n`;
          moodSummary += `  Q2: ${questions[1]} - ${answer2}/5\n`;
          moodSummary += `  Q3: ${questions[2]} - ${answer3}/5\n`;
        } else if (answer1 || answer2 || answer3) {
          // Fallback: show any available answers
          const moodKey = moodData.mood ? moodData.mood.toLowerCase() : 'happy';
          const questions = moodQuestions[moodKey] || moodQuestions['happy'];
          
          moodSummary += `• Survey Questions:\n`;
          if (answer1) {
            moodSummary += `  Q1: ${questions[0]} - ${answer1}/5\n`;
          }
          if (answer2) {
            moodSummary += `  Q2: ${questions[1]} - ${answer2}/5\n`;
          }
          if (answer3) {
            moodSummary += `  Q3: ${questions[2]} - ${answer3}/5\n`;
          }
        }
        
        if (recommendationData.recommendation) {
          moodSummary += `• Recommendation: ${recommendationData.recommendation}`;
        }
        
        // Start with user message
        setMessages([{ from: 'user', text: 'Check-in today' }]);
        
        // Add messages one by one with typing animation
        await addMessageWithTyping("Hey! You've already done your check-in for today. Come back tomorrow for your next one!", 600);
        
        // Add mood summary with image
        await addMessageWithTyping(moodSummary, 800);
        setMessages(msgs => {
          const lastMessage = msgs[msgs.length - 1];
          if (lastMessage && lastMessage.from === 'bot' && lastMessage.text === moodSummary) {
            // Update the last message to include mood image
            const updatedMessages = [...msgs];
            updatedMessages[updatedMessages.length - 1] = {
              ...lastMessage,
              moodImage: moodImagePath
            };
            return updatedMessages;
          }
          return msgs;
        });
        
        await addMessageWithTyping(`But if you feel like opening up more or just talking about your emotions, I'm right here to listen. Your thoughts and feelings are important. You can tell me more about why you're feeling ${moodData.mood ? moodData.mood.charAt(0).toUpperCase() + moodData.mood.slice(1) : 'this way'} today so I can understand you better?`, 700);
        
        // Set up for open-up conversation flow
        setFlow('open_up');
        setStep('waiting_for_input');
        setIsChatDisabled(false);
        
        await logMessage('Check-in today');
        await logMessage("Hey! You've already done your check-in for today. Come back tomorrow for your next one!", 'bot');
        await logMessage(moodSummary, 'bot');
        await logMessage(`But if you feel like opening up more or just talking about your emotions, I'm right here to listen. Your thoughts and feelings are important. You can tell me more about why you're feeling ${moodData.mood ? moodData.mood.charAt(0).toUpperCase() + moodData.mood.slice(1) : 'this way'} today so I can understand you better? 💬`, 'bot');
        
      } catch (error) {
        console.error('Failed to fetch mood data:', error);
        // Fallback message if API calls fail
        setMessages([{ from: 'user', text: 'Check-in today' }]);
        await addMessageWithTyping("Hey! You've already done your check-in for today. Come back tomorrow for your next one!", 600);
        await addMessageWithTyping("But if you feel like opening up more or just talking about your emotions, I'm right here to listen. Your thoughts and feelings are important. You can tell me more about why you're feeling this way today so I can understand you better? 💬", 700);
        
        // Set up for open-up conversation flow
        setFlow('open_up');
        setStep('waiting_for_input');
        setIsChatDisabled(false);
        
        await logMessage('Check-in today');
        await logMessage("Hey! You've already done your check-in for today. Come back tomorrow for your next one!", 'bot');
        await logMessage("But if you feel like opening up more or just talking about your emotions, I'm right here to listen. Your thoughts and feelings are important. You can tell me more about why you're feeling this way today so I can understand you better? 💬", 'bot');
      }
      return;
    }
    
    // User hasn't checked in today, proceed with mood check-in
      setFlow('mood');
      setStep('choose_mood');
      
      // Add message with typing animation and sound for mood check-in
      await addMessageWithTyping("Let's help you start strong by checking how you feel today. Choose what you've felt overall today:", 600);
      setMessages(msgs => {
        const lastMessage = msgs[msgs.length - 1];
        if (lastMessage && lastMessage.from === 'bot' && lastMessage.text === "Let's help you start strong by checking how you feel today. Choose what you've felt overall today:") {
          // Update the last message to include options
          const updatedMessages = [...msgs];
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
            options: [
          { label: 'Happy', value: 'Happy' },
          { label: 'Good', value: 'Good' },
          { label: 'Neutral', value: 'Neutral' },
          { label: 'Sad', value: 'Sad' },
          { label: 'Angry', value: 'Angry' },
            ]
          };
          return updatedMessages;
        }
        return msgs;
      });
      
    await logMessage('Check-in today');
    await logMessage("Let's help you start strong by checking how you feel today. Choose what you've felt overall today:", 'bot');
  };

  // Main option handler
  const handleOption = async (opt) => {
    // Log user option selection
    await logMessage(opt);
    
    if (opt === 'I need someone to talk to') {
      setFlow('general');
      setStep('listening');
      setMessages(msgs => [...msgs, { from: 'user', text: opt }]);
      const botResponse = "I'm here to listen. What's on your mind today? Feel free to share whatever you're comfortable with.";
      await logMessage(botResponse, 'bot');
      setMessages(msgs => [...msgs, {
        from: 'bot',
        text: botResponse
      }]);
    }
  };

  // Handle counselor selection
  const handleCounselor = async (name) => {
    const counselor = counselors.find(c => c.full_name === name);
    setSelectedCounselor(counselor);
    setMessages(msgs => [...msgs, { from: 'user', text: name }]);
    setStep('choose_date');
    
    // Add typing animation and sound for date selection message with options
    await addMessageWithTyping('Please select a date for your appointment:', 600);
    setMessages(msgs => {
      const lastMessage = msgs[msgs.length - 1];
      if (lastMessage && lastMessage.from === 'bot' && lastMessage.text === 'Please select a date for your appointment:') {
        // Update the last message to include options
        const updatedMessages = [...msgs];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          options: [{ label: 'Pick a date', value: 'date_input' }]
        };
        return updatedMessages;
      }
      return msgs;
    });
    
    await logMessage(name);
    await logMessage('Please select a date for your appointment:', 'bot');
  };

  const handleDate = async (date) => {
    setSelectedDate(date);
    setMessages(msgs => [...msgs, { from: 'user', text: new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }]);
    setLoading(true);
    try {
      const slotData = await getProviderAvailableTimes(selectedCounselor.id); // This returns all times, so filter by date if needed
      // For now, assume all times are available for the selected date
      setSlots(slotData);
      setStep('choose_slot');
      
      // Add typing animation and sound for time selection message with options
      const timeMessage = `Please choose an available time for ${new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}:`;
      await addMessageWithTyping(timeMessage, 600);
      setMessages(msgs => {
        const lastMessage = msgs[msgs.length - 1];
        if (lastMessage && lastMessage.from === 'bot' && lastMessage.text === timeMessage) {
          // Update the last message to include options
          const updatedMessages = [...msgs];
          updatedMessages[updatedMessages.length - 1] = {
            ...lastMessage,
            options: slotData.length ? slotData.map(t => ({ label: to12Hour(t), value: t })) : ['No available slots']
          };
          return updatedMessages;
        }
        return msgs;
      });
      
      await logMessage(new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
      await logMessage(timeMessage, 'bot');
    } catch (e) {
      await addMessageWithTyping('Failed to load available times.', 400);
      await logMessage('Failed to load available times.', 'bot');
    }
    setLoading(false);
  };

  // Handle slot selection and booking
  const handleSlot = async (slot) => {
    const slotValue = typeof slot === 'object' && slot.value ? slot.value : slot;
    setSelectedSlot(slotValue);
    setMessages(msgs => [...msgs, { from: 'user', text: typeof slot === 'object' && slot.label ? slot.label : to12Hour(slotValue) }]);
    // Show confirmation step before booking
    setPendingBooking({
      provider: selectedCounselor,
      date: selectedDate,
      time: slotValue,
      timeLabel: typeof slot === 'object' && slot.label ? slot.label : to12Hour(slotValue)
    });
    setStep('confirm_booking');
    
    // Add typing animation and sound for confirmation message with options
    const confirmationMessage = `Please confirm your appointment details:\nProvider: Counselor ${selectedCounselor.full_name}\nDate: ${new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}\nTime: ${typeof slot === 'object' && slot.label ? slot.label : to12Hour(slotValue)}`;
    await addMessageWithTyping(confirmationMessage, 800);
    setMessages(msgs => {
      const lastMessage = msgs[msgs.length - 1];
      if (lastMessage && lastMessage.from === 'bot' && lastMessage.text === confirmationMessage) {
        // Update the last message to include options
        const updatedMessages = [...msgs];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          options: ['Confirm', 'Cancel']
        };
        return updatedMessages;
      }
      return msgs;
    });
    
    await logMessage(typeof slot === 'object' && slot.label ? slot.label : slot);
    await logMessage(confirmationMessage, 'bot');
  };

  // Handle mood selection
  const handleMood = async (moodLabel) => {
    const moodKey = moodLabel.toLowerCase();
    setMood(moodKey);
    setSurveyQuestions(moodQuestions[moodKey] || moodQuestions['happy']);
    setMessages(msgs => [...msgs, { from: 'user', text: moodLabel }]);
    setStep('mood_note');
    
    // Add message with typing animation and sound for mood note question
    await addMessageWithTyping('Would you like to add a note about your mood? (optional)', 600);
    setMessages(msgs => {
      const lastMessage = msgs[msgs.length - 1];
      if (lastMessage && lastMessage.from === 'bot' && lastMessage.text === 'Would you like to add a note about your mood? (optional)') {
        // Update the last message to include options
        const updatedMessages = [...msgs];
        updatedMessages[updatedMessages.length - 1] = {
          ...lastMessage,
          options: ['Skip', 'Add Note']
        };
        return updatedMessages;
      }
      return msgs;
    });
  };

  // Handle mood note or skip
  const handleMoodNote = async (opt) => {
    if (opt === 'Skip') {
      await submitMood('');
    } else {
      setStep('enter_note');
      await addMessageWithTyping('Please enter your note:', 600);
    }
  };

  // Submit mood
  const submitMood = async (note) => {
    setMoodNote(note);
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/submit-mood/', {
        method: 'POST',
        body: { mood, note },
      });
      setMoodEntryId(res.mood_entry_id);
      setStep('mood_survey');
      setSurveyStep(0);
      setSurveyAnswers([null, null, null]);
      await addMessageWithTyping('Please answer a few questions about your mood (1 = Strongly Disagree, 5 = Strongly Agree):', 600);
      
      // Dispatch real-time update event for mood submission
      const moodUpdateEvent = new CustomEvent('mood-updated', {
        detail: {
          mood: mood,
          note: note,
          date: new Date().toISOString().slice(0, 10),
          type: 'mood-submitted'
        }
      });
      window.dispatchEvent(moodUpdateEvent);
      
    } catch (e) {
      await addMessageWithTyping('Failed to submit mood.', 400);
      setStep(null);
      setFlow(null);
    }
    setLoading(false);
  };

  // Add or update this function in the component:
  const handleSurveySubmit = async (answers) => {
    setLoading(true);
    try {
      // Check if moodEntryId is available
      if (!moodEntryId) {
        throw new Error('Mood entry ID not found. Please try the mood check-in again.');
      }
      
      const res = await fetchWithAuth('/api/mood/submit-survey/', {
        method: 'POST',
        body: { mood_entry_id: moodEntryId, answers },
      });
      
      // Update the existing survey message to include the survey table
      setMessages(msgs => {
        const updatedMessages = [...msgs];
        // Find the last bot message that contains the survey text
        for (let i = updatedMessages.length - 1; i >= 0; i--) {
          if (updatedMessages[i].from === 'bot' && 
              updatedMessages[i].text === 'Please answer a few questions about your mood (1 = Strongly Disagree, 5 = Strongly Agree):') {
            updatedMessages[i] = {
              ...updatedMessages[i],
              surveyTable: { questions: surveyQuestions, answers }
            };
            break;
          }
        }
        return updatedMessages;
      });
      
      // Always show recommendation (whether survey was completed or skipped)
      await addMessageWithTyping(res.recommendation || 'Thank you for checking in!', 600);
      
      // Add "Thanks for checking in today!" message
      await addMessageWithTyping("Thanks for checking in today!", 600);
      
      // Check if survey was skipped for event type
      const isSurveySkipped = answers.every(a => a === null);
      
      // Dispatch real-time update event for survey completion
      const surveyUpdateEvent = new CustomEvent('mood-updated', {
        detail: {
          mood: mood,
          note: moodNote,
          date: new Date().toISOString().slice(0, 10),
          type: isSurveySkipped ? 'mood-submitted' : 'survey-completed',
          recommendation: res.recommendation, // Always include recommendation
          answers: answers
        }
      });
      window.dispatchEvent(surveyUpdateEvent);
      
    } catch (e) {
      console.error('Survey submission error:', e);
      await addMessageWithTyping('Failed to submit survey. Please try again.', 400);
    }
    setLoading(false);
    setStep(null);
    setFlow(null);
    setIsChatDisabled(true); // Disable chat and show "Start the chat again" button
  };

  // Main message handler
  const handleSend = async () => {
    if (input.trim() === '') return;
    
    const userMessage = input.trim();
    setMessages([...messages, { from: 'user', text: userMessage }]);
    
    // Log user message and get keyword detection response
    const logResponse = await logMessage(userMessage, 'user', flow === 'chat_with_me');
    
    if (flow === 'mood' && step === 'enter_note') {
      submitMood(userMessage);
      setInput('');
      return;
    } else if (flow === 'chat_with_me') {
      // Handle the new rule-based chatbot flow for "Chat with me"
      try {
        // Ensure conversation is initialized
        let currentConversationId = conversationId;
        if (!currentConversationId) {
          const initResponse = await startChatbotConversation('general', sessionId);
          currentConversationId = initResponse.conversation_id;
          setConversationId(currentConversationId);
        }
        
        const response = await handleChatWithMeConversation(currentConversationId, userMessage, step);
        
        if (response && response.response) {
          await addMessageWithTyping(response.response, 600);
          
          // Update step for next interaction
          if (response.next_step) {
            setStep(response.next_step);
            
            // Automatically trigger high-risk escalation
            if (response.next_step === 'high_risk_escalation') {
              // Wait a bit for the current message to be displayed, then trigger escalation
              setTimeout(async () => {
                try {
                  const escalationResponse = await handleChatWithMeConversation(currentConversationId, '', 'high_risk_escalation');
                  
                  if (escalationResponse && escalationResponse.response) {
                    await addMessageWithTyping(escalationResponse.response, 600);
                    
                    // Update step again
                    if (escalationResponse.next_step) {
                      setStep(escalationResponse.next_step);
                    }
                    
                    // Automatically trigger hotline message
                    if (escalationResponse.next_step === 'high_risk_hotline') {
                      setTimeout(async () => {
                        try {
                          const hotlineResponse = await handleChatWithMeConversation(currentConversationId, '', 'high_risk_hotline');
                          
                          if (hotlineResponse && hotlineResponse.response) {
                            await addMessageWithTyping(hotlineResponse.response, 600);
                            
                            // Update step again
                            if (hotlineResponse.next_step) {
                              setStep(hotlineResponse.next_step);
                            }
                            
                            // Check if conversation is completed
                            if (hotlineResponse.conversation_completed) {
                              // For chat_with_me flow, don't disable chat - keep it open for continuous conversation
                              if (flow === 'chat_with_me') {
                                // Reset to greeting step for continuous conversation
                                setStep('greeting');
                              } else {
                                setFlow(null);
                                setStep(null);
                                setIsChatDisabled(true);
                              }
                            }
                          }
                        } catch (error) {
                          console.error('Failed to trigger hotline message:', error);
                        }
                      }, 1000); // Wait 1 second before showing hotline message
                    }
                  }
                } catch (error) {
                  console.error('Failed to trigger high-risk escalation:', error);
                }
              }, 1000); // Wait 1 second before showing escalation message
            }
          }
          
          // Add options if provided
          if (response.options) {
            setMessages(msgs => {
              const lastMessage = msgs[msgs.length - 1];
              if (lastMessage && lastMessage.from === 'bot' && lastMessage.text === response.response) {
                const updatedMessages = [...msgs];
                updatedMessages[updatedMessages.length - 1] = {
                  ...lastMessage,
                  options: response.options
                };
                return updatedMessages;
              }
              return msgs;
            });
          }
          
          // Check if conversation is completed
          if (response.conversation_completed) {
            // For chat_with_me flow, don't disable chat - keep it open for continuous conversation
            if (flow === 'chat_with_me') {
              // Reset to greeting step for continuous conversation
              setStep('greeting');
            } else {
              setFlow(null);
              setStep(null);
              setIsChatDisabled(true);
            }
          }
        }
      } catch (error) {
        console.error('Failed to handle chat with me conversation:', error);
        await addMessageWithTyping("I'm sorry, I'm having trouble processing that right now. Please try again.", 400);
      }
    } else if (flow === 'open_up') {
      // Handle open-up conversation flow
      try {
        const response = await handleOpenUpConversation(conversationId, userMessage, step);
        
        if (response && response.response) {
          await addMessageWithTyping(response.response, 600);
          
          // Update step for next interaction
          if (response.next_step) {
            setStep(response.next_step);
            
            // Automatically trigger follow-up step if needed
            if (response.next_step === 'follow_up') {
              // Wait a bit for the current message to be displayed, then trigger follow-up
              setTimeout(async () => {
                try {
                  const followUpResponse = await handleOpenUpConversation(conversationId, '', 'follow_up');
                  
                  if (followUpResponse && followUpResponse.response) {
                    await addMessageWithTyping(followUpResponse.response, 600);
                    
                    // Update step again
                    if (followUpResponse.next_step) {
                      setStep(followUpResponse.next_step);
                    }
                    
                    // Add options if provided
                    if (followUpResponse.options) {
                      setMessages(msgs => {
                        const lastMessage = msgs[msgs.length - 1];
                        if (lastMessage && lastMessage.from === 'bot' && lastMessage.text === followUpResponse.response) {
                          const updatedMessages = [...msgs];
                          updatedMessages[updatedMessages.length - 1] = {
                            ...lastMessage,
                            options: followUpResponse.options
                          };
                          return updatedMessages;
                        }
                        return msgs;
                      });
                    }
                  }
                } catch (error) {
                  console.error('Failed to trigger follow-up:', error);
                }
              }, 1000); // Wait 1 second before showing follow-up
            }
            
            // Automatically trigger feedback check step if needed
            if (response.next_step === 'feedback_check') {
              // Wait a bit for the current message to be displayed, then trigger feedback check
              setTimeout(async () => {
                try {
                  const feedbackResponse = await handleOpenUpConversation(conversationId, '', 'feedback_check');
                  
                  if (feedbackResponse && feedbackResponse.response) {
                    await addMessageWithTyping(feedbackResponse.response, 600);
                    
                    // Update step again
                    if (feedbackResponse.next_step) {
                      setStep(feedbackResponse.next_step);
                    }
                    
                    // Add options if provided
                    if (feedbackResponse.options) {
                      setMessages(msgs => {
                        const lastMessage = msgs[msgs.length - 1];
                        if (lastMessage && lastMessage.from === 'bot' && lastMessage.text === feedbackResponse.response) {
                          const updatedMessages = [...msgs];
                          updatedMessages[updatedMessages.length - 1] = {
                            ...lastMessage,
                            options: feedbackResponse.options
                          };
                          return updatedMessages;
                        }
                        return msgs;
                      });
                    }
                  }
                } catch (error) {
                  console.error('Failed to trigger feedback check:', error);
                }
              }, 1000); // Wait 1 second before showing feedback check
            }
          }
          
          // Add options if provided
          if (response.options) {
            setMessages(msgs => {
              const lastMessage = msgs[msgs.length - 1];
              if (lastMessage && lastMessage.from === 'bot' && lastMessage.text === response.response) {
                const updatedMessages = [...msgs];
                updatedMessages[updatedMessages.length - 1] = {
                  ...lastMessage,
                  options: response.options
                };
                return updatedMessages;
              }
              return msgs;
            });
          }
          
          // Check if conversation is completed
          if (response.conversation_completed) {
            setFlow(null);
            setStep(null);
            setIsChatDisabled(true);
          }
        }
      } catch (error) {
        console.error('Failed to handle open-up conversation:', error);
        await addMessageWithTyping("I'm sorry, I'm having trouble processing that right now. Please try again.", 400);
      }
    } else if (flow === 'general' && step === 'listening') {
      // Handle general conversation - provide supportive responses
      let botResponse = "Thank you for sharing that with me. ";
      
      // Check if keywords were detected (from logResponse)
      if (logResponse && logResponse.flagged_keywords && logResponse.flagged_keywords.length > 0) {
        // Contextual response already added by logMessage function
        botResponse += "Is there anything specific you'd like help with, or would you like me to connect you with a counselor?";
      } else {
        botResponse += "How are you feeling about that? I'm here to listen and support you.";
      }
      
      await logMessage(botResponse, 'bot');
      setMessages(msgs => [...msgs, { 
        from: 'bot', 
        text: botResponse,
        options: [
          'I want to talk to a counselor',
          'I feel better now',
          'Tell me more about mental health resources'
        ]
      }]);
    }
    
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSend();
  };

  // Handle chatbot close
  const handleClose = async () => {
    if (conversationId) {
      try {
        await endChatbotConversation(conversationId);
      } catch (error) {
        console.error('Failed to end conversation:', error);
      }
    }
    onClose();
  };

  // Option click handler
  const handleOptionClick = async (opt) => {
    if (loading) return;
    if (!flow) return handleOption(opt);
    if (flow === 'chat_with_me') {
      // Handle chat with me flow options
      setMessages(msgs => [...msgs, { from: 'user', text: opt }]);
      
      try {
        // Ensure conversation is initialized
        let currentConversationId = conversationId;
        if (!currentConversationId) {
          const initResponse = await startChatbotConversation('general', sessionId);
          currentConversationId = initResponse.conversation_id;
          setConversationId(currentConversationId);
        }
        
        const response = await handleChatWithMeConversation(currentConversationId, opt, step);
        
        if (response && response.response) {
          await addMessageWithTyping(response.response, 600);
          
          // Update step for next interaction
          if (response.next_step) {
            setStep(response.next_step);
          }
          
          // Add options if provided
          if (response.options) {
            setMessages(msgs => {
              const lastMessage = msgs[msgs.length - 1];
              if (lastMessage && lastMessage.from === 'bot' && lastMessage.text === response.response) {
                const updatedMessages = [...msgs];
                updatedMessages[updatedMessages.length - 1] = {
                  ...lastMessage,
                  options: response.options
                };
                return updatedMessages;
              }
              return msgs;
            });
          }
          
          // Check if conversation is completed
          if (response.conversation_completed) {
            // For chat_with_me flow, don't disable chat - keep it open for continuous conversation
            if (flow === 'chat_with_me') {
              // Reset to greeting step for continuous conversation
              setStep('greeting');
            } else {
              setFlow(null);
              setStep(null);
              setIsChatDisabled(true);
            }
          }
        }
      } catch (error) {
        console.error('Failed to handle chat with me option:', error);
        await addMessageWithTyping("I'm sorry, I'm having trouble processing that right now. Please try again.", 400);
      }
      return;
    } else if (flow === 'appointment') {
      if (step === 'choose_counselor') return handleCounselor(opt);
      if (step === 'choose_date') {
        if (typeof opt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(opt)) return handleDate(opt);
        if (opt === 'date_input') {
          setMessages(msgs => [...msgs, { from: 'user', text: 'Pick a date' }]);
          
          // Add typing animation and sound for date input message
          await addMessageWithTyping('Please select a date:', 400);
          setStep('waiting_for_date_input');
          
          await logMessage('Pick a date');
          await logMessage('Please select a date:', 'bot');
          return;
        }
        // Also check if it's the label text
        if (opt === 'Pick a date') {
          setMessages(msgs => [...msgs, { from: 'user', text: 'Pick a date' }]);
          await addMessageWithTyping('Please select a date:', 400);
          setStep('waiting_for_date_input');
          await logMessage('Pick a date');
          await logMessage('Please select a date:', 'bot');
          return;
        }
      }
      if (step === 'choose_slot') return handleSlot(opt);
      if (step === 'waiting_for_date_input') {
        if (typeof opt === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(opt)) return handleDate(opt);
      }
      if (step === 'appointment_completed') {
        if (opt === 'Start the chat again') {
          // Reset to initial welcome page
          setStep(null);
          setFlow(null);
          setPendingBooking(null);
          setSelectedCounselor(null);
          setSelectedDate("");
          setSelectedSlot(null);
          setSlots([]);
          
          // Clear messages and show welcome panel
          setMessages([{ from: 'bot', text: "Hi! How can I help you today?", options: [] }]);
          setShowChat(false);
          
          await logMessage('Start the chat again');
        }
        return;
      }
      if (step === 'confirm_booking') {
        if (opt === 'Confirm' && pendingBooking) {
          setLoading(true);
          try {
            const userProfile = await fetchWithAuth('/api/user/profile/');
            const providerId = Number(pendingBooking.provider.id);
            const clientId = Number(userProfile.id);
            const date = String(pendingBooking.date);
            const time = String(pendingBooking.time);
            const notes = '';
            const serviceType = 'mental';
            const payload = {
              provider_id: providerId,
              client_id: clientId,
              date,
              time,
              reason: notes,
              service_type: serviceType
            };
            const newAppt = await createAppointment(payload);
            if (onScheduled) onScheduled(newAppt);
            
            // Dispatch real-time update events for both student and counselor dashboards
            window.dispatchEvent(new Event('student-appointment-updated'));
            window.dispatchEvent(new Event('counselor-appointment-updated'));
            
            // Add typing animation and sound for confirmation message
            const successMessage = `You're all set! Your appointment with Counselor ${pendingBooking.provider.full_name} is confirmed for ${new Date(pendingBooking.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${pendingBooking.timeLabel}. Everything has been arranged successfully.`;
            await addMessageWithTyping(successMessage, 1000);
            
            // Add closing message
            const closingMessage = "Thank you for scheduling your appointment. See you on your appointment day, take care in the meantime.";
            await addMessageWithTyping(closingMessage, 800);
            
            // Set special state to show "Start the chat again" in message input area
            setStep('appointment_completed');
            setFlow('appointment');
            setPendingBooking(null);
            
            await logMessage('Confirm');
            await logMessage(successMessage, 'bot');
            await logMessage(closingMessage, 'bot');
          } catch (e) {
            let errorMsg = 'Failed to book appointment. Please try again.';
            if (e && e.message) errorMsg += `\n${e.message}`;
            await addMessageWithTyping(errorMsg, 600);
            await logMessage('Confirm');
            await logMessage(errorMsg, 'bot');
          }
          setLoading(false);
        } else if (opt === 'Start the chat again') {
          // Reset to initial welcome page
          setStep(null);
          setFlow(null);
          setPendingBooking(null);
          setSelectedCounselor(null);
          setSelectedDate("");
          setSelectedSlot(null);
          setSlots([]);
          
          // Clear messages and show welcome panel
          setMessages([{ from: 'bot', text: "Hi! How can I help you today?", options: [] }]);
          setShowChat(false);
          
          await logMessage('Start the chat again');
        } else if (opt === 'Cancel') {
          // Reset to initial welcome page
          setStep(null);
          setFlow(null);
          setPendingBooking(null);
          setSelectedCounselor(null);
          setSelectedDate("");
          setSelectedSlot(null);
          setSlots([]);
          
          // Hide chat and show welcome panel
          setShowChat(false);
          
          await logMessage('Cancel');
        }
        return;
      }
    } else if (flow === 'mood') {
      if (step === 'choose_mood') return handleMood(opt);
      if (step === 'mood_note') return handleMoodNote(opt);
      if (step === 'enter_note') return submitMood(opt);
    } else if (flow === 'open_up') {
      // Handle open-up conversation flow options
      if (step === 'waiting_for_activity_choice') {
        // Handle activity selection
        setMessages(msgs => [...msgs, { from: 'user', text: opt }]);
        
        try {
          const response = await handleOpenUpConversation(conversationId, opt, 'activity_instruction');
          
          if (response && response.response) {
            await addMessageWithTyping(response.response, 600);
            
            // Update step for next interaction
            if (response.next_step) {
              setStep(response.next_step);
              
              // Automatically trigger follow-up step if needed
              if (response.next_step === 'follow_up') {
                setTimeout(async () => {
                  try {
                    const followUpResponse = await handleOpenUpConversation(conversationId, '', 'follow_up');
                    
                    if (followUpResponse && followUpResponse.response) {
                      await addMessageWithTyping(followUpResponse.response, 600);
                      
                      // Update step again
                      if (followUpResponse.next_step) {
                        setStep(followUpResponse.next_step);
                      }
                      
                      // Add options if provided
                      if (followUpResponse.options) {
                        setMessages(msgs => {
                          const lastMessage = msgs[msgs.length - 1];
                          if (lastMessage && lastMessage.from === 'bot' && lastMessage.text === followUpResponse.response) {
                            const updatedMessages = [...msgs];
                            updatedMessages[updatedMessages.length - 1] = {
                              ...lastMessage,
                              options: followUpResponse.options
                            };
                            return updatedMessages;
                          }
                          return msgs;
                        });
                      }
                    }
                  } catch (error) {
                    console.error('Failed to trigger follow-up:', error);
                  }
                }, 1000); // Wait 1 second before showing follow-up
              }
            }
          }
        } catch (error) {
          console.error('Failed to handle activity instruction:', error);
          await addMessageWithTyping("I'm sorry, I'm having trouble processing that right now. Please try again.", 400);
        }
        return;
      } else if (step === 'follow_up' || step === 'waiting_for_follow_up_response' || step === 'feedback_check' || step === 'waiting_for_feedback_response') {
        // Add user's choice as a message
        setMessages(msgs => [...msgs, { from: 'user', text: opt }]);
        
        // Determine the next step based on current step and user's choice
        let nextStep = '';
        if (step === 'follow_up' || step === 'waiting_for_follow_up_response') {
          nextStep = 'follow_up_response';
        } else if (step === 'feedback_check' || step === 'waiting_for_feedback_response') {
          nextStep = 'feedback_response';
        }
        
        // Process the response
        try {
          const response = await handleOpenUpConversation(conversationId, opt, nextStep);
          
          if (response && response.response) {
            await addMessageWithTyping(response.response, 600);
            
            // Update step for next interaction
            if (response.next_step) {
              setStep(response.next_step);
              
              // Automatically trigger feedback check step if needed
              if (response.next_step === 'feedback_check') {
                // Wait a bit for the current message to be displayed, then trigger feedback check
                setTimeout(async () => {
                  try {
                    const feedbackResponse = await handleOpenUpConversation(conversationId, '', 'feedback_check');
                    
                    if (feedbackResponse && feedbackResponse.response) {
                      await addMessageWithTyping(feedbackResponse.response, 600);
                      
                      // Update step again
                      if (feedbackResponse.next_step) {
                        setStep(feedbackResponse.next_step);
                      }
                      
                      // Add options if provided
                      if (feedbackResponse.options) {
                        setMessages(msgs => {
                          const lastMessage = msgs[msgs.length - 1];
                          if (lastMessage && lastMessage.from === 'bot' && lastMessage.text === feedbackResponse.response) {
                            const updatedMessages = [...msgs];
                            updatedMessages[updatedMessages.length - 1] = {
                              ...lastMessage,
                              options: feedbackResponse.options
                            };
                            return updatedMessages;
                          }
                          return msgs;
                        });
                      }
                      
                      // Automatically trigger closing message if needed
                      if (feedbackResponse.next_step === 'closing') {
                        setTimeout(async () => {
                          try {
                            const closingResponse = await handleOpenUpConversation(conversationId, '', 'closing');
                            
                            if (closingResponse && closingResponse.response) {
                              await addMessageWithTyping(closingResponse.response, 600);
                              
                              // End the conversation
                              setFlow(null);
                              setStep(null);
                              setIsChatDisabled(true);
                            }
                          } catch (error) {
                            console.error('Failed to trigger closing message:', error);
                          }
                        }, 1000); // Wait 1 second before showing closing message
                      }
                    }
                  } catch (error) {
                    console.error('Failed to trigger feedback check:', error);
                  }
                }, 1000); // Wait 1 second before showing feedback check
              }
              
              // Automatically trigger closing message if needed (for direct closing step)
              if (response.next_step === 'closing') {
                setTimeout(async () => {
                  try {
                    const closingResponse = await handleOpenUpConversation(conversationId, '', 'closing');
                    
                    if (closingResponse && closingResponse.response) {
                      await addMessageWithTyping(closingResponse.response, 600);
                      
                      // End the conversation
                      setFlow(null);
                      setStep(null);
                      setIsChatDisabled(true);
                    }
                  } catch (error) {
                    console.error('Failed to trigger closing message:', error);
                  }
                }, 1000); // Wait 1 second before showing closing message
              }
            }
            
            // Add options if provided
            if (response.options) {
              setMessages(msgs => {
                const lastMessage = msgs[msgs.length - 1];
                if (lastMessage && lastMessage.from === 'bot' && lastMessage.text === response.response) {
                  const updatedMessages = [...msgs];
                  updatedMessages[updatedMessages.length - 1] = {
                    ...lastMessage,
                    options: response.options
                  };
                  return updatedMessages;
                }
                return msgs;
              });
            }
            
            // Check if conversation is completed
            if (response.conversation_completed) {
              setFlow(null);
              setStep(null);
              setIsChatDisabled(true);
            }
          }
        } catch (error) {
          console.error('Failed to handle open-up conversation option:', error);
          await addMessageWithTyping("I'm sorry, I'm having trouble processing that right now. Please try again.", 400);
        }
      }
    }
  };

  // Render chat bubbles
  const renderMessages = () => (
    <div style={{
      flex: 1,
      padding: '32px 24px 0 24px',
      overflowY: 'auto',
      background: 'transparent',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      {messages.map((msg, idx) => (
        <div key={idx} style={{
          display: 'flex',
          flexDirection: msg.from === 'user' ? 'row-reverse' : 'row',
          alignItems: 'flex-end',
          gap: 8,
        }}>
          {msg.from === 'bot' && <BotAvatar />}
          <div style={{
            background: msg.from === 'user' ? '#b2f7ef' : '#fff',
            color: msg.from === 'user' ? '#22806a' : '#222',
            borderRadius: 18,
            padding: '12px 18px',
            maxWidth: msg.options ? 380 : 420,
            fontSize: msg.from === 'user' ? 16 : 15,
            fontWeight: 400,
            border: msg.from === 'user' ? 'none' : '1.5px solid #e0e0e0',
            boxShadow: 'none',
            marginLeft: msg.from === 'user' ? 40 : 0,
            marginRight: msg.from === 'user' ? 0 : 0,
            width: msg.options ? '100%' : 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
          }}>
            <div style={{ whiteSpace: 'pre-line' }}>
              {msg.moodImage ? 
                msg.text.replace('[MOOD_IMAGE]', '').split('\n').map((line, index) => (
                  <div key={index}>
                    {line}
                    {line === '' && index === 2 && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        marginTop: 8,
                        marginBottom: 8
                      }}>
                        <img 
                          src={msg.moodImage} 
                          alt="mood" 
                          style={{ 
                            width: 48, 
                            height: 48, 
                            objectFit: 'contain',
                            borderRadius: '8px'
                          }} 
                        />
                      </div>
                    )}
                  </div>
                ))
                : msg.text
              }
            </div>
            {msg.surveyTable && renderStaticSurveyTable(msg.surveyTable.questions, msg.surveyTable.answers)}
            {msg.options && (
              <div style={{ 
                marginTop: 12, 
                display: msg.options.length === 1 ? 'flex' : 'grid', 
                gridTemplateColumns: msg.options.length === 1 ? 'none' : 'repeat(2, 1fr)', 
                gap: 10, 
                alignItems: 'center',
                justifyContent: msg.options.length === 1 ? 'center' : 'stretch',
                width: '100%',
                maxWidth: 500
              }}>
                {msg.options.map((opt, i) => (
                  <button key={i} style={{
                    background: '#20bfa9',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 0',
                    fontSize: 15,
                    fontWeight: 500,
                    width: msg.options.length === 1 ? 240 : '100%',
                    marginBottom: 0,
                    cursor: 'pointer',
                    textAlign: 'center',
                    marginTop: 0,
                    boxShadow: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                  }} onClick={() => handleOptionClick(opt.value || opt)}>
                                    {moodImages[opt.value] && (
                  <img src={moodImages[opt.value]} alt={opt.value} width={24} height={24} style={{ objectFit: 'contain', marginRight: 8 }} />
                    )}
                    <span>{opt.label || opt}</span>
                  </button>
                ))}
              </div>
            )}
            {/* Render date input if waiting for date input */}
            {flow === 'appointment' && step === 'waiting_for_date_input' && idx === messages.length - 1 && (
              <div style={{ marginTop: 16 }}>
                <input
                  type="date"
                  className="form-control"
                  style={{ fontSize: 15, borderRadius: 8, padding: '8px 12px', border: '1.5px solid #e0e0e0', width: '100%' }}
                  onChange={e => {
                    if (e.target.value) handleOptionClick(e.target.value);
                  }}
                />
              </div>
            )}
            {flow === 'mood' && step === 'mood_survey' && idx === messages.length - 1 && (
              <form
                style={{ marginTop: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
                onSubmit={e => e.preventDefault()}
              >
                <div style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  padding: 24,
                  width: '100%',
                  maxWidth: 480,
                  margin: '0 auto 18px auto',
                  textAlign: 'left',
                  border: '1.5px solid #d3d3d3',
                  boxSizing: 'border-box',
                }}>
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
                          <td style={{ color: '#20bfa9', fontSize: '1rem', padding: '12px 0', verticalAlign: 'middle' }}>{q}</td>
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
                                  // Auto-submit if all answered
                                  if (updated.every(a => a !== null)) handleSurveySubmit(updated);
                                }}
                                style={{ accentColor: '#20bfa9', width: 20, height: 20 }}
                                disabled={loading}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Skip Survey Button */}
                <button
                  onClick={() => {
                    // Skip survey and complete mood check-in
                    handleSurveySubmit([null, null, null]); // Submit with null answers
                  }}
                  style={{
                    background: '#f8f9fa',
                    color: '#6c757d',
                    border: '1.5px solid #dee2e6',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'center',
                    marginTop: 8,
                    transition: 'all 0.2s',
                  }}
                  disabled={loading}
                >
                  Skip
                </button>
              </form>
            )}
          </div>
        </div>
      ))}
      
      {/* Typing animation */}
      {isTyping && (
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 8,
        }}>
          <BotAvatar />
          <div style={{
            background: '#fff',
            color: '#222',
            borderRadius: 18,
            padding: '12px 18px',
            maxWidth: 420,
            fontSize: 15,
            fontWeight: 400,
            border: '1.5px solid #e0e0e0',
            boxShadow: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <span style={{ fontSize: 16 }}>●</span>
            <span style={{ fontSize: 16 }}>●</span>
            <span style={{ fontSize: 16 }}>●</span>
          </div>
        </div>
      )}
      

      
      <div ref={messagesEndRef} />
    </div>
  );

  // Chat UI
  const chatPanel = (
    <div style={{
      position: 'fixed',
      bottom: 104,
      right: 32,
      width: 540,
      maxWidth: '98vw',
      height: 700,
      background: 'linear-gradient(135deg, #d6f8f3 0%, #e9fcfa 100%)',
      borderRadius: 28,
      boxShadow: '0 16px 48px rgba(60,140,108,0.18)',
      border: '1.5px solid #e0e0e0',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10000,
      padding: 0,
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        width: '100%',
        height: 56,
        background: 'transparent',
        display: 'flex',
        alignItems: 'center',
        // Place arrow and dots together
        padding: '0 18px',
        gap: 0,
      }}>
        <button onClick={() => setShowChat(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#222', fontSize: 28, display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontWeight: 700 }}>
          <span style={{fontSize: 28, fontWeight: 700, lineHeight: 1, color: '#222'}}>←</span>
        </button>
        <div style={{ flex: 1 }} />
        <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#222', fontSize: 28, fontWeight: 700 }}>
          <span style={{fontSize: 32, fontWeight: 700, color: '#222', lineHeight: 1}}>-</span>
        </button>
      </div>
      {/* Chat Messages */}
      {renderMessages()}
      {/* Input */}
      <div style={{
        padding: 18,
        // No background, fully transparent to let parent gradient show through
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
      }}>
        {(isChatDisabled || (flow === 'appointment' && step === 'appointment_completed')) && flow !== 'chat_with_me' ? (
          <button
            onClick={async () => {
              setIsChatDisabled(false);
              setFlow(null);
              setStep(null);
              setMessages([]);
              await addMessageWithTyping("Hi! How can I help you today?", 600);
              setInput('');
              setShowChat(false); // Return to initial welcome page
            }}
            style={{
              flex: 1,
              background: '#20bfa9',
              color: '#fff',
              border: 'none',
              borderRadius: 18,
              padding: '12px 18px',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'background 0.2s',
            }}
          >
            Start the chat again
          </button>
        ) : (
          <>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write your message..."
              style={{
                flex: 1,
                border: '1.5px solid #d0d0d0',
                borderRadius: 18,
                padding: '12px 18px',
                fontSize: 15,
                outline: 'none',
                background: '#fff',
                marginRight: 8,
                color: '#222',
                cursor: 'text',
              }}
            />
            <button
              onClick={handleSend}
              style={{
                background: '#20bfa9',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                cursor: 'pointer',
                boxShadow: 'none',
              }}
            >
              <BsSend size={22} />
            </button>
          </>
        )}
      </div>
    </div>
  );

  // Welcome panel
  const welcomePanel = (
    <div style={{
      position: 'fixed',
      bottom: 104,
      right: 32,
      width: 540,
      maxWidth: '98vw',
      height: 700,
      background: 'linear-gradient(135deg, #d6f8f3 0%, #e9fcfa 100%)',
      borderRadius: 28,
      boxShadow: '0 16px 48px rgba(60,140,108,0.18)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10000,
      padding: 0,
      overflow: 'hidden',
    }}>
      {/* Minimize Button */}
      <button onClick={handleClose} style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', cursor: 'pointer', color: '#222', fontSize: 32, fontWeight: 700, zIndex: 2 }}>
        <span style={{fontSize: 32, fontWeight: 700, color: '#222', lineHeight: 1}}>-</span>
      </button>
      {/* Logo and Greeting */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        flex: 1,
        padding: '40px 0 0 40px',
      }}>
                      <img src="/img/amietilogo.png" alt="AMIETI Logo" width={44} height={44} style={{ marginBottom: 32 }} />
        <h1 style={{
          color: '#22806a',
          fontWeight: 700,
          fontSize: 40,
          margin: 0,
          textAlign: 'left',
          lineHeight: 1.15,
        }}>
          How can I<br />help you today?
        </h1>
      </div>
      {/* White Card for Description and Button */}
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 60,
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 14,
          boxShadow: 'none',
          padding: '28px 28px 24px 28px',
          minWidth: 340,
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}>
          <div style={{
            fontWeight: 700,
            fontSize: 15,
            color: '#20bfa9',
            marginBottom: 6,
            textAlign: 'left',
          }}>AMIETI</div>
          <div style={{
            fontWeight: 400,
            fontSize: 15,
            color: '#222',
            marginBottom: 18,
            textAlign: 'left',
            lineHeight: 1.4,
          }}>
            I'm AMIETI, your companion for mental well-being. Ready to transform, one chat at a time? How can I help you today?
          </div>
          <button
            style={{
              background: '#20bfa9',
              color: '#222',
              border: 'none',
              borderRadius: 8,
              padding: '12px 0',
              fontWeight: 600,
              fontSize: 17,
              cursor: 'pointer',
              width: '100%',
              marginTop: 0,
              outline: 'none',
              boxShadow: 'none',
              textAlign: 'center',
              transition: 'background 0.2s',
            }}
            onClick={handleChatWithMe}
          >
            Chat with me
          </button>
        </div>
      </div>
      
      {/* Navigation bar with Check-in Today and Talk to Counselor buttons */}
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
      }}>
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: '16px 24px',
          width: '100%',
          maxWidth: 400,
          margin: '0 28px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            width: '100%',
          }}>
            <button
              style={{
                background: 'transparent',
                color: '#222',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                fontWeight: 500,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
                outline: 'none',
                minWidth: 80,
              }}
              onClick={handleCheckInToday}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="9,22 9,12 15,12 15,22" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: 12, color: '#222' }}>Check-in Today</span>
            </button>
            <button
              style={{
                background: 'transparent',
                color: '#222',
                border: 'none',
                borderRadius: 8,
                padding: '8px 12px',
                fontWeight: 500,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
                outline: 'none',
                minWidth: 80,
              }}
              onClick={handleTalkToCounselor}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: 12, color: '#222' }}>Talk to Counselor</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return showChat ? chatPanel : welcomePanel;
}
