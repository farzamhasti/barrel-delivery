'use client';

import { useState } from 'react';
import { Send, AlertCircle, CheckCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { pushDebugger } from '@/lib/push-debug';

interface PushTestButtonProps {
  dashboardType: 'admin' | 'kitchen' | 'driver';
  driverId?: number;
}

export function PushTestButton({ dashboardType, driverId }: PushTestButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const sendTestMutation = trpc.push.sendTest.useMutation();

  const handleSendTest = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      pushDebugger.log('Test-Push', 'info', 'Sending test push notification', {
        dashboardType,
        driverId,
      });

      const response = await sendTestMutation.mutateAsync({
        dashboardType,
        driverId,
      });

      pushDebugger.log('Test-Push', 'success', `Test push sent to ${response.sent} device(s)`, {
        response,
      });

      setResult({
        success: true,
        message: `Test push sent to ${response.sent} device(s)`,
      });
    } catch (error: any) {
      pushDebugger.log('Test-Push', 'error', 'Failed to send test push', {
        error: error.message,
      });

      setResult({
        success: false,
        message: `Error: ${error.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleSendTest}
        disabled={isLoading}
        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
      >
        <Send size={16} />
        {isLoading ? 'Sending...' : 'Send Test Push'}
      </button>

      {result && (
        <div
          className={`flex items-start gap-2 p-3 rounded text-sm ${
            result.success
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {result.success ? (
            <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          )}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  );
}
