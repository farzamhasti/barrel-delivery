import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';

export function useSystemSession() {
  const [isLoading, setIsLoading] = useState(true);
  const [systemSession, setSystemSession] = useState<{
    username: string | null;
    role: string | null;
  } | null>(null);

  // Query to check current system session
  const { data: sessionData } = trpc.system.checkSession.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    if (sessionData && sessionData.isAuthenticated && sessionData.username && sessionData.role) {
      setSystemSession({
        username: sessionData.username,
        role: sessionData.role,
      });
      setIsLoading(false);
    } else {
      setSystemSession(null);
      setIsLoading(false);
    }
  }, [sessionData]);

  const logout = () => {
    // Clear localStorage
    localStorage.removeItem('systemSessionToken');
    localStorage.removeItem('systemRole');
    localStorage.removeItem('systemUsername');
    
    // Clear sessionStorage
    sessionStorage.removeItem('systemSessionToken');
    sessionStorage.removeItem('systemRole');
    sessionStorage.removeItem('systemUsername');
    
    // Clear window object
    (window as any).__systemSessionToken = null;
    (window as any).__systemRole = null;
    (window as any).__systemUsername = null;
    
    // Redirect to home
    window.location.href = '/';
  };

  return {
    systemSession: systemSession ? { username: systemSession.username || '', role: systemSession.role || '' } : null,
    isLoading,
    logout,
    isAuthenticated: !!systemSession && !!systemSession.username && !!systemSession.role,
  };
}
