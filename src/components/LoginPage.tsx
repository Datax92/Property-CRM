'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogoMark, Icon } from './Icons';
import * as M from '../lib/re-data';
import { getActiveFirebaseConfig, FirebaseConfig } from '../lib/firebase';

export function LoginPage() {
  const {
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    resetPassword,
    updateFirebaseConfig,
    isConfigured,
    error,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<'CEO' | 'Accountant' | 'Manager' | 'Agent'>('CEO');
  const [office, setOffice] = useState(M.OFFICES[0]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Firebase Config Drawer state (collapsed by default when configured)
  const [showConfig, setShowConfig] = useState(!isConfigured);
  const currentConfig = getActiveFirebaseConfig();
  const [cfgApiKey, setCfgApiKey] = useState(currentConfig.apiKey || '');
  const [cfgProjectId, setCfgProjectId] = useState(currentConfig.projectId || 'property-crm-5a401');
  const [cfgAuthDomain, setCfgAuthDomain] = useState(currentConfig.authDomain || 'property-crm-5a401.firebaseapp.com');
  const [cfgStorageBucket, setCfgStorageBucket] = useState(currentConfig.storageBucket || 'property-crm-5a401.firebasestorage.app');
  const [cfgSenderId, setCfgSenderId] = useState(currentConfig.messagingSenderId || '');
  const [cfgAppId, setCfgAppId] = useState(currentConfig.appId || '');
  const [rawSnippet, setRawSnippet] = useState('');

  const parseSnippet = (text: string) => {
    try {
      const match = text.match(/const\s+firebaseConfig\s*=\s*({[\s\S]*?});/) || text.match(/({[\s\S]*apiKey[\s\S]*})/);
      let jsonStr = match ? match[1] : text;
      jsonStr = jsonStr
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
        .replace(/'/g, '"')
        .replace(/,\s*}/g, '}');
      const obj = JSON.parse(jsonStr);
      if (obj.apiKey) setCfgApiKey(obj.apiKey);
      if (obj.projectId) setCfgProjectId(obj.projectId);
      if (obj.authDomain) setCfgAuthDomain(obj.authDomain);
      if (obj.storageBucket) setCfgStorageBucket(obj.storageBucket);
      if (obj.messagingSenderId) setCfgSenderId(obj.messagingSenderId);
      if (obj.appId) setCfgAppId(obj.appId);
      setFeedback('Firebase configuration parsed successfully! / فائر بیس سیٹنگز محفوظ ہوگئیں');
    } catch {
      setFeedback('Could not parse snippet automatically. Please paste individual values below.');
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cfgApiKey || !cfgProjectId) {
      setFeedback('Please provide at least the API Key and Project ID.');
      return;
    }
    const newCfg: FirebaseConfig = {
      apiKey: cfgApiKey.trim(),
      projectId: cfgProjectId.trim(),
      authDomain: cfgAuthDomain.trim() || `${cfgProjectId.trim()}.firebaseapp.com`,
      storageBucket: cfgStorageBucket.trim() || `${cfgProjectId.trim()}.firebasestorage.app`,
      messagingSenderId: cfgSenderId.trim(),
      appId: cfgAppId.trim(),
    };
    updateFirebaseConfig(newCfg);
    setShowConfig(false);
    setFeedback('Firebase connected! You can now log in or register. / فائر بیس فعال ہو گیا ہے');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setFeedback(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else if (mode === 'signup') {
        if (!name.trim()) {
          throw new Error('Please enter your full name. / براہ کرم اپنا پورا نام درج کریں');
        }
        await signUpWithEmail(email, password, { name, role, office });
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setFeedback('Password reset link sent to your email! / پاس ورڈ کی بحالی کا لنک ای میل پر بھیج دیا گیا ہے');
        setMode('signin');
      }
    } catch {
      // Error handled by AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    clearError();
    setFeedback(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      // Error handled by AuthContext
    } finally {
      setLoading(false);
    }
  };

  const roleLabels: Record<string, { en: string; ur: string; desc: string }> = {
    CEO: { en: 'Chief Executive (CEO)', ur: 'چیف ایگزیکٹو', desc: 'Full access to properties, profits & FBR tax / تمام کھاتوں تک رسائی' },
    Accountant: { en: 'Head of Accounts', ur: 'ہیڈ آف اکاؤنٹس', desc: 'Sales, expenses, payments & tax invoices / فنانس، اخراجات اور رسیدیں' },
    Manager: { en: 'Operations Manager', ur: 'سیلز و آپریشنز مینیجر', desc: 'Inventory, deal pipeline & agent records / انوینٹری اور سودے' },
    Agent: { en: 'Real Estate Consultant', ur: 'رئیل اسٹیٹ ایجنٹ', desc: 'Assigned customer deals & personal commission / ذاتی کمیشن اور کلائنٹس' },
  };

  return (
    <div className="login-super-wrap">
      {/* Animated Ambient Background Canvas */}
      <div className="ambient-background">
        <div className="ambient-orb orb-1" />
        <div className="ambient-orb orb-2" />
        <div className="ambient-orb orb-3" />
        <div className="ambient-grid-overlay" />
        <div className="ambient-scanline" />
      </div>

      <div className="login-container">
        {/* Top Header Card */}
        <div className="login-card-elevated">
          {/* Brand & Urdu Title */}
          <div className="brand-badge-header">
            <div className="brand-logo-glow">
              <LogoMark />
            </div>
            <div className="brand-titles">
              <div className="brand-row-main">
                <h1>Meridian Estates</h1>
                <span className="urdu-gold-pill">میریڈیئن اسٹیٹس</span>
              </div>
              <p className="brand-sub-title">
                Real Estate Investment &amp; Management System
                <span className="urdu-sub-txt">پراپرٹی پورٹ فولیو اور ٹیکس مینجمنٹ پورٹل</span>
              </p>
            </div>
          </div>

          <div className="luxury-gold-line" />

          {/* Mode Switch Tabs */}
          {mode !== 'forgot' && (
            <div className="luxury-tab-bar">
              <button
                type="button"
                className={`luxury-tab-item ${mode === 'signin' ? 'active' : ''}`}
                onClick={() => {
                  setMode('signin');
                  clearError();
                  setFeedback(null);
                }}
              >
                <span className="tab-en">Sign In</span>
                <span className="tab-ur">داخل ہوں</span>
              </button>

              <button
                type="button"
                className={`luxury-tab-item ${mode === 'signup' ? 'active' : ''}`}
                onClick={() => {
                  setMode('signup');
                  clearError();
                  setFeedback(null);
                }}
              >
                <span className="tab-en">Create Account</span>
                <span className="tab-ur">نیا اکاؤنٹ بنائیں</span>
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div className="forgot-header-bar">
              <button
                type="button"
                className="btn-back-link"
                onClick={() => {
                  setMode('signin');
                  clearError();
                }}
              >
                ← Back to Sign In / واپس سائن ان پر جائیں
              </button>
              <h3>Reset Your Password / پاس ورڈ کی بحالی</h3>
              <p>Enter your registered email address to receive an instant recovery link.</p>
            </div>
          )}

          {/* Alert / Feedback Messages */}
          {feedback && (
            <div className="status-banner success-banner">
              <span className="banner-icon">
                <Icon name="ok" />
              </span>
              <div className="banner-text">{feedback}</div>
            </div>
          )}

          {error && (
            <div className="status-banner error-banner">
              <span className="banner-icon">
                <Icon name="warn" />
              </span>
              <div className="banner-text">{error}</div>
            </div>
          )}

          {/* Main Form */}
          <form onSubmit={handleSubmit} className="elevated-form">
            {mode === 'signup' && (
              <>
                <div className="form-group-lux">
                  <div className="label-dual">
                    <span>Full Name</span>
                    <span className="ur-hint">پورا نام</span>
                  </div>
                  <div className="input-with-icon">
                    <span className="input-leading-icon">
                      <Icon name="user" />
                    </span>
                    <input
                      type="text"
                      className="lux-input"
                      placeholder="e.g. M. Salman Khan"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group-lux">
                  <div className="label-dual">
                    <span>Select Corporate Role</span>
                    <span className="ur-hint">ادارہ جاتی عہدہ منتخب کریں</span>
                  </div>
                  <div className="role-selector-grid">
                    {(['CEO', 'Accountant', 'Manager', 'Agent'] as const).map((r) => {
                      const isSel = role === r;
                      return (
                        <div
                          key={r}
                          className={`role-option-card ${isSel ? 'selected' : ''}`}
                          onClick={() => setRole(r)}
                        >
                          <div className="role-card-top">
                            <span className="role-en-title">{roleLabels[r].en}</span>
                            <span className="role-ur-pill">{roleLabels[r].ur}</span>
                          </div>
                          <span className="role-desc">{roleLabels[r].desc}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="form-group-lux">
                  <div className="label-dual">
                    <span>Assigned Office / Branch</span>
                    <span className="ur-hint">متعلقہ برانچ یا دفتر</span>
                  </div>
                  <select
                    className="lux-input lux-select"
                    value={office}
                    onChange={(e) => setOffice(e.target.value)}
                  >
                    {M.OFFICES.map((o) => (
                      <option key={o} value={o}>
                        {o} Office
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div className="form-group-lux">
              <div className="label-dual">
                <span>Email Address</span>
                <span className="ur-hint">ای میل ایڈریس</span>
              </div>
              <div className="input-with-icon">
                <span className="input-leading-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  type="email"
                  className="lux-input"
                  placeholder="admin@propertycrm.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="form-group-lux">
                <div className="label-dual">
                  <span>Password</span>
                  <span className="ur-hint">خفیہ پاس ورڈ</span>
                </div>
                <div className="input-with-icon">
                  <span className="input-leading-icon">
                    <Icon name="lock" />
                  </span>
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="lux-input"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="input-trailing-action"
                    onClick={() => setShowPass(!showPass)}
                    title={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass ? 'Hide' : 'Show'}
                  </button>
                </div>

                {mode === 'signin' && (
                  <div style={{ textAlign: 'right', marginTop: '6px' }}>
                    <button
                      type="button"
                      className="link-subtle"
                      onClick={() => {
                        setMode('forgot');
                        clearError();
                        setFeedback(null);
                      }}
                    >
                      Forgot password? / پاس ورڈ بھول گئے؟
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Elevated Primary Action Button */}
            <button
              type="submit"
              className="btn-lux-elevated"
              disabled={loading}
            >
              {loading ? (
                <span className="loading-spinner-row">
                  <span className="spinner-mini" /> Authenticating... / تصدیق جاری ہے
                </span>
              ) : mode === 'signin' ? (
                <span className="btn-content-dual">
                  <span>Sign In to Dashboard</span>
                  <span className="ur-inline">پورٹل میں داخل ہوں</span>
                </span>
              ) : mode === 'signup' ? (
                <span className="btn-content-dual">
                  <span>Create Account &amp; Enter</span>
                  <span className="ur-inline">اکاؤنٹ بنائیں اور داخل ہوں</span>
                </span>
              ) : (
                <span className="btn-content-dual">
                  <span>Send Recovery Email</span>
                  <span className="ur-inline">پاس ورڈ بحالی لنک بھیجیں</span>
                </span>
              )}
            </button>
          </form>

          {/* Google Sign In Divider */}
          {mode !== 'forgot' && (
            <>
              <div className="lux-divider">
                <span>OR SIGN IN WITH / یا پھر</span>
              </div>

              <button
                type="button"
                className="btn-google-elevated"
                onClick={handleGoogle}
                disabled={loading}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27A7.18 7.18 0 0 1 4.9 12c0-.79.14-1.57.38-2.27V6.58H1.25A11.96 11.96 0 0 0 0 12c0 1.92.45 3.74 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google Account</span>
                <span className="google-ur">گوگل اکاؤنٹ سے لاگ ان کریں</span>
              </button>
            </>
          )}

          {/* Firebase Settings Toggle Accordion */}
          <div className="lux-footer-bar">
            <div className="security-tag-row">
              <span className="sec-dot" />
              <span>FBR Tax Compliant &amp; 256-bit Encrypted Cloud DB</span>
              <span className="sec-ur">محفوظ کلاؤڈ ڈیٹا بیس</span>
            </div>

            <button
              type="button"
              className="btn-settings-pill"
              onClick={() => setShowConfig(!showConfig)}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>{showConfig ? 'Hide Cloud Config' : 'Firebase Cloud Config (Active: property-crm-5a401)'}</span>
            </button>
          </div>

          {showConfig && (
            <div className="lux-config-box">
              <div className="config-box-head">
                <h4>Firebase Connection Settings / فائر بیس سیٹنگز</h4>
                <p>Configured for: <code>{cfgProjectId}</code></p>
              </div>

              <div className="fld" style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '11px', color: 'var(--mute)' }}>Paste Config Snippet</label>
                <textarea
                  rows={2}
                  className="lux-input mono"
                  placeholder={`const firebaseConfig = { apiKey: "...", projectId: "property-crm-5a401" };`}
                  value={rawSnippet}
                  onChange={(e) => {
                    setRawSnippet(e.target.value);
                    parseSnippet(e.target.value);
                  }}
                  style={{ fontSize: '11px', fontFamily: 'monospace' }}
                />
              </div>

              <form onSubmit={handleSaveConfig} className="formgrid">
                <div className="fld">
                  <span style={{ fontSize: '11px' }}>API Key</span>
                  <input
                    type="text"
                    className="lux-input sm"
                    value={cfgApiKey}
                    onChange={(e) => setCfgApiKey(e.target.value)}
                    required
                  />
                </div>
                <div className="fld">
                  <span style={{ fontSize: '11px' }}>Project ID</span>
                  <input
                    type="text"
                    className="lux-input sm"
                    value={cfgProjectId}
                    onChange={(e) => setCfgProjectId(e.target.value)}
                    required
                  />
                </div>
                <div className="fld full" style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button type="submit" className="btn pri sm">
                    Save Config
                  </button>
                  <button type="button" className="btn sm" onClick={() => setShowConfig(false)}>
                    Close
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
