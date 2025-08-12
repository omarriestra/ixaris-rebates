import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Notification, NotificationType } from '../../shared/types';

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>): void => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification: Notification = {
      ...notification,
      id,
      duration: notification.duration || 5000
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-remove notification after duration
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }
  };

  const removeNotification = (id: string): void => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const clearNotifications = (): void => {
    setNotifications([]);
  };

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Convenience hooks for different notification types
// Convenience hook for simple notification usage
export const useNotification = () => {
  const { addNotification } = useNotifications();

  const showNotification = (notification: Omit<Notification, 'id'>) => {
    addNotification(notification);
  };

  const showSuccess = (title: string, message: string) => {
    addNotification({
      type: 'success',
      title,
      message
    });
  };

  const showError = (title: string, message: string) => {
    addNotification({
      type: 'error',
      title,
      message,
      duration: 0 // Don't auto-dismiss errors
    });
  };

  const showWarning = (title: string, message: string) => {
    addNotification({
      type: 'warning',
      title,
      message,
      duration: 8000 // Longer duration for warnings
    });
  };

  const showInfo = (title: string, message: string) => {
    addNotification({
      type: 'info',
      title,
      message
    });
  };

  return {
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};