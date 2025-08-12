import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { NotificationType } from '../../shared/types';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-success-500" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-error-500" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-warning-500" />;
    case 'info':
      return <Info className="w-5 h-5 text-primary-500" />;
    default:
      return <Info className="w-5 h-5 text-primary-500" />;
  }
};

const getNotificationStyles = (type: NotificationType): string => {
  switch (type) {
    case 'success':
      return 'border-success-200 bg-success-50';
    case 'error':
      return 'border-error-200 bg-error-50';
    case 'warning':
      return 'border-warning-200 bg-warning-50';
    case 'info':
      return 'border-primary-200 bg-primary-50';
    default:
      return 'border-primary-200 bg-primary-50';
  }
};

export const NotificationContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            border rounded-lg p-4 shadow-lg transition-all duration-300 ease-in-out
            ${getNotificationStyles(notification.type)}
          `}
        >
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              {getNotificationIcon(notification.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-medium text-gray-900">
                {notification.title}
              </h4>
              <p className="text-sm text-gray-700 mt-1">
                {notification.message}
              </p>
              
              {notification.actions && notification.actions.length > 0 && (
                <div className="mt-3 flex space-x-2">
                  {notification.actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        action.action();
                        removeNotification(notification.id);
                      }}
                      className="text-sm bg-white border border-gray-200 rounded px-3 py-1 hover:bg-gray-50 transition-colors"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={() => removeNotification(notification.id)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};