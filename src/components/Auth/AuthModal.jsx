import React, { useState, useEffect } from 'react';
import { X, Phone, Lock, Mail, User, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Sparkles, RefreshCw, Smartphone, Key } from 'lucide-react';
import { sanitizeText, formatPhoneNumber, hashPassword } from '../../utils/sanitizer';
import { useMarketplace } from '../../context/MarketplaceContext';
import { getSyncServerHosts } from '../../utils/broadcast';

export const AuthModal = ({ onClose, onAuthenticate, existingUsers = [] }) => {
  const { fetchLatestUsers, regions, cities } = useMarketplace();
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [step, setStep] = useState('CREDENTIALS'); // 'CREDENTIALS' | 'SMS_OTP' | 'EMAIL_OTP' | 'SUCCESS'

  // Form Fields
  const [phone, setPhone] = useState('+1 (555) 912-3456');
  const [password, setPassword] = useState('password123');
  const [name, setName] = useState('David Miller');
  const [email, setEmail] = useState('david.miller@example.com');
  const [role, setRole] = useState('electrician');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [preferredWorkRegionId, setPreferredWorkRegionId] = useState('');

  // Simulated OTP state
  const [smsOtpCode, setSmsOtpCode] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [generatedSmsOtp, setGeneratedSmsOtp] = useState('');
  const [generatedEmailOtp, setGeneratedEmailOtp] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [otpAttempts, setOtpAttempts] = useState(0);

  // Timer countdown
  useEffect(() => {
    if (step === 'SMS_OTP' || step === 'EMAIL_OTP') {
      const timer = setInterval(() => {
        setResendTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  const generateRandom6Digits = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanPhone = formatPhoneNumber(phone);
    if (!cleanPhone || cleanPhone.length < 8) {
      setErrorMessage('Please enter a valid phone number.');
      return;
    }

    const latestUsers = await fetchLatestUsers();

    if (tab === 'login') {
      // Validate against DB users
      const match = latestUsers.find(u => formatPhoneNumber(u.phone) === cleanPhone && u.password_hash === hashPassword(password, u.email));
      if (!match) {
        setErrorMessage('Invalid phone number or password. Check demo credentials.');
        return;
      }

      // Pre-set their registered email in state so the UI displays it correctly
      if (match.email) {
        setEmail(match.email);
      }

      const emailCode = generateRandom6Digits();
      setGeneratedEmailOtp(emailCode);
      setStep('EMAIL_OTP');
      setResendTimer(60);
      setOtpAttempts(0);

      // Send OTP to user's registered email
      (async () => {
        const hosts = getSyncServerHosts();
        const targetEmail = match.email || 'user@example.com';
        console.log(`📩 Dispatching OTP code ${emailCode} to user email ${targetEmail}...`);
        for (const host of hosts) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1500);
          try {
            const res = await fetch(`${host}/api/send-otp`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: targetEmail, otp: emailCode }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
              console.log(`📩 OTP email sent successfully via ${host}`);
              break;
            }
          } catch (fetchErr) {
            clearTimeout(timeoutId);
            console.warn(`Failed to dispatch OTP email via ${host}:`, fetchErr.message);
          }
        }
      })();
    } else {
      // Register mode checks
      if (!name.trim()) {
        setErrorMessage('Please enter your full name.');
        return;
      }
      if (!email.includes('@')) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
      if (!selectedRegionId || !selectedCityId) {
        setErrorMessage('Please select your region and city.');
        return;
      }
      if (role !== 'customer' && !preferredWorkRegionId) {
        setErrorMessage('Please select your preferred work region.');
        return;
      }

      const emailCode = generateRandom6Digits();
      setGeneratedEmailOtp(emailCode);
      setStep('EMAIL_OTP');
      setResendTimer(60);
      setOtpAttempts(0);

      // Send OTP to the registering user's email address
      (async () => {
        const hosts = getSyncServerHosts();
        console.log(`📩 Dispatching OTP code ${emailCode} to user email ${email}...`);
        for (const host of hosts) {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1500);
          try {
            const res = await fetch(`${host}/api/send-otp`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, otp: emailCode }),
              signal: controller.signal
            });
            clearTimeout(timeoutId);
            if (res.ok) {
              console.log(`📩 OTP email sent successfully via ${host}`);
              break;
            }
          } catch (fetchErr) {
            clearTimeout(timeoutId);
            console.warn(`Failed to dispatch OTP email via ${host}:`, fetchErr.message);
          }
        }
      })();
    }
  };

  const handleEmailOtpVerify = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (otpAttempts >= 3) {
      setErrorMessage('Too many failed attempts. Session locked. Please start over.');
      return;
    }

    if (emailOtpCode !== generatedEmailOtp) {
      const attempts = otpAttempts + 1;
      setOtpAttempts(attempts);
      if (attempts >= 3) {
        setErrorMessage('Too many failed attempts. Session locked. Please start over.');
      } else {
        setErrorMessage(`Invalid 6-digit email code. ${3 - attempts} attempt(s) remaining.`);
      }
      return;
    }

    if (tab === 'login') {
      const latestUsers = await fetchLatestUsers();
      const user = latestUsers.find(u => formatPhoneNumber(u.phone) === formatPhoneNumber(phone)) || {
        user_id: `usr-${Date.now()}`,
        name: 'Logged User',
        phone: formatPhoneNumber(phone),
        email: 'user@example.com'
      };
      onAuthenticate(user, role);
      onClose();
    } else {
      // Register complete!
      const isProvider = role !== 'customer';
      const newUser = {
        user_id: `usr-${Date.now()}`,
        name: sanitizeText(name),
        phone: formatPhoneNumber(phone),
        email: sanitizeText(email),
        password_hash: hashPassword(password, email),
        role: role,
        city_id: selectedCityId ? parseInt(selectedCityId, 10) : null,
        preferred_region_id: isProvider && preferredWorkRegionId ? parseInt(preferredWorkRegionId, 10) : null
      };

      onAuthenticate(newUser, role, isProvider);
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 400,
      padding: 'max(0.75rem, env(safe-area-inset-top)) 0.75rem 0.75rem 0.75rem'
    }}>
      <div className="animate-slide-up" style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '480px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid #E2E8F0',
        position: 'relative'
      }}>

        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          color: '#FFFFFF'
        }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>
              {step === 'CREDENTIALS' ? (tab === 'login' ? 'Welcome Back' : 'Create Account') : 'Security Verification'}
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '2px' }}>
              HandyHub Relational Authentication Engine
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Simulated Push Notification Banners for Demo */}
        {step === 'SMS_OTP' && (
          <div className="animate-slide-down" style={{
            background: '#FEF3C7',
            borderBottom: '1px solid #FDE68A',
            padding: '10px 14px',
            fontSize: '0.82rem',
            color: '#92400E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Smartphone size={16} style={{ color: '#D97706' }} />
              <span><strong>Simulated SMS Push:</strong> Your OTP code is <strong>{generatedSmsOtp}</strong></span>
            </div>
            <button
              onClick={() => setSmsOtpCode(generatedSmsOtp)}
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                background: '#D97706',
                color: '#FFFFFF',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Auto-Fill
            </button>
          </div>
        )}

        {step === 'EMAIL_OTP' && (
          <div className="animate-slide-down" style={{
            background: '#EEF2FF',
            borderBottom: '1px solid #C7D2FE',
            padding: '10px 14px',
            fontSize: '0.82rem',
            color: '#3730A3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Mail size={16} style={{ color: '#4F46E5' }} />
              <span><strong>Simulated Email Alert:</strong> Verification code is <strong>{generatedEmailOtp}</strong></span>
            </div>
            <button
              onClick={() => setEmailOtpCode(generatedEmailOtp)}
              style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                background: '#4F46E5',
                color: '#FFFFFF',
                border: 'none',
                padding: '3px 8px',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Auto-Fill
            </button>
          </div>
        )}

        <div style={{ padding: '1.5rem' }}>
          {/* Error Notice */}
          {errorMessage && (
            <div style={{
              background: '#FFF1F2',
              border: '1px solid #FECDD3',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              fontSize: '0.8rem',
              color: '#E11D48',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: CREDENTIALS (LOGIN / REGISTER TABS) */}
          {step === 'CREDENTIALS' && (
            <div>
              {/* Tab Selector */}
              <div style={{
                display: 'flex',
                background: '#F1F5F9',
                padding: '4px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem'
              }}>
                <button
                  onClick={() => { setTab('login'); setErrorMessage(''); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    background: tab === 'login' ? '#FFFFFF' : 'transparent',
                    color: tab === 'login' ? 'var(--text-main)' : 'var(--text-muted)',
                    border: 'none',
                    boxShadow: tab === 'login' ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setTab('register'); setErrorMessage(''); }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    background: tab === 'register' ? '#FFFFFF' : 'transparent',
                    color: tab === 'register' ? 'var(--text-main)' : 'var(--text-muted)',
                    border: 'none',
                    boxShadow: tab === 'register' ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  Register Account
                </button>
              </div>

              <form onSubmit={handleCredentialsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {tab === 'register' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                      Full Name:
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                      <User size={16} style={{ color: 'var(--text-muted)', marginRight: '6px' }} />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. David Miller"
                        style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '0.85rem', fontWeight: 600 }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Phone Number:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                    <Phone size={16} style={{ color: 'var(--primary-amber)', marginRight: '6px' }} />
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                      placeholder="+1 (555) 912-3456"
                      style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '0.85rem', fontWeight: 600 }}
                    />
                  </div>
                </div>

                {tab === 'register' && (
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                      Email Address:
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                      <Mail size={16} style={{ color: 'var(--accent-teal)', marginRight: '6px' }} />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="david.miller@example.com"
                        style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '0.85rem', fontWeight: 600 }}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                    Password:
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                    <Lock size={16} style={{ color: 'var(--text-muted)', marginRight: '6px' }} />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '0.85rem', fontWeight: 600 }}
                    />
                  </div>
                </div>

                {tab === 'register' && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                        Account Primary Role:
                      </label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid #E2E8F0',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          background: '#F8FAFC',
                          color: 'var(--text-main)'
                        }}
                      >
                        <option value="customer">Customer (Post repairs)</option>
                        <option value="electrician">Electrician Pro</option>
                        <option value="plumber">Plumber Pro</option>
                        <option value="locksmith">Locksmith Pro</option>
                        <option value="hvac">HVAC Specialist Pro</option>
                        <option value="painter">Painter Pro</option>
                        <option value="carpenter">Carpenter Pro</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                        Your Region:
                      </label>
                      <select
                        value={selectedRegionId}
                        onChange={(e) => {
                          setSelectedRegionId(e.target.value);
                          setSelectedCityId('');
                        }}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid #E2E8F0',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          background: '#F8FAFC',
                          color: 'var(--text-main)'
                        }}
                      >
                        <option value="">Select Region</option>
                        {regions.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                        Your City:
                      </label>
                      <select
                        value={selectedCityId}
                        disabled={!selectedRegionId}
                        onChange={(e) => setSelectedCityId(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid #E2E8F0',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          background: selectedRegionId ? '#F8FAFC' : '#E2E8F0',
                          color: 'var(--text-main)',
                          cursor: selectedRegionId ? 'pointer' : 'not-allowed'
                        }}
                      >
                        <option value="">Select City</option>
                        {cities.filter(c => c.region_id === parseInt(selectedRegionId, 10)).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    {role !== 'customer' && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                          Preferred Work Region:
                        </label>
                        <select
                          value={preferredWorkRegionId}
                          onChange={(e) => setPreferredWorkRegionId(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid #E2E8F0',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            background: '#F8FAFC',
                            color: 'var(--text-main)'
                          }}
                        >
                          <option value="">Select Work Region</option>
                          {regions.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </>
                )}

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, #F59E0B 0%, #FF6B35 100%)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: 'var(--shadow-glow)',
                    marginTop: '0.5rem'
                  }}
                >
                  <span>{tab === 'login' ? 'Continue to SMS OTP' : 'Send Verification Codes'}</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          )}

          {/* STEP 2: SMS OTP VERIFICATION */}
          {step === 'SMS_OTP' && (
            <form onSubmit={handleSmsOtpVerify} style={{ textAlign: 'center' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto'
              }}>
                <Smartphone size={28} />
              </div>

              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                Verify Phone SMS OTP
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                We sent a 6-digit SMS code to <strong>{phone}</strong>
              </p>

              <input
                type="text"
                required
                maxLength={6}
                value={smsOtpCode}
                onChange={(e) => setSmsOtpCode(e.target.value)}
                placeholder="123456"
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  letterSpacing: '0.3em',
                  textAlign: 'center',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid #F59E0B',
                  width: '180px',
                  margin: '0 auto 1.25rem auto',
                  display: 'block'
                }}
              />

              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Resend code in: <span style={{ fontWeight: 700, color: 'var(--primary-amber)' }}>{resendTimer}s</span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setStep('CREDENTIALS')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#F1F5F9',
                    color: 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}
                >
                  Back
                </button>

                <button
                  type="submit"
                  style={{
                    flex: 2,
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--accent-emerald)',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.88rem'
                  }}
                >
                  Verify SMS Code
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: EMAIL CODE VERIFICATION (FOR REGISTRATION) */}
          {step === 'EMAIL_OTP' && (
            <form onSubmit={handleEmailOtpVerify} style={{ textAlign: 'center' }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto'
              }}>
                <Mail size={28} />
              </div>

              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '4px' }}>
                Verify Email Address
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                We sent a 6-digit email confirmation code to <strong>{email}</strong>
              </p>

              <input
                type="text"
                required
                maxLength={6}
                value={emailOtpCode}
                onChange={(e) => setEmailOtpCode(e.target.value)}
                placeholder="654321"
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  letterSpacing: '0.3em',
                  textAlign: 'center',
                  padding: '10px',
                  borderRadius: 'var(--radius-md)',
                  border: '2px solid #4F46E5',
                  width: '180px',
                  margin: '0 auto 1.25rem auto',
                  display: 'block'
                }}
              />

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setStep('CREDENTIALS')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#F1F5F9',
                    color: 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.85rem'
                  }}
                >
                  Back
                </button>

                <button
                  type="submit"
                  style={{
                    flex: 2,
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#4F46E5',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.88rem'
                  }}
                >
                  {tab === 'login' ? 'Confirm Sign In 🔑' : 'Complete Registration 🚀'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
