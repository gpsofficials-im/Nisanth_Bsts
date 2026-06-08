import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useStorage } from './context/StorageContext';
import { useTheme } from './context/ThemeContext';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import MediaVault from './components/MediaVault';
import Timeline from './components/Timeline';
import AdminPanel from './components/AdminPanel';
import AIChat from './components/AIChat';
import SettingsChat from './components/SettingsChat';
import CloudVault from './components/CloudVault';
import { 
  LogOut, Sun, Moon, Home, Image, Film, Calendar, Settings, Edit, Save, X, Heart, Sparkles, User, MessageSquare, Cloud, FileText
} from 'lucide-react';

import { motion, AnimatePresence } from 'framer-motion';
import { Routes, Route, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';

function AppContent() {
  const { user, logout, updateProfileLocal } = useAuth();
  const { config, saveProfileUpdates, loading } = useStorage();
  const { darkMode, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [editingProfile, setEditingProfile] = useState(false);

  React.useEffect(() => {
    const handleAppNavigate = (e) => {
      if (e.detail && e.detail.tab) {
        if (e.detail.tab === 'media') {
          navigate('/photos');
        } else {
          navigate('/' + e.detail.tab);
        }
      }
    };
    window.addEventListener('app-navigate', handleAppNavigate);
    return () => window.removeEventListener('app-navigate', handleAppNavigate);
  }, [navigate]);
  
  // Profile edit fields
  const [editBio, setEditBio] = useState('');
  const [editStory, setEditStory] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100 gap-4">
        <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
        <div className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Loading Besties Vault...</div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  // Get bio & story from live config database
  const liveProfile = config?.authorizedUsers?.find(u => u.name === user.name) || user;

  const startEditing = () => {
    setEditBio(liveProfile.bio || '');
    setEditStory(liveProfile.relationshipStory || '');
    setEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    const success = await saveProfileUpdates(user.name, user.name, editBio, editStory);
    if (success) {
      // Update local storage too so it is reflected instantly
      updateProfileLocal({
        ...user,
        bio: editBio,
        relationshipStory: editStory
      });
      setEditingProfile(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-all duration-300">
      
      {/* LEFT SIDEBAR NAVBAR + PROFILE */}
      <aside className="w-full lg:w-80 shrink-0 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between gap-8 z-30">
        <div className="space-y-8">
          
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-cyan-500 via-indigo-500 to-pink-500 rounded-2xl flex items-center justify-center font-mono text-xl tracking-tighter text-white shadow-md select-none group border border-white/20">
              <span className="smiley-logo animate-pulse">😉</span>
            </div>
            <div>
              <h1 className="font-extrabold text-lg leading-tight bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-400 bg-clip-text text-transparent">
                Nisanth Wallet
              </h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Private Memory Platform</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-2">
            {[
              { path: '/dashboard', name: 'Dashboard', icon: Home, match: '/dashboard' },
              { path: '/photos', name: 'Photos', icon: Image, match: '/photos' },
              { path: '/videos', name: 'Videos', icon: Film, match: '/videos' },
              { path: '/documents', name: 'Documents', icon: FileText, match: '/documents' },
              { path: '/timeline', name: 'Story Timeline', icon: Calendar, match: '/timeline' },
              { path: '/chat', name: 'Private Chat', icon: MessageSquare, match: '/chat' },

              ...(user.role === 'owner' ? [
                { path: '/cloud', name: 'Cloud Vault', icon: Cloud, match: '/cloud' },
                { path: '/admin', name: 'Admin Panel', icon: Settings, match: '/admin' }
              ] : [])
            ].map(item => {
              const Icon = item.icon;
              const active = location.pathname.startsWith(item.match);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`w-full py-3 px-4 rounded-2xl text-sm font-extrabold flex items-center gap-3 transition-all cursor-pointer ${
                    active 
                      ? 'bg-gradient-to-r from-indigo-500/10 to-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-l-4 border-indigo-500' 
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Profile Card */}
        <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="p-4 bg-slate-100/50 dark:bg-slate-950/30 rounded-3xl border border-slate-200 dark:border-slate-800 relative group">
            
            {/* Custom initials avatar */}
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center font-black text-white text-lg shadow-inner">
                {liveProfile.name.substring(0, 1)}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-white leading-tight flex items-center gap-1.5">
                  {liveProfile.name} <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                </h4>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  {liveProfile.role === 'owner' ? 'Owner / Admin' : 'Bestie'}
                </p>
              </div>
            </div>

            {/* Editable Profile Text */}
            <AnimatePresence mode="wait">
              {editingProfile ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3"
                >
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">My Bio</label>
                    <textarea
                      rows={2}
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Relationship Story</label>
                    <textarea
                      rows={3}
                      value={editStory}
                      onChange={(e) => setEditStory(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      className="flex-1 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 shadow cursor-pointer"
                    >
                      <Save className="w-3 h-3" /> Save
                    </button>
                    <button
                      onClick={() => setEditingProfile(false)}
                      className="py-1.5 px-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3 text-xs"
                >
                  <div>
                    <span className="font-extrabold text-[10px] text-slate-400 uppercase block mb-0.5">Bio</span>
                    <p className="font-semibold text-slate-600 dark:text-slate-300 italic">
                      "{liveProfile.bio || 'No bio entered yet.'}"
                    </p>
                  </div>
                  <div>
                    <span className="font-extrabold text-[10px] text-slate-400 uppercase block mb-0.5">Friendship story</span>
                    <p className="font-medium text-slate-500 dark:text-slate-400 leading-relaxed text-justify">
                      {liveProfile.relationshipStory || 'No story details added yet.'}
                    </p>
                  </div>

                  <button
                    onClick={startEditing}
                    className="mt-2 text-[10px] font-extrabold text-indigo-500 hover:text-indigo-600 flex items-center gap-1 transition-all"
                  >
                    <Edit className="w-3 h-3" /> Edit details
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

      </aside>

      {/* RIGHT MAIN CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header Controls Bar */}
        <header className="py-4 px-6 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h2 className="font-extrabold text-base tracking-tight text-slate-800 dark:text-white">
              Hello, {user.name}! Welcome to our Memory Wallet.
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 bg-slate-200/50 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-2xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 shadow-sm transition-all"
              title="Toggle Theme"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            
            {/* Logout */}
            <button
              onClick={logout}
              className="py-2.5 px-4 bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 border border-rose-200/40 hover:border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-2xl flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log out</span>
            </button>
          </div>
        </header>

        {/* Dynamic Inner Panel View Container */}
        <div className="flex-1 p-6 md:p-8 max-w-6xl w-full mx-auto overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/photos" element={<MediaVault type="photos" />} />
                <Route path="/photos/:folderId" element={<MediaVault type="photos" />} />
                <Route path="/videos" element={<MediaVault type="videos" />} />
                <Route path="/videos/:folderId" element={<MediaVault type="videos" />} />
                <Route path="/documents" element={<MediaVault type="documents" />} />
                <Route path="/documents/:folderId" element={<MediaVault type="documents" />} />
                <Route path="/timeline" element={<Timeline />} />
                <Route path="/chat" element={<SettingsChat />} />
                {user.role === 'owner' && (
                  <>
                    <Route path="/cloud" element={<CloudVault />} />
                    <Route path="/admin" element={<AdminPanel />} />
                  </>
                )}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </div>

      </main>

      {/* Glowing Floating AI memory Chatbot */}
      <AIChat />

    </div>
  );
}

export default function App() {
  return (
    <AppContent />
  );
}
