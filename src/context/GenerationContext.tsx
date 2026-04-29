import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import localforage from 'localforage';

export interface BackgroundTask {
  id: string;
  type: 'generation';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  theme: string;
  category: string;
  historyId?: string;
  startTime: number;
  result?: any;
  error?: string;
}

interface GenerationContextType {
  tasks: BackgroundTask[];
  addTask: (task: Omit<BackgroundTask, 'id' | 'startTime' | 'status' | 'progress'>) => string;
  updateTask: (id: string, updates: Partial<BackgroundTask>) => void;
  removeTask: (id: string) => void;
  activeTask: BackgroundTask | null;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

export const GenerationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<BackgroundTask[]>([]);

  // Load tasks from storage on mount
  useEffect(() => {
    const loadTasks = async () => {
      const savedTasks = await localforage.getItem<BackgroundTask[]>('background_tasks');
      if (savedTasks) {
        // Mark any 'processing' tasks as 'failed' if they were interrupted by a refresh
        const sanitizedTasks = savedTasks.map(t => 
          t.status === 'processing' ? { ...t, status: 'failed' as const, message: 'Terhenti karena aplikasi dimuat ulang' } : t
        );
        setTasks(sanitizedTasks);
      }
    };
    loadTasks();
  }, []);

  // Save tasks to storage whenever they change
  useEffect(() => {
    localforage.setItem('background_tasks', tasks);
  }, [tasks]);

  const addTask = useCallback((taskData: Omit<BackgroundTask, 'id' | 'startTime' | 'status' | 'progress'>) => {
    const id = Math.random().toString(36).substring(2, 11);
    const newTask: BackgroundTask = {
      ...taskData,
      id,
      startTime: Date.now(),
      status: 'pending',
      progress: 0,
    };
    setTasks(prev => [newTask, ...prev]);
    return id;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<BackgroundTask>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const activeTask = tasks.find(t => t.status === 'processing' || t.status === 'pending') || null;

  return (
    <GenerationContext.Provider value={{ tasks, addTask, updateTask, removeTask, activeTask }}>
      {children}
    </GenerationContext.Provider>
  );
};

export const useGeneration = () => {
  const context = useContext(GenerationContext);
  if (!context) {
    throw new Error('useGeneration must be used within a GenerationProvider');
  }
  return context;
};
