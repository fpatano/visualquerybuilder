import React from 'react';
import { Database, Play, Download, Upload, Settings } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-databricks-medium-gray px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Database className="w-8 h-8 text-databricks-orange" />
          <h1 className="text-2xl font-bold text-databricks-dark-blue">
            Visual SQL Query Builder
          </h1>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <button
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-databricks-dark-gray hover:text-databricks-blue transition-colors"
          title="Import SQL"
        >
          <Upload className="w-4 h-4" />
          <span>Import</span>
        </button>
        
        <button
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-databricks-dark-gray hover:text-databricks-blue transition-colors"
          title="Export SQL"
        >
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
        
        <div className="w-px h-6 bg-databricks-medium-gray" />
        
        <button
          className="flex items-center space-x-2 databricks-button"
          title="Execute Query"
        >
          <Play className="w-4 h-4" />
          <span>Run Query</span>
        </button>
        
        <button
          className="p-2 text-databricks-dark-gray hover:text-databricks-blue transition-colors"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
