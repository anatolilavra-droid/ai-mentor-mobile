import { useContext } from 'react';

import { AuthContext, type AuthContextValue } from './AuthProvider';

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}

/** The signed-in user's id. Only call from screens behind the signed-in guard. */
export function useUserId(): string {
  const { user } = useAuth();
  if (!user) throw new Error('useUserId requires a signed-in user');
  return user.id;
}
