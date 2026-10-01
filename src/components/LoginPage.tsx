'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as M from '../lib/re-data';

export function LoginPage() {
  const { signInWithEmail, signUpWithEmail, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'subadmin' | 'user'>('admin');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError(null);
    setInfoMsg(null);
    setLoading(true);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setLocalError('Please enter both email and password / برائے مہربانی ای میل اور پاس ورڈ درج کریں');
      setLoading(false);
      return;
    }

    try {
      // Direct sign-in for the single person
      await signInWithEmail(trimmedEmail, password);
    } catch (err: any) {
      // If user doesn't exist yet in fresh Firebase, seamlessly auto-provision as the single Admin!
      try {
        await signUpWithEmail(trimmedEmail, password, {
          name: 'Admin',
          role: selectedRole === 'user' ? 'Agent' : selectedRole === 'subadmin' ? 'Manager' : 'CEO',
          office: M.OFFICES[0],
        });
      } catch {
        // Show the actual error if sign-in failed on an existing account
        setLocalError(err.message || 'Invalid email or password / ای میل یا پاس ورڈ درست نہیں ہے');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="leadway-login-screen">
      {/* Background Animated Teal Grid Mesh on Left */}
      <div className="leadway-bg-grid-container" aria-hidden="true">
        <svg
          className="leadway-grid-svg"
          viewBox="0 0 720 720"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g className="grid-lines-group">
            {/* Horizontal Grid Lines */}
            {Array.from({ length: 18 }).map((_, i) => (
              <line
                key={`h-${i}`}
                x1="10"
                y1={20 + i * 40}
                x2="710"
                y2={20 + i * 40}
              />
            ))}
            {/* Vertical Grid Lines */}
            {Array.from({ length: 18 }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={20 + i * 40}
                y1="10"
                x2={20 + i * 40}
                y2="710"
              />
            ))}
          </g>
        </svg>
      </div>

      {/* Ambient soft glow behind the card */}
      <div className="leadway-ambient-glow" />

      {/* Main Centered Clean White Card */}
      <div className="leadway-card">
        {/* Brand Logo & Name */}
        <div className="leadway-brand-row">
          <div className="leadway-logo-mark">
            <svg width="34" height="34" viewBox="0 0 40 40" fill="none">
              {/* Outer Roof / House Outline */}
              <path
                d="M6 22L20 8L34 22"
                stroke="#175d50"
                strokeWidth="3.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Rising growth chart chevron inside */}
              <path
                d="M12 25V28C12 28.55 12.45 29 13 29H27C27.55 29 28 28.55 28 28V25"
                stroke="#2ea389"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <path
                d="M16 23L20 18L24 23"
                stroke="#2ea389"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div className="leadway-brand-text">
            <h2>Leadway</h2>
            <span>CRM</span>
          </div>
        </div>

        {/* Admin Sign-in Pill Badge */}
        <div className="leadway-admin-badge">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2a8b79" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>ADMIN SIGN-IN</span>
        </div>

        {/* Title & Urdu Subtitle */}
        <div className="leadway-card-titles">
          <h3>Lead Management System</h3>
          <p className="leadway-sub-en">Choose your role, then sign in</p>
          <p className="leadway-sub-ur">اپنا کردار منتخب کریں، پھر سائن ان کریں</p>
        </div>

        {/* Role Selector Pill */}
        <div className="leadway-role-pill">
          <button
            type="button"
            className={`role-tab-btn ${selectedRole === 'admin' ? 'active' : ''}`}
            onClick={() => setSelectedRole('admin')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Admin</span>
          </button>

          <button
            type="button"
            className={`role-tab-btn ${selectedRole === 'subadmin' ? 'active' : ''}`}
            onClick={() => setSelectedRole('subadmin')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Sub Admin</span>
          </button>

          <button
            type="button"
            className={`role-tab-btn ${selectedRole === 'user' ? 'active' : ''}`}
            onClick={() => setSelectedRole('user')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span>User</span>
          </button>
        </div>

        {/* Error or Info notification if any */}
        {(localError || error) && (
          <div className="leadway-error-msg">
            {localError || error}
          </div>
        )}
        {infoMsg && (
          <div className="leadway-info-msg">
            {infoMsg}
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="leadway-form">
          {/* Email Field */}
          <div className="leadway-field-group">
            <label className="leadway-label">
              <span>Email</span>
              <span className="leadway-ur-label">(ای میل)</span>
            </label>
            <div className="leadway-input-wrap">
              <span className="leadway-icon-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7e94a8" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </span>
              <input
                type="email"
                className="leadway-input"
                placeholder="mahziyarmktcrm@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="leadway-field-group">
            <label className="leadway-label">
              <span>Password</span>
              <span className="leadway-ur-label">(پاس ورڈ)</span>
            </label>
            <div className="leadway-input-wrap">
              <span className="leadway-icon-left">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7e94a8" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type={showPass ? 'text' : 'password'}
                className="leadway-input has-toggle"
                placeholder="••••••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <button
                type="button"
                className="leadway-icon-right"
                onClick={() => setShowPass(!showPass)}
                title={showPass ? 'Hide password' : 'Show password'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7e94a8" strokeWidth="2">
                  {showPass ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Elevated Teal Sign In Button */}
          <button
            type="submit"
            className="leadway-submit-btn"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Footer info */}
        <div className="leadway-card-footer">
          <p>
            First time here?{' '}
            <button
              type="button"
              className="leadway-link-btn"
              onClick={() =>
                setInfoMsg('Single Admin Mode: Enter your email & password above and click Sign in to directly access your CRM account.')
              }
            >
              Create the account
            </button>
          </p>
          <span className="leadway-footer-note">(verified by an emailed code)</span>
        </div>
      </div>
    </div>
  );
}
