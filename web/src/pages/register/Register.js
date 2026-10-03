import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../api/axios';
import Input from '../../components/common/Input/Input';
import Button from '../../components/common/Button/Button';
import AuthLink from '../../components/common/AuthLink/AuthLink';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
  });
  const [familyOption, setFamilyOption] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, token, authLoading } = useAuth();
  const navigate = useNavigate();

  if (!authLoading && token) return <Navigate to="/dashboard" replace />;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Step 1 — Register user
      const res = await API.post('/auth/register', formData);
      login(res.data.user, res.data.token);

      // Step 2 — Create or Join family
      if (familyOption === 'create') {
        await API.post('/family/create', { name: familyName });
      } else if (familyOption === 'join') {
        await API.post('/family/join', { invite_code: inviteCode });
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">

        {/* Logo */}
        <div className="login-logo">
          <svg viewBox="0 0 160 110" width="200" height="130" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#56e39f"/>
                <stop offset="33%" stopColor="#4facfe"/>
                <stop offset="66%" stopColor="#f857a6"/>
                <stop offset="100%" stopColor="#f48c06"/>
              </linearGradient>
            </defs>
            <rect x="10" y="8" width="140" height="3" rx="2" fill="url(#lineGrad)"/>
            <text x="80" y="42" fontSize="36" fontWeight="900" fill="#1d1d1f" textAnchor="middle" fontFamily="Inter" letterSpacing="-2">WHEN</text>
            <rect x="10" y="52" width="140" height="3" rx="2" fill="url(#lineGrad)"/>
            <line x1="30" y1="55" x2="30" y2="72" stroke="#d2d2d7" strokeWidth="1.5"/>
            <line x1="63" y1="55" x2="63" y2="72" stroke="#d2d2d7" strokeWidth="1.5"/>
            <line x1="97" y1="55" x2="97" y2="72" stroke="#d2d2d7" strokeWidth="1.5"/>
            <line x1="130" y1="55" x2="130" y2="72" stroke="#d2d2d7" strokeWidth="1.5"/>
            <text x="30" y="90" fontSize="16" textAnchor="middle">🌸</text>
            <text x="63" y="90" fontSize="16" textAnchor="middle">☀️</text>
            <text x="97" y="90" fontSize="16" textAnchor="middle">🍂</text>
            <text x="130" y="90" fontSize="16" textAnchor="middle">❄️</text>
          </svg>
          <p>To every season, a time · Eccl. 3:1</p>
        </div>

        {error && <p className="error-message">{error}</p>}

        <form onSubmit={handleSubmit}>
          {/* Name Row */}
          <div className="register-row">
            <Input
              label="First Name"
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              placeholder="John"
            />
            <Input
              label="Last Name"
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              placeholder="Smith"
            />
          </div>

          <Input
            label="Email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
          />

          <Input
            label="Password"
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
          />

          {/* Family Option */}
          <div className="register-family">
            <label className="register-family-label">Your Family</label>
            <div className="register-family-options">
              <div
                className={`register-family-option ${familyOption === 'create' ? 'selected' : ''}`}
                onClick={() => setFamilyOption('create')}
              >
                <span>👨‍👩‍👧</span>
                <p>Create Family</p>
              </div>
              <div
                className={`register-family-option ${familyOption === 'join' ? 'selected' : ''}`}
                onClick={() => setFamilyOption('join')}
              >
                <span>🔗</span>
                <p>Join Family</p>
              </div>
            </div>

            {familyOption === 'create' && (
              <input
                className="register-family-input"
                type="text"
                placeholder="Family name e.g. The Smiths"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
              />
            )}

            {familyOption === 'join' && (
              <input
                className="register-family-input"
                type="text"
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
              />
            )}
          </div>

          <Button type="submit" text="Join When →" loading={loading} />
        </form>

        <p className="login-tag">Exclusively for your family ♥</p>
        <div className="login-divider"><span>OR</span></div>
        <AuthLink
          text="Already have an account?"
          linkText="Sign in →"
          linkUrl="/login"
        />
      </div>
    </div>
  );
};

export default Register;