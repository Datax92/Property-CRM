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
  const [name, setName] = useState('');
  const [role, setRole] = useState<'CEO' | 'Accountant' | 'Manager' | 'Agent'>('CEO');
  const [office, setOffice] = useState(M.OFFICES[0]);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Firebase Config State for manual pasting
  const [showConfig, setShowConfig] = useState(!isConfigured);
  const currentConfig = getActiveFirebaseConfig();
  const [cfgApiKey, setCfgApiKey] = useState(currentConfig.apiKey || '');
  const [cfgProjectId, setCfgProjectId] = useState(currentConfig.projectId || 'property-crm');
  const [cfgAuthDomain, setCfgAuthDomain] = useState(currentConfig.authDomain || 'property-crm.firebaseapp.com');
  const [cfgStorageBucket, setCfgStorageBucket] = useState(currentConfig.storageBucket || 'property-crm.appspot.com');
  const [cfgSenderId, setCfgSenderId] = useState(currentConfig.messagingSenderId || '');
  const [cfgAppId, setCfgAppId] = useState(currentConfig.appId || '');
  const [rawSnippet, setRawSnippet] = useState('');

  const parseSnippet = (text: string) => {
    try {
      const match = text.match(/const\s+firebaseConfig\s*=\s*({[\s\S]*?});/) || text.match(/({[\s\S]*apiKey[\s\S]*})/);
      let jsonStr = match ? match[1] : text;
      // Convert loose JS keys to valid JSON if needed
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
      setFeedback('Firebase configuration parsed successfully!');
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
      storageBucket: cfgStorageBucket.trim() || `${cfgProjectId.trim()}.appspot.com`,
      messagingSenderId: cfgSenderId.trim(),
      appId: cfgAppId.trim(),
    };
    updateFirebaseConfig(newCfg);
    setShowConfig(false);
    setFeedback('Firebase connected! You can now log in or register.');
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
          throw new Error('Please enter your full name.');
        }
        await signUpWithEmail(email, password, { name, role, office });
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setFeedback('Password reset link sent! Check your email inbox.');
        setMode('signin');
      }
    } catch (err: any) {
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

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-head">
          <div className="login-brand">
            <LogoMark />
            <div>
              <h2>Meridian Estates</h2>
              <span className="login-sub">Real Estate Management System</span>
            </div>
          </div>
          <p className="login-tagline">
            Official portal for Pakistan real estate trading, portfolio valuation, cost sheets, and FBR tax reporting.
          </p>
        </div>

        {/* Configuration Notice if not connected */}
        {!isConfigured && (
          <div className="note warn" style={{ marginBottom: '16px' }}>
            <span className="ic">
              <Icon name="warn" />
            </span>
            <div>
              <b>Firebase setup required:</b> Connect your Firebase project (<code>property-crm</code>) to activate login.
              <button
                type="button"
                className="btn sm"
                style={{ marginLeft: '10px' }}
                onClick={() => setShowConfig(!showConfig)}
              >
                {showConfig ? 'Hide settings' : 'Connect now'}
              </button>
            </div>
          </div>
        )}

        {/* Firebase Config Drawer */}
        {showConfig && (
          <div className="panel" style={{ marginBottom: '18px', borderColor: 'var(--brand)' }}>
            <div className="panel-h">
              <h3>Firebase Project Connection</h3>
              <span className="sub">Project: {cfgProjectId}</span>
            </div>
            <div className="panel-b">
              <p style={{ fontSize: '12px', color: 'var(--mute)', marginBottom: '10px' }}>
                Paste the <code>firebaseConfig</code> object from Firebase Console (Project Settings &gt; General &gt; Web apps), or fill in the keys:
              </p>
              <div className="fld" style={{ marginBottom: '10px' }}>
                <label>Paste Firebase Config Snippet</label>
                <textarea
                  rows={3}
                  placeholder={`const firebaseConfig = {\n  apiKey: "...",\n  projectId: "property-crm",\n  ...\n};`}
                  value={rawSnippet}
                  onChange={(e) => {
                    setRawSnippet(e.target.value);
                    parseSnippet(e.target.value);
                  }}
                  style={{ fontFamily: 'monospace', fontSize: '11px' }}
                />
              </div>

              <form onSubmit={handleSaveConfig} className="formgrid">
                <div className="fld">
                  <label>API Key *</label>
                  <input
                    type="text"
                    value={cfgApiKey}
                    onChange={(e) => setCfgApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    required
                  />
                </div>
                <div className="fld">
                  <label>Project ID *</label>
                  <input
                    type="text"
                    value={cfgProjectId}
                    onChange={(e) => setCfgProjectId(e.target.value)}
                    placeholder="property-crm"
                    required
                  />
                </div>
                <div className="fld">
                  <label>Auth Domain</label>
                  <input
                    type="text"
                    value={cfgAuthDomain}
                    onChange={(e) => setCfgAuthDomain(e.target.value)}
                    placeholder="property-crm.firebaseapp.com"
                  />
                </div>
                <div className="fld">
                  <label>App ID</label>
                  <input
                    type="text"
                    value={cfgAppId}
                    onChange={(e) => setCfgAppId(e.target.value)}
                    placeholder="1:1234567890:web:abcdef..."
                  />
                </div>
                <div className="fld full" style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <button type="submit" className="btn pri">
                    <Icon name="ok" /> Save &amp; Connect Firebase
                  </button>
                  {isConfigured && (
                    <button type="button" className="btn" onClick={() => setShowConfig(false)}>
                      Close
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab navigation between Sign In and Sign Up */}
        {mode !== 'forgot' && (
          <div className="login-tabs">
            <button
              type="button"
              className={`login-tab ${mode === 'signin' ? 'active' : ''}`}
              onClick={() => {
                setMode('signin');
                clearError();
                setFeedback(null);
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`login-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => {
                setMode('signup');
                clearError();
                setFeedback(null);
              }}
            >
              Create Account
            </button>
          </div>
        )}

        {feedback && (
          <div className="note" style={{ marginBottom: '14px' }}>
            <span className="ic">
              <Icon name="ok" />
            </span>
            <div>{feedback}</div>
          </div>
        )}

        {error && (
          <div className="note bad" style={{ marginBottom: '14px' }}>
            <span className="ic">
              <Icon name="warn" />
            </span>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {mode === 'signup' && (
            <>
              <div className="fld">
                <label>Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Hammad Khan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="fld">
                <label>Role in Company *</label>
                <select value={role} onChange={(e) => setRole(e.target.value as any)}>
                  <option value="CEO">CEO (Full System Access)</option>
                  <option value="Accountant">Accountant (Accounts, Tax &amp; Invoices)</option>
                  <option value="Manager">Manager (Operations, Inventory &amp; Sales)</option>
                  <option value="Agent">Real Estate Agent (Assigned Deals Only)</option>
                </select>
              </div>

              <div className="fld">
                <label>Branch / Office</label>
                <select value={office} onChange={(e) => setOffice(e.target.value)}>
                  {M.OFFICES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div className="fld">
            <label>Email Address *</label>
            <input
              type="email"
              placeholder="user@propertycrm.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {mode !== 'forgot' && (
            <div className="fld">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label>Password *</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    className="linkbtn"
                    onClick={() => {
                      setMode('forgot');
                      clearError();
                      setFeedback(null);
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn pri full"
            disabled={loading}
            style={{ marginTop: '8px', padding: '10px 16px', fontSize: '14px', fontWeight: 600 }}
          >
            {loading ? (
              'Authenticating...'
            ) : mode === 'signin' ? (
              <>
                <Icon name="user" /> Sign In to Portal
              </>
            ) : mode === 'signup' ? (
              <>
                <Icon name="ok" /> Create Account
              </>
            ) : (
              'Send Password Reset Link'
            )}
          </button>

          {mode === 'forgot' && (
            <button
              type="button"
              className="btn full"
              style={{ marginTop: '6px' }}
              onClick={() => {
                setMode('signin');
                clearError();
              }}
            >
              Back to Sign In
            </button>
          )}
        </form>

        {mode !== 'forgot' && (
          <>
            <div className="login-divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="btn full"
              onClick={handleGoogle}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
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
              Continue with Google
            </button>
          </>
        )}

        <div className="login-footer">
          <button
            type="button"
            className="linkbtn"
            style={{ fontSize: '11px', color: 'var(--mute)' }}
            onClick={() => setShowConfig(!showConfig)}
          >
            {showConfig ? 'Hide Firebase Connection Settings' : 'Configure Firebase Connection'}
          </button>
        </div>
      </div>
    </div>
  );
}
