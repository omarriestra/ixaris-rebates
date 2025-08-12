import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useConfiguration } from '../contexts/ConfigurationContext';
import { useNotifications } from '../contexts/NotificationContext';
import { 
  Settings, 
  Calendar, 
  Folder,
  User,
  HelpCircle,
  ChevronDown
} from 'lucide-react';

export const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { configuration } = useConfiguration();
  const { addNotification } = useNotifications();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Ixaris Rebates Calculator: Import CSVs';
      case '/configuration':
        return 'Ixaris Rebates Calculator: Configuration';
      case '/results':
        return 'Ixaris Rebates Calculator: Results';
      case '/table':
        return 'Ixaris Rebates Calculator: Rebates Viewer';
      case '/export':
        return 'Ixaris Rebates Calculator: Export';
      case '/settings':
        return 'Ixaris Rebates Calculator: Settings';
      case '/help':
        return 'Ixaris Rebates Calculator: Help';
      default:
        return 'Ixaris Rebates Calculator';
    }
  };


  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left section - Title only */}
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-gray-900">{getPageTitle()}</h1>
          
          {configuration && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Folder className="w-4 h-4" />
              <span>{configuration.folderPath.split('/').pop() || 'Data Folder'}</span>
              <span className="mx-2">•</span>
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(configuration.year, configuration.month - 1).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long' 
                })}
              </span>
            </div>
          )}
        </div>

        {/* Right section - User menu */}
        <div className="flex items-center space-x-4">
          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary-600" />
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {userMenuOpen && (
              <div className="dropdown">
                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      addNotification({
                        type: 'info',
                        title: 'Settings',
                        message: 'Settings page is under development. Coming in future versions.',
                      });
                    }}
                    className="dropdown-item w-full text-left flex items-center"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings (Under Development)
                  </button>
                  
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      navigate('/help');
                    }}
                    className="dropdown-item w-full text-left flex items-center"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Help
                  </button>
                  
                  <div className="border-t border-gray-100 my-1"></div>
                  
                  <div className="px-4 py-2">
                    <p className="text-xs text-gray-500">
                      Ixaris Rebates Calculator v1.0.0
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};