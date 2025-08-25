import React from 'react';
import { Database, Play, Settings, Square, Upload, Download } from 'lucide-react';
import { useQueryBuilder } from '../../contexts/QueryBuilderContext';

const Header: React.FC = () => {
  const { state, dispatch, executeQuery, cancelQuery, applySqlToCanvas } = useQueryBuilder();

  const handleImportSql = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sql';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target?.result as string;
          dispatch({ type: 'UPDATE_SQL', payload: content || '' });
          // Also apply to canvas immediately
          applySqlToCanvas(content || '');
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExportSql = () => {
    const sql = state.sqlQuery || '';
    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query.sql';
    a.click();
    URL.revokeObjectURL(url);
  };
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
          onClick={handleImportSql}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-databricks-dark-gray hover:text-databricks-blue transition-colors"
          title="Import SQL (.sql)"
        >
          <Upload className="w-4 h-4" />
          <span>Import</span>
        </button>
        
        <button
          onClick={handleExportSql}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-databricks-dark-gray hover:text-databricks-blue transition-colors"
          title="Export SQL (.sql)"
        >
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
        
        <div className="w-px h-6 bg-databricks-medium-gray" />
        
        <button
          onClick={() => executeQuery(true)}
          className="flex items-center space-x-2 databricks-button"
          title="Execute Query"
        >
          <Play className="w-4 h-4" />
          <span>Run Query</span>
        </button>
        <button
          onClick={() => cancelQuery?.()}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-databricks-dark-gray hover:text-red-600 transition-colors border border-databricks-medium-gray rounded"
          title="Cancel running query"
        >
          <Square className="w-4 h-4" />
          <span>Cancel</span>
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
