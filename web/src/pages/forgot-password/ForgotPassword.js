import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState('');

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await API.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h2>Forgot password</h2>

        {sent ? (
          <>
            <p className="auth-subtitle">
              If <strong>{email}</strong> is registered, you'll receive a reset link shortly.
              Check your inbox (and spam folder).
            </p>
            <Link to="/login" className="auth-back-link">← Back to sign in</Link>
          </>
        ) : (
          <>
            <p className="auth-subtitle">
              Enter your email and we'll send you a link to reset your password.
            </p>

            {error && <p className="error-message">{error}</p>}

            <form onSubmit={handleSubmit}>
              <Input
                label="Email address"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <Button type="submit" text="Send reset link" loading={loading} />
            </form>

            <Link to="/login" className="auth-back-link">← Back to sign in</Link>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
