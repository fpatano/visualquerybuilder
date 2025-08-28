import React, { useState, useEffect } from 'react';
import { QueryBuilderProvider } from './contexts/QueryBuilderContext';
import MainLayout from './components/layout/MainLayout';
import { checkDatabricksContext, logEnvironmentInfo, getEnvironmentConfig } from './utils/databricks-context';

function App() {
  const [contextValid, setContextValid] = useState<boolean | null>(null);
  const [contextInfo, setContextInfo] = useState<any>(null);

  useEffect(() => {
    // Log comprehensive environment information
    logEnvironmentInfo();
    
    // Check Databricks Apps context
    const context = checkDatabricksContext();
    const config = getEnvironmentConfig();
    
    setContextValid(context.isAvailable);
    setContextInfo(config);

    // Warm up warehouse connection if in valid context
    if (context.isAvailable) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      (async () => {
        try {
          await fetch('/api/warehouse/test', { method: 'POST', signal: controller.signal });
          console.log('✅ Warehouse connection test successful');
        } catch (error) {
          if (error.name === 'AbortError') {
            console.log('⏰ Warehouse connection test timed out (normal for cold start)');
          } else {
            console.warn('⚠️ Warehouse connection test failed:', error);
          }
        } finally {
          clearTimeout(timeoutId);
        }
      })();
      
      return () => controller.abort();
    }
  }, []);

  // Show error screen if not in Databricks Apps context
  if (contextValid === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Databricks Apps Context Required
            </h1>
            
            <p className="text-gray-600 mb-6">
              This application must be run within a Databricks workspace as an installed app. 
              It cannot be run on localhost or as a standalone application.
            </p>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6 text-left">
              <h3 className="text-sm font-medium text-yellow-800 mb-2">To Fix This Issue:</h3>
              <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Deploy this app as a Databricks App in your workspace</li>
                <li>Launch the app from the Databricks Apps menu in your workspace UI</li>
                <li>Ensure the app has the required Unity Catalog permissions</li>
                <li>Contact your workspace admin if the issue persists</li>
              </ol>
            </div>

            {contextInfo && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-left">
                <h3 className="text-sm font-medium text-gray-800 mb-2">Environment Details:</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Environment: <span className="font-mono">{contextInfo.environment}</span></div>
                  <div>Databricks Apps: <span className="font-mono">{contextInfo.isDatabricksApps ? 'Yes' : 'No'}</span></div>
                  <div>Unity Catalog Access: <span className="font-mono">{contextInfo.canUseUnityCatalog ? 'Yes' : 'No'}</span></div>
                  <div>Current URL: <span className="font-mono break-all">{window.location.href}</span></div>
                </div>
              </div>
            )}

            <div className="mt-6 text-xs text-gray-500">
              Check the browser console for detailed debugging information.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while checking context
  if (contextValid === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking Databricks Apps context...</p>
        </div>
      </div>
    );
  }

  // Render main app if context is valid
  return (
    <QueryBuilderProvider>
      <div className="App h-screen overflow-hidden">
        <MainLayout />
      </div>
    </QueryBuilderProvider>
  );
}

export default App;
