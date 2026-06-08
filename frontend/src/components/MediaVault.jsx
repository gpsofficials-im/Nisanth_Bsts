import React, { useState, useRef } from 'react';
import { useStorage } from '../context/StorageContext';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  UploadCloud, Folder, Cloud, HardDrive, Trash2, Video, Image as ImageIcon, Eye, Plus, Sparkles, X, 
  ArrowLeft, FolderOpen, Play, Search, FileText, ChevronRight, Download, Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Folder definitions with harmonized neon gradients
const PHOTO_FOLDERS = [
  { id: 'fun', name: 'Fun', color: 'from-cyan-500 to-blue-600', glow: 'shadow-cyan-500/20' },
  { id: 'letters', name: 'Letters', color: 'from-pink-500 to-purple-600', glow: 'shadow-pink-500/20' },
  { id: 'photos', name: 'Photos', color: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/20' }
];

const VIDEO_FOLDERS = [
  { id: 'camera', name: 'Camera', color: 'from-cyan-500 to-blue-600', glow: 'shadow-cyan-500/20' },
  { id: 'edits', name: 'Edits', color: 'from-pink-500 to-purple-600', glow: 'shadow-pink-500/20' },
  { id: 'extras', name: 'Extras', color: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/20' }
];

const DOCUMENT_FOLDERS = [
  { id: 'notes', name: 'Personal Notes', color: 'from-emerald-500 to-teal-600', glow: 'shadow-emerald-500/20' },
  { id: 'docs', name: 'Letters & PDFs', color: 'from-purple-500 to-indigo-600', glow: 'shadow-purple-500/20' },
  { id: 'archive', name: 'Archive', color: 'from-amber-500 to-orange-600', glow: 'shadow-amber-500/20' }
];

export default function MediaVault({ type }) {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { 
    media, uploadFiles, deleteMedia, config, 
    uploadProgress, uploadQueueLength, showToast, isOffline
  } = useStorage();
  const { user } = useAuth();

  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lightboxItem, setLightboxItem] = useState(null);
  
  const fileInputRef = useRef(null);

  // Normalize type to match category
  const activeCategory = type === 'photos' ? 'Photos' : type === 'videos' ? 'Videos' : 'Documents';

  // Dynamic FOLDERS list based on the active section type
  const FOLDERS = type === 'videos' ? VIDEO_FOLDERS : type === 'photos' ? PHOTO_FOLDERS : DOCUMENT_FOLDERS;

  // Format size function
  const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Filter media based on: category (Photos/Videos/Documents), folder, and search query
  const getFolderMedia = (fId) => {
    return media.filter(item => {
      const matchesCategory = item.category?.toLowerCase() === activeCategory.toLowerCase();
      
      // Backward compatibility mapping for old folder IDs
      const normalizeFolder = (f, cat) => {
        if (!f) return cat?.toLowerCase() === 'videos' ? 'camera' : cat?.toLowerCase() === 'documents' ? 'notes' : 'fun';
        const lf = f.toLowerCase();
        if (cat?.toLowerCase() === 'videos') {
          if (lf === 'storage1') return 'camera';
          if (lf === 'storage2') return 'edits';
          if (lf === 'storage3') return 'extras';
        } else if (cat?.toLowerCase() === 'documents') {
          if (lf === 'storage1') return 'notes';
          if (lf === 'storage2') return 'docs';
          if (lf === 'storage3') return 'archive';
        } else {
          if (lf === 'storage1') return 'fun';
          if (lf === 'storage2') return 'letters';
          if (lf === 'storage3') return 'photos';
        }
        return lf;
      };

      const normalizedDbFolder = normalizeFolder(item.folder, item.category);
      const normalizedReqFolder = normalizeFolder(fId, activeCategory);
      
      return matchesCategory && normalizedDbFolder === normalizedReqFolder;
    });
  };

  // Current folder's media list filtered by search query
  const currentFolderMedia = folderId ? getFolderMedia(folderId).filter(item => {
    const matchesSearch = searchQuery.trim() === '' || 
      item.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.uploadedBy && item.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  }) : [];

  // Active folder metadata
  const activeFolderObj = FOLDERS.find(f => f.id === folderId);
  const activeFolderName = activeFolderObj ? activeFolderObj.name : 'Unknown Storage';

  // Stats for the active category
  const categoryMedia = media.filter(item => item.category?.toLowerCase() === activeCategory.toLowerCase());
  const totalCategorySize = categoryMedia.reduce((sum, item) => sum + (item.size || 0), 0);
  const totalCategoryCount = categoryMedia.length;

  // Drag and drop processing
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    processFiles(files);
  };

  const processFiles = (files) => {
    const validFiles = files.filter(file => {
      const isVideoFile = file.type.startsWith('video/');
      const isImageFile = file.type.startsWith('image/');
      
      if (activeCategory === 'Videos' && !isVideoFile) {
        showToast('Only video files are allowed inside the Videos section.', 'warning');
        return false;
      }
      if (activeCategory === 'Photos' && !isImageFile) {
        showToast('Only picture files are allowed inside the Photos section.', 'warning');
        return false;
      }
      if (activeCategory === 'Documents') {
        const ext = file.name.split('.').pop().toLowerCase();
        const allowedExts = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'txt', 'pptx', 'ppt'];
        if (!allowedExts.includes(ext)) {
          showToast('Only document files (PDF, Word, Excel, PowerPoint, Text) are allowed here.', 'warning');
          return false;
        }
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setSelectedFiles(prev => [...prev, ...validFiles]);
    
    const newPreviews = validFiles.map(file => {
      const isVideo = file.type.startsWith('video/');
      const isDoc = !file.type.startsWith('video/') && !file.type.startsWith('image/');
      return {
        name: file.name,
        type: isVideo ? 'video' : isDoc ? 'document' : 'photo',
        url: isDoc ? '' : URL.createObjectURL(file)
      };
    });
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0) return;
    
    if (user.role === 'secondary' && user.permissions && !user.permissions.canUpload) {
      showToast('You do not have permission to upload files.', 'warning');
      return;
    }
    
    const success = await uploadFiles(selectedFiles, activeCategory, user.name, folderId);
    if (success) {
      setSelectedFiles([]);
      setPreviews([]);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Tab Navigation header */}
      <div className="flex bg-slate-200/50 dark:bg-slate-950/40 p-1.5 rounded-2xl border border-white/20 dark:border-white/5 flex-wrap gap-1 max-w-md font-orbitron">
        {[
          { id: 'photos', name: 'Photos', icon: ImageIcon },
          { id: 'videos', name: 'Videos', icon: Video },
          { id: 'documents', name: 'Documents', icon: FileText }
        ].map(tab => {
          const Icon = tab.icon;
          const active = type === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                navigate(`/${tab.id}`);
              }}
              className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-extrabold uppercase flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                active 
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

      {/* Main Container Switch */}
      <AnimatePresence mode="wait">
        {!folderId ? (
          
          /* VIEW 1: HOME DIRECTORY FOLDERS LIST */
          <motion.div
            key="folders-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* Elegant Header Banner */}
            <div className="glass-panel p-8 rounded-3xl bg-gradient-to-r from-slate-900/5 to-slate-900/10 dark:from-slate-950/10 dark:to-slate-950/30 border border-white/10 dark:border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-3xl"></div>
              <div className="space-y-2 relative z-10">
                <div className="inline-flex items-center gap-2 py-1 px-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black tracking-widest uppercase">
                  {activeCategory} Section
                </div>
                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                  {activeCategory} Wallet Dashboard
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">
                  Securely stored personal vaults. Click into a storage folder below to upload, view, and sync.
                </p>
              </div>

              {/* Stats Card */}
              <div className="flex gap-4 relative z-10 shrink-0">
                <div className="p-4 bg-white/40 dark:bg-slate-900/50 rounded-2xl border border-white/20 dark:border-white/5 text-center min-w-[90px]">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">Total Items</div>
                  <div className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{totalCategoryCount}</div>
                </div>
                <div className="p-4 bg-white/40 dark:bg-slate-900/50 rounded-2xl border border-white/20 dark:border-white/5 text-center min-w-[110px]">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400">Space Used</div>
                  <div className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{formatBytes(totalCategorySize)}</div>
                </div>
              </div>
            </div>

            {/* Folders List Grid */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                Secure Subfolders (3 Available)
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {FOLDERS.map((f, i) => {
                  const folderItems = getFolderMedia(f.id);
                  const folderSize = folderItems.reduce((sum, item) => sum + (item.size || 0), 0);
                  const folderCount = folderItems.length;
                  
                  // Mock storage limit calculation (50MB cap per folder for dynamic stats bar)
                  const folderLimit = 50 * 1024 * 1024;
                  const usePercentage = Math.min((folderSize / folderLimit) * 100, 100);

                  return (
                    <motion.div
                      key={f.id}
                      onClick={() => navigate(`/${type}/${f.id}`)}
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`glass-card p-5 rounded-3xl border border-white/20 dark:border-slate-800/40 bg-white/30 dark:bg-slate-900/20 shadow-lg cursor-pointer transition-all flex flex-col justify-between h-48 relative overflow-hidden group hover:border-indigo-500/40 hover:shadow-xl hover:${f.glow}`}
                    >
                      {/* Top Corner Decorative Glow */}
                      <div className={`absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-10 rounded-full blur-xl transition-all duration-300`}></div>
                      
                      <div className="flex items-start justify-between">
                        {/* Folder icon wrapper with gradient color backgrounds */}
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${f.color} text-white flex items-center justify-center shadow-md shadow-indigo-500/10`}>
                          <FolderOpen className="w-5 h-5" />
                        </div>
                        
                        <div className="px-2 py-0.5 bg-slate-200/50 dark:bg-slate-950/40 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-500">
                          Storage {i + 1}
                        </div>
                      </div>

                      <div className="space-y-3.5 mt-4">
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-800 dark:text-white truncate">
                            {f.name}
                          </h4>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block mt-0.5">
                            {folderCount} {folderCount === 1 ? 'Item' : 'Items'} • {formatBytes(folderSize)}
                          </span>
                        </div>

                        {/* Progress stats bar */}
                        <div className="space-y-1">
                          <div className="w-full bg-slate-200/50 dark:bg-slate-800/50 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`bg-gradient-to-r ${f.color} h-full rounded-full transition-all`} 
                              style={{ width: `${usePercentage || 2}%` }}
                            ></div>
                          </div>
                          <div className="flex items-center justify-between text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                            <span>{Math.round(usePercentage)}% Capacity</span>
                            <span>50 MB</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : (
          
          /* VIEW 2: FOLDER DETAIL VIEW */
          <motion.div
            key="folder-detail-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            
            {/* Modern Breadcrumbs Navigation Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 glass-panel rounded-2xl border border-white/20 dark:border-white/5 bg-white/20 dark:bg-slate-900/10 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(`/${type}`)}
                  className="p-2 bg-slate-200/50 hover:bg-slate-200 dark:bg-slate-800/50 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-300 transition-all cursor-pointer active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500 uppercase">
                  <span className="cursor-pointer hover:text-slate-800 dark:hover:text-white" onClick={() => navigate(`/${type}`)}>
                    {activeCategory}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg">
                    {activeFolderName}
                  </span>
                </div>
              </div>

              {/* Secure tag */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search inside this folder..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="py-1.5 px-3 bg-slate-200/50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-880 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 transition-all w-full sm:w-48"
                />
                <span className="text-[10px] font-black tracking-wider uppercase py-1.5 px-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-500/20 shadow-sm whitespace-nowrap">
                  {user.role === 'secondary' ? 'Vault Secured' : 'Cloud Secured'}
                </span>
              </div>
            </div>

            {/* Split Screen upload zone vs grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Instant Upload Panel */}
              <div className="lg:col-span-1 glass-card p-6 rounded-3xl border border-white/20 bg-white/10 dark:bg-slate-900/10 backdrop-blur-md flex flex-col justify-between h-fit self-start gap-5">
                <div className="space-y-2">
                  <h3 className="font-extrabold text-slate-800 dark:text-white text-base">
                    Upload to {activeFolderName}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {user.role === 'secondary' 
                      ? `Add new ${activeCategory.toLowerCase()} directly to this private memory segment.` 
                      : `Add new ${activeCategory.toLowerCase()} directly to this cloud storage segment.`}
                  </p>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current.click()}
                  className={`border-2 border-dashed rounded-2.5xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[180px] ${
                    isDragging 
                      ? 'border-indigo-500 bg-indigo-500/5' 
                      : 'border-slate-300 dark:border-slate-850 hover:border-indigo-400 bg-slate-200/20 dark:bg-slate-950/20'
                  }`}
                >
                  <UploadCloud className="w-10 h-10 text-indigo-500/80 mb-2.5" />
                  <div className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Drag & Drop Files
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    or click to browse local folders
                  </div>
                  <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept={type === 'videos' ? 'video/*' : type === 'photos' ? 'image/*' : '.pdf,.docx,.doc,.xlsx,.xls,.txt,.pptx,.ppt'}
                  />
                </div>

                {/* Progress Indicators */}
                {uploadProgress > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                      <span>Uploading {uploadQueueLength} files...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-pink-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Previews panel */}
                {previews.length > 0 && (
                  <div className="space-y-4 pt-2">
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Queued Items ({previews.length})
                    </div>
                    <div className="grid grid-cols-3 gap-2 max-h-[140px] overflow-y-auto pr-1">
                      {previews.map((prev, index) => (
                        <div key={index} className="relative group aspect-square rounded-xl overflow-hidden border border-white/20 shadow-sm bg-slate-950/20">
                          {prev.type === 'video' ? (
                            <div className="w-full h-full flex items-center justify-center text-white">
                              <Video className="w-5 h-5 opacity-70" />
                            </div>
                          ) : prev.type === 'document' ? (
                            <div className="w-full h-full flex items-center justify-center text-white bg-slate-800">
                              <FileText className="w-6 h-6 text-indigo-455" />
                            </div>
                          ) : (
                            <img src={prev.url} alt="upload preview" className="w-full h-full object-cover" />
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); removeSelectedFile(index); }}
                            className="absolute -top-1 -right-1 p-1 bg-rose-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:scale-110 cursor-pointer shadow-md"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    <button
                      onClick={handleUploadSubmit}
                      className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 active:scale-98 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-md hover:shadow-indigo-500/10 cursor-pointer transition-all text-center"
                    >
                      {user.role === 'secondary' ? 'Upload to Vault' : 'Stream to Cloud Storages'}
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Files Grid */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Folder Files ({currentFolderMedia.length})
                </h3>

                {currentFolderMedia.length === 0 ? (
                  <div className="p-16 border-2 border-dashed border-slate-200 dark:border-slate-850 bg-white/5 rounded-3.5xl text-center text-slate-500 dark:text-slate-400">
                    <Folder className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-800 mb-3 animate-pulse" />
                    <p className="text-sm font-semibold">Folder is empty</p>
                    <p className="text-xs text-slate-400 mt-1">Upload files using the drag-box on the left side!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-h-[580px] overflow-y-auto pr-2">
                    {currentFolderMedia.map(item => (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="glass-card p-3 rounded-2.5xl relative group overflow-hidden border border-white/20 hover:transform-none bg-white/40 dark:bg-slate-900/35 hover:border-indigo-500/30"
                      >
                        {/* Media display aspect */}
                        <div className="aspect-video w-full bg-slate-950/20 dark:bg-slate-950/40 rounded-2xl overflow-hidden mb-3 relative shadow-inner">
                          
                          {item.type === 'video' ? (
                            <div className="w-full h-full relative">
                              <video 
                                src={isOffline && item.megaUrl ? item.megaUrl : `${window.API_URL}/api/media/file/${item.filename}#t=0.1`}
                                className="w-full h-full object-cover"
                                preload="metadata"
                                playsInline
                                muted
                              />
                              {/* Play Overlay */}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-10 h-10 rounded-full bg-white/30 dark:bg-slate-900/30 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-lg pointer-events-none group-hover:scale-110 transition-all duration-300">
                                  <Play className="w-4 h-4 fill-white ml-0.5" />
                                </div>
                              </div>
                            </div>
                          ) : item.type === 'document' ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100/50 dark:bg-slate-950/50 p-4 text-center gap-2 relative">
                              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center shadow-inner">
                                <FileText className="w-6 h-6 text-indigo-550" />
                              </div>
                              <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate w-full px-2">
                                {item.originalName}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                {formatBytes(item.size)}
                              </span>
                            </div>
                          ) : (
                            <img 
                              src={isOffline && item.megaUrl ? item.megaUrl : `${window.API_URL}/api/media/file/${item.filename}`}
                              alt={item.originalName}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          )}

                          {/* Hover Play & Actions Layer */}
                          <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3 backdrop-blur-[2px]">
                            <button
                              onClick={() => setLightboxItem(item)}
                              className="p-3 bg-white/95 text-slate-800 rounded-full hover:scale-110 shadow-md transition-all cursor-pointer"
                              title="Full Screen Preview"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                            
                            <a
                              href={`${window.API_URL}/api/media/file/${item.filename}`}
                              download={item.originalName}
                              target="_blank"
                              rel="noreferrer"
                              className="p-3 bg-white/95 text-slate-800 rounded-full hover:scale-110 shadow-md transition-all cursor-pointer"
                              title="Download to Local"
                            >
                              <Download className="w-4 h-4" />
                            </a>

                            <button
                              onClick={() => {
                                if (user.role === 'secondary' && user.permissions && !user.permissions.canDelete) {
                                  showToast('You do not have permission to delete files.', 'warning');
                                  return;
                                }
                                if(confirm(`Remove file from this storage: ${item.originalName}?`)) {
                                  deleteMedia(item.id, user.name);
                                }
                              }}
                              className="p-3 bg-rose-600/95 text-white rounded-full hover:scale-110 shadow-md transition-all cursor-pointer"
                              title="Delete File"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Left Category/Type Badge */}
                          <div className="absolute top-3 left-3 px-2 py-0.5 bg-slate-950/60 backdrop-blur-md rounded-lg text-[9px] font-extrabold uppercase tracking-widest text-white border border-white/10">
                            {item.type}
                          </div>

                          {/* Storage Sync status indicator pins (high-fidelity live hosts) */}
                          {user.role !== 'secondary' && (
                            <div className="absolute bottom-3 right-3 flex gap-1 font-orbitron">
                              {item.urls?.google && (
                                <span className="py-1 px-1.5 bg-amber-500/90 text-white rounded-md shadow border border-amber-400/20 text-[8px] font-black uppercase" title="Google Photos">
                                  G
                                </span>
                              )}
                              {item.urls?.mega && (
                                <span className="py-1 px-1.5 bg-rose-600/90 text-white rounded-md shadow border border-rose-500/20 text-[8px] font-black uppercase" title="MEGA Cloud">
                                  M
                                </span>
                              )}
                              {item.urls?.degoo && (
                                <span className="py-1 px-1.5 bg-sky-500/90 text-white rounded-md shadow border border-sky-400/20 text-[8px] font-black uppercase" title="Degoo Cloud">
                                  D
                                </span>
                              )}
                              {/* Compatibility fallback */}
                              {!item.urls && item.megaUrl && (
                                <span className="py-1 px-1.5 bg-emerald-600/90 text-white rounded-md shadow border border-emerald-500/20 text-[8px] font-black uppercase" title="Synced Cloud">
                                  Cloud
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Title & Metadata bottom bar */}
                        <div className="flex flex-col justify-between px-1.5 pb-1">
                          <div className="font-extrabold text-xs text-slate-800 dark:text-white truncate">
                            {item.originalName}
                          </div>
                          <div className="flex items-center justify-between mt-1 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                            <span>Uploaded by {item.uploadedBy}</span>
                            <span>{new Date(item.uploadDate).toLocaleDateString()}</span>
                          </div>
                        </div>

                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. PREMIUM FULL-SCREEN LIGHTBOX MODAL */}
      <AnimatePresence>
        {lightboxItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-4 md:p-8"
          >
            {/* Modal Glass Container */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-4xl max-h-[85vh] bg-slate-900/40 rounded-3.5xl border border-white/10 flex flex-col justify-between overflow-hidden shadow-2xl"
            >
              
              {/* Top Bar controls */}
              <div className="p-4 bg-slate-950/40 border-b border-white/10 flex items-center justify-between text-white">
                <div>
                  <h4 className="font-extrabold text-sm truncate max-w-sm">{lightboxItem.originalName}</h4>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">
                    Category: {lightboxItem.category} • Size: {formatBytes(lightboxItem.size)}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <a
                    href={`${window.API_URL}/api/media/file/${lightboxItem.filename}`}
                    download={lightboxItem.originalName}
                    className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-300 hover:text-white cursor-pointer"
                    title="Download File"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => {
                      if (user.role === 'secondary' && user.permissions && !user.permissions.canDelete) {
                        showToast('You do not have permission to delete files.', 'warning');
                        return;
                      }
                      if(confirm(`Remove file from this storage: ${lightboxItem.originalName}?`)) {
                        deleteMedia(lightboxItem.id, user.name);
                        setLightboxItem(null);
                      }
                    }}
                    className="p-2 hover:bg-rose-500/20 rounded-xl transition-all text-slate-350 hover:text-rose-450 cursor-pointer"
                    title="Delete File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setLightboxItem(null)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-300 hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Central Media view box */}
              <div className="flex-1 flex items-center justify-center p-6 min-h-0 bg-black/20">
                {lightboxItem.type === 'video' ? (
                  <video
                    src={isOffline && lightboxItem.megaUrl ? lightboxItem.megaUrl : `${window.API_URL}/api/media/file/${lightboxItem.filename}`}
                    className="max-w-full max-h-[60vh] rounded-xl shadow-lg border border-white/5"
                    controls
                    autoPlay
                    playsInline
                  />
                ) : lightboxItem.type === 'document' ? (
                  <div className="text-center p-8 bg-slate-900/60 rounded-3xl border border-white/5 space-y-4 max-w-md w-full">
                    <div className="w-16 h-16 rounded-3xl bg-indigo-500/10 flex items-center justify-center mx-auto shadow-inner">
                      <FileText className="w-8 h-8 text-indigo-500 animate-bounce" />
                    </div>
                    <h3 className="text-base font-extrabold text-white truncate px-4">
                      {lightboxItem.originalName}
                    </h3>
                    <p className="text-xs text-slate-450 uppercase font-bold tracking-widest">
                      Document Vault File • {formatBytes(lightboxItem.size)}
                    </p>
                    <div className="pt-2 flex justify-center gap-3">
                      <a
                        href={`${window.API_URL}/api/media/file/${lightboxItem.filename}`}
                        target="_blank"
                        rel="noreferrer"
                        className="py-3 px-6 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-xs font-extrabold tracking-wider uppercase rounded-xl shadow-md flex items-center gap-2 hover:from-indigo-550"
                      >
                        <Eye className="w-4 h-4" /> Open Document
                      </a>
                    </div>
                  </div>
                ) : (
                  <img
                    src={isOffline && lightboxItem.megaUrl ? lightboxItem.megaUrl : `${window.API_URL}/api/media/file/${lightboxItem.filename}`}
                    alt={lightboxItem.originalName}
                    className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-lg border border-white/5"
                  />
                )}
              </div>

              {/* Bottom bar status tags */}
              <div className="p-4 bg-slate-950/40 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                <span>By {lightboxItem.uploadedBy}</span>
                <span>{new Date(lightboxItem.uploadDate).toLocaleString()}</span>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
