import React, { useState } from 'react';
import { useStorage } from '../context/StorageContext';
import { useAuth } from '../context/AuthContext';
import { Calendar, Image, Edit, Trash2, Plus, X, Video, Heart, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Timeline() {
  const { timeline, media, saveTimelineEntry, deleteTimelineEntry } = useStorage();
  const { user } = useAuth();
  
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  
  // Form fields
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMedia, setSelectedMedia] = useState([]);
  
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false);

  const openNewEditor = () => {
    if (user.role === 'secondary' && user.permissions && !user.permissions.canEditTimeline) {
      showToast('You do not have permission to modify the story timeline.', 'warning');
      return;
    }
    setEditingCard(null);
    setDate(new Date().toISOString().split('T')[0]);
    setTitle('');
    setDescription('');
    setSelectedMedia([]);
    setEditorOpen(true);
  };

  const openModifyEditor = (card) => {
    if (user.role === 'secondary' && user.permissions && !user.permissions.canEditTimeline) {
      showToast('You do not have permission to modify the story timeline.', 'warning');
      return;
    }
    setEditingCard(card);
    setDate(card.date);
    setTitle(card.title);
    setDescription(card.description);
    setSelectedMedia(card.mediaUrls || []);
    setEditorOpen(true);
  };

  const handleMediaSelectToggle = (filename) => {
    const filePath = `/api/media/file/${filename}`;
    if (selectedMedia.includes(filePath)) {
      setSelectedMedia(prev => prev.filter(m => m !== filePath));
    } else {
      setSelectedMedia(prev => [...prev, filePath]);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const entry = {
      id: editingCard?.id,
      date,
      title,
      description,
      mediaUrls: selectedMedia
    };

    const success = await saveTimelineEntry(entry, user.name);
    if (success) {
      setEditorOpen(false);
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-cinzel font-black tracking-tight text-slate-800 dark:text-white">
            Life Story Timeline
          </h2>
          <p className="text-sm font-poppins text-slate-500 dark:text-slate-400 mt-1">
            A chronological memory lane of our incredible bond.
          </p>
        </div>
        
        <button
          onClick={openNewEditor}
          className="py-3 px-5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-600 hover:to-indigo-600 active:scale-95 text-white rounded-xl shadow-md font-extrabold text-xs flex items-center gap-2 cursor-pointer transition-all uppercase tracking-wider font-orbitron"
        >
          <Plus className="w-4 h-4" /> Add Story Page
        </button>
      </div>

      {/* Cinematic Emotional Quotes Banner */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="p-6 bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 rounded-3xl border border-white/20 dark:border-white/5 text-center relative overflow-hidden backdrop-blur-sm select-none"
      >
        <p className="text-2xl md:text-3xl font-dancing text-pink-500 dark:text-pink-400 font-black leading-relaxed">
          "Every step we take is a footprint in our private universe."
        </p>
        <p className="text-[9px] font-orbitron font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2 flex items-center justify-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-pink-500 animate-pulse" fill="currentColor" /> NIST SECURED MEMORY BOOK
        </p>
      </motion.div>

      {/* Editor Form Modal */}
      <AnimatePresence>
        {editorOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-panel w-full max-w-lg p-6 rounded-3xl border border-white/20 relative shadow-2xl overflow-y-auto max-h-[90vh] text-slate-800 dark:text-slate-100"
            >
              <button
                onClick={() => setEditorOpen(false)}
                className="absolute top-4 right-4 p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="font-extrabold text-xl mb-4 bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
                {editingCard ? 'Modify Timeline Story' : 'Create New Timeline Story'}
              </h3>

              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Memory Date</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-indigo-500 focus:outline-none rounded-xl font-medium text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Story Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. The first cup of coffee"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-indigo-500 focus:outline-none rounded-xl font-medium text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Description</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Write a sweet summary of this memory..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-indigo-500 focus:outline-none rounded-xl font-medium text-sm transition-all"
                  />
                </div>

                {/* Media Link Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase">Attach Media Files</label>
                    <button
                      type="button"
                      onClick={() => setMediaSelectorOpen(!mediaSelectorOpen)}
                      className="text-xs font-extrabold text-indigo-500 hover:underline"
                    >
                      {mediaSelectorOpen ? 'Hide Selector' : 'Browse Vault Media'}
                    </button>
                  </div>

                  {mediaSelectorOpen && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="p-3 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 grid grid-cols-4 gap-2 max-h-[140px] overflow-y-auto mb-3"
                    >
                      {media.length === 0 ? (
                        <div className="col-span-4 text-center text-xs text-slate-500">
                          Upload files to Media first to attach them!
                        </div>
                      ) : (
                        media.map(m => {
                          const filePath = `/api/media/file/${m.filename}`;
                          const selected = selectedMedia.includes(filePath);
                          return (
                            <div
                              key={m.id}
                              onClick={() => handleMediaSelectToggle(m.filename)}
                              className={`cursor-pointer aspect-square rounded-lg overflow-hidden relative border-2 ${selected ? 'border-indigo-500' : 'border-transparent opacity-60'}`}
                            >
                              <img src={`${window.API_URL}/api/media/file/${m.filename}`} className="w-full h-full object-cover" />
                              {selected && (
                                <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center text-white">
                                  <Check className="w-5 h-5 bg-indigo-600 rounded-full p-0.5" />
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </motion.div>
                  )}

                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Attached items: <span className="font-bold text-indigo-500">{selectedMedia.length} files</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 to-pink-500 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  Save Timeline Page
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Timeline Line */}
      {timeline.length === 0 ? (
        <div className="glass-card p-12 rounded-3xl text-center text-slate-500 dark:text-slate-400 hover:transform-none">
          <Calendar className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-800 mb-3" />
          <p className="text-sm font-semibold">No milestones recorded yet</p>
          <p className="text-xs text-slate-400 mt-1">Click "Add Story Page" to write down your first bestie chapter!</p>
        </div>
      ) : (
        <div className="relative pl-6 md:pl-10 space-y-8 before:absolute before:top-4 before:bottom-4 before:left-[11px] before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-pink-500 before:to-rose-500">
          {timeline.map((card, index) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              {/* Central glowing indicator node */}
              <div className="absolute -left-[23px] md:-left-[37px] top-4 w-4 h-4 bg-indigo-500 border-4 border-white dark:border-slate-900 rounded-full shadow-md animate-pulse"></div>

              <div className="glass-card p-6 rounded-3xl border border-white/20 hover:transform-none">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-lg">
                      <Calendar className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-extrabold font-mono text-indigo-500 dark:text-indigo-400">
                      {new Date(card.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>
                  
                  {/* Edit/Trash commands */}
                  <div className="flex gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => openModifyEditor(card)}
                      className="p-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-500 hover:text-indigo-600 rounded-xl"
                      title="Edit card"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (user.role === 'secondary' && user.permissions && !user.permissions.canEditTimeline) {
                          showToast('You do not have permission to modify the story timeline.', 'warning');
                          return;
                        }
                        if (confirm(`Remove this milestone story?`)) {
                          deleteTimelineEntry(card.id, user.name);
                        }
                      }}
                      className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500 hover:text-rose-600 rounded-xl"
                      title="Delete card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4 font-poppins">
                  <div>
                    <h3 className="font-cinzel font-black text-xl text-slate-800 dark:text-white flex items-center gap-2 tracking-tight leading-tight">
                      {card.title} <Heart className="w-4 h-4 text-pink-500" fill="currentColor" />
                    </h3>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-2 leading-relaxed whitespace-pre-line text-justify">
                      {card.description}
                    </p>
                  </div>

                  {/* Staged media attachments */}
                  {card.mediaUrls && card.mediaUrls.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {card.mediaUrls.map((url, i) => {
                        const isVideo = url.endsWith('.mp4');
                        return (
                          <div key={i} className="aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-white/5 relative group">
                            {isVideo ? (
                              <video src={`${window.API_URL}${url}`} className="w-full h-full object-cover" controls preload="none" />
                            ) : (
                              <img src={`${window.API_URL}${url}`} alt="timeline attach" className="w-full h-full object-cover" loading="lazy" />
                            )}
                            <a
                              href={`${window.API_URL}${url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="absolute top-2 right-2 p-1.5 bg-slate-900/60 backdrop-blur rounded-lg text-white opacity-0 group-hover:opacity-100 hover:scale-105 transition-all text-xs"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
