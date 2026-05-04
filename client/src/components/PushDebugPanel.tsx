'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Copy, Trash2 } from 'lucide-react';
import { pushDebugger, DebugLog } from '@/lib/push-debug';

interface DebugStatus {
  https: boolean;
  serviceWorkerSupported: boolean;
  serviceWorkerRegistered: boolean;
  notificationPermission: NotificationPermission;
  pushSubscriptionActive: boolean;
  lastLog: DebugLog | null;
}

export function PushDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<DebugStatus>({
    https: false,
    serviceWorkerSupported: false,
    serviceWorkerRegistered: false,
    notificationPermission: 'default',
    pushSubscriptionActive: false,
    lastLog: null,
  });
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [copied, setCopied] = useState(false);

  // Update status periodically
  useEffect(() => {
    const updateStatus = async () => {
      const https = window.location.protocol === 'https:';
      const swSupported = 'serviceWorker' in navigator;
      let swRegistered = false;
      let pushActive = false;

      if (swSupported) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          swRegistered = registrations.length > 0;

          if (swRegistered && registrations[0]) {
            const subscription = await registrations[0].pushManager.getSubscription();
            pushActive = !!subscription;
          }
        } catch (error) {
          console.error('Error checking SW status:', error);
        }
      }

      setStatus({
        https,
        serviceWorkerSupported: swSupported,
        serviceWorkerRegistered: swRegistered,
        notificationPermission: Notification.permission,
        pushSubscriptionActive: pushActive,
        lastLog: pushDebugger.getLogs()[pushDebugger.getLogs().length - 1] || null,
      });

      setLogs(pushDebugger.getLogs());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const copyLogs = () => {
    const logsText = pushDebugger.exportLogs();
    navigator.clipboard.writeText(logsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearLogs = () => {
    pushDebugger.clearLogs();
    setLogs([]);
  };

  const getStatusColor = (value: boolean): string => {
    return value ? 'text-green-600' : 'text-red-600';
  };

  const getStatusBg = (value: boolean): string => {
    return value ? 'bg-green-50' : 'bg-red-50';
  };

  return (
    <div className="fixed bottom-0 right-0 z-40 max-w-md">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute bottom-0 right-0 bg-gray-800 hover:bg-gray-900 text-white px-3 py-2 text-xs font-mono flex items-center gap-2 rounded-tl"
      >
        Push Debug
        {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="absolute bottom-10 right-0 w-96 bg-gray-900 text-gray-100 rounded-tl border border-gray-700 shadow-lg max-h-96 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="font-mono text-xs font-bold">Push Notification Debug</h3>
            <button
              onClick={clearLogs}
              className="text-gray-400 hover:text-gray-200 p-1"
              title="Clear logs"
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Status Section */}
          <div className="px-4 py-3 border-b border-gray-700 space-y-2 text-xs font-mono">
            <div className={`p-2 rounded ${getStatusBg(status.https)}`}>
              <span className="text-gray-400">HTTPS:</span>
              <span className={`ml-2 font-bold ${getStatusColor(status.https)}`}>
                {status.https ? '✓' : '✗'}
              </span>
            </div>

            <div className={`p-2 rounded ${getStatusBg(status.serviceWorkerSupported)}`}>
              <span className="text-gray-400">SW Supported:</span>
              <span className={`ml-2 font-bold ${getStatusColor(status.serviceWorkerSupported)}`}>
                {status.serviceWorkerSupported ? '✓' : '✗'}
              </span>
            </div>

            <div className={`p-2 rounded ${getStatusBg(status.serviceWorkerRegistered)}`}>
              <span className="text-gray-400">SW Registered:</span>
              <span className={`ml-2 font-bold ${getStatusColor(status.serviceWorkerRegistered)}`}>
                {status.serviceWorkerRegistered ? '✓' : '✗'}
              </span>
            </div>

            <div className={`p-2 rounded ${getStatusBg(status.notificationPermission === 'granted')}`}>
              <span className="text-gray-400">Permission:</span>
              <span className={`ml-2 font-bold ${getStatusColor(status.notificationPermission === 'granted')}`}>
                {status.notificationPermission}
              </span>
            </div>

            <div className={`p-2 rounded ${getStatusBg(status.pushSubscriptionActive)}`}>
              <span className="text-gray-400">Subscription:</span>
              <span className={`ml-2 font-bold ${getStatusColor(status.pushSubscriptionActive)}`}>
                {status.pushSubscriptionActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {status.lastLog && (
              <div className="p-2 rounded bg-blue-50 text-blue-900">
                <span className="text-gray-600">Last:</span>
                <span className="ml-2 text-blue-700 font-bold">{status.lastLog.step}</span>
                <span className="text-blue-600 text-xs ml-1">{status.lastLog.message}</span>
              </div>
            )}
          </div>

          {/* Logs Section */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-xs">No logs yet...</div>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`text-xs font-mono py-1 px-2 rounded ${
                    log.status === 'error'
                      ? 'bg-red-900 text-red-200'
                      : log.status === 'success'
                      ? 'bg-green-900 text-green-200'
                      : log.status === 'warning'
                      ? 'bg-yellow-900 text-yellow-200'
                      : 'bg-blue-900 text-blue-200'
                  }`}
                >
                  <span className="text-gray-400">[{log.step}]</span>
                  <span className="ml-1">{log.message}</span>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-800 px-4 py-2 border-t border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {logs.length} logs
            </span>
            <button
              onClick={copyLogs}
              className="text-gray-400 hover:text-gray-200 p-1 flex items-center gap-1"
              title="Copy logs to clipboard"
            >
              <Copy size={12} />
              <span className="text-xs">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
