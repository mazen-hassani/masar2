'use client';

import { useSession, signOut } from 'next-auth/react';
import { useCallback } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  tenantId: string;
  roles: string[];
}

export interface UseAuthReturn {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  logout: () => Promise<void>;
}

/**
 * Hook to get current user authentication state and helpers
 * @returns Authentication state and utility functions
 */
export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession();

  const isLoading = status === 'loading';
  const isAuthenticated = status === 'authenticated';

  const user: AuthUser | null = session?.user
    ? {
        id: (session.user as unknown as { id: string }).id,
        email: session.user.email || '',
        name: session.user.name || null,
        tenantId: (session.user as unknown as { tenantId: string }).tenantId || '',
        roles: (session.user as unknown as { roles: string[] }).roles || [],
      }
    : null;

  const hasRole = useCallback(
    (role: string): boolean => {
      return user?.roles?.includes(role) ?? false;
    },
    [user?.roles]
  );

  const hasAnyRole = useCallback(
    (roles: string[]): boolean => {
      return user?.roles?.some((role) => roles.includes(role)) ?? false;
    },
    [user?.roles]
  );

  const logout = useCallback(async (): Promise<void> => {
    await signOut({ redirect: true });
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    hasRole,
    hasAnyRole,
    logout,
  };
}
