import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext'; 
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  AlertCircle, 
  CheckCircle, 
  Key,
  Shield,
  RefreshCw
} from 'lucide-react';

const AuthView = ({ onSuccessRedirect }) => {
  const { login, isLoadingAuth, authError, logout, sendOTP } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [localError, setLocalError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [showOTPField, setShowOTPField] = useState(false);
  const [isOTPVerification, setIsOTPVerification] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState('');

  // Imágenes de fondo temáticas
  const backgroundImages = [
    'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
    'https://images.unsplash.com/photo-1589652717521-10c0d092dea9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
  ];

  const [selectedBackground] = useState(() => 
    backgroundImages[Math.floor(Math.random() * backgroundImages.length)]
  );

  // Detectar si el error indica que se requiere OTP
  useEffect(() => {
    if (authError) {
      const errorMsg = authError.message || authError.toString();
      const requiresOTP = errorMsg.includes('OTP') || 
                         errorMsg.includes('two-factor') || 
                         errorMsg.includes('2FA') ||
                         errorMsg.includes('verification') ||
                         errorMsg.includes('code') ||
                         errorMsg.includes('authenticator');
      
      if (requiresOTP) {
        setShowOTPField(true);
        setIsOTPVerification(true);
        setOtpSentMessage('We sent a verification code to your email. Please enter it below.');
      }
    }
  }, [authError]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    let isValid = true;
    
    // Validar email
    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    } else {
      setEmailError('');
    }

    // Validar contraseña (solo si no estamos en modo OTP)
    if (!showOTPField && !password.trim()) {
      setPasswordError('Password is required');
      isValid = false;
    } else {
      setPasswordError('');
    }

    // Validar OTP (si estamos en modo OTP)
    if (showOTPField && !otp.trim()) {
      setOtpError('Verification code is required');
      isValid = false;
    } else if (showOTPField && otp.trim().length < 6) {
      setOtpError('Verification code must be at least 6 characters');
      isValid = false;
    } else {
      setOtpError('');
    }

    return isValid;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitted(true);
    setLocalError(null);
    setEmailError('');
    setPasswordError('');

    // Validar formulario
    if (!validateForm()) {
      return;
    }

    try {
      // Llamar a la función de login
      await login(email, password);
      
      if (onSuccessRedirect) window.location.href = onSuccessRedirect;
    } catch (err) {
      setLocalError(err?.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitted(true);
    setOtpError('');

    if (!validateForm()) {
      return;
    }

    try {
      // Llamar a la función sendOTP con el código
      const result = await sendOTP(email, otp);
      
      if (result && onSuccessRedirect) {
        window.location.href = onSuccessRedirect;
      }
    } catch (err) {
      setOtpError(err?.message || 'Invalid verification code. Please try again.');
    }
  };

  const handleResendOTP = async () => {
    try {
      setOtpSentMessage('Sending new verification code...');
      // Aquí podrías llamar a una función para reenviar el OTP
      // await resendOTP(email);
      setOtpSentMessage('New verification code sent to your email.');
      setOtp(''); // Limpiar el campo OTP
    } catch (err) {
      setOtpError('Failed to resend code. Please try again.');
    }
  };

  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    if (emailError && value && validateEmail(value)) {
      setEmailError('');
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    if (passwordError && value.trim()) {
      setPasswordError('');
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(value);
    if (otpError && value.trim().length >= 6) {
      setOtpError('');
    }
  };

  const handleBackToLogin = () => {
    setShowOTPField(false);
    setIsOTPVerification(false);
    setOtp('');
    setOtpError('');
    setOtpSentMessage('');
    setLocalError(null);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${selectedBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-transparent to-emerald-900/20"></div>
      
      <div className="max-w-md w-full relative z-10">
        {/* Tarjeta de login */}
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-amber-100/20">
          {/* Encabezado */}
          <div className="bg-[#02A1E8] p-8 text-center relative">
            <div className="absolute top-4 right-4 text-white/50 text-sm">
              <span className="bg-white/10 px-2 py-1 rounded-full text-xs">
                {showOTPField ? 'Two-Factor Authentication' : 
                 selectedBackground.includes('transport') ? 'Sustainable Transport' : 
                 selectedBackground.includes('energy') ? 'Green Energy' : 'Emission Core'}
              </span>
            </div>
            
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-4 backdrop-blur-sm">
              {showOTPField ? (
                <Shield className="w-8 h-8 text-white" />
              ) : (
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              {showOTPField ? 'Verify Identity' : 'Welcome to SupplyLens'}
            </h1>
            <p className="text-amber-100/90">
              {showOTPField ? 'Enter your verification code' : 'Sign in to continue'}
            </p>
          </div>

          {/* Formulario */}
          <div className="p-8">
            {showOTPField ? (
              // Formulario de verificación OTP
              <form onSubmit={handleOTPSubmit} className="space-y-6">
                {/* Mensaje de OTP enviado */}
                {otpSentMessage && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center animate-fadeIn">
                    <p className="text-sm text-blue-700">{otpSentMessage}</p>
                    <p className="text-xs text-blue-600 mt-1">Check your email inbox and spam folder</p>
                  </div>
                )}

                {/* Campo OTP */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Verification Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Key className={`h-5 w-5 ${otpError ? 'text-red-500' : 'text-amber-600'}`} />
                    </div>
                    <input
                      type="text"
                      value={otp}
                      onChange={handleOtpChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:outline-none transition-all duration-200 text-center text-lg tracking-widest ${
                        otpError 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-gray-300 focus:border-amber-500 focus:ring-amber-500/20'
                      } bg-white`}
                      placeholder="000000"
                      maxLength="6"
                      autoComplete="one-time-code"
                      autoFocus
                    />
                    {otp && otp.length === 6 && !otpError && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    {otpError && (
                      <p className="text-sm text-red-600 flex items-center gap-1 animate-fadeIn">
                        <AlertCircle className="h-4 w-4" />
                        {otpError}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="text-sm text-amber-600 hover:text-amber-800 transition-colors flex items-center gap-1 ml-auto"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Resend Code
                    </button>
                  </div>
                </div>

                {/* Información del usuario */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">
                    Verifying access for: <span className="font-semibold">{email}</span>
                  </p>
                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="text-xs text-amber-600 hover:text-amber-800 transition-colors mt-1"
                  >
                    Not you? Sign in with different account
                  </button>
                </div>

                {/* Botón de verificación OTP */}
                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={isLoadingAuth}
                    className="w-full bg-[#02A1E8] hover:bg-[#86B027] text-white font-medium py-3.5 px-4 rounded-xl transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                  >
                    {isLoadingAuth ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Verifying...
                      </>
                    ) : (
                      <>
                        Verify & Continue
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleBackToLogin}
                    className="w-full text-sm text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    ← Back to login
                  </button>
                </div>
              </form>
            ) : (
              // Formulario de login original
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                {/* Campo Email */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className={`h-5 w-5 ${emailError ? 'text-red-500' : 'text-amber-600'}`} />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={handleEmailChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:outline-none transition-all duration-200 ${
                        emailError 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-gray-300 focus:border-amber-500 focus:ring-amber-500/20'
                      } bg-white`}
                      placeholder="you@example.com"
                      autoComplete="email"
                      disabled={showOTPField}
                    />
                    {email && !emailError && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <CheckCircle className="h-5 w-5 text-emerald-500" />
                      </div>
                    )}
                  </div>
                  {isSubmitted && emailError && (
                    <p className="text-sm text-red-600 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="h-4 w-4" />
                      {emailError}
                    </p>
                  )}
                </div>

                {/* Campo Password */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-sm text-amber-600 hover:text-amber-800 transition-colors"
                      disabled={showOTPField}
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-amber-600" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={handlePasswordChange}
                      className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:outline-none transition-all duration-200 ${
                        passwordError 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                          : 'border-gray-300 focus:border-amber-500 focus:ring-amber-500/20'
                      } bg-white`}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={showOTPField}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-amber-600 transition-colors disabled:opacity-50"
                      disabled={showOTPField}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {isSubmitted && passwordError && (
                    <p className="text-sm text-red-600 flex items-center gap-1 animate-fadeIn">
                      <AlertCircle className="h-4 w-4" />
                      {passwordError}
                    </p>
                  )}
                </div>

                {/* Enlace Forgot Password */}
                <div className="flex justify-end">
                  <a 
                    href="#" 
                    className={`text-sm font-medium transition-colors ${
                      showOTPField 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-amber-600 hover:text-amber-800'
                    }`}
                    onClick={(e) => showOTPField && e.preventDefault()}
                  >
                    Forgot password?
                  </a>
                </div>

                {/* Mensaje de error general */}
                {isSubmitted && (localError || authError) && !showOTPField && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-fadeIn">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700">
                      {localError || authError.message}
                    </div>
                  </div>
                )}

                {/* Botón de submit */}
                <div>
                  <button
                    type="submit"
                    disabled={isLoadingAuth || showOTPField}
                    className={`w-full font-medium py-3.5 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 transform ${
                      showOTPField
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#02A1E8] hover:bg-[#86B027] text-white hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed'
                    }`}
                  >
                    {isLoadingAuth ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Signing in...
                      </>
                    ) : (
                      <>
                        Sign in
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Enlace de registro (solo en modo login) */}
            {!showOTPField && (
              <div className="mt-8 text-center text-sm text-gray-600">
                Don't have an account?{' '}
                <a href="#" className="font-semibold text-amber-600 hover:text-amber-800 transition-colors">
                  Sign up for free
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Pie de página */}
        <div className="mt-8 text-center">
          <p className="text-xs text-white/70">
            {showOTPField ? (
              'Two-factor authentication adds an extra layer of security to your account.'
            ) : (
              <>
                By signing in, you agree to our{' '}
                <a href="#" className="underline hover:text-amber-300 transition-colors">Terms of Service</a> and{' '}
                <a href="#" className="underline hover:text-amber-300 transition-colors">Privacy Policy</a>
              </>
            )}
          </p>
          <p className="text-xs text-white/50 mt-2">© {new Date().getFullYear()} Emission Core. All rights reserved.</p>
        </div>
      </div>

      {/* Estilos CSS para animaciones */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default AuthView;