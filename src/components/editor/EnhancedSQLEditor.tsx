/**
 * Enhanced SQL Editor - Modern SQL editor with advanced features
 * 
 * Features:
 * - Monaco Editor integration
 * - Real-time syntax highlighting
 * - SQL validation and error reporting
 * - Auto-completion and IntelliSense
 * - Query execution and results display
 * - Query history and favorites
 * - Performance analysis
 * - Export/Import functionality
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useQueryBuilder } from '../../contexts/QueryBuilderContext';
import { EnhancedSQLParser } from '../../utils/sql-transpiler/enhanced-parser-simple';
import { generateSQLWithMetadata } from '../../utils/sql-transpiler/sql-generator';

interface EnhancedSQLEditorProps {
  className?: string;
  onQueryChange?: (sql: string) => void;
  onExecuteQuery?: (sql: string) => void;
}

interface QueryResult {
  success: boolean;
  data?: any[];
  error?: string;
  executionTime?: number;
  rowCount?: number;
}

interface QueryHistoryItem {
  id: string;
  sql: string;
  timestamp: Date;
  executionTime?: number;
  success: boolean;
}

const EnhancedSQLEditor: React.FC<EnhancedSQLEditorProps> = ({
  className = '',
  onQueryChange,
  onExecuteQuery
}) => {
  const { state, dispatch, applySqlToCanvas } = useQueryBuilder();
  const [sql, setSql] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [parserMetadata, setParserMetadata] = useState<any>(null);

  // Refs
  const editorRef = useRef<any>(null);
  const sqlParserRef = useRef<EnhancedSQLParser | null>(null);

  // Initialize SQL parser
  useEffect(() => {
    if (!sqlParserRef.current) {
      sqlParserRef.current = new EnhancedSQLParser({
        dialect: 'mysql',
        debugMode: false,
        logLevel: 'info'
      });
    }
  }, []);

  // Generate SQL from canvas state
  useEffect(() => {
    if (state.tables.length > 0) {
      try {
        const result = generateSQLWithMetadata(state, {
          dialect: 'mysql',
          formatOutput: true,
          useTableAliases: true,
          optimizeJoins: true
        });
        
        setSql(result.sql);
        setValidationWarnings(result.warnings);
        setParserMetadata(result.metadata);
        
        if (onQueryChange) {
          onQueryChange(result.sql);
        }
      } catch (error) {
        console.error('SQL generation failed:', error);
        setValidationErrors([`SQL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      }
    }
  }, [state, onQueryChange]);

  // Sync with QueryBuilder context SQL state
  useEffect(() => {
    if (state.sqlQuery && state.sqlQuery !== sql) {
      setSql(state.sqlQuery);
      if (editorRef.current) {
        editorRef.current.setValue(state.sqlQuery);
      }
    }
  }, [state.sqlQuery, sql]);

  // Handle SQL input changes
  const handleSQLChange = useCallback((value: string | undefined) => {
    const sqlValue = value || '';
    setSql(sqlValue);
    
    if (onQueryChange) {
      onQueryChange(sqlValue);
    }

    // Clear previous validation results
    setValidationErrors([]);
    setValidationWarnings([]);
    setParserMetadata(null);

    // Validate SQL if it's not empty
    if (sqlValue.trim() && sqlParserRef.current) {
      try {
        const parseResult = sqlParserRef.current.parseSQL(sqlValue);
        
        if (parseResult.success) {
          setValidationWarnings(parseResult.warnings);
          setParserMetadata(parseResult.metadata);
          
          // Convert parsed SQL to canvas state
          if (parseResult.data) {
            // Load query state - you might need to implement this action type
            // dispatch({ type: 'LOAD_QUERY_STATE', payload: parseResult.data });
          }
        } else {
          setValidationErrors(parseResult.errors);
        }
      } catch (error) {
        setValidationErrors([`SQL parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      }
    }
  }, [onQueryChange, dispatch]);

  // Import SQL from file
  const handleImportSQL = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sql';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          setSql(content);
          if (editorRef.current) {
            editorRef.current.setValue(content);
          }
          // Update the QueryBuilder context
          dispatch({ type: 'UPDATE_SQL', payload: content });
          if (onQueryChange) {
            onQueryChange(content);
          }
          applySqlToCanvas(content); // Apply SQL to canvas after import
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [onQueryChange, dispatch, applySqlToCanvas]);

  // Export SQL to file
  const handleExportSQL = useCallback(() => {
    if (sql.trim()) {
      const blob = new Blob([sql], { type: 'text/sql' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `query_${Date.now()}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [sql]);

  // Execute SQL query
  const handleExecuteQuery = useCallback(async () => {
    if (!sql.trim()) {
      setValidationErrors(['Please enter a SQL query to execute']);
      return;
    }

    setIsExecuting(true);
    const startTime = performance.now();

    try {
      // Add to query history
      const historyItem: QueryHistoryItem = {
        id: `query_${Date.now()}`,
        sql: sql,
        timestamp: new Date(),
        success: false
      };

      // Execute query (this would integrate with your Databricks API)
      if (onExecuteQuery) {
        onExecuteQuery(sql);
      }

      // Simulate query execution for demo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const executionTime = performance.now() - startTime;
      
      // Update history item
      historyItem.executionTime = executionTime;
      historyItem.success = true;
      
      setQueryHistory(prev => [historyItem, ...prev.slice(0, 49)]); // Keep last 50 queries
      
      // Show success result
      setQueryResult({
        success: true,
        data: [], // This would contain actual query results
        executionTime,
        rowCount: 0
      });

    } catch (error) {
      const executionTime = performance.now() - startTime;
      
      // Update history item
      const historyItem: QueryHistoryItem = {
        id: `query_${Date.now()}`,
        sql: sql,
        timestamp: new Date(),
        executionTime,
        success: false
      };
      
      setQueryHistory(prev => [historyItem, ...prev.slice(0, 49)]);
      
      setQueryResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime
      });
    } finally {
      setIsExecuting(false);
    }
  }, [sql, onExecuteQuery]);

  // Format SQL
  const handleFormatSQL = useCallback(() => {
    if (sql.trim() && sqlParserRef.current) {
      try {
        const parseResult = sqlParserRef.current.parseSQL(sql);
        if (parseResult.success && parseResult.data) {
          const formattedSQL = generateSQLWithMetadata(parseResult.data as any, {
            dialect: 'mysql',
            formatOutput: true,
            useTableAliases: true,
            optimizeJoins: true
          });
          
          setSql(formattedSQL.sql);
          if (editorRef.current) {
            editorRef.current.setValue(formattedSQL.sql);
          }
        }
      } catch (error) {
        setValidationErrors([`SQL formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      }
    }
  }, [sql]);

  // Clear SQL
  const handleClearSQL = useCallback(() => {
    setSql('');
    setQueryResult(null);
    setValidationErrors([]);
    setValidationWarnings([]);
    setParserMetadata(null);
    
    if (editorRef.current) {
      editorRef.current.setValue('');
    }
  }, []);

  // Copy SQL to clipboard
  const handleCopySQL = useCallback(() => {
    if (sql.trim()) {
      navigator.clipboard.writeText(sql);
      // You could show a toast notification here
    }
  }, [sql]);

  // Load query from history
  const handleLoadFromHistory = useCallback((historyItem: QueryHistoryItem) => {
    setSql(historyItem.sql);
    if (editorRef.current) {
      editorRef.current.setValue(historyItem.sql);
    }
    setShowHistory(false);
  }, []);

  // Clear query history
  const handleClearHistory = useCallback(() => {
    if (confirm('Are you sure you want to clear all query history? This action cannot be undone.')) {
      setQueryHistory([]);
    }
  }, []);

  // Editor options
  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: 'on' as const,
    roundedSelection: false,
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: 'on' as const,
    folding: true,
    foldingStrategy: 'indentation' as const,
    showFoldingControls: 'always' as const,
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    parameterHints: { enabled: true },
    hover: { enabled: true },
    contextmenu: true,
    mouseWheelZoom: true,
    smoothScrolling: true,
    cursorBlinking: 'smooth' as const,
    cursorSmoothCaretAnimation: 'on' as const,
    renderWhitespace: 'selection' as const,
    renderControlCharacters: false,
    renderLineHighlight: 'all' as const,
    selectOnLineNumbers: true,
    glyphMargin: true,
    foldingHighlight: true,
    overviewRulerBorder: true,
    overviewRulerLanes: 0,
    scrollbar: {
      vertical: 'visible' as const,
      horizontal: 'visible' as const,
      verticalScrollbarSize: 12,
      horizontalScrollbarSize: 12,
      useShadows: false
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <h2 className="text-lg font-semibold text-gray-900">SQL Editor</h2>
          
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleFormatSQL}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            title="Format SQL"
          >
            Format
          </button>
          
          <button
            onClick={handleCopySQL}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            title="Copy SQL"
          >
            Copy
          </button>
          
          <button
            onClick={handleImportSQL}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            title="Import SQL"
          >
            Import
          </button>

          <button
            onClick={handleExportSQL}
            className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
            title="Export SQL"
          >
            Export
          </button>
          
          <button
            onClick={handleClearSQL}
            className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            title="Clear SQL"
          >
            Clear
          </button>
          
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            title="Query History"
          >
            History ({queryHistory.length})
          </button>
          
          <button
            onClick={handleExecuteQuery}
            disabled={isExecuting || !sql.trim()}
            className={`px-4 py-1 text-sm rounded transition-colors ${
              isExecuting || !sql.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
            title="Execute Query"
          >
            {isExecuting ? 'Executing...' : 'Execute'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* SQL Editor */}
        <div className="flex-1 flex flex-col">
          {/* Editor */}
          <div className="flex-1">
            <Editor
              // ref={editorRef}
              height="100%"
              defaultLanguage="sql"
              value={sql}
              onChange={handleSQLChange}
              options={editorOptions}
              theme="vs-dark"
              onMount={(editor) => {
                editorRef.current = editor;
              }}
            />
          </div>

          {/* Validation Panel */}
          {(validationErrors.length > 0 || validationWarnings.length > 0 || parserMetadata) && (
            <div className="border-t border-gray-200 bg-gray-50 p-4">
              {validationErrors.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-red-700 mb-2">Errors</h4>
                  <div className="space-y-1">
                    {validationErrors.map((error, index) => (
                      <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        ❌ {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {validationWarnings.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-yellow-700 mb-2">Warnings</h4>
                  <div className="space-y-1">
                    {validationWarnings.map((warning, index) => (
                      <div key={index} className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                        ⚠️ {warning}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {parserMetadata && (
                <div>
                  <h4 className="text-sm font-medium text-blue-700 mb-2">Query Analysis</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Parse Time:</span> {parserMetadata.parseTime?.toFixed(2)}ms
                    </div>
                    <div>
                      <span className="font-medium">SQL Length:</span> {parserMetadata.sqlLength} chars
                    </div>
                    <div>
                      <span className="font-medium">Tables:</span> {parserMetadata.complexity?.tableCount || 0}
                    </div>
                    <div>
                      <span className="font-medium">Joins:</span> {parserMetadata.complexity?.joinCount || 0}
                    </div>
                    <div>
                      <span className="font-medium">Subqueries:</span> {parserMetadata.complexity?.subqueryCount || 0}
                    </div>
                    <div>
                      <span className="font-medium">CTEs:</span> {parserMetadata.complexity?.cteCount || 0}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Query History Sidebar */}
        {showHistory && (
          <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Query History</h3>
                <button
                  onClick={handleClearHistory}
                  className="text-sm text-red-600 hover:text-red-800"
                  title="Clear all history"
                >
                  Clear All
                </button>
              </div>
            </div>
            
            <div className="p-4 space-y-3">
              {queryHistory.length === 0 ? (
                <p className="text-gray-500 text-sm">No queries in history</p>
              ) : (
                queryHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleLoadFromHistory(item)}
                  >
                    <div className="text-sm font-mono text-gray-800 mb-2 line-clamp-3">
                      {item.sql}
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{item.timestamp.toLocaleTimeString()}</span>
                      <span className={`px-2 py-1 rounded ${
                        item.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {item.success ? 'Success' : 'Failed'}
                      </span>
                      {item.executionTime && (
                        <span>{item.executionTime.toFixed(0)}ms</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Query Results */}
      {queryResult && (
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Query Results</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              {queryResult.executionTime && (
                <span>Execution Time: {queryResult.executionTime.toFixed(2)}ms</span>
              )}
              {queryResult.rowCount !== undefined && (
                <span>Rows: {queryResult.rowCount}</span>
              )}
            </div>
          </div>

          {queryResult.success ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    Query executed successfully
                  </p>
                  {queryResult.data && queryResult.data.length === 0 && (
                    <p className="text-sm text-green-700 mt-1">
                      No results returned
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">
                    Query execution failed
                  </p>
                  {queryResult.error && (
                    <p className="text-sm text-red-700 mt-1">
                      {queryResult.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedSQLEditor;
