import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStorage } from '../context/StorageContext';
import { 
  Cloud, 
  Settings, 
  Image as ImageIcon, 
  Video, 
  FileText, 
  HardDrive, 
  Plus, 
  X, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  ShieldCheck,
  RefreshCw,
  Eye,
  Download,
  Play,
  Server,
  Layers,
  Database,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CloudWallet() {
  const { user } = useAuth();
  const { media, deleteMedia, showToast } = useStorage();
  
  const [activeTab, setActiveTab] = useState('accounts'); // 'photos', 'videos', 'files', 'accounts', 'analytics'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    googlePhotosEnabled: false,
    googleAccessToken: '',
    mega1Enabled: false,
    mega1Email: '',
    mega1Password: '',
    mega2Enabled: false,
    mega2Email: '',
    mega2Password: '',
    mega3Enabled: false,
    mega3Email: '',
    mega3Password: '',
    degooEnabled: false,
    degooAccessToken: ''
  });

  const [stats, setStats] = useState(null);
  const [editProvider, setEditProvider] = useState(null); // 'google', 'mega1', 'mega2', 'mega3', 'degoo'

  useEffect(() => {
    if (user?.role === 'owner') {
      fetchCloudConfig();
      fetchCloudStats();
    }
  }, [user]);

  const fetchCloudConfig = async () => {
    try {
      const token = localStorage.getItem('nisanth_token');
      const response = await fetch(`${window.API_URL}/api/admin/storage/config`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to load storage config');
      const data = await response.json();
      if (data.success && data.config) {
        setConfig({
          googlePhotosEnabled: data.config.googlePhotosEnabled || false,
          googleAccessToken: data.config.googleAccessToken || '',
          mega1Enabled: data.config.mega1Enabled || false,
          mega1Email: data.config.mega1Email || '',
          mega1Password: data.config.mega1Password || '',
          mega2Enabled: data.config.mega2Enabled || false,
          mega2Email: data.config.mega2Email || '',
          mega2Password: data.config.mega2Password || '',
          mega3Enabled: data.config.mega3Enabled || false,
          mega3Email: data.config.mega3Email || '',
          mega3Password: data.config.mega3Password || '',
          degooEnabled: data.config.degooEnabled || false,
          degooAccessToken: data.config.degooAccessToken || ''
        });
      }
    } catch (error) {
      console.error('Error fetching cloud config:', error);
      showToast('Could not load storage configurations.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCloudStats = async () => {
    try {
      const token = localStorage.getItem('nisanth_token');
      const response = await fetch(`${window.API_URL}/api/admin/storage/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to load storage stats');
      const data = await response.json();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching cloud stats:', error);
    }
  };

  const handleToggle = async (providerKey, currentStatus) => {
    const updatedStatus = !currentStatus;
    let key;
    if (providerKey === 'google') key = 'googlePhotosEnabled';
    else if (providerKey === 'degoo') key = 'degooEnabled';
    else key = `${providerKey}Enabled`; // mega1Enabled, mega2Enabled, mega3Enabled

    const updatedConfig = { ...config, [key]: updatedStatus };
    setConfig(updatedConfig);
    
    // Save live status switch immediately
    try {
      const token = localStorage.getItem('nisanth_token');
      const response = await fetch(`${window.API_URL}/api/admin/storage/config/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedConfig)
      });
      if (!response.ok) throw new Error('Failed to toggle status');
      const data = await response.json();
      if (data.success) {
        showToast(`${providerKey.toUpperCase()} status updated!`, 'success');
        fetchCloudStats(); // Refresh stats live!
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveCredentials = async (provider) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('nisanth_token');
      const response = await fetch(`${window.API_URL}/api/admin/storage/config/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });
      if (!response.ok) throw new Error('Failed to update credentials');
      const data = await response.json();
      if (data.success) {
        showToast(`${provider.toUpperCase()} credentials bound successfully!`, 'success');
        setEditProvider(null);
        fetchCloudStats();
      }
    } catch (error) {
      showToast('Failed to save config.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Helper size converter
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 B';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Strict owner-only RBAC separation check
  if (user?.role !== 'owner') {
    return (
      <div className="glass-panel p-8 text-center rounded-3xl border border-white/10 max-w-lg mx-auto my-12 shadow-2xl">
        <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Lock className="w-8 h-8 text-rose-500 animate-pulse" />
        </div>
        <h4 className="font-orbitron font-black text-lg text-slate-800 dark:text-white uppercase tracking-wider">Access Restricted</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed font-poppins">
          The Vault Cloud Wallet settings are highly encrypted and secured for owner-only administration.
          Secondary members can upload and view secure family media within their Vault, but backend hosting nodes and cloud quota references are completely hidden for maximum security.
        </p>
      </div>
    );
  }

  // File aggregations inside Cloud Wallet
  const cloudPhotos = media.filter(m => m.type === 'photo');
  const cloudVideos = media.filter(m => m.type === 'video');
  const cloudFiles = media.filter(m => m.type === 'document');

  // Space calculation analytics
  const totalGoogleSize = stats?.google?.spaceUsed || cloudPhotos.filter(m => m.urls?.google).reduce((s, m) => s + m.size, 0);
  
  const mega1Used = stats?.mega1?.spaceUsed || media.filter(m => m.urls?.mega1 || m.urls?.mega).reduce((s, m) => s + m.size, 0);
  const mega2Used = stats?.mega2?.spaceUsed || media.filter(m => m.urls?.mega2).reduce((s, m) => s + m.size, 0);
  const mega3Used = stats?.mega3?.spaceUsed || media.filter(m => m.urls?.mega3).reduce((s, m) => s + m.size, 0);
  const totalMegaSize = mega1Used + mega2Used + mega3Used;

  const totalDegooSize = stats?.degoo?.spaceUsed || media.filter(m => m.urls?.degoo).reduce((s, m) => s + m.size, 0);
  const totalCombinedSize = totalGoogleSize + totalMegaSize + totalDegooSize;

  const accountsData = [
    {
      id: 'google',
      name: 'Google Photos',
      type: 'OAuth API Service',
      enabled: config.googlePhotosEnabled,
      email: config.googleAccessToken ? 'Google Account Connected' : 'Disconnected',
      connected: !!config.googleAccessToken,
      providerKey: 'google',
      statKey: 'google',
      color: 'amber',
      iconColor: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      glowColor: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.15)] border-amber-500/10'
    },
    {
      id: 'mega1',
      name: 'MEGA Cloud 1',
      type: 'Active Node Card 1',
      enabled: config.mega1Enabled,
      email: config.mega1Email,
      connected: !!config.mega1Email,
      providerKey: 'mega1',
      statKey: 'mega1',
      color: 'rose',
      iconColor: 'text-rose-500',
      bgColor: 'bg-rose-500/10',
      glowColor: 'hover:shadow-[0_0_20px_rgba(244,63,94,0.15)] border-rose-500/10',
      waterfallPriority: 1
    },
    {
      id: 'mega2',
      name: 'MEGA Cloud 2',
      type: 'Active Node Card 2',
      enabled: config.mega2Enabled,
      email: config.mega2Email,
      connected: !!config.mega2Email,
      providerKey: 'mega2',
      statKey: 'mega2',
      color: 'rose',
      iconColor: 'text-rose-450',
      bgColor: 'bg-rose-500/5',
      glowColor: 'hover:shadow-[0_0_20px_rgba(244,63,94,0.1)] border-rose-400/10',
      waterfallPriority: 2
    },
    {
      id: 'mega3',
      name: 'MEGA Cloud 3',
      type: 'Active Node Card 3',
      enabled: config.mega3Enabled,
      email: config.mega3Email,
      connected: !!config.mega3Email,
      providerKey: 'mega3',
      statKey: 'mega3',
      color: 'rose',
      iconColor: 'text-rose-400',
      bgColor: 'bg-rose-500/5',
      glowColor: 'hover:shadow-[0_0_20px_rgba(244,63,94,0.1)] border-rose-400/10',
      waterfallPriority: 3
    },
    {
      id: 'degoo',
      name: 'Degoo Backups',
      type: 'REST Backup API',
      enabled: config.degooEnabled,
      email: config.degooAccessToken ? 'Degoo Account Connected' : 'Disconnected',
      connected: !!config.degooAccessToken,
      providerKey: 'degoo',
      statKey: 'degoo',
      color: 'sky',
      iconColor: 'text-sky-500',
      bgColor: 'bg-sky-500/10',
      glowColor: 'hover:shadow-[0_0_20px_rgba(14,165,233,0.15)] border-sky-500/10'
    }
  ];

  const getStatusInfo = (acc) => {
    const cardStat = stats?.[acc.statKey];
    const isOnline = cardStat?.status === 'Connected' || cardStat?.status === 'Online';
    const isSim = cardStat?.status === 'Simulation Mode';
    
    if (!acc.enabled) {
      return { label: 'Disconnected', color: 'text-slate-400', dotColor: 'bg-slate-400' };
    }
    if (!acc.connected) {
      return { label: 'Simulation Mode', color: 'text-amber-500', dotColor: 'bg-amber-400 animate-pulse' };
    }
    if (isSim) {
      return { label: 'Simulation Mode', color: 'text-amber-500', dotColor: 'bg-amber-400 animate-pulse' };
    }
    if (isOnline) {
      return { label: 'Online', color: 'text-emerald-550 dark:text-emerald-450', dotColor: 'bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse' };
    }
    return { label: cardStat?.status || 'Active', color: 'text-emerald-500', dotColor: 'bg-emerald-400 animate-pulse' };
  };

  const getUploadStatus = (acc) => {
    if (!acc.enabled) return { text: 'Disabled', style: 'bg-slate-100 text-slate-500 dark:bg-slate-900/40' };
    if (!acc.connected) return { text: 'Sim Uploader', style: 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' };
    
    if (acc.providerKey.startsWith('mega')) {
      const cardStat = stats?.[acc.statKey];
      const used = cardStat?.spaceUsed || 0;
      const total = cardStat?.spaceTotal || 20 * 1024 * 1024 * 1024;
      const free = total - used;
      
      // If less than 20MB buffer, it's full and will be bypassed
      if (free <= 20 * 1024 * 1024) {
        return { text: 'Full (Bypassed)', style: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-450 font-bold' };
      }
      
      // Find which mega accounts are enabled and have space before this one
      let isFirstAvailable = true;
      const megaNodes = ['mega1', 'mega2', 'mega3'];
      const myIdx = megaNodes.indexOf(acc.providerKey);
      
      for (let i = 0; i < myIdx; i++) {
        const otherKey = megaNodes[i];
        const otherConfigEnabled = config[`${otherKey}Enabled`];
        const otherStat = stats?.[otherKey];
        const otherUsed = otherStat?.spaceUsed || 0;
        const otherTotal = otherStat?.spaceTotal || 20 * 1024 * 1024 * 1024;
        const otherFree = otherTotal - otherUsed;
        if (otherConfigEnabled && otherFree > 20 * 1024 * 1024) {
          isFirstAvailable = false;
          break;
        }
      }
      
      if (isFirstAvailable) {
        return { text: 'Primary Node', style: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-extrabold shadow-[0_0_8px_rgba(16,185,129,0.15)] animate-pulse' };
      } else {
        return { text: 'Waterfall Standby', style: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300 font-semibold' };
      }
    }
    
    return { text: 'Active', style: 'bg-indigo-50 text-indigo-650 dark:bg-indigo-950/20 dark:text-indigo-400' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="animate-spin rounded-full h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 5-Tab Control Switcher */}
      <div className="flex bg-slate-200/50 dark:bg-slate-950/40 p-1.5 rounded-2xl border border-white/20 dark:border-white/5 flex-wrap gap-1 w-full font-orbitron shadow-inner">
        {[
          { id: 'accounts', name: 'Cloud Wallets', icon: Cloud },
          { id: 'photos', name: 'Photos Grid', icon: ImageIcon },
          { id: 'videos', name: 'Videos Grid', icon: Video },
          { id: 'files', name: 'Documents', icon: FileText },
          { id: 'analytics', name: 'Storage Metrics', icon: HardDrive }
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                active 
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md border border-white/10 scale-103' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Tab Render Panels */}
      <AnimatePresence mode="wait">
        
        {/* TAB 1: CLOUD ACCOUNTS MANAGER */}
        {activeTab === 'accounts' && (
          <motion.div
            key="accounts-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 animate-fade-in"
          >
            {/* Account Binding Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accountsData.map(acc => {
                const cardStat = stats?.[acc.statKey];
                const used = cardStat?.spaceUsed || 0;
                const total = cardStat?.spaceTotal || (acc.providerKey.startsWith('mega') ? 20 * 1024 * 1024 * 1024 : acc.providerKey === 'google' ? 15 * 1024 * 1024 * 1024 : 100 * 1024 * 1024 * 1024);
                const percent = Math.min((used / total) * 100, 100);
                const statusInfo = getStatusInfo(acc);
                const uploadStatus = getUploadStatus(acc);
                
                return (
                  <div key={acc.id} className={`glass-card p-5.5 rounded-3xl border border-white/15 hover:transform-none flex flex-col justify-between space-y-4 relative overflow-hidden transition-all duration-300 ${acc.glowColor} bg-white/45 dark:bg-slate-900/40 backdrop-blur-md`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl ${acc.bgColor} flex items-center justify-center shadow-inner`}>
                          <Cloud className={`w-5 h-5 ${acc.iconColor}`} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5 font-orbitron uppercase">
                            {acc.name}
                          </h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-poppins">{acc.type}</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleToggle(acc.providerKey, acc.enabled)}
                        className="text-slate-400 hover:text-indigo-500 transition-colors cursor-pointer"
                      >
                        {acc.enabled ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]" />
                        ) : (
                          <X className="w-6 h-6 text-slate-450" />
                        )}
                      </button>
                    </div>
                    
                    {/* Quota details if enabled */}
                    {acc.enabled && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-550 dark:text-slate-450 font-poppins">
                          <span>STORAGE USED</span>
                          <span>{formatBytes(used)} / {formatBytes(total)}</span>
                        </div>
                        <div className="w-full bg-slate-200/50 dark:bg-slate-850/50 h-2 rounded-full overflow-hidden shadow-inner">
                          <div className={`h-full rounded-full bg-gradient-to-r ${
                            acc.color === 'amber' ? 'from-amber-400 to-amber-500' :
                            acc.color === 'rose' ? 'from-rose-450 to-rose-550' : 'from-sky-400 to-indigo-500'
                          }`} style={{ width: `${percent}%` }}></div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 pt-2.5 border-t border-slate-200/40 dark:border-slate-800/40 font-poppins">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-450 dark:text-slate-400 uppercase text-[9px] tracking-wide">Connected Account</span>
                        <span className="text-slate-700 dark:text-slate-300 font-bold truncate max-w-[140px]" title={acc.email}>
                          {acc.email || 'Simulator Fallback'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-450 dark:text-slate-400 uppercase text-[9px] tracking-wide">Cloud Status</span>
                        <span className={`flex items-center gap-1.5 font-bold ${statusInfo.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotColor}`}></span>
                          <span>{statusInfo.label}</span>
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-455 dark:text-slate-400 uppercase text-[9px] tracking-wide">Uploader Route</span>
                        <span className={`px-2.5 py-0.5 rounded-md text-[8.5px] font-extrabold uppercase ${uploadStatus.style} shadow-sm border border-black/5 dark:border-white/5`}>
                          {uploadStatus.text}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditProvider(editProvider === acc.id ? null : acc.id)}
                        className="flex-1 py-2.5 bg-indigo-600/10 text-indigo-650 dark:bg-indigo-500/10 dark:text-indigo-400 hover:bg-indigo-600/20 dark:hover:bg-indigo-500/20 text-[10px] font-black uppercase rounded-xl transition-all cursor-pointer active:scale-95 text-center shadow-sm"
                      >
                        {acc.connected ? 'Change Account' : 'Connect Cloud'}
                      </button>
                      {acc.connected && (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Disconnect credentials for ${acc.name}?`)) {
                              let updated;
                              if (acc.providerKey === 'google') {
                                updated = { googleAccessToken: '', googlePhotosEnabled: false };
                              } else if (acc.providerKey === 'degoo') {
                                updated = { degooAccessToken: '', degooEnabled: false };
                              } else {
                                updated = { [`${acc.providerKey}Email`]: '', [`${acc.providerKey}Password`]: '', [`${acc.providerKey}Enabled`]: false };
                              }
                              setConfig(prev => ({ ...prev, ...updated }));
                              
                              // Trigger backend update
                              const token = localStorage.getItem('nisanth_token');
                              fetch(`${window.API_URL}/api/admin/storage/config/update`, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ ...config, ...updated })
                              })
                              .then(res => res.json())
                              .then(data => {
                                if (data.success) {
                                  showToast(`${acc.name} credentials removed!`, 'info');
                                  fetchCloudStats();
                                }
                              });
                            }
                          }}
                          className="p-2.5 bg-rose-500/10 text-rose-550 rounded-xl hover:bg-rose-500/20 transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Dynamic Credentials Setup Panel */}
            <AnimatePresence mode="wait">
              {editProvider && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="glass-card p-6 rounded-3xl border border-white/20 hover:transform-none bg-white/60 dark:bg-slate-900/30 backdrop-blur-xl space-y-4 shadow-xl"
                >
                  <h4 className="font-orbitron font-extrabold text-xs text-indigo-500 uppercase tracking-widest flex items-center justify-between pb-2.5 border-b border-slate-200/50 dark:border-white/10">
                    <span>Setup {editProvider.toUpperCase()} Credentials</span>
                    <button onClick={() => setEditProvider(null)} className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer">
                      <X className="w-4.5 h-4.5" />
                    </button>
                  </h4>

                  {editProvider === 'google' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">OAuth API Access Token</label>
                        <input
                          type="password"
                          name="googleAccessToken"
                          value={config.googleAccessToken}
                          onChange={handleInputChange}
                          placeholder="Enter OAuth Access Token"
                          className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/80 focus:border-indigo-500 focus:outline-none rounded-xl text-xs font-semibold"
                        />
                      </div>
                    </div>
                  )}

                  {['mega1', 'mega2', 'mega3'].includes(editProvider) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">{editProvider.toUpperCase()} Email Address</label>
                        <input
                          type="email"
                          name={`${editProvider}Email`}
                          value={config[`${editProvider}Email`] || ''}
                          onChange={handleInputChange}
                          placeholder="email@mega.co.nz"
                          className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/80 focus:border-indigo-500 focus:outline-none rounded-xl text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">{editProvider.toUpperCase()} Account Password</label>
                        <input
                          type="password"
                          name={`${editProvider}Password`}
                          value={config[`${editProvider}Password`] || ''}
                          onChange={handleInputChange}
                          placeholder="••••••••"
                          className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/80 focus:border-indigo-500 focus:outline-none rounded-xl text-xs font-semibold"
                        />
                      </div>
                    </div>
                  )}

                  {editProvider === 'degoo' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Degoo API Access Token</label>
                        <input
                          type="password"
                          name="degooAccessToken"
                          value={config.degooAccessToken}
                          onChange={handleInputChange}
                          placeholder="Enter Degoo Token"
                          className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-950 border border-slate-200/40 dark:border-slate-800/80 focus:border-indigo-500 focus:outline-none rounded-xl text-xs font-semibold"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveCredentials(editProvider)}
                      disabled={saving}
                      className="py-3 px-6 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                    >
                      {saving ? 'Binding Account...' : 'Deploy Integration'}
                    </button>
                    <button
                      onClick={() => setEditProvider(null)}
                      className="py-3 px-4 bg-slate-200/60 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* TAB 2: PHOTOS GRID */}
        {activeTab === 'photos' && (
          <motion.div
            key="photos-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {cloudPhotos.length === 0 ? (
              <div className="glass-panel p-12 text-center text-slate-500 rounded-3xl border border-white/10">
                <ImageIcon className="w-12 h-12 mx-auto text-slate-450 mb-3" />
                <h4 className="font-orbitron font-extrabold text-sm uppercase">No Cloud Photos Found</h4>
                <p className="text-xs text-slate-400 mt-1 font-poppins">Upload pictures from your folders to see them dynamically here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
                {cloudPhotos.map(item => (
                  <div key={item.id} className="glass-card p-2 rounded-2xl relative group overflow-hidden border border-white/10 h-40 shadow">
                    <img 
                      src={`${window.API_URL}/api/media/file/${item.filename}`}
                      alt={item.originalName}
                      className="w-full h-full object-cover rounded-xl shadow-inner"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2 rounded-2xl">
                      <a href={`${window.API_URL}/api/media/file/${item.filename}`} target="_blank" rel="noreferrer" className="p-2 bg-white text-slate-800 rounded-full hover:scale-110 shadow transition-transform">
                        <Eye className="w-3.5 h-3.5" />
                      </a>
                      <button onClick={() => { if(confirm('Delete file?')) deleteMedia(item.id, user.name); }} className="p-2 bg-rose-600 text-white rounded-full hover:scale-110 shadow transition-transform cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 3: VIDEOS GRID */}
        {activeTab === 'videos' && (
          <motion.div
            key="videos-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {cloudVideos.length === 0 ? (
              <div className="glass-panel p-12 text-center text-slate-500 rounded-3xl border border-white/10">
                <Video className="w-12 h-12 mx-auto text-slate-450 mb-3" />
                <h4 className="font-orbitron font-extrabold text-sm uppercase">No Cloud Videos Found</h4>
                <p className="text-xs text-slate-400 mt-1 font-poppins">Upload video memories to stream them directly from cloud hosts.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
                {cloudVideos.map(item => (
                  <div key={item.id} className="glass-card p-2 rounded-2xl relative group overflow-hidden border border-white/10 h-44 shadow">
                    <video 
                      src={`${window.API_URL}/api/media/file/${item.filename}#t=0.1`}
                      className="w-full h-full object-cover rounded-xl"
                      preload="metadata"
                      muted
                    />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2 rounded-2xl">
                      <a href={`${window.API_URL}/api/media/file/${item.filename}`} target="_blank" rel="noreferrer" className="p-2 bg-white text-slate-800 rounded-full hover:scale-110 shadow transition-transform">
                        <Play className="w-3.5 h-3.5 fill-slate-800" />
                      </a>
                      <button onClick={() => { if(confirm('Delete file?')) deleteMedia(item.id, user.name); }} className="p-2 bg-rose-600 text-white rounded-full hover:scale-110 shadow transition-transform cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 4: FILES CARD LIST */}
        {activeTab === 'files' && (
          <motion.div
            key="files-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {cloudFiles.length === 0 ? (
              <div className="glass-panel p-12 text-center text-slate-500 rounded-3xl border border-white/10">
                <FileText className="w-12 h-12 mx-auto text-slate-450 mb-3" />
                <h4 className="font-orbitron font-extrabold text-sm uppercase">No Documents Saved</h4>
                <p className="text-xs text-slate-400 mt-1 font-poppins">Bind PDF or Word files to aggregate secure cloud records.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in font-poppins">
                {cloudFiles.map(item => (
                  <div key={item.id} className="glass-card p-4 rounded-2.5xl border border-white/10 flex items-center justify-between hover:transform-none bg-white/45 dark:bg-slate-900/40 shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-indigo-550 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h5 className="font-extrabold text-xs text-slate-800 dark:text-white truncate max-w-[150px]">{item.originalName}</h5>
                        <p className="text-[8px] text-slate-450 font-bold uppercase">{formatBytes(item.size)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <a href={`${window.API_URL}/api/media/file/${item.filename}`} target="_blank" rel="noreferrer" className="p-2 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg hover:scale-105 transition-transform">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button onClick={() => { if(confirm('Delete file?')) deleteMedia(item.id, user.name); }} className="p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:scale-105 transition-transform cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* TAB 5: STORAGE ANALYTICS */}
        {activeTab === 'analytics' && (
          <motion.div
            key="analytics-panel"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Storage analytics card */}
            <div className="glass-card p-6 rounded-3xl border border-white/20 hover:transform-none bg-gradient-to-tr from-slate-900/5 to-slate-900/15 dark:from-slate-950/10 dark:to-slate-950/30 relative overflow-hidden shadow-xl">
              <h4 className="font-orbitron font-extrabold text-slate-800 dark:text-white text-sm flex items-center gap-2 mb-6 uppercase tracking-wider">
                <HardDrive className="w-4 h-4 text-indigo-550 dark:text-indigo-400 animate-pulse" /> Multi-Cloud Combined Storage Breakdown
              </h4>

              <div className="space-y-5 font-poppins">
                {/* 1. Google Photos breakdown */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500 dark:text-slate-400">Google Photos usage</span>
                    <span className="text-slate-850 dark:text-white font-black">{formatBytes(totalGoogleSize)} / {formatBytes(stats?.google?.spaceTotal || 15 * 1024 * 1024 * 1024)}</span>
                  </div>
                  <div className="w-full bg-slate-200/50 dark:bg-slate-800/50 h-2.5 rounded-full overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full" style={{ width: `${Math.min((totalGoogleSize / (stats?.google?.spaceTotal || 15 * 1024 * 1024 * 1024)) * 100, 100) || 1}%` }}></div>
                  </div>
                </div>

                {/* 2. MEGA 1 breakdown */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500 dark:text-slate-400">MEGA Cloud 1 usage</span>
                    <span className="text-slate-850 dark:text-white font-black">{formatBytes(mega1Used)} / {formatBytes(stats?.mega1?.spaceTotal || 20 * 1024 * 1024 * 1024)}</span>
                  </div>
                  <div className="w-full bg-slate-200/50 dark:bg-slate-800/50 h-2.5 rounded-full overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-rose-450 to-rose-550 h-full rounded-full" style={{ width: `${Math.min((mega1Used / (stats?.mega1?.spaceTotal || 20 * 1024 * 1024 * 1024)) * 100, 100) || 1}%` }}></div>
                  </div>
                </div>

                {/* 3. MEGA 2 breakdown */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500 dark:text-slate-400">MEGA Cloud 2 usage</span>
                    <span className="text-slate-850 dark:text-white font-black">{formatBytes(mega2Used)} / {formatBytes(stats?.mega2?.spaceTotal || 20 * 1024 * 1024 * 1024)}</span>
                  </div>
                  <div className="w-full bg-slate-200/50 dark:bg-slate-800/50 h-2.5 rounded-full overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-rose-400 to-rose-500 h-full rounded-full" style={{ width: `${Math.min((mega2Used / (stats?.mega2?.spaceTotal || 20 * 1024 * 1024 * 1024)) * 100, 100) || 1}%` }}></div>
                  </div>
                </div>

                {/* 4. MEGA 3 breakdown */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500 dark:text-slate-400">MEGA Cloud 3 usage</span>
                    <span className="text-slate-850 dark:text-white font-black">{formatBytes(mega3Used)} / {formatBytes(stats?.mega3?.spaceTotal || 20 * 1024 * 1024 * 1024)}</span>
                  </div>
                  <div className="w-full bg-slate-200/50 dark:bg-slate-800/50 h-2.5 rounded-full overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-rose-350 to-rose-450 h-full rounded-full" style={{ width: `${Math.min((mega3Used / (stats?.mega3?.spaceTotal || 20 * 1024 * 1024 * 1024)) * 100, 100) || 1}%` }}></div>
                  </div>
                </div>

                {/* 5. Degoo breakdown */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-500 dark:text-slate-400">Degoo Cloud usage</span>
                    <span className="text-slate-850 dark:text-white font-black">{formatBytes(totalDegooSize)} / {formatBytes(stats?.degoo?.spaceTotal || 100 * 1024 * 1024 * 1024)}</span>
                  </div>
                  <div className="w-full bg-slate-200/50 dark:bg-slate-800/50 h-2.5 rounded-full overflow-hidden shadow-inner">
                    <div className="bg-gradient-to-r from-sky-450 to-indigo-550 h-full rounded-full" style={{ width: `${Math.min((totalDegooSize / (stats?.degoo?.spaceTotal || 100 * 1024 * 1024 * 1024)) * 100, 100) || 1}%` }}></div>
                  </div>
                </div>

                {/* Total Combined */}
                <div className="border-t border-slate-250/50 dark:border-slate-800/60 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div>
                    <h5 className="font-extrabold text-[10px] text-slate-450 uppercase tracking-widest font-orbitron">Combined Storage Footprint</h5>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1.5 font-orbitron">
                      {formatBytes(totalCombinedSize)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="p-3 bg-white/50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/50 dark:border-white/5 text-center min-w-[70px] shadow-sm">
                      <div className="text-[8px] font-black uppercase text-slate-405">Photos</div>
                      <div className="text-sm font-black text-slate-850 dark:text-white mt-0.5">{cloudPhotos.length}</div>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/50 dark:border-white/5 text-center min-w-[70px] shadow-sm">
                      <div className="text-[8px] font-black uppercase text-slate-405">Videos</div>
                      <div className="text-sm font-black text-slate-850 dark:text-white mt-0.5">{cloudVideos.length}</div>
                    </div>
                    <div className="p-3 bg-white/50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/50 dark:border-white/5 text-center min-w-[70px] shadow-sm">
                      <div className="text-[8px] font-black uppercase text-slate-405">Files</div>
                      <div className="text-sm font-black text-slate-850 dark:text-white mt-0.5">{cloudFiles.length}</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
