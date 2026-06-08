import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useStorage } from '../context/StorageContext';
import { Send, MessageCircle, ShieldAlert, Sparkles, CheckCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

export default function SettingsChat() {
  const { user } = useAuth();
  const { showToast } = useStorage();
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [socketConnected, setSocketConnected] = useState(false);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const recipientName = user.name === 'Gokul' ? 'Nivetha' : 'Gokul';

  useEffect(() => {
    // Connect to Socket.IO Server
    console.log('[Chat] Connecting to Socket.IO server...');
    const socket = io(window.API_URL + '');
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      console.log('[Socket] Connected with ID:', socket.id);
      // Join user specific room
      socket.emit('join_room', `room_${user.name}`);
      // Request complete message logs
      socket.emit('fetch_chat_history');
    });

    socket.on('chat_history', (history) => {
      setMessages(history);
      // Mark received messages as read
      socket.emit('mark_as_read', { reader: user.name, sender: recipientName });
    });

    socket.on('new_message', (msg) => {
      setMessages(prev => {
        // Prevent duplicate appending
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // Play soft cyber synth sound notification
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } catch (e) {
        // Silent fallback
      }

      // If we are the recipient, trigger mark read receipt
      if (msg.recipient === user.name) {
        socket.emit('mark_as_read', { reader: user.name, sender: recipientName });
      }
    });

    socket.on('messages_read_receipt', (receipt) => {
      if (receipt.reader === recipientName) {
        setMessages(prev => 
          prev.map(m => (m.sender === user.name && m.recipient === recipientName) ? { ...m, read: true } : m)
        );
      }
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user.name, recipientName]);

  // Scroll to bottom whenever messages list is populated
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const msgPayload = {
      id: 'msg_' + Date.now() + '_' + Math.round(Math.random() * 100),
      sender: user.name,
      recipient: recipientName,
      text: inputText,
      timestamp: new Date().toISOString(),
      read: false
    };

    if (socketRef.current && socketConnected) {
      socketRef.current.emit('send_message', msgPayload);
      setInputText('');
    } else {
      showToast('Chat currently operating in Offline mode.', 'warning');
    }
  };

  const formatMessageTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/20 dark:border-white/5 relative overflow-hidden backdrop-blur-xl bg-slate-900/40 text-slate-100 min-h-[580px] flex flex-col justify-between">
      {/* Glow ambient design backdrops */}
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-500/5 rounded-full blur-[80px]"></div>
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-cyan-500/5 rounded-full blur-[80px]"></div>

      {/* Header bar */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-cyan-500 to-indigo-500 rounded-2xl text-white shadow-lg animate-pulse-slow">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
              Secure Private Chat <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-0.5">
              Direct connection: {user.name} ↔ {recipientName}
            </p>
          </div>
        </div>

        {/* Sync/Status Badge */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-pulse'}`}></span>
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
            {socketConnected ? 'Secure Online' : 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Messaging grid list */}
      <div className="flex-1 my-6 overflow-y-auto pr-1 max-h-[380px] space-y-4 scrollbar-thin scrollbar-thumb-white/10 relative z-10">
        {messages.length === 0 ? (
          <div className="h-[260px] flex flex-col items-center justify-center text-center text-slate-500">
            <MessageCircle className="w-12 h-12 text-slate-700/60 mb-2" />
            <p className="text-sm font-semibold">No messages recorded in Nisanth Wallet</p>
            <p className="text-xs text-slate-600 mt-1">Start the conversation by sending a direct note below!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === user.name;
            return (
              <div 
                key={msg.id} 
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-1 uppercase">
                  <span>{msg.sender}</span>
                </div>
                
                <div className={`p-3.5 max-w-[70%] rounded-2xl border text-sm font-medium relative ${
                  isMe 
                    ? 'bg-indigo-600/90 text-white border-indigo-500/30 rounded-tr-sm rounded-br-2xl shadow-[0_4px_12px_rgba(99,102,241,0.15)]' 
                    : 'bg-slate-950/40 text-slate-800 dark:text-slate-100 border-white/5 rounded-tl-sm rounded-bl-2xl shadow-inner'
                }`}>
                  <p className="leading-relaxed break-words">{msg.text}</p>
                  
                  {/* Footer metadata */}
                  <div className="flex items-center justify-end gap-1.5 mt-2.5 text-[9px] font-mono tracking-tighter opacity-70">
                    <span>{formatMessageTime(msg.timestamp)}</span>
                    {isMe && (
                      <CheckCheck className={`w-3.5 h-3.5 ${msg.read ? 'text-cyan-300' : 'text-slate-400'}`} />
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input panel form */}
      <form onSubmit={handleSendMessage} className="flex gap-3 relative z-10 border-t border-white/10 pt-4">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Direct message ${recipientName}...`}
          className="flex-1 py-3.5 px-4 bg-slate-950/40 border border-white/5 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-500 font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all shadow-inner"
        />
        <button
          type="submit"
          className="p-3.5 bg-gradient-to-tr from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
        >
          <Send className="w-4.5 h-4.5" />
        </button>
      </form>
    </div>
  );
}
