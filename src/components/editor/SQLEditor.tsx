import React, { useState, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Copy, Download, Upload, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { useQueryBuilder } from '../../contexts/QueryBuilderContext';

const SQLEditor: React.FC = () => {
  const { state, dispatch, executeQuery, cancelQuery, applySqlToCanvas } = useQueryBuilder();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
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
        // Disabled for now to avoid blocking UI - this should happen in applySqlToCanvas
        // try {
        //   const parsedQuery = await parseSQL(value);
        //   // Update query state based on parsed SQL
        // } catch (error) {
        //   console.warn('SQL parsing failed:', error);
        // }
      }
    },
    [state.sqlQuery, dispatch]
  );

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      // Manual run from editor: use preview unless the user confirms full
      await executeQuery(true);
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

  const handleSyncToCanvas = async () => {
    if (!state.sqlQuery.trim()) {
      alert('Please enter a SQL query before syncing to canvas.');
      return;
    }
    
    setIsSyncing(true);
    try {
      console.log('🔄 Initiating manual sync to canvas from SQL Editor');
      await applySqlToCanvas(state.sqlQuery);
      console.log('✅ Manual sync to canvas completed');
    } catch (error) {
      console.error('❌ Manual sync to canvas failed:', error);
      // The applySqlToCanvas function will handle showing the user error message
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEditorBlur = useCallback(async () => {
    // Auto-sync when user clicks away from editor (if there's SQL content)
    if (state.sqlQuery.trim() && !isSyncing) {
      setIsSyncing(true);
      try {
        await applySqlToCanvas(state.sqlQuery);
      } catch (error) {
        console.error('Failed to auto-sync SQL to canvas:', error);
      } finally {
        setIsSyncing(false);
      }
    }
  }, [state.sqlQuery, isSyncing, applySqlToCanvas]);

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
          {/* Sync to Canvas Button */}
          <button
            onClick={handleSyncToCanvas}
            disabled={!state.sqlQuery.trim() || isSyncing}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-databricks-blue text-white rounded hover:bg-databricks-dark-blue disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Sync SQL to visual canvas"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync to Canvas'}</span>
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
          onMount={(editor) => {
            handleEditorDidMount(editor);
            // Add blur handler for auto-sync
            editor.onDidBlurEditorText(handleEditorBlur);
          }}
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
