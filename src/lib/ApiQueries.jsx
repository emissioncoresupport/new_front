import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

const QueryContext = createContext();

export const QueryProvider = ({ children }) => {
  const getUserMe = async() => {
    console.log(`/api/v1/user/me`);
    try {

        const res = await fetch(`${import.meta.env.VITE_BASE44_BACKEND_URL}/api/v1/user/me`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json'
        }
      })

      console.log(`/api/v1/user/me`);

      const data = await res.json();
      console.log(data);
      //console.log(data.data);
      console.log("DATAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA");
      
      if (!res.ok) {
        throw new Error(JSON.stringify(data.detail))
      }
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
    <QueryContext.Provider value={{ 
      getUserMe
    }}>
      {children}
    </QueryContext.Provider>
  );
};

export const useAPIQuery = () => {
  const context = useContext(QueryContext);
  if (!context) {
    throw new Error('useAQuery must be used within an QueryProvider');
  }
  return context;
};