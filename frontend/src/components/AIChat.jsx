import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Sparkles, Send, X, Bot, User, ArrowRight, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useStorage } from '../context/StorageContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function AIChat() {
  const { user, token } = useAuth();
  const { showToast } = useStorage();
  
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: `✨ Hello! I am your Nisanth AI Assistant. 🔒\n\nI can scan our private vault. Ask me things like:\n- *"When is Gokul's birthday?"*\n- *"Tell me our anniversary story"* \n- *"Find photos from the beach"*`
    }
  ]);
  const [typing, setTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([
    "When is Gokul's birthday?",
    "Tell me our anniversary story",
    "Find beach trip memories"
  ]);

  const [isListening, setIsListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  // Initialize Speech Recognition
  useEffect(() => {
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          showToast(`Voice assistant: ${event.error}`, 'warning');
        }
      };

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        handleVoiceCommand(transcript);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typing, isListening]);

  // Speech Synthesis Helper
  const speak = (text) => {
    if (!ttsEnabled) return;
    
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      
      // Remove emoticons and Markdown symbols for clean read-out
      const cleanText = text.replace(/[*_#`✨⚠️👭🔒]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft Zira') || v.name.includes('Samantha')) && v.lang.startsWith('en')
      ) || voices.find(v => v.lang.startsWith('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      showToast('Speech recognition not supported in this browser.', 'warning');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Process and route vocal commands
  const handleVoiceCommand = (query) => {
    if (!query.trim()) return;

    // 1. Role-Based Access Check: Block secondary users from requesting admin actions
    if (user?.role === 'secondary') {
      const adminKeywords = ['admin', 'password', 'storage setting', 'credentials', 'permission', 'config', 'smtp', 'mega', 'change email', 'server path', 'cloud', 'wallet', 'vault', 'degoo', 'google photos', 'google drive'];
      const isAccessingAdmin = adminKeywords.some(keyword => query.toLowerCase().includes(keyword));
      if (isAccessingAdmin) {
        const refuseText = "I'm sorry, Nivetha. As a secondary user, you do not have permission to modify or access admin configurations. Please ask Gokul to perform these actions.";
        setMessages(prev => [
          ...prev,
          { sender: 'user', text: query },
          { sender: 'bot', text: refuseText }
        ]);
        speak(refuseText);
        return;
      }
    }

    const normalized = query.toLowerCase();

    // 2. Specific navigation/vocal routes
    if (normalized.includes('open my recent memories') || normalized.includes('open recent memories') || normalized.includes('recent memories')) {
      const reply = "Opening your recent memory timeline now.";
      setMessages(prev => [
        ...prev,
        { sender: 'user', text: query },
        { sender: 'bot', text: reply }
      ]);
      speak(reply);
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { tab: 'timeline' } }));
    } else if (normalized.includes('search photos from beach trip') || normalized.includes('search beach trip') || normalized.includes('beach trip memories') || normalized.includes('beach trip')) {
      const reply = "Searching for photos from your beach trip in the media vault.";
      setMessages(prev => [
        ...prev,
        { sender: 'user', text: query },
        { sender: 'bot', text: reply }
      ]);
      speak(reply);
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { tab: 'media' } }));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('app-media-search', { detail: { category: 'Photos', query: 'beach' } }));
      }, 100);
    } else if (user?.role !== 'secondary' && (normalized.includes('show cloud files') || normalized.includes('cloud files') || normalized.includes('show my cloud'))) {
      const reply = "Here are the files synced to your cloud storage.";
      setMessages(prev => [
        ...prev,
        { sender: 'user', text: query },
        { sender: 'bot', text: reply }
      ]);
      speak(reply);
      window.dispatchEvent(new CustomEvent('app-navigate', { detail: { tab: 'media' } }));
    } else {
      // Fallback: Send generic queries to AI backend API
      handleSendMessage(query);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    if (!textToSend) setInput('');

    // 1. Role-Based Access Check (typed requests)
    if (user?.role === 'secondary') {
      const adminKeywords = ['admin', 'password', 'storage setting', 'credentials', 'permission', 'config', 'smtp', 'mega', 'change email', 'server path', 'cloud', 'wallet', 'vault', 'degoo', 'google photos', 'google drive'];
      const isAccessingAdmin = adminKeywords.some(keyword => query.toLowerCase().includes(keyword));
      if (isAccessingAdmin) {
        const refuseText = "I'm sorry, Nivetha. As a secondary user, you do not have permission to modify or access admin configurations. Please ask Gokul to perform these actions.";
        setMessages(prev => [
          ...prev,
          { sender: 'user', text: query },
          { sender: 'bot', text: refuseText }
        ]);
        speak(refuseText);
        return;
      }
    }

    // Append user message
    setMessages(prev => [...prev, { sender: 'user', text: query }]);
    setTyping(true);

    try {
      const response = await fetch(window.API_URL + '/api/ai/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          message: query
        })
      });

      const data = await response.json();
      setTyping(false);
      
      if (response.ok) {
        setMessages(prev => [...prev, { sender: 'bot', text: data.reply }]);
        speak(data.reply);
        if (data.suggestions) {
          setSuggestions(data.suggestions);
        }
      } else {
        throw new Error('AI Server offline');
      }
    } catch (error) {
      setTyping(false);
      setMessages(prev => [...prev, { 
        sender: 'bot', 
        text: '⚠️ I had trouble connecting to the memory neural net. Please verify the backend server is running!' 
      }]);
    }
  };

  const handleSuggestionClick = (sug) => {
    handleSendMessage(sug);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Glowing Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full flex items-center justify-center text-white shadow-xl cursor-pointer hover:scale-105 active:scale-95 transition-all ai-glow-ring border border-white/20"
          >
            <MessageCircle className="w-6 h-6 animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating Chat Box Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="w-[360px] sm:w-[380px] h-[520px] glass-panel rounded-3xl border border-white/20 dark:border-white/5 flex flex-col justify-between overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-cyan-600 via-indigo-600 to-indigo-700 text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/20 rounded-lg">
                  <Sparkles className="w-4 h-4 text-cyan-200 animate-spin-slow" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm leading-tight tracking-wide font-poppins">Nisanth AI Assistant</h3>
                  <p className="text-[10px] text-cyan-300 opacity-90 font-semibold uppercase tracking-wider">Voice & Neural Secured</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-white/30 dark:bg-slate-900/30">
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`p-2 rounded-xl shrink-0 h-max border ${
                    msg.sender === 'user' 
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' 
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700'
                  }`}>
                    {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  <div className={`max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line border font-medium ${
                    msg.sender === 'user'
                      ? 'bg-indigo-500 text-white rounded-tr-none border-indigo-600'
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border-slate-150 dark:border-slate-750'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {/* Dynamic Sound Wave & Voice Listening Visualizer */}
              {isListening && (
                <div className="flex flex-col items-center justify-center py-4 bg-slate-900/10 dark:bg-slate-950/20 rounded-2xl border border-dashed border-cyan-500/30 gap-2 mb-1 animate-pulse">
                  <div className="flex items-end justify-center h-8">
                    <span className="audio-bar" style={{ animationDelay: '0.1s' }}></span>
                    <span className="audio-bar" style={{ animationDelay: '0.3s' }}></span>
                    <span className="audio-bar" style={{ animationDelay: '0.5s' }}></span>
                    <span className="audio-bar" style={{ animationDelay: '0.2s' }}></span>
                    <span className="audio-bar" style={{ animationDelay: '0.4s' }}></span>
                  </div>
                  <p className="text-[9px] font-extrabold uppercase text-cyan-500 tracking-widest">
                    Listening to voice commands...
                  </p>
                </div>
              )}

              {typing && (
                <div className="flex gap-2.5">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-750 h-max">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-750 rounded-2xl rounded-tl-none flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Smart suggestions panel */}
            {suggestions.length > 0 && !isListening && (
              <div className="p-2 border-t border-slate-100 dark:border-slate-800 flex gap-1.5 overflow-x-auto bg-white/40 dark:bg-slate-900/40 select-none pr-1">
                {suggestions.map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(sug)}
                    className="py-1 px-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-full text-[10px] font-bold text-slate-600 dark:text-slate-300 shadow-sm shrink-0 transition-all active:scale-95 cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            )}

            {/* Footer Form Input with Voice Synthesis & Recognition buttons */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="p-3 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2"
            >
              {/* Text-to-Speech Enable/Disable Mute */}
              <button
                type="button"
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`p-2 rounded-xl transition-all shadow-sm border shrink-0 cursor-pointer ${
                  ttsEnabled 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20' 
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-transparent hover:bg-slate-200 dark:hover:bg-slate-850'
                }`}
                title={ttsEnabled ? "Speech Output Enabled" : "Speech Output Disabled"}
              >
                {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Speech Recognition Micro Activation Button */}
              {SpeechRecognition && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2 rounded-xl transition-all shadow-sm border shrink-0 cursor-pointer ${
                    isListening 
                      ? 'bg-cyan-500 text-white border-cyan-600 animate-pulse ai-glow-ring' 
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-200 dark:hover:bg-slate-850'
                  }`}
                  title={isListening ? "Listening... Click to Stop" : "Activate Voice Command"}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              )}

              <input
                type="text"
                placeholder="Ask AI memory network..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 py-2 px-3 bg-slate-100 dark:bg-slate-900 border border-transparent focus:border-indigo-500 focus:outline-none rounded-xl font-medium text-xs text-slate-800 dark:text-slate-150 transition-all"
              />
              
              <button
                type="submit"
                className="p-2.5 bg-indigo-600 text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
