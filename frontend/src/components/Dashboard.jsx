import React, { useState, useEffect } from 'react';
import { Calendar, Bell, Heart, Sparkles, Image, Film, FileText, MessageSquare, BookOpen, Clock, ArrowRight } from 'lucide-react';
import { useStorage } from '../context/StorageContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { config, media, timeline, showToast } = useStorage();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Real-time Anniversary Ticker
  const [anniversaryAge, setAnniversaryAge] = useState({
    years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0
  });

  // Milestones
  const [events, setEvents] = useState([
    { name: 'Gokul Birthday', target: '01-08', icon: '🎂', reminder: true },
    { name: 'Nivedha Birthday', target: '12-02', icon: '🎁', reminder: true },
    { name: 'Besties Day', target: '06-08', icon: '✨', reminder: true },
    { name: 'Anniversary Day', target: '07-03', icon: '💖', reminder: true },
  ]);

  const [eventCountdowns, setEventCountdowns] = useState({});

  // Dynamic Quotes List
  const defaultQuotes = [
    "Private memories deserve a private universe.",
    "Two souls. One secure vault.",
    "Moments stay forever inside Nisanth Besties.",
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
      
      let years = now.getFullYear() - annivDate.getFullYear();
      let months = now.getMonth() - annivDate.getMonth();
      let days = now.getDate() - annivDate.getDate();

      if (days < 0) {
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

  // Compute countdowns
  useEffect(() => {
    const computeCountdowns = () => {
      const now = new Date();
      const currentYear = now.getFullYear();
      const countdownData = {};

      events.forEach(evt => {
        const nameKey = evt.name.replace('Nivetha', 'Nivedha');
        const [monthStr, dayStr] = evt.target.split('-');
        const month = parseInt(monthStr) - 1;
        const dateVal = parseInt(dayStr);

        let targetDate = new Date(currentYear, month, dateVal, 0, 0, 0);
        if (targetDate - now < 0) {
          targetDate = new Date(currentYear + 1, month, dateVal, 0, 0, 0);
        }

        const diff = targetDate - now;
        const totalDays = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);

        countdownData[nameKey] = {
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
      `${updated[index].name.replace('Nivetha', 'Nivedha')} reminder ${updated[index].reminder ? 'activated' : 'silenced'}.`,
      'info'
    );
  };

  // Get dynamic data for gallery and timeline
  const recentPhotos = (media || [])
    .filter(m => m.type === 'photo')
    .slice(0, 4);

  const recentStories = (timeline || [])
    .slice(0, 2);

  return (
    <div className="space-y-10 selection:bg-pink-500 selection:text-white pb-12">
      
      {/* 1. Header Welcome Panel */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center space-y-3 py-6"
      >
        <span className="text-4xl animate-bounce inline-block">💖</span>
        <h1 className="text-3xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent filter drop-shadow-sm leading-tight">
          Welcome To My Friendship Memories 💖
        </h1>
        <p className="text-slate-500 dark:text-slate-400 font-semibold text-sm max-w-xl mx-auto uppercase tracking-widest flex items-center justify-center gap-2">
          <span>✨ Private Memory Wallet & Journal</span>
          <span>•</span>
          <span className="text-pink-500">Gokul & Nivedha</span>
        </p>
      </motion.div>

      {/* 2. Anniversary Ticker Card (Journal Style) */}
      <motion.div 
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="glass-panel p-8 rounded-3xl relative overflow-hidden border border-pink-500/20 dark:border-pink-500/10 shadow-lg bg-white/40 dark:bg-slate-900/40"
      >
        <div className="absolute top-0 right-0 p-3 bg-pink-500/15 text-pink-400 text-[10px] uppercase font-extrabold rounded-bl-2xl tracking-widest flex items-center gap-1 border-b border-l border-pink-500/10">
          <Clock className="w-3.5 h-3.5 animate-spin-slow" /> Friendship Timer
        </div>

        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-pink-500 dark:text-pink-400">
              Partners in Crime Since July 3, 2023
            </span>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight mt-1">
              Every Second of Our Lifelong Bond
            </h2>
          </div>

          {/* Counters Grid */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { label: 'Years', val: anniversaryAge.years },
              { label: 'Months', val: anniversaryAge.months },
              { label: 'Days', val: anniversaryAge.days },
              { label: 'Hours', val: anniversaryAge.hours },
              { label: 'Minutes', val: anniversaryAge.minutes },
              { label: 'Seconds', val: anniversaryAge.seconds }
            ].map((item, idx) => (
              <div
                key={item.label}
                className="p-3 bg-white/70 dark:bg-slate-950/70 border border-pink-500/10 rounded-2xl shadow-inner relative group overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-pink-400 to-purple-500"></div>
                <div className="text-2xl md:text-3xl font-extrabold font-mono text-pink-500 dark:text-pink-400 tracking-tighter">
                  {item.val.toString().padStart(2, '0')}
                </div>
                <div className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase mt-0.5">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 3. Memory Collection Wallet Cards */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="w-4.5 h-4.5 text-pink-500" /> Memory Collections
        </h3>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Photo Vault', path: '/photos', icon: Image, count: media?.filter(m => m.type === 'photo').length || 0, color: 'from-pink-500/10 to-rose-500/10 border-pink-500/20 text-pink-500' },
            { name: 'Video Reels', path: '/videos', icon: Film, count: media?.filter(m => m.type === 'video').length || 0, color: 'from-purple-500/10 to-indigo-500/10 border-purple-500/20 text-purple-500' },
            { name: 'Story Journal', path: '/timeline', icon: FileText, count: timeline?.length || 0, color: 'from-indigo-500/10 to-blue-500/10 border-indigo-500/20 text-indigo-500' },
            { name: 'Besties Chat', path: '/chat', icon: MessageSquare, count: 'Live', color: 'from-pink-500/10 to-purple-500/10 border-pink-500/20 text-pink-500' }
          ].map(wallet => {
            const Icon = wallet.icon;
            return (
              <button
                key={wallet.name}
                onClick={() => navigate(wallet.path)}
                className={`p-5 bg-gradient-to-tr ${wallet.color} border rounded-3xl flex flex-col justify-between items-start text-left hover:scale-105 active:scale-95 transition-all shadow-md group cursor-pointer h-36`}
              >
                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow border border-white/5">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white leading-none mt-4 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors">
                    {wallet.name}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
                    {wallet.count} {typeof wallet.count === 'number' ? 'Items' : ''}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* 4. Mini Photo Gallery Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Image className="w-4.5 h-4.5 text-pink-500" /> Recent Photo Gallery
            </h3>
            <button
              onClick={() => navigate('/photos')}
              className="text-xs font-black text-pink-500 hover:text-pink-600 dark:text-pink-400 dark:hover:text-pink-300 flex items-center gap-1 cursor-pointer transition-all"
            >
              See All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-pink-500/10 bg-white/20 dark:bg-slate-900/20">
            {recentPhotos.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {recentPhotos.map(photo => (
                  <div 
                    key={photo.id}
                    onClick={() => navigate('/photos')}
                    className="relative rounded-2xl overflow-hidden aspect-video border border-white/10 shadow hover:scale-103 transition-transform cursor-pointer group"
                  >
                    <img 
                      src={photo.megaUrl || `${window.API_URL}/api/media/file/${photo.filename}`} 
                      alt={photo.originalName} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[9px] font-bold text-white uppercase tracking-wider line-clamp-1">
                        {photo.originalName}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 font-semibold text-xs border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                📸 No photos uploaded yet. Open the Photo Vault to add some!
              </div>
            )}
          </div>
        </div>

        {/* 5. Mini Timeline Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-pink-500" /> Recent Journal Pages
            </h3>
            <button
              onClick={() => navigate('/timeline')}
              className="text-xs font-black text-pink-500 hover:text-pink-600 dark:text-pink-400 dark:hover:text-pink-300 flex items-center gap-1 cursor-pointer transition-all"
            >
              See All <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-pink-500/10 bg-white/20 dark:bg-slate-900/20 space-y-3">
            {recentStories.length > 0 ? (
              <div className="space-y-3">
                {recentStories.map(story => (
                  <div 
                    key={story.id}
                    onClick={() => navigate('/timeline')}
                    className="p-4 bg-white/70 dark:bg-slate-950/70 border border-pink-500/5 hover:border-pink-500/20 rounded-2xl shadow-sm transition-all cursor-pointer space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-sm text-slate-800 dark:text-white line-clamp-1">
                        {story.title}
                      </h4>
                      <span className="text-[9px] font-black font-mono text-pink-500 dark:text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full">
                        {story.date}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal line-clamp-2 italic">
                      "{story.description}"
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 font-semibold text-xs border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                📖 No stories recorded in our timeline yet. Let's record one!
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 6. Milestone Countdowns */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4.5 h-4.5 text-pink-500" /> Upcoming Milestones
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {events.map((evt, idx) => {
            const nameKey = evt.name.replace('Nivetha', 'Nivedha');
            const data = eventCountdowns[nameKey] || { days: 0, timerStr: '00:00:00' };
            return (
              <div
                key={evt.name}
                className="glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col justify-between border border-pink-500/10 shadow-sm"
              >
                <div className="absolute top-4 right-4 text-xl">
                  {evt.icon}
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-800 dark:text-white leading-tight">
                      {nameKey}
                    </h4>
                    <p className="text-[9px] font-black text-pink-500 dark:text-pink-400 tracking-wider uppercase mt-0.5">
                      {evt.target.replace('-', '/')}
                    </p>
                  </div>

                  <div>
                    <div className="text-2xl font-black text-slate-800 dark:text-slate-100 leading-none">
                      {data.days}{' '}
                      <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase">
                        days
                      </span>
                    </div>
                    <div className="text-[9px] font-bold font-mono text-slate-400 dark:text-slate-500 tracking-widest mt-1">
                      {data.timerStr}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Reminders
                  </span>
                  <button
                    onClick={() => toggleReminder(idx)}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      evt.reminder 
                        ? 'bg-pink-50 text-pink-600 dark:bg-pink-950/30 dark:text-pink-400' 
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
                    }`}
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 7. Animated Server Quote Card */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="glass-panel p-6 rounded-3xl text-center relative overflow-hidden border border-pink-500/10 bg-slate-900/5 dark:bg-slate-950/10 shadow min-h-[100px] flex flex-col justify-center items-center"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={quoteIndex}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.5 }}
            className="space-y-1 relative z-10"
          >
            <p className="text-sm md:text-base font-extrabold bg-gradient-to-r from-pink-500 to-indigo-500 bg-clip-text text-transparent italic tracking-tight font-serif">
              "{quotesList[quoteIndex]}"
            </p>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
              ✨ Server Quote of the Day
            </p>
          </motion.div>
        </AnimatePresence>
      </motion.div>

    </div>
  );
}
