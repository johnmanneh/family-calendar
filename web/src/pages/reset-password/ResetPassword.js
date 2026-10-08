import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import API from '../../api/axios';
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import '../forgot-password/ForgotPassword.css';

const ResetPassword = () => {
  const [searchParams]            = useSearchParams();
  const token                     = searchParams.get('token') || '';
  const navigate                  = useNavigate();

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [error, setError]         = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    try {
      await API.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <h2>Invalid link</h2>
          <p className="auth-subtitle">This reset link is missing or broken.</p>
          <Link to="/forgot-password" className="auth-back-link">Request a new link →</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Set new password</h2>

        {done ? (
          <>
            <p className="auth-subtitle">
              Password updated! Redirecting you to sign in…
            </p>
            <Link to="/login" className="auth-back-link">Sign in now →</Link>
          </>
        ) : (
          <>
            <p className="auth-subtitle">Choose a new password for your account.</p>

            {error && <p className="error-message">{error}</p>}

            <form onSubmit={handleSubmit}>
              <Input
                label="New password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
              <Input
                label="Confirm password"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repeat your password"
              />
              <Button type="submit" text="Reset password" loading={loading} />
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
