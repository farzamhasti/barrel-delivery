import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

interface TestPushButtonProps {
  role: 'admin' | 'kitchen' | 'driver';
  userId: number;
}

export function TestPushButton({ role, userId }: TestPushButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const sendTestMutation = trpc.push.sendTest.useMutation();

  const handleSendTest = async () => {
    setIsLoading(true);
    try {
      const result = await sendTestMutation.mutateAsync({
        userId,
        role,
      });

      if (result.sent > 0) {
        toast.success(`Test notification sent to ${result.sent} device(s)`);
      } else {
        toast.error('No subscriptions found for this device');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('Failed to send test notification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleSendTest}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="gap-2"
      title="Send a test push notification to verify setup"
    >
      <Bell size={16} />
      {isLoading ? 'Sending...' : 'Test Push'}
    </Button>
  );
}
