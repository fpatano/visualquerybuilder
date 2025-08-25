import React from 'react';
import { QueryBuilderProvider } from './contexts/QueryBuilderContext';
import MainLayout from './components/layout/MainLayout';

function App() {
  React.useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    (async () => {
      try {
        await fetch('/api/warehouse/test', { method: 'POST', signal: controller.signal });
      } catch (_) {
        // ignore warm-up errors
      } finally {
        clearTimeout(timeoutId);
      }
    })();
    return () => controller.abort();
  }, []);

  return (
    <QueryBuilderProvider>
      <div className="App h-screen overflow-hidden">
        <MainLayout />
      </div>
    </QueryBuilderProvider>
  );
}

export default App;
