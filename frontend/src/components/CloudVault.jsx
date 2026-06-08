import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStorage } from '../context/StorageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cloud, Image as ImageIcon, Film, Filter, Layers, Database, HardDrive, 
  ExternalLink, Calendar, ShieldCheck, RefreshCw, X, Play, Info, Lock
} from 'lucide-react';

export default function CloudVault() {
  const { token, user } = useAuth();
  const { showToast } = useStorage();

  const [activeFilter, setActiveFilter] = useState('all');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lightboxItem, setLightboxItem] = useState(null);

  // Role check
  const isOwner = user?.role === 'owner';

  // Cloud metrics calculation helper
  const [stats, setStats] = useState({
    totalSize: 0,
    googlePhotosSize: 0,
    megaSize: 0,
    degooSize: 0,
    googlePhotosCount: 0,
    megaCount: 0,
    degooCount: 0,
  });

  const fetchCloudFiles = async (showNotification = false) => {
    try {
      if (showNotification) setRefreshing(true);
      else setLoading(true);

      const savedToken = token || localStorage.getItem('nisanth_token');
      const response = await fetch(`${window.API_URL}/api/cloud/files?source=all`, {
        headers: { 'Authorization': `Bearer ${savedToken}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch cloud files');

      const cloudFiles = data.files || [];
      setFiles(cloudFiles);

      // Compute metrics
      let total = 0;
      let gSize = 0, mSize = 0, dSize = 0;
      let gCount = 0, mCount = 0, dCount = 0;

      cloudFiles.forEach(f => {
        total += f.size || 0;
        if (f.cloud === 'google-photos') {
          gSize += f.size || 0;
          gCount++;
        } else if (['mega', 'mega1', 'mega2', 'mega3'].includes(f.cloud)) {
          mSize += f.size || 0;
          mCount++;
        } else if (f.cloud === 'degoo') {
          dSize += f.size || 0;
          dCount++;
        }
      });

      setStats({
        totalSize: total,
        googlePhotosSize: gSize,
        megaSize: mSize,
        degooSize: dSize,
        googlePhotosCount: gCount,
        megaCount: mCount,
        degooCount: dCount
      });

      if (showNotification) {
        showToast('Successfully synchronized secure aggregator vaults!', 'success');
      }
    } catch (err) {
      console.error('[CloudVault] Fetch error:', err.message);
      showToast('Vault sync error: ' + err.message, 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCloudFiles();
    }
  }, [token, user]);

  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Filtered files view (adapted for mega1, mega2, mega3, mega grouping)
  const filteredFiles = files.filter(f => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'mega') {
      return ['mega', 'mega1', 'mega2', 'mega3'].includes(f.cloud);
    }
    return f.cloud === activeFilter;
  });

  return (
    <div className="space-y-8 font-sans">
      
      {/* 1. Header Info & Manual Refresh Trigger */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-gradient-to-r from-indigo-500/10 to-pink-500/10 border border-indigo-500/20 rounded-3xl backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
            <Cloud className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2 font-orbitron uppercase tracking-wide">
              {isOwner ? 'Unified Cloud Storage Aggregator' : 'Vault Secured Media Aggregator'}
              {isOwner && <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold">API v1.5</span>}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium leading-relaxed font-poppins">
              {isOwner 
                ? 'Consolidating assets across three distinct storage clouds: Degoo, Google Photos, and Mega. Files are aggregated in a single interface.'
                : 'Consolidating your secure family memories across safe, highly encrypted backup storage vaults. All assets are synchronized and integrated seamlessly.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchCloudFiles(true)}
          disabled={loading || refreshing}
          className="self-start md:self-center py-2.5 px-4 bg-slate-200/50 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-2xl flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 select-none shadow-sm active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'Synchronizing...' : 'Sync Vaults'}</span>
        </button>
      </div>

      {/* 2. Stats Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        
        {/* Global Combined Storage */}
        <div className="glass-panel p-5 rounded-3xl border border-white/10 dark:border-slate-800/80 shadow-lg backdrop-blur-md relative overflow-hidden bg-slate-900/40 text-white">
          <div className="absolute top-0 right-0 p-3 bg-white/5 rounded-bl-2xl text-slate-400 text-xs">
            <Layers className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-orbitron">Combined Storage Footprint</p>
          <h2 className="text-2xl font-black text-cyan-400 mt-2 tracking-tight font-orbitron">
            {formatBytes(stats.totalSize)}
          </h2>
          <div className="flex items-center gap-2 mt-3 text-xs font-semibold text-slate-400 font-poppins">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>{files.length} Secure Vault Files Aggregated</span>
          </div>
        </div>

        {/* Google Photos metrics */}
        <div className="glass-panel p-5 rounded-3xl border border-white/5 dark:border-slate-800/50 shadow-md bg-white/50 dark:bg-slate-950/20 backdrop-blur-md relative overflow-hidden">
          {isOwner && (
            <div className="absolute top-0 right-0 p-3 text-rose-450 text-xs">
              <ShieldCheck className="w-4 h-4 animate-pulse" />
            </div>
          )}
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-orbitron">{isOwner ? 'Google Photos' : 'Secure Vault 1'}</p>
          <h2 className="text-xl font-extrabold text-rose-500 dark:text-rose-400 mt-2 font-orbitron">
            {formatBytes(stats.googlePhotosSize)}
          </h2>
          <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-3 font-extrabold flex items-center gap-1.5 font-poppins">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_#10b981]"></span>
            <span>{stats.googlePhotosCount} items · {isOwner ? 'Active API Connection' : 'Vault Secured'}</span>
          </p>
        </div>

        {/* Mega metrics */}
        <div className="glass-panel p-5 rounded-3xl border border-white/5 dark:border-slate-800/50 shadow-md bg-white/50 dark:bg-slate-950/20 backdrop-blur-md relative overflow-hidden">
          {isOwner && (
            <div className="absolute top-0 right-0 p-3 text-red-500 text-xs">
              <ShieldCheck className="w-4 h-4 animate-pulse" />
            </div>
          )}
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-orbitron">{isOwner ? 'Mega Cloud' : 'Secure Vault 2'}</p>
          <h2 className="text-xl font-extrabold text-red-655 dark:text-red-550 mt-2 font-orbitron">
            {formatBytes(stats.megaSize)}
          </h2>
          <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-3 font-extrabold flex items-center gap-1.5 font-poppins">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_#10b981]"></span>
            <span>{stats.megaCount} items · {isOwner ? 'Load-Balanced Nodes' : 'Vault Secured'}</span>
          </p>
        </div>

        {/* Degoo metrics */}
        <div className="glass-panel p-5 rounded-3xl border border-white/5 dark:border-slate-800/50 shadow-md bg-white/50 dark:bg-slate-950/20 backdrop-blur-md relative overflow-hidden">
          {isOwner && (
            <div className="absolute top-0 right-0 p-3 text-yellow-500 text-xs">
              <ShieldCheck className="w-4 h-4 animate-pulse" />
            </div>
          )}
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-orbitron">{isOwner ? 'Degoo Storage' : 'Secure Vault 3'}</p>
          <h2 className="text-xl font-extrabold text-yellow-600 dark:text-yellow-500 mt-2 font-orbitron">
            {formatBytes(stats.degooSize)}
          </h2>
          <p className="text-[10px] text-slate-550 dark:text-slate-400 mt-3 font-extrabold flex items-center gap-1.5 font-poppins">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_#10b981]"></span>
            <span>{stats.degooCount} items · {isOwner ? 'Active API Connection' : 'Vault Secured'}</span>
          </p>
        </div>
      </div>

      {/* 3. Provider Filters Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mt-8 font-poppins">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 tracking-wider font-orbitron">
          <Filter className="w-3.5 h-3.5" />
          <span>Vault Filter</span>
        </div>
        
        <div className="flex gap-2 bg-slate-100 dark:bg-slate-900/80 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
          {[
            { id: 'all', name: 'All Vaults', icon: Layers },
            { id: 'google-photos', name: isOwner ? 'Google Photos' : 'Vault 1', icon: ImageIcon },
            { id: 'mega', name: isOwner ? 'Mega' : 'Vault 2', icon: Cloud },
            { id: 'degoo', name: isOwner ? 'Degoo' : 'Vault 3', icon: HardDrive }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`py-2 px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 cursor-pointer transition-all select-none ${
                  active 
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-md border border-slate-250/10 scale-103' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Media Grid View */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-square bg-slate-200/50 dark:bg-slate-900/50 rounded-3xl border border-white/5 animate-pulse flex flex-col justify-end p-4 shadow">
              <div className="w-2/3 h-4 bg-slate-300 dark:bg-slate-800 rounded mb-2"></div>
              <div className="w-1/3 h-3 bg-slate-300 dark:bg-slate-800 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="py-20 text-center glass-panel rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 flex flex-col items-center justify-center p-8 bg-white/30 dark:bg-slate-950/10 shadow-lg">
          <Layers className="w-12 h-12 text-slate-300 dark:text-slate-700 animate-bounce-slow mb-4" />
          <h4 className="font-orbitron font-extrabold text-base text-slate-700 dark:text-slate-300 uppercase tracking-wide">No vault assets found</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto font-poppins">
            Currently, no files are returned from the selected cloud filter. Synchronize your secure vaults or verify connections.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <AnimatePresence>
            {filteredFiles.map((file) => {
              const isVideo = file.type === 'video';
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  key={file.id}
                  onClick={() => setLightboxItem(file)}
                  className="aspect-square group rounded-3xl overflow-hidden relative border border-slate-200/50 dark:border-slate-850 shadow-md cursor-pointer hover:shadow-2xl transition-all duration-300 hover:border-indigo-500/40 bg-slate-100 dark:bg-slate-950"
                >
                  {/* Photo or Video Thumbnail */}
                  {isVideo ? (
                    <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                      <video src={file.url} className="w-full h-full object-cover opacity-60" muted preload="metadata" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/45 transition-all flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-md group-hover:scale-110 transition-all">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <img 
                      src={file.url} 
                      alt={file.name} 
                      className="w-full h-full object-cover group-hover:scale-103 transition-all duration-500" 
                      loading="lazy"
                    />
                  )}

                  {/* Cloud Badge indicator (Hidden/Adapted for Nivetha sandbox) */}
                  <div className={`absolute top-3.5 left-3.5 py-1 px-2.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white backdrop-blur-md flex items-center gap-1 shadow-sm border ${
                    file.cloud === 'google-photos' 
                      ? 'bg-rose-500/80 border-rose-400/40' 
                      : ['mega', 'mega1', 'mega2', 'mega3'].includes(file.cloud)
                      ? 'bg-red-650/80 border-red-500/40' 
                      : 'bg-yellow-500/80 border-yellow-400/40'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white inline-block"></span>
                    <span>
                      {isOwner ? (
                        file.cloud === 'mega' ? 'Mega' : 
                        file.cloud === 'mega1' ? 'Mega 1' :
                        file.cloud === 'mega2' ? 'Mega 2' :
                        file.cloud === 'mega3' ? 'Mega 3' :
                        file.cloud.replace('-', ' ')
                      ) : (
                        file.cloud === 'google-photos' ? 'Vault 1' :
                        ['mega', 'mega1', 'mega2', 'mega3'].includes(file.cloud) ? 'Vault 2' : 'Vault 3'
                      )}
                    </span>
                  </div>

                  {/* Media Details Footer Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/45 to-transparent text-white flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none font-poppins">
                    <p className="font-extrabold text-xs leading-tight truncate">{file.name}</p>
                    <div className="flex items-center justify-between mt-1.5 text-[9px] font-bold text-slate-300">
                      <span>{formatBytes(file.size)}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5 text-slate-400" />
                        {new Date(file.date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* 5. Custom Lightbox overlay */}
      <AnimatePresence>
        {lightboxItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 md:p-8"
          >
            {/* Close Button */}
            <button
              onClick={() => setLightboxItem(null)}
              className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 text-white rounded-full transition-all cursor-pointer shadow-md"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Media Box */}
            <motion.div
              initial={{ scale: 0.97, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: 15 }}
              className="w-full max-w-4xl max-h-[80vh] flex flex-col items-center justify-center relative rounded-3xl overflow-hidden"
            >
              {lightboxItem.type === 'video' ? (
                <video 
                  src={lightboxItem.url} 
                  controls 
                  autoPlay 
                  className="max-w-full max-h-[70vh] rounded-2xl shadow-2xl border border-white/10" 
                />
              ) : (
                <img 
                  src={lightboxItem.url} 
                  alt={lightboxItem.name} 
                  className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl border border-white/10" 
                />
              )}

              {/* Media Title and Cloud Source Panel */}
              <div className="w-full max-w-2xl mt-6 p-5 glass-panel rounded-2xl border border-white/15 bg-white/5 text-slate-100 flex items-center justify-between gap-4 font-poppins shadow-2xl">
                <div className="min-w-0">
                  <h4 className="font-extrabold text-sm leading-tight truncate flex items-center gap-2">
                    {lightboxItem.name}
                    <span className={`py-0.5 px-2 rounded-full text-[9px] font-black uppercase tracking-wider text-white ${
                      lightboxItem.cloud === 'google-photos' 
                        ? 'bg-rose-500' 
                        : ['mega', 'mega1', 'mega2', 'mega3'].includes(lightboxItem.cloud)
                        ? 'bg-red-655' 
                        : 'bg-yellow-550'
                    }`}>
                      {isOwner ? (
                        lightboxItem.cloud === 'mega' ? 'Mega' :
                        lightboxItem.cloud === 'mega1' ? 'Mega 1' :
                        lightboxItem.cloud === 'mega2' ? 'Mega 2' :
                        lightboxItem.cloud === 'mega3' ? 'Mega 3' :
                        lightboxItem.cloud.replace('-', ' ')
                      ) : (
                        lightboxItem.cloud === 'google-photos' ? 'Vault 1' :
                        ['mega', 'mega1', 'mega2', 'mega3'].includes(lightboxItem.cloud) ? 'Vault 2' : 'Vault 3'
                      )}
                    </span>
                  </h4>
                  <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 mt-2">
                    <span>File size: {formatBytes(lightboxItem.size)}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      Created: {new Date(lightboxItem.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <a
                  href={lightboxItem.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 py-2 px-3.5 bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Link</span>
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
