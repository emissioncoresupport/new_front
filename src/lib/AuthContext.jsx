import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {

    //sessionStorage.clear()
    //localStorage.clear()
    console.log("Check App State");
    console.log(sessionStorage);
    //console.log(localStorage);
    try {
      //setIsLoadingPublicSettings(true);
      setAuthError(null);

      /*console.log("Chamizooooooooooooooooooooooooooooooo")
      console.log(appParams);
      console.log(user);
      console.log("Chamizooooooooooooooooooooooooooooooo")
      
      /*const appClient = createAxiosClient({
        baseURL: `${appParams.serverUrl}/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token,
        interceptResponses: true
      });
      */
      
      try {
        //console.log("checkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk");
        //console.log(sessionStorage.getItem('login').length);
        if (sessionStorage.refresh_token.length > 15) {
          await checkUserAuth();
        } else {
          //console.log("1111111111111111111111111111111111111111111111111");
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    console.log("Check User Auth");
    try {
      setIsLoadingAuth(false);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    console.log("Log Outtttttttttttttt");

    sessionStorage.removeItem('refresh_token')
    sessionStorage.removeItem('access_token')
    sessionStorage.removeItem('token_type')
    //sessionStorage.removeItem('expires_at')
    
    sessionStorage.clear()
    localStorage.clear()
    setUser(null);
    setIsAuthenticated(false);
    setAuthError(null);
    
    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  const login = async (email, password) => {
    try {
      // Resetear cualquier error previo
      setAuthError(null);
      setIsLoadingAuth(true);

      //throw new Error('OTP Code');

      // Validar formato básico de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        throw new Error('Please enter a valid email address');
      }

      // Validar que la contraseña no esté vacía
      if (!password || password.trim().length === 0) {
        throw new Error('Password is required');
      }

      // Aquí normalmente harías la llamada al API real
      // Por ahora simulamos un login exitoso
      /*const appClient = createAxiosClient({
        baseURL: `${appParams.serverUrl}/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token,
        interceptResponses: true
      });
      */


      //console.log(process.env.VITE_BASE44_BACKEND_URL);
      const res = await fetch(`${import.meta.env.VITE_BASE44_BACKEND_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      })

      const data = await res.json();
      console.log(data);
      console.log(data.data);
      console.log("DATAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
      
      if (!res.ok) {
        throw new Error(JSON.stringify(data.detail))
      }
      /*
      if (res.ok) {
        return {
          id: data.access_token,
          email: email,
          access_token: data.access_token,
          token_type: data.token_type,
          refresh_token: data.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + 43200 // 12 hours from now
        }
      }
      
      
      // Simular una llamada asíncrona al API
      //await new Promise(resolve => setTimeout(resolve, 500));

      //console.log("Login with email:", email);
      //console.log(import.meta.env.VITE_BASE44_BACKEND_URL);

      // Validar que el email esté en la lista permitida
      //const normalizedEmail = email.trim().toLowerCase();
      //if (!isValidEmail(normalizedEmail)) {
      //  throw new Error(`The email address ${email} is not authorized to access the system. Contact the administrator.`);
      //}
      */

      // Crear usuario simulado con datos
      const simulatedUser = {
        id: `user_${Date.now()}`,
        email: "",
        name: "",
        token: '',
        refresh: '',
        permissions: ['read', 'write'],
        role: "user"
      };

      if (res.ok){
        sessionStorage.email = email;
        sessionStorage.access_token = data.data.access_token;
        sessionStorage.refresh_token = data.data.refresh_token;
        sessionStorage.token_type = data.data.token_type;
        sessionStorage.company_id = data.data.company_id;
        sessionStorage.user_id = data.data.user_id;
        sessionStorage.role = data.data.role;
        sessionStorage.login = true;
        //console.log(sessionStorage);
        //console.log("Session Storage After Login");
        //simulatedUser.id = data.user_id;
        //simulatedUser.email = data.email;
        //simulatedUser.name = data.email;
        //simulatedUser.token = data.access_token;
        //simulatedUser.refresh = data.refresh_token;
        //simulatedUser.role = data.role;
      }

      // Actualizar estado de autenticación
      setUser(simulatedUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);

      // Retornar el usuario para que pueda ser usado en el componente
      return simulatedUser;

    } catch (error) {
      // Manejar errores
      console.error('Login error:', error);
      
      const errorMessage = error.message || 'Authentication process error';
      setAuthError({
        type: 'login_failed',
        message: errorMessage
      });
      setIsLoadingAuth(false);
      
      // Lanzar el error para que el componente AuthView lo capture
      throw error;
    }
  };

  const navigateToLogin = () => {
    console.log("Navigate to Login");
    base44.auth.redirectToLogin(window.location.href);
  };

  const getUserMe = async() => {
    //console.log(`/api/v1/user/me`);
    try {

        const res = await fetch(`${import.meta.env.VITE_BASE44_BACKEND_URL}/api/v1/user/me`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json'
        }
      })

      //console.log(`/api/v1/user/me`);

      const data = await res.json();
      //console.log(data);
      //console.log(data.email);
      //console.log("DATAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
      
      if (!res.ok) {
        throw new Error(JSON.stringify(data.detail))
      }

      return data;
    }
    catch (error) {
      // Manejar errores
      console.error('Login error:', error);
      
      const errorMessage = error.message || 'Authentication process error';
      /*
      setAuthError({
        type: 'login_failed',
        message: errorMessage
      });
      setIsLoadingAuth(false);
      */
      
      // Lanzar el error para que el componente AuthView lo capture
      throw error;
    }
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState,
      login,
      getUserMe,
      // Funciones adicionales para gestión de emails
      //getAllowedEmails,
      //addAllowedEmail,
      //isValidEmail
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};