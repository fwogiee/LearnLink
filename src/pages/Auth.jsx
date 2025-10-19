import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import StatusMessage from '../components/StatusMessage.jsx';
import { http } from '../lib/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);

  const redirectPath = location.state?.redirectTo || '/dashboard';

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [auth.isAuthenticated, navigate, redirectPath]);

  async function handleLogin(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = form.get('username').trim();
    const password = form.get('password');

    setLoginLoading(true);
    setLoginError('');
    try {
      const data = await http('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      auth.login({ token: data.token, role: data.role, username: data.username });
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setLoginError(error.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = form.get('username').trim();
    const password = form.get('password');
    const role = form.get('role');

    setRegisterLoading(true);
    setRegisterError('');
    try {
      const data = await http('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, role }),
      });
      auth.login({ token: data.token, role: data.role, username: data.username });
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setRegisterError(error.message || 'Registration failed');
    } finally {
      setRegisterLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="grid w-full max-w-5xl gap-6 md:grid-cols-2">
        <section className="card p-8">
          <h1 className="text-xl font-semibold text-neutral-900">Welcome back</h1>
          <p className="mt-1 text-sm text-neutral-600">Sign in to access your study workspace.</p>
          {loginError ? <StatusMessage tone="error" className="mt-4">{loginError}</StatusMessage> : null}
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="login-username" className="text-sm font-medium text-neutral-700">Username</label>
              <input id="login-username" name="username" className="input" placeholder="yourname" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="login-password" className="text-sm font-medium text-neutral-700">Password</label>
              <input id="login-password" name="password" type="password" className="input" placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loginLoading}>
              {loginLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </section>

        <section className="card p-8">
          <h2 className="text-xl font-semibold text-neutral-900">Create an account</h2>
          <p className="mt-1 text-sm text-neutral-600">Sign up to start building flashcards and quizzes.</p>
          {registerError ? <StatusMessage tone="error" className="mt-4">{registerError}</StatusMessage> : null}
          <form onSubmit={handleRegister} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="register-username" className="text-sm font-medium text-neutral-700">Username</label>
              <input id="register-username" name="username" className="input" placeholder="yourname" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="register-password" className="text-sm font-medium text-neutral-700">Password</label>
              <input id="register-password" name="password" type="password" className="input" placeholder="Choose a strong password" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="register-role" className="text-sm font-medium text-neutral-700">Role</label>
              <select id="register-role" name="role" className="input" defaultValue="user" required>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" className="btn-outline w-full" disabled={registerLoading}>
              {registerLoading ? 'Creating account...' : 'Register'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
