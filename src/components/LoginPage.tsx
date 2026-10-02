'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CursorGrid from './effects/CursorGrid';
import { ShieldCheck, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const { signInWithEmail, resetPassword, error, clearError, isConfigured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    clearError();
    setLocalError(null);
    setInfo(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setLocalError('Please enter both email and password / برائے مہربانی ای میل اور پاس ورڈ درج کریں');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(trimmedEmail, password);
    } catch (err: any) {
      setLocalError(err?.message || 'Incorrect email or password / ای میل یا پاس ورڈ درست نہیں ہے');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (loading) return;
    clearError();
    setLocalError(null);
    setInfo(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setLocalError('Enter your email first, then press “Forgot password” / پہلے اپنی ای میل درج کریں');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(trimmedEmail);
      setInfo('If this is the admin email, a password reset link has been sent / پاس ورڈ ری سیٹ لنک بھیج دیا گیا ہے');
    } catch (err: any) {
      setLocalError(err?.message || 'Could not send the reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const shownError = localError || error;

  return (
    <div className="property-login-viewport">
      {/* Interactive Cursor Grid Background from CRM */}
      <CursorGrid
        color="#714B67"
        cellSize={65}
        radius={180}
        gridOpacity={0.045}
        fillOpacity={0.03}
        maxOpacity={0.7}
        clickPulse={true}
      />

      {/* Floating Animated Ambient Gradient Blobs */}
      <div className="property-drift-blob blob-1" aria-hidden="true" />
      <div className="property-drift-blob blob-2" aria-hidden="true" />

      {/* Main Elevated Login Card */}
      <div className="property-login-card">
        {/* Brand Header for Property CRM */}
        <div className="property-brand-header">
          <div className="property-brand-logo-wrap">
            <svg
              viewBox="0 0 48 48"
              className="property-brand-svg"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="propTealGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#8F6A86" />
                  <stop offset="100%" stopColor="#5F3F57" />
                </linearGradient>
              </defs>
              {/* Roof architecture line */}
              <path
                d="M6 24L24 8L42 24"
                stroke="url(#propTealGrad)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Modern building tower silhouette */}
              <path
                d="M14 22V40H34V22"
                stroke="#1e293b"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Ascending investment chevron inside */}
              <path
                d="M19 33L24 27L29 33"
                stroke="url(#propTealGrad)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div className="property-brand-title-box">
              <span className="property-brand-main">Property</span>
              <span className="property-brand-sub">CRM</span>
            </div>
          </div>

          {/* Single Admin Role Badge */}
          <div className="property-role-badge">
            <ShieldCheck size={14} className="badge-icon" />
            <span>ADMIN SIGN-IN</span>
          </div>

          {/* Title & Bilingual Subtitle */}
          <h1 className="property-portal-title">Real Estate Management System</h1>
          <div className="property-portal-subtitles">
            <p className="sub-en">Enter your credentials to access the portal</p>
            <p className="sub-ur" dir="rtl">پورٹل تک رسائی کے لیے اپنی اسناد درج کریں</p>
          </div>
        </div>

        {/* Notifications if any */}
        {!isConfigured && (
          <div className="property-auth-alert error" role="alert">
            Sign-in is not set up yet — the Firebase project keys are missing.
          </div>
        )}
        {shownError && (
          <div className="property-auth-alert error" role="alert">
            {shownError}
          </div>
        )}
        {info && !shownError && (
          <div className="property-auth-alert info" role="status">
            {info}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="property-login-form" noValidate>
          {/* Email Field */}
          <div className="property-input-field">
            <label className="property-field-label" htmlFor="login-email">
              <span>Email</span>
              <span className="ur-hint" dir="rtl">(ای میل)</span>
            </label>
            <div className="property-input-wrap">
              <Mail className="input-left-icon" size={17} />
              <input
                id="login-email"
                type="email"
                name="email"
                autoComplete="username"
                autoFocus
                className="property-text-input"
                placeholder="admin@propertycrm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="property-input-field">
            <label className="property-field-label" htmlFor="login-password">
              <span>Password</span>
              <span className="ur-hint" dir="rtl">(پاس ورڈ)</span>
            </label>
            <div className="property-input-wrap">
              <Lock className="input-left-icon" size={17} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete="current-password"
                className="property-text-input with-toggle"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="input-eye-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {/* Elevated Submit Button */}
          <button
            type="submit"
            className="property-submit-btn"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="property-card-footer">
          <button type="button" className="property-footer-link" onClick={handleReset} disabled={loading}>
            Forgot password?
          </button>
          <span className="property-footer-note">
            Access is limited to the administrator account.
          </span>
        </div>
      </div>
    </div>
  );
}
