import React, { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface NotificationIconProps {
  role: 'admin' | 'kitchen' | 'driver';
  driverId?: number;
}

export function NotificationIcon({ role, driverId }: NotificationIconProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const utils = trpc.useUtils();

  // Invalidate cache on component mount to ensure fresh data
  useEffect(() => {
    utils.notifications.getUnread.invalidate();
    utils.notifications.getAll.invalidate();
  }, [role, driverId, utils]);

  // Poll for unread notifications every 2 seconds
  const { data: unreadNotifications = [] } = trpc.notifications.getUnread.useQuery(
    { role, driverId },
    { refetchInterval: 2000, retry: false } // Poll every 2 seconds
  );

  // Get all notifications for display
  const { data: allNotifications = [] } = trpc.notifications.getAll.useQuery(
    { role, driverId },
    { refetchInterval: 2000, retry: false }
  );

  // Mark notification as read mutation
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation();
  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation();

  useEffect(() => {
    if (Array.isArray(unreadNotifications)) {
      setUnreadCount(unreadNotifications.length);
    } else {
      setUnreadCount(0);
    }
  }, [unreadNotifications]);

  // Filter out notifications with undefined order/reservation numbers
  const filteredNotifications = Array.isArray(allNotifications) 
    ? allNotifications.filter(n => !n.message?.includes('undefined'))
    : [];

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate({ notificationId });
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate({ role, driverId });
  };

  return (
    <div className="relative inline-block">
      {/* Notification Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none transition-colors"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell size={20} className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full whitespace-nowrap">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>

          {/* Notifications List */}
          <div className="divide-y">
            {filteredNotifications.length > 0 ? (
              <>
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
                      notification.isRead ? 'bg-white' : 'bg-blue-50'
                    }`}
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}

                {/* Mark All as Read Button */}
                {unreadCount > 0 && (
                  <div className="p-3 bg-gray-50 border-t text-center">
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-xs font-medium text-blue-600 hover:text-blue-700"
                    >
                      Mark all as read
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">No notifications yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
