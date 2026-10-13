import { createContext, useContext, useEffect, useState } from 'react';
import client from '../api/client';
import { getToken, setToken, clearToken } from '../utils/tokenStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function refreshUser() {
    return client.get('/auth/me').then((res) => setUser(res.data.user));
  }

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    refreshUser()
      .catch(clearToken)
      .finally(() => setLoading(false));
  }, []);

  async function applySession(token, remember = true) {
    setToken(token, remember);
    const { user: fullUser } = await client.get('/auth/me').then((r) => r.data);
    setUser(fullUser);
    return fullUser;
  }

  async function login(identifier, password, remember = true) {
    const res = await client.post('/auth/login', { identifier, password });
    return applySession(res.data.token, remember);
  }

  async function register(data) {
    const res = await client.post('/auth/register', data);
    return res.data;
  }

  async function verifySignup(email, code) {
    const res = await client.post('/auth/register/verify', { email, code });
    return applySession(res.data.token);
  }

  async function forgotPassword(identifier) {
    const res = await client.post('/auth/forgot-password', { identifier });
    return res.data;
  }

  async function verifyResetCode(identifier, code) {
    const res = await client.post('/auth/forgot-password/verify', { identifier, code });
    return res.data;
  }

  async function resetPassword(data) {
    const res = await client.post('/auth/reset-password', data);
    return res.data;
  }

  async function loginWithGoogle(credential) {
    const res = await client.post('/auth/google', { credential });
    if (res.data.needsRegistration) {
      return { needsRegistration: true, profile: res.data.profile };
    }
    const fullUser = await applySession(res.data.token);
    return { needsRegistration: false, user: fullUser };
  }

  async function registerWithGoogle(data) {
    const res = await client.post('/auth/google/register', data);
    return applySession(res.data.token);
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user, loading, login, register, verifySignup, forgotPassword, verifyResetCode, resetPassword,
        loginWithGoogle, registerWithGoogle, logout, refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
