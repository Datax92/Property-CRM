'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import CursorGrid from './effects/CursorGrid';
import { ShieldCheck, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export function LoginPage() {
  const { signInWithEmail, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    setLoading(true);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setLocalError('Please enter both email and password / برائے مہربانی ای میل اور پاس ورڈ درج کریں');
      setLoading(false);
      return;
    }

    try {
      await signInWithEmail(trimmedEmail, password);
    } catch (err: any) {
      const code = err?.code;
      let msg = err.message || 'Invalid email or password / ای میل یا پاس ورڈ درست نہیں ہے';
      if (
        code === 'auth/invalid-credential' ||
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found'
      ) {
        msg = 'Incorrect email or password / ای میل یا پاس ورڈ درست نہیں ہے';
      } else if (code === 'auth/too-many-requests') {
        msg = 'Too many attempts. Please try again later / بہت زیادہ کوششیں، کچھ دیر بعد کوشش کریں';
      }
      setLocalError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="property-login-viewport">
      {/* Interactive Cursor Grid Background from CRM */}
      <CursorGrid
        color="#2a8b79"
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
            >
              <defs>
                <linearGradient id="propTealGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#22c55e" />
                  <stop offset="100%" stopColor="#0f766e" />
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
        {(localError || error) && (
          <div className="property-auth-alert error">
            {localError || error}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="property-login-form">
          {/* Email Field */}
          <div className="property-input-field">
            <label className="property-field-label">
              <span>Email</span>
              <span className="ur-hint" dir="rtl">(ای میل)</span>
            </label>
            <div className="property-input-wrap">
              <Mail className="input-left-icon" size={17} />
              <input
                type="email"
                className="property-text-input"
                placeholder="admin@propertycrm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="property-input-field">
            <label className="property-field-label">
              <span>Password</span>
              <span className="ur-hint" dir="rtl">(پاس ورڈ)</span>
            </label>
            <div className="property-input-wrap">
              <Lock className="input-left-icon" size={17} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="property-text-input with-toggle"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                className="input-eye-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
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
      </div>
    </div>
  );
}
