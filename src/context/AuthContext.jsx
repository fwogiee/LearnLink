import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { clearSessionAuth, getSessionAuth, persistSessionAuth } from '../lib/api.js';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [state, setState] = useState(() => {
    const { token, role, username } = getSessionAuth();
    return {
      token,
      role,
      username,
      isAuthenticated: Boolean(token),
      initializing: true,
    };
  });

  const login = useCallback(({ token, role, username }) => {
    persistSessionAuth({ token, role, username });
    setState({ token, role, username, isAuthenticated: true, initializing: false });
  }, []);

  const logout = useCallback(() => {
    clearSessionAuth();
    setState({ token: '', role: '', username: '', isAuthenticated: false, initializing: false });
  }, []);

  const refreshFromSession = useCallback(() => {
    const { token, role, username } = getSessionAuth();
    setState({ token, role, username, isAuthenticated: Boolean(token), initializing: false });
  }, []);

  useEffect(() => {
    refreshFromSession();
  }, [refreshFromSession]);

  const value = useMemo(
    () => ({
      ...state,
      login,
      logout,
      refreshFromSession,
    }),
    [state, login, logout, refreshFromSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
