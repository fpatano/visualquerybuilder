import React from 'react';
import CatalogExplorer from '../catalog/CatalogExplorer';
import VisualCanvas from '../canvas/VisualCanvas';
import SQLEditor from '../editor/SQLEditor';
import ProfilingPane from '../profiling/ProfilingPane';
import QueryPreview from '../preview/QueryPreview';
import Header from './Header';

const MainLayout: React.FC = () => {
  return (
    <div className="h-screen flex flex-col bg-databricks-light-gray">
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Catalog Explorer */}
        <div className="w-80 sidebar-panel">
          <CatalogExplorer />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Visual Canvas */}
          <div className="flex-1 canvas-area">
            <VisualCanvas />
          </div>
          
          {/* SQL Editor */}
          <div className="h-64 sql-editor">
            <SQLEditor />
          </div>
        </div>
        
        {/* Right Sidebar - Profiling & Preview */}
        <div className="w-96 flex flex-col">
          {/* Data Profiling Pane */}
          <div className="h-1/2 preview-pane border-b">
            <ProfilingPane />
          </div>
          
          {/* Query Preview */}
          <div className="h-1/2 preview-pane">
            <QueryPreview />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
