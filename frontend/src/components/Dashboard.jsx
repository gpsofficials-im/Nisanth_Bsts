import React, { useState, useEffect } from 'react';
import { Calendar, Bell, Heart, Sparkles, Gift } from 'lucide-react';
import { useStorage } from '../context/StorageContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function Dashboard() {
  const { config, showToast } = useStorage();
  
  // Real-time Anniversary Ticker
  const [anniversaryAge, setAnniversaryAge] = useState({
    years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0
  });

  // Event Countdowns
  const [events, setEvents] = useState([
    { name: 'Gokul Birthday', target: '01-08', icon: '🎂', reminder: true },
    { name: 'Nivetha Birthday', target: '12-02', icon: '🎁', reminder: true },
    { name: 'Besties Day', target: '06-08', icon: '✨', reminder: true },
    { name: 'Anniversary Day', target: '07-03', icon: '💖', reminder: true },
  ]);

  const [eventCountdowns, setEventCountdowns] = useState({});

  // Rotating Quotes List State
  const defaultQuotes = [
    "Private memories deserve a private universe.",
    "Two souls. One secure vault.",
    "Moments stay forever inside Nishanth Wallet.",
    "Securing our shared digital lifetime, second by second.",
    "Every screenshot, every laughter, preserved in neon glass."
  ];

  const quotesList = config?.quotes || defaultQuotes;
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const quoteTimer = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % quotesList.length);
    }, 8000);
    return () => clearInterval(quoteTimer);
  }, [quotesList]);

  // Compute live anniversary counters
  useEffect(() => {
    const annivDate = new Date(config?.anniversaryDate || '2023-07-03T00:00:00+05:30');
    
    const interval = setInterval(() => {
      const now = new Date();
      let diff = now - annivDate;

      if (diff < 0) diff = 0;

      const seconds = Math.floor((diff / 1000) % 60);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      
      // Calculate years, months, days accurately
      let years = now.getFullYear() - annivDate.getFullYear();
      let months = now.getMonth() - annivDate.getMonth();
      let days = now.getDate() - annivDate.getDate();

      if (days < 0) {
        // Borrow days from previous month
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
        months--;
      }
      if (months < 0) {
        months += 12;
        years--;
      }

      setAnniversaryAge({ years, months, days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [config]);

  // Compute countdowns to next occurrences of events
  useEffect(() => {
    const computeCountdowns = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const countdownData = {};

      events.forEach(evt => {
        const [monthStr, dayStr] = evt.target.split('-');
        const month = parseInt(monthStr) - 1; // 0-indexed
        const dateVal = parseInt(dayStr);

        let targetDate = new Date(currentYear, month, dateVal, 0, 0, 0);
        
        // If event already passed this year, point to next year
        if (targetDate - now < 0) {
          targetDate = new Date(currentYear + 1, month, dateVal, 0, 0, 0);
        }

        const diff = targetDate - now;
        const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        countdownData[evt.name] = {
          days: totalDays,
          timerStr: `${hours.toString().padStart(2, '0')}h : ${minutes.toString().padStart(2, '0')}m : ${seconds.toString().padStart(2, '0')}s`
        };
      });

      setEventCountdowns(countdownData);
    };

    computeCountdowns();
    const ticker = setInterval(computeCountdowns, 1000);
    return () => clearInterval(ticker);
  }, [events]);

  const toggleReminder = (index) => {
    const updated = [...events];
    updated[index].reminder = !updated[index].reminder;
    setEvents(updated);
    showToast(
      `${updated[index].name} reminder ${updated[index].reminder ? 'activated' : 'silenced'}.`,
      'info'
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  return (
    <div className="space-y-10">
      {/* 1. Anniversary Banner Counter */}
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel p-8 rounded-3xl text-center relative overflow-hidden border border-white/20 dark:border-white/5"
      >
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-pink-500/10 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl"></div>
        
        <div className="inline-flex items-center justify-center p-3 bg-rose-500/10 text-rose-500 rounded-full mb-3 border border-rose-500/20">
          <Heart className="w-6 h-6 animate-pulse" fill="currentColor" />
        </div>
        
        <h2 className="text-sm font-extrabold uppercase tracking-widest text-rose-500 dark:text-rose-400 mb-2">
          Together Since July 3, 2023
        </h2>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-white mb-6">
          Our Besties Anniversary Timeline
        </h1>

        {/* Dynamic counters grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 max-w-4xl mx-auto">
          {[
            { label: 'Years', val: anniversaryAge.years },
            { label: 'Months', val: anniversaryAge.months },
            { label: 'Days', val: anniversaryAge.days },
            { label: 'Hours', val: anniversaryAge.hours },
            { label: 'Minutes', val: anniversaryAge.minutes },
            { label: 'Seconds', val: anniversaryAge.seconds }
          ].map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="p-4 bg-white/40 dark:bg-slate-900/40 border border-white/50 dark:border-white/5 rounded-2xl shadow-sm backdrop-blur-md"
            >
              <div className="text-3xl md:text-4xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400 tracking-tight">
                {item.val.toString().padStart(2, '0')}
              </div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mt-1">
                {item.label}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 2. Event Countdown Grid Cards */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white">
              Upcoming Milestones
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Days and timers left for our special occasions.
            </p>
          </div>
          <Calendar className="w-5 h-5 text-indigo-500" />
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {events.map((evt, idx) => {
            const data = eventCountdowns[evt.name] || { days: 0, timerStr: '00:00:00' };
            return (
              <motion.div
                key={evt.name}
                variants={itemVariants}
                className="glass-card p-6 rounded-2xl relative overflow-hidden flex flex-col justify-between"
              >
                {/* Visual badge top right */}
                <div className="absolute top-4 right-4 text-2xl filter drop-shadow">
                  {evt.icon}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-800 dark:text-white leading-tight">
                      {evt.name}
                    </h3>
                    <p className="text-xs font-bold text-indigo-500 dark:text-indigo-400 mt-1">
                      {evt.target.replace('-', '/')}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="text-4xl font-extrabold tracking-tight text-slate-800 dark:text-white">
                      {data.days}{' '}
                      <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        days left
                      </span>
                    </div>
                    <div className="text-xs font-extrabold font-mono text-slate-400 dark:text-slate-500 uppercase">
                      {data.timerStr}
                    </div>
                  </div>
                </div>

                {/* Reminder Alert Switch */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Mail Alert Reminders
                  </span>
                  <button
                    onClick={() => toggleReminder(idx)}
                    className={`p-2 rounded-xl transition-all ${
                      evt.reminder 
                        ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400' 
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                    }`}
                  >
                    <Bell className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* Elegant Separator Line */}
      <hr className="border-t border-slate-200 dark:border-slate-800/80 my-8 shadow-sm" />

      {/* 3. Google-style Rotating Quote Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="glass-panel p-8 rounded-3xl text-center relative overflow-hidden border border-white/20 dark:border-white/5 backdrop-blur-md bg-slate-900/10 dark:bg-slate-950/20 shadow-md min-h-[140px] flex flex-col justify-center items-center select-none"
      >
        {/* Glow ambient design backdrops */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl animate-pulse-slow"></div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={quoteIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.5 }}
            className="space-y-2 relative z-10"
          >
            <p className="text-lg md:text-xl font-extrabold bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-400 bg-clip-text text-transparent italic tracking-tight font-serif">
              "{quotesList[quoteIndex]}"
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              ✨ Server Quote of the Day
            </p>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
