import React, { useState, useEffect } from 'react';
import { useStorage } from '../context/StorageContext';
import { useAuth } from '../context/AuthContext';
import { Settings, ShieldAlert, Calendar, RefreshCw, Key, HardDrive, FileText, CheckCircle2, CloudLightning, ShieldCheck, UserCheck, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CloudWallet from './CloudWallet';

export default function AdminPanel() {
  const { config, saveConfig, activities, fetchActivities, triggerMegaSync, syncing, showToast } = useStorage();
  const { user } = useAuth();
  
  const [activeSubTab, setActiveSubTab] = useState('dates'); // 'dates', 'rbac', 'credentials', 'storage', 'logs'
  
  // Settings Form fields
  const [anniversaryDate, setAnniversaryDate] = useState('');
  const [gokulBday, setGokulBday] = useState('');
  const [nivethaBday, setNivethaBday] = useState('');
  
  const [localPath, setLocalPath] = useState('');
  const [megaEmail, setMegaEmail] = useState('');
  const [megaPassword, setMegaPassword] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [sandboxMode, setSandboxMode] = useState(true);

  // Quotes Fields
  const [quotesText, setQuotesText] = useState('');

  // Credentials Fields
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [secEmail, setSecEmail] = useState('');
  const [secPass, setSecPass] = useState('');

  // RBAC permissions states
  const [canUpload, setCanUpload] = useState(true);
  const [canDelete, setCanDelete] = useState(true);
  const [canEditTimeline, setCanEditTimeline] = useState(true);

  // Guard Clause - Gokul only
  const isGokul = user?.name === 'Gokul';

  useEffect(() => {
    if (config) {
      setAnniversaryDate(config.anniversaryDate ? config.anniversaryDate.substring(0, 16) : '2023-07-03T00:00');
      setGokulBday(config.birthdays?.Gokul || '01-08');
      setNivethaBday(config.birthdays?.Nivetha || '12-02');
      
      setLocalPath(config.localPath || '');
      setMegaEmail(config.megaEmail || '');
      setMegaPassword(config.megaPassword || '');
      setSmtpHost(config.smtpHost || '');
      setSmtpPort(config.smtpPort || '587');
      setSmtpUser(config.smtpUser || '');
      setSmtpPass(config.smtpPass || '');
      setSandboxMode(config.sandboxMode !== false);

      // Set Quotes
      setQuotesText(config.quotes ? config.quotes.join('\n') : '');

      // Set secondary permissions
      const secUser = config.authorizedUsers?.find(u => u.role === 'secondary');
      if (secUser) {
        setSecEmail(secUser.email || '');
        setCanUpload(secUser.permissions?.canUpload !== false);
        setCanDelete(secUser.permissions?.canDelete !== false);
        setCanEditTimeline(secUser.permissions?.canEditTimeline !== false);
      }

      const adminUser = config.authorizedUsers?.find(u => u.role === 'owner');
      if (adminUser) {
        setAdminEmail(adminUser.email || '');
      }
    }
  }, [config]);

  // Load activities when logs tab is open
  useEffect(() => {
    if (isGokul && activeSubTab === 'logs') {
      fetchActivities(user.name);
    }
  }, [activeSubTab, isGokul]);

  if (!isGokul) {
    return (
      <div className="glass-panel p-8 rounded-3xl text-center border border-rose-500/20 max-w-lg mx-auto space-y-4">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />
        <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">Admin Access Denied</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Only Owner **Gokul** is authorized to view and modify configurations in this Admin Panel.
        </p>
      </div>
    );
  }

  const handleSaveDatesAndQuotes = async (e) => {
    e.preventDefault();
    if (!config) return;

    const parsedQuotes = quotesText.split('\n').filter(q => q.trim().length > 0);

    const updated = {
      ...config,
      anniversaryDate,
      birthdays: {
        ...config.birthdays,
        Gokul: gokulBday,
        Nivetha: nivethaBday
      },
      quotes: parsedQuotes
    };

    const success = await saveConfig(updated, user.name);
    if (success) showToast('Dates and rotating quotes list updated!', 'success');
  };

  const handleSaveStorage = async (e) => {
    e.preventDefault();
    if (!config) return;

    const updated = {
      ...config,
      localPath,
      megaEmail,
      megaPassword,
      smtpHost,
      smtpPort: parseInt(smtpPort) || 587,
      smtpUser,
      smtpPass,
      sandboxMode
    };

    const success = await saveConfig(updated, user.name);
    if (success) showToast('Storage & API Credentials updated!', 'success');
  };

  const handleSavePermissions = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${window.API_URL}/api/admin/permissions/update?adminName=Gokul`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          permissions: {
            canUpload,
            canDelete,
            canEditTimeline
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      showToast('Secondary user (Nivetha) role permissions updated successfully!', 'success');
      // Save trigger configuration reloading
      saveConfig({ ...config }, user.name);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    try {
      // 1. Save Gokul Credentials
      if (adminEmail || adminPass) {
        const payload = { targetUser: 'Gokul' };
        if (adminEmail) payload.email = adminEmail;
        if (adminPass) payload.password = adminPass;
        
        const res = await fetch(`${window.API_URL}/api/admin/credentials/update?adminName=Gokul`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }

      // 2. Save Nivetha Credentials
      if (secEmail || secPass) {
        const payload = { targetUser: 'Nivetha' };
        if (secEmail) payload.email = secEmail;
        if (secPass) payload.password = secPass;
        
        const res = await fetch(`${window.API_URL}/api/admin/credentials/update?adminName=Gokul`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      }

      showToast('Credentials updated successfully in config.json! Hashed on disk.', 'success');
      setAdminPass('');
      setSecPass('');
      saveConfig({ ...config }, user.name);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-cinzel font-black tracking-tight text-slate-800 dark:text-white flex items-center gap-2">
          <Settings className="w-8 h-8 text-indigo-500 animate-spin-slow" /> Admin Control Panel
        </h2>
        <p className="text-sm font-poppins text-slate-500 dark:text-slate-400 mt-1">
          Modify core dates, SMTP channels, credentials passwords, secondary access levels, and inspect logs.
        </p>
      </div>

      {/* Sub Tabs */}
      <div className="flex bg-slate-200/50 dark:bg-slate-950/40 p-1.5 rounded-2xl border border-white/20 dark:border-white/5 flex-wrap gap-1 max-w-2xl font-orbitron">
        {[
          { id: 'dates', name: 'Dashboard Parameters', icon: Calendar },
          { id: 'rbac', name: 'Access Levels (RBAC)', icon: ShieldCheck },
          { id: 'credentials', name: 'Passcodes Manager', icon: Key },
          { id: 'storage', name: 'Cloud & Server', icon: HardDrive },
          { id: 'logs', name: 'Auditing Sheets', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-extrabold uppercase flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                activeSubTab === tab.id 
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-white/10' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Animate SubTabs transitions */}
      <AnimatePresence mode="wait">
        {/* dates Tab */}
        {activeSubTab === 'dates' && (
          <motion.div
            key="dates"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="glass-card p-6 rounded-3xl border border-white/20 hover:transform-none space-y-6"
          >
            <h3 className="font-extrabold text-base text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <Calendar className="w-5 h-5 text-indigo-500" /> Anniversaries, Birthdays & Rotating Quotes
            </h3>

            <form onSubmit={handleSaveDatesAndQuotes} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Anniversary Date (July 3, 2023)</label>
                  <input
                    type="datetime-local"
                    required
                    value={anniversaryDate}
                    onChange={(e) => setAnniversaryDate(e.target.value)}
                    className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-indigo-500 focus:outline-none rounded-xl font-medium text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Gokul Birthday (Jan 8)</label>
                  <input
                    type="text"
                    required
                    placeholder="01-08"
                    value={gokulBday}
                    onChange={(e) => setGokulBday(e.target.value)}
                    className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-indigo-500 focus:outline-none rounded-xl font-medium text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nivetha Birthday (Dec 2)</label>
                  <input
                    type="text"
                    required
                    placeholder="12-02"
                    value={nivethaBday}
                    onChange={(e) => setNivethaBday(e.target.value)}
                    className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-indigo-500 focus:outline-none rounded-xl font-medium text-sm transition-all"
                  />
                </div>
              </div>

              {/* Quotes Editor */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5">
                  <Quote className="w-4 h-4 text-indigo-500" /> Rotating quotes repository (One per line)
                </label>
                <textarea
                  rows={5}
                  placeholder="Private memories deserve a private universe."
                  value={quotesText}
                  onChange={(e) => setQuotesText(e.target.value)}
                  className="w-full p-4 bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-indigo-500 focus:outline-none rounded-xl font-medium text-sm transition-all font-sans leading-relaxed"
                />
              </div>

              <button
                type="submit"
                className="py-3.5 px-6 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider font-orbitron rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
              >
                Save Dashboard Data
              </button>
            </form>
          </motion.div>
        )}

        {/* RBAC Access Controls Tab */}
        {activeSubTab === 'rbac' && (
          <motion.div
            key="rbac"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="glass-card p-6 rounded-3xl border border-white/20 hover:transform-none space-y-6"
          >
            <h3 className="font-extrabold text-base text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <ShieldCheck className="w-5 h-5 text-indigo-500" /> Secondary Account Role Access Controls (RBAC)
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-4 leading-relaxed">
              Restrict or grant permissions to Nivetha's secondary account. Plain role-based checks block unauthorized operations instantly.
            </p>

            <form onSubmit={handleSavePermissions} className="space-y-6">
              <div className="space-y-4">
                {[
                  { state: canUpload, setter: setCanUpload, label: 'Authorize Media Uploads', desc: 'Allows secondary account to drop, select, and upload media files to local storage & MEGA.' },
                  { state: canDelete, setter: setCanDelete, label: 'Authorize Media Deletions', desc: 'Allows secondary account to delete uploaded vault files in all folders.' },
                  { state: canEditTimeline, setter: setCanEditTimeline, label: 'Authorize Timeline Modifications', desc: 'Allows secondary account to write new milestone pages and edit story cards.' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-4 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl">
                    <input
                      type="checkbox"
                      checked={item.state}
                      onChange={(e) => item.setter(e.target.checked)}
                      className="w-5 h-5 mt-0.5 accent-indigo-500 cursor-pointer rounded-md focus:outline-none"
                    />
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 dark:text-white">{item.label}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="py-3.5 px-6 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider font-orbitron rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
              >
                Apply Access Rules
              </button>
            </form>
          </motion.div>
        )}

        {/* Passcodes Manager Tab */}
        {activeSubTab === 'credentials' && (
          <motion.div
            key="credentials"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="glass-card p-6 rounded-3xl border border-white/20 hover:transform-none space-y-6"
          >
            <h3 className="font-extrabold text-base text-slate-800 dark:text-white mb-4 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <UserCheck className="w-5 h-5 text-indigo-500" /> Authorized Accounts Passcode Manager
            </h3>

            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
              Change login emails or secure passwords for both Admin (Gokul) and Secondary (Nivetha) accounts. Passwords are saved with bcrypt cryptography.
            </p>

            <form onSubmit={handleSaveCredentials} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Admin Gokul */}
                <div className="p-4 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl space-y-4">
                  <h4 className="font-bold text-xs text-indigo-500 uppercase tracking-widest border-b border-white/5 pb-2">Admin: Gokul Credentials</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gmail Address</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="prasanthgokul736@gmail.com"
                      className="w-full py-2.5 px-3.5 bg-white dark:bg-slate-900 border border-white/10 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Change Secure Password</label>
                    <input
                      type="password"
                      value={adminPass}
                      onChange={(e) => setAdminPass(e.target.value)}
                      placeholder="Enter new passcode"
                      className="w-full py-2.5 px-3.5 bg-white dark:bg-slate-900 border border-white/10 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Secondary Nivetha */}
                <div className="p-4 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl space-y-4">
                  <h4 className="font-bold text-xs text-indigo-500 uppercase tracking-widest border-b border-white/5 pb-2">Secondary: Nivetha Credentials</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gmail Address</label>
                    <input
                      type="email"
                      value={secEmail}
                      onChange={(e) => setSecEmail(e.target.value)}
                      placeholder="nivethanivetha2109@gmail.com"
                      className="w-full py-2.5 px-3.5 bg-white dark:bg-slate-900 border border-white/10 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Change Secure Password</label>
                    <input
                      type="password"
                      value={secPass}
                      onChange={(e) => setSecPass(e.target.value)}
                      placeholder="Enter new passcode"
                      className="w-full py-2.5 px-3.5 bg-white dark:bg-slate-900 border border-white/10 rounded-xl text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="py-3.5 px-6 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs uppercase tracking-wider font-orbitron rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
              >
                Rewrite Credentials
              </button>
            </form>
          </motion.div>
        )}

        {/* Cloud Wallet Storage Configuration */}
        {activeSubTab === 'storage' && (
          <motion.div
            key="storage"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
          >
            <CloudWallet />
          </motion.div>
        )}

        {/* Excel logs Tab */}
        {activeSubTab === 'logs' && (
          <motion.div
            key="logs"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="glass-card p-6 rounded-3xl border border-white/20 hover:transform-none space-y-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">
              <h3 className="font-extrabold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-500" /> Excel Audits Log (`activity_log.xlsx`)
              </h3>
              <button 
                onClick={() => fetchActivities(user.name)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-xl"
                title="Refresh logs"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {activities.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-semibold text-sm">
                No audit logs captured inside Excel sheet yet.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto pr-1">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider font-orbitron">
                      <th className="p-3">Timestamp (IST)</th>
                      <th className="p-3">User</th>
                      <th className="p-3">Activity</th>
                      <th className="p-3">Details</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium font-poppins">
                    {activities.map((log, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                        <td className="p-3 text-slate-400 font-mono shrink-0 whitespace-nowrap">{log['Timestamp (IST)']}</td>
                        <td className="p-3 font-bold text-slate-700 dark:text-slate-300">{log['User']}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-md">
                            {log['Activity Type']}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 dark:text-slate-400 max-w-xs truncate" title={log['Details']}>
                          {log['Details']}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-md flex items-center gap-1 w-max text-[10px] font-extrabold uppercase ${
                            log['Status'] === 'Success' 
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400'
                          }`}>
                            {log['Status'] === 'Success' && <CheckCircle2 className="w-3 h-3" />}
                            <span>{log['Status']}</span>
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-400">{log['IP Address']}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
