import React from 'react';
import { QueryBuilderProvider } from './contexts/QueryBuilderContext';
import MainLayout from './components/layout/MainLayout';

function App() {
  return (
    <QueryBuilderProvider>
      <div className="App h-screen overflow-hidden">
        <MainLayout />
      </div>
    </QueryBuilderProvider>
  );
}

export default App;
