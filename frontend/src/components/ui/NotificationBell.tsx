import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { useNotificationStore } from '../../stores/notifications';
import { NotificationDropdown } from './NotificationDropdown';
import { Button } from './Button';

export const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { unreadCount, pollNotifications, stopPolling } = useNotificationStore();

  useEffect(() => {
    // Start polling when component mounts
    pollNotifications();
    
    // Stop polling when component unmounts
    return () => stopPolling();
  }, [pollNotifications, stopPolling]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleDropdown}
        className="relative p-2"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
      
      <NotificationDropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </div>
  );
};
