import React, { useState } from 'react';
import EnhancedVisualCanvas from '../canvas/EnhancedVisualCanvas';
import EnhancedSQLEditor from '../editor/EnhancedSQLEditor';
import CatalogExplorer from '../catalog/CatalogExplorer';
import ProfilingPane from '../profiling/ProfilingPane';
import QueryPreview from '../preview/QueryPreview';
import Header from './Header';
import { useQueryBuilder } from '../../contexts/QueryBuilderContext';

const MainLayout: React.FC = () => {
  const [activeView, setActiveView] = useState<'canvas' | 'editor' | 'split'>('split');
  const [rightPanelHeights, setRightPanelHeights] = useState({ profiling: 50, results: 50 }); // Default to 50/50
  const [isDragging, setIsDragging] = useState(false);
  const { state, dispatch, executeQuery } = useQueryBuilder();

  // Handle SQL query changes from the editor
  const handleQueryChange = (sql: string) => {
    dispatch({ type: 'UPDATE_SQL', payload: sql });
  };

  // Handle query execution from the editor
  const handleExecuteQuery = async (sql: string) => {
    if (executeQuery) {
      await executeQuery(true); // true for preview mode
    }
  };

  // Handle right panel resizing
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    const container = e.currentTarget.parentElement;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    const profilingHeight = (y / height) * 100;
    const resultsHeight = 100 - profilingHeight;
    
    // Clamp heights between 20% and 80%
    if (profilingHeight >= 20 && profilingHeight <= 80) {
      setRightPanelHeights({ profiling: profilingHeight, results: resultsHeight });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add global mouse event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const container = document.querySelector('.right-sidebar');
        if (!container) return;
        
        const rect = container.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const height = rect.height;
        const profilingHeight = (y / height) * 100;
        const resultsHeight = 100 - profilingHeight;
        
        if (profilingHeight >= 20 && profilingHeight <= 80) {
          setRightPanelHeights({ profiling: profilingHeight, results: resultsHeight });
        }
      };
      
      const handleGlobalMouseUp = () => {
        setIsDragging(false);
      };
      
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div className="h-screen flex flex-col bg-databricks-light-gray">
      <Header />
      
      {/* View Toggle */}
      <div className="bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('canvas')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              activeView === 'canvas' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Visual Canvas
          </button>
          <button
            onClick={() => setActiveView('editor')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              activeView === 'editor' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            SQL Editor
          </button>
          <button
            onClick={() => setActiveView('split')}
            className={`px-3 py-1 text-sm rounded transition-colors ${
              activeView === 'split' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Split View
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Catalog Explorer */}
        <div className="w-80 sidebar-panel">
          <CatalogExplorer />
        </div>
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {activeView === 'canvas' && (
            <div className="flex-1 canvas-area">
              <EnhancedVisualCanvas />
            </div>
          )}
          
          {activeView === 'editor' && (
            <div className="flex-1">
              <EnhancedSQLEditor 
                onQueryChange={handleQueryChange}
                onExecuteQuery={handleExecuteQuery}
              />
            </div>
          )}
          
          {activeView === 'split' && (
            <>
              {/* Visual Canvas */}
              <div className="flex-1 canvas-area">
                <EnhancedVisualCanvas />
              </div>
              
              {/* SQL Editor */}
              <div className="h-64 sql-editor">
                <EnhancedSQLEditor 
                  onQueryChange={handleQueryChange}
                  onExecuteQuery={handleExecuteQuery}
                />
              </div>
            </>
          )}
        </div>
        
        {/* Right Sidebar - Profiling & Preview */}
        <div className="w-96 flex flex-col right-sidebar">
          {/* Data Profiling Pane */}
          <div 
            className="preview-pane border-b"
            style={{ height: `${rightPanelHeights.profiling}%` }}
          >
            <ProfilingPane />
          </div>
          
          {/* Drag Handle */}
          <div 
            className="h-1 bg-gray-300 cursor-ns-resize hover:bg-blue-400 transition-colors flex items-center justify-center"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            <div className="w-8 h-0.5 bg-gray-400 rounded"></div>
          </div>
          
          {/* Query Preview */}
          <div 
            className="preview-pane"
            style={{ height: `${rightPanelHeights.results}%` }}
          >
            <QueryPreview />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
