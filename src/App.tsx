import React, { useState, useEffect } from 'react';
import { QueryBuilderProvider } from './contexts/QueryBuilderContext';
import MainLayout from './components/layout/MainLayout';

function App() {
  const [isReady, setIsReady] = useState<boolean>(false);

  useEffect(() => {
    // Simple app initialization without strict context checks
    console.log('🚀 Visual SQL Query Builder initializing...');
    
    // Check backend connectivity and warehouse status
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    (async () => {
      try {
        await fetch('/api/warehouse/status', { method: 'POST', signal: controller.signal });
        console.log('✅ Backend connectivity and warehouse status check successful');
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('⏰ Backend status check timed out (normal for cold start)');
        } else {
          console.warn('⚠️ Backend status check failed:', error);
        }
      } finally {
        clearTimeout(timeoutId);
        setIsReady(true);
      }
    })();
    
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  // Show loading state while initializing
  if (!isReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing Visual SQL Query Builder...</p>
        </div>
      </div>
    );
  }

  // Render main app
  return (
    <QueryBuilderProvider>
      <div className="App h-screen overflow-hidden">
        <MainLayout />
      </div>
    </QueryBuilderProvider>
  );
}

export default App;
