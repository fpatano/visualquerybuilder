import React, { useState, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Copy, Download, Upload, Maximize2, Minimize2 } from 'lucide-react';
import { useQueryBuilder } from '../../contexts/QueryBuilderContext';
import { parseSQL } from '../../utils/sqlGenerator';

const SQLEditor: React.FC = () => {
  const { state, dispatch, executeQuery, cancelQuery } = useQueryBuilder();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const editorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    
    // Configure editor options
    editor.updateOptions({
      fontSize: 14,
      lineNumbers: 'on',
      minimap: { enabled: false },
      wordWrap: 'on',
      theme: 'vs-light',
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });

    // Add SQL syntax highlighting and autocomplete
    editor.getModel()?.updateOptions({ tabSize: 2 });
  };

  const handleSQLChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined && value !== state.sqlQuery) {
        dispatch({ type: 'UPDATE_SQL', payload: value });
        
        // Parse SQL and update canvas (simplified implementation)
        try {
          const parsedQuery = parseSQL(value);
          // Update query state based on parsed SQL
          // This is a placeholder - implement proper SQL parsing
        } catch (error) {
          console.warn('SQL parsing failed:', error);
        }
      }
    },
    [state.sqlQuery, dispatch]
  );

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      // Allow full query execution when manually triggered from SQL Editor
      await executeQuery(false); // false = not preview mode = no auto LIMIT
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCancel = () => {
    cancelQuery?.();
  };

  const handleCopy = () => {
    if (state.sqlQuery) {
      navigator.clipboard.writeText(state.sqlQuery);
      // You could add a toast notification here
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sql';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          dispatch({ type: 'UPDATE_SQL', payload: content });
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExport = () => {
    if (state.sqlQuery) {
      const blob = new Blob([state.sqlQuery], { type: 'text/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'query.sql';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`bg-white border-t border-databricks-medium-gray flex flex-col ${
      isFullscreen ? 'fixed inset-0 z-50' : 'h-full'
    }`}>
      {/* SQL Editor Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-databricks-medium-gray bg-databricks-light-gray">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-databricks-dark-blue">SQL Editor</h3>
          {state.isExecuting && (
            <div className="flex items-center space-x-2 text-databricks-blue">
              <div className="w-4 h-4 border-2 border-databricks-blue border-t-transparent rounded-full animate-spin" />
              <span className="text-sm">Executing...</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleImport}
            className="flex items-center space-x-1 px-3 py-1.5 text-sm text-databricks-dark-gray hover:text-databricks-blue transition-colors"
            title="Import SQL file"
          >
            <Upload className="w-4 h-4" />
            <span>Import</span>
          </button>
          
          <button
            onClick={handleExport}
            className="flex items-center space-x-1 px-3 py-1.5 text-sm text-databricks-dark-gray hover:text-databricks-blue transition-colors"
            title="Export SQL file"
            disabled={!state.sqlQuery.trim()}
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-3 py-1.5 text-sm text-databricks-dark-gray hover:text-databricks-blue transition-colors"
            title="Copy SQL to clipboard"
            disabled={!state.sqlQuery.trim()}
          >
            <Copy className="w-4 h-4" />
            <span>Copy</span>
          </button>
          
          <div className="w-px h-6 bg-databricks-medium-gray" />
          
          <button
            onClick={handleExecute}
            disabled={!state.sqlQuery.trim() || isExecuting}
            className="flex items-center space-x-2 databricks-button disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            <span>{isExecuting ? 'Running...' : 'Run'}</span>
          </button>

          <button
            onClick={handleCancel}
            disabled={!isExecuting}
            className="flex items-center space-x-2 databricks-button disabled:opacity-50 disabled:cursor-not-allowed"
            title="Cancel running query"
          >
            <span>Cancel</span>
          </button>
          
          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-databricks-dark-gray hover:text-databricks-blue transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 relative">
        <Editor
          height="100%"
          defaultLanguage="sql"
          value={state.sqlQuery}
          onChange={handleSQLChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 14,
            lineNumbers: 'on',
            minimap: { enabled: false },
            wordWrap: 'on',
            theme: 'vs-light',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            suggest: {
              showKeywords: true,
              showSnippets: true,
              showFunctions: true,
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false,
            },
          }}
          theme="vs-light"
        />
        
        {!state.sqlQuery.trim() && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-databricks-dark-gray/50">
              <p className="text-lg mb-2">SQL will appear here as you build your query</p>
              <p className="text-sm">You can also type SQL directly to update the visual canvas</p>
            </div>
          </div>
        )}
      </div>

      {/* SQL Editor Footer */}
      <div className="px-4 py-2 bg-databricks-light-gray border-t border-databricks-medium-gray">
        <div className="flex items-center justify-between text-xs text-databricks-dark-gray">
          <div className="flex items-center space-x-4">
            <span>Language: SQL</span>
            <span>Lines: {state.sqlQuery.split('\n').length}</span>
            <span>Characters: {state.sqlQuery.length}</span>
          </div>
          
          {state.queryResult && (
            <div className="flex items-center space-x-4">
              {state.queryResult.error ? (
                <span className="text-red-600">Error in query</span>
              ) : (
                <>
                  <span>Rows: {state.queryResult.rowCount}</span>
                  <span>Time: {Math.round(state.queryResult.executionTime)}ms</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SQLEditor;
