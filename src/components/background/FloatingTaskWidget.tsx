import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2, CheckCircle2, XCircle, ChevronUp, ChevronDown, 
  ExternalLink, Trash2, Bell, BellOff, Minimize2, Maximize2
} from 'lucide-react';
import { useGeneration, BackgroundTask } from '../../context/GenerationContext';

export const FloatingTaskWidget: React.FC<{ currentScreen?: string, onOpenTask?: (historyId: string) => void }> = ({ currentScreen, onOpenTask }) => {
  const { tasks, activeTask, removeTask, updateTask } = useGeneration();
  const [isExpanded, setIsExpanded] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const activeTasksCount = tasks.filter(t => t.status === 'processing' || t.status === 'pending').length;
  const showBottomNav = !['result'].includes(currentScreen || '');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
  };

  if (tasks.length === 0) return null;

  return (
    <div 
      className={`fixed right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none transition-all duration-500 ${
        showBottomNav ? 'bottom-24' : 'bottom-6'
      }`}
    >
      <AnimatePresence mode="popLayout">
        {/* Active Task Bubble */}
        {activeTask && !isExpanded && (
          <motion.div
            layoutId="task-widget"
            drag
            dragConstraints={{ left: -300, right: 0, top: -500, bottom: 0 }}
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            className="pointer-events-auto cursor-grab active:cursor-grabbing"
          >
            <button
              onClick={() => setIsExpanded(true)}
              className="group relative flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl border border-white/10 p-2 pr-4 rounded-full shadow-2xl shadow-emerald-500/20"
            >
              <div className="relative w-10 h-10 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-white/5"
                  />
                  <motion.circle
                    cx="20"
                    cy="20"
                    r="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeDasharray="113"
                    initial={{ strokeDashoffset: 113 }}
                    animate={{ strokeDashoffset: 113 - (113 * activeTask.progress) / 100 }}
                    className="text-emerald-500"
                  />
                </svg>
                <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                
                {/* Task Count Badge */}
                {activeTasksCount > 1 && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900 shadow-lg"
                  >
                    {activeTasksCount}
                  </motion.div>
                )}
              </div>
              <div className="flex flex-col items-start pr-1">
                <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-500/80 leading-none mb-1">
                  {activeTasksCount > 1 ? `Antrean (${activeTasksCount})` : 'Menyusun...'}
                </span>
                <span className="text-xs font-medium text-white max-w-[100px] truncate">
                  {activeTask.theme}
                </span>
              </div>
              
              <div className="w-px h-6 bg-white/10 mx-1" />
              <div className="text-[8px] text-white/30 font-bold uppercase vertical-text">
                DRAG
              </div>
              
              {/* Pulse Effect */}
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping -z-10 opacity-50" />
            </button>
          </motion.div>
        )}

        {/* Expanded Panel */}
        {isExpanded && (
          <motion.div
            layoutId="task-widget"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="pointer-events-auto w-80 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs font-bold uppercase tracking-widest text-white/70">
                  Task Manager
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={requestNotificationPermission}
                  className={`p-1.5 rounded-lg transition-colors ${notificationsEnabled ? 'text-emerald-500 bg-emerald-500/10' : 'text-white/40 hover:bg-white/5'}`}
                  title={notificationsEnabled ? "Notifikasi Aktif" : "Aktifkan Notifikasi"}
                >
                  {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="p-1.5 text-white/40 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Task List */}
            <div className="max-h-[400px] overflow-y-auto p-2 space-y-2">
              {tasks.map((task) => (
                <div 
                  key={task.id}
                  className="group relative p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-xs font-medium text-white truncate">
                          {task.theme}
                        </p>
                        {task.historyId && onOpenTask && (
                          <button 
                            onClick={() => {
                              onOpenTask(task.historyId!);
                              setIsExpanded(false);
                            }}
                            className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-all"
                            title="Buka Naskah"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-white/40 uppercase tracking-tight">
                        {task.category} • {new Date(task.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {task.status === 'completed' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                      {task.status === 'failed' && (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      )}
                      {task.status === 'processing' && (
                        <Loader2 className="w-4 h-4 text-emerald-500 animate-spin" />
                      )}
                      <button 
                        onClick={() => removeTask(task.id)}
                        className="p-1 text-white/20 hover:text-rose-500 hover:bg-rose-500/10 rounded-md transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {(task.status === 'processing' || task.status === 'pending') && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] text-emerald-500/80 font-bold uppercase">
                          {task.message}
                        </span>
                        <span className="text-[9px] text-white/40 font-mono">
                          {Math.round(task.progress)}%
                        </span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-emerald-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {task.status === 'failed' && (
                    <p className="text-[10px] text-rose-400/80 mt-1 italic">
                      Error: {task.error || task.message}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Footer Info */}
            <div className="p-3 bg-white/5 border-t border-white/5">
              <p className="text-[9px] text-center text-white/30 leading-relaxed">
                Proses tetap berjalan selama tab browser aktif (meski di latar belakang).<br/>
                Aktifkan notifikasi untuk mendapatkan info saat selesai.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
