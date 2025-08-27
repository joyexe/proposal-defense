'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getMoodData, getWeekMoods, getLatestMoodRecommendation } from '../utils/api';

const MoodContext = createContext();

export const useMood = () => {
  const context = useContext(MoodContext);
  if (!context) {
    throw new Error('useMood must be used within a MoodProvider');
  }
  return context;
};

export const MoodProvider = ({ children }) => {
  const [todayMood, setTodayMood] = useState(null);
  const [todayNote, setTodayNote] = useState('');
  const [moodHistory, setMoodHistory] = useState([]);
  const [weekMoods, setWeekMoods] = useState([]);
  const [latestRecommendation, setLatestRecommendation] = useState('');
  const [loading, setLoading] = useState(false);

  // Initialize mood data
  useEffect(() => {
    const initializeMoodData = async () => {
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {

        setLoading(false);
        return;
      }
      
      // Check if user is a student (only students should have mood tracking)
      const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (!userProfile.role || userProfile.role !== 'student') {

        setLoading(false);
        return;
      }
      
      
      
      setLoading(true);
      try {
        // Fetch mood history
        const historyData = await getMoodData();
        let history = Array.isArray(historyData.data) ? historyData.data : [];
        
        // Parse stringified moods if needed
        history = history.map(entry => {
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
          return { ...entry, mood, note };
        });
        
        setMoodHistory(history); // newest to oldest (as received from API)
        
        // Get today's mood from history
        const today = new Date().toISOString().slice(0, 10);
        const todayEntry = history.find(entry => entry.date === today);
        if (todayEntry) {
          setTodayMood(todayEntry.mood);
          setTodayNote(todayEntry.note || '');
        }
        
        // Fetch week moods
        const todayDate = new Date();
        const start = new Date(todayDate);
        start.setDate(todayDate.getDate() - todayDate.getDay() + 1); // Monday
        const end = new Date(start);
        end.setDate(start.getDate() + 6); // Sunday
        
        const weekData = await getWeekMoods({ 
          start: start.toISOString().slice(0, 10), 
          end: end.toISOString().slice(0, 10) 
        });
        setWeekMoods(Array.isArray(weekData.week) ? weekData.week : []);
        
        // Fetch latest recommendation
        const recData = await getLatestMoodRecommendation();
        setLatestRecommendation(recData.recommendation || '');
        
      } catch (error) {
        console.error('Error initializing mood data:', error);
        // If it's an authentication error, don't show it as an error
        if (error.message && error.message.includes('Session expired')) {
  
        }
      } finally {
        setLoading(false);
      }
    };

    initializeMoodData();
  }, []);

  // Listen for real-time mood updates
  useEffect(() => {
    const handleMoodUpdate = async (event) => {
      // Check if user is a student before processing mood updates
      const userProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
      if (!userProfile.role || userProfile.role !== 'student') {
        return; // Ignore mood updates for non-students
      }
      
      const { mood, note, date, type } = event.detail;
      
      // Update today's mood and note
      setTodayMood(mood);
      setTodayNote(note);
      
      // Update mood history
      const todayStr = new Date().toISOString().slice(0, 10);
      setMoodHistory(prev => {
        const existingIndex = prev.findIndex(entry => entry.date === todayStr);
        if (existingIndex >= 0) {
          // Update existing entry
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], mood, note };
          return updated;
        } else {
          // Add new entry
          return [{ date: todayStr, mood, note }, ...prev];
        }
      });
      
      // Update week moods
      if (type === 'mood-submitted' || type === 'survey-completed') {
        setWeekMoods(prev => {
          const todayStr = new Date().toISOString().slice(0, 10);
          const existingIndex = prev.findIndex(entry => entry.date === todayStr);
          
          if (existingIndex >= 0) {
            // Update existing entry
            const updated = [...prev];
            updated[existingIndex] = { ...updated[existingIndex], mood };
            return updated;
          } else {
            // Add new entry
            return [...prev, { date: todayStr, mood }];
          }
        });
      }
      
      // Update recommendation if survey was completed
      if (type === 'survey-completed' && event.detail.recommendation) {
        setLatestRecommendation(event.detail.recommendation);
      } else if (type === 'mood-submitted') {
        // Fetch fresh recommendation
        try {
          const recData = await getLatestMoodRecommendation();
          setLatestRecommendation(recData.recommendation || '');
        } catch (error) {
          console.error('Error fetching recommendation:', error);
        }
      }
    };

    window.addEventListener('mood-updated', handleMoodUpdate);
    return () => window.removeEventListener('mood-updated', handleMoodUpdate);
  }, []);

  const value = {
    todayMood,
    todayNote,
    moodHistory,
    weekMoods,
    latestRecommendation,
    loading,
    setTodayMood,
    setTodayNote,
    setMoodHistory,
    setWeekMoods,
    setLatestRecommendation
  };

  return (
    <MoodContext.Provider value={value}>
      {children}
    </MoodContext.Provider>
  );
};
