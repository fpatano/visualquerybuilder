import React, { useState, useCallback } from 'react';
import { Download, Maximize2, AlertCircle, RefreshCw, Brain, Bot } from 'lucide-react';
import { useQueryBuilder } from '../../contexts/QueryBuilderContext';
import { AISummaryError } from '../../types/aiSummary';

const QueryPreview: React.FC = () => {
  const { state, generateAISummary } = useQueryBuilder();
  const { queryResult, sqlQuery, aiSummary } = state;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const handleExport = useCallback(() => {
    if (!queryResult || queryResult.error) return;
    
    // Create CSV content
    const csvContent = [
      queryResult.columns.join(','),
      ...queryResult.rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_results_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }, [queryResult]);

  const handleRefreshSummary = useCallback(async () => {
    if (!sqlQuery.trim()) return;
    
    setIsGeneratingSummary(true);
    try {
      await generateAISummary();
    } catch (error) {
      console.error('Failed to refresh AI summary:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [sqlQuery, generateAISummary]);

  const renderStatusIndicator = () => {
    if (!queryResult) return null;
    
    if (queryResult.error) {
      return (
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Query Failed</span>
        </div>
      );
    }
    
    return (
      <div className="flex items-center space-x-2 text-green-600">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium">Query Completed</span>
      </div>
    );
  };

  const renderQueryStats = () => {
    if (!queryResult) return null;
    
    return (
      <div className="flex items-center space-x-4 text-sm text-databricks-dark-gray">
        {queryResult.executionTime > 0 && (
          <span>Execution Time: {queryResult.executionTime.toFixed(2)}ms</span>
        )}
        {queryResult.rowCount !== undefined && (
          <span>Rows: {queryResult.rowCount}</span>
        )}
        {queryResult.metadata?.isPreview && (
          <span className="text-orange-600">Preview Mode (100 rows)</span>
        )}
      </div>
    );
  };

  const renderAISummary = () => {
    if (!sqlQuery.trim()) return null;

    if (isGeneratingSummary) {
      return (
        <div className="p-4 border-b border-databricks-medium-gray">
          <div className="flex items-center space-x-2 text-blue-600">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">🤖 AI is thinking...</span>
          </div>
        </div>
      );
    }

    if (aiSummary) {
      return (
        <div className="p-4 border-b border-databricks-medium-gray">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-blue-700 mb-2 flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              AI Query Summary
            </h4>
            <button
              onClick={handleRefreshSummary}
              className="p-1 text-blue-600 hover:text-blue-800 transition-colors"
              title="Refresh AI summary"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
          <div className="text-sm text-blue-800 bg-blue-50 p-3 rounded-lg">
            {aiSummary.summary}
          </div>
          <div className="text-xs text-blue-600 mt-2">
            Generated at {new Date(aiSummary.timestamp).toLocaleTimeString()}
          </div>
        </div>
      );
    }

    // Show error state with funny message
    if (aiSummary === null && queryResult?.error) {
      return (
        <div className="p-4 border-b border-databricks-medium-gray">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center">
              <Bot className="w-4 h-4 mr-2" />
              AI Summary Failed
            </h4>
            <button
              onClick={handleRefreshSummary}
              className="p-1 text-red-600 hover:text-red-800 transition-colors"
              title="Retry AI summary"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-lg">🤖 X_X</span>
              <span className="font-medium">Oops! My circuits got a bit tangled!</span>
            </div>
            <p>Let me reboot my humor module and try again!</p>
          </div>
        </div>
      );
    }

    // Show initial state
    return (
      <div className="p-4 border-b border-databricks-medium-gray">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
            <Brain className="w-4 h-4 mr-2" />
            AI Query Summary
          </h4>
          <button
            onClick={handleRefreshSummary}
            className="p-1 text-gray-600 hover:text-gray-800 transition-colors"
            title="Generate AI summary"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🤖</span>
            <span>Click the refresh button to generate an AI summary of your query!</span>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (!queryResult) {
      return (
        <div className="flex-1 flex items-center justify-center text-databricks-dark-gray">
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-lg font-medium">No query results yet</p>
            <p className="text-sm">Execute a query to see results here</p>
          </div>
        </div>
      );
    }

    if (queryResult.error) {
      return (
        <div className="flex-1 flex items-center justify-center text-red-600">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mb-4 mx-auto" />
            <p className="text-lg font-medium">Query Failed</p>
            <p className="text-sm">{queryResult.error}</p>
          </div>
        </div>
      );
    }

    if (queryResult.rows.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-databricks-dark-gray">
          <div className="text-center">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-lg font-medium">No results found</p>
            <p className="text-sm">The query executed successfully but returned no rows</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-auto">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-databricks-medium-gray">
            <thead className="bg-databricks-light-gray">
              <tr>
                {queryResult.columns.map((column, index) => (
                  <th
                    key={index}
                    className="px-3 py-2 text-left text-xs font-medium text-databricks-dark-gray uppercase tracking-wider"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-databricks-medium-gray">
              {queryResult.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-databricks-light-gray">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-3 py-2 whitespace-nowrap text-sm text-databricks-dark-gray"
                    >
                      {cell !== null && cell !== undefined ? String(cell) : 'NULL'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-databricks-medium-gray">
      {/* Header */}
      <div className="p-4 border-b border-databricks-medium-gray">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-medium text-databricks-dark-blue">Query Results</h3>
          
          <div className="flex items-center space-x-2">
            {queryResult && !queryResult.error && (
              <>
                <button
                  onClick={handleExport}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm text-databricks-dark-gray hover:text-databricks-blue transition-colors"
                  title="Export results as CSV (.csv)"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
              </>
            )}
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 text-databricks-dark-gray hover:text-databricks-blue transition-colors"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          {renderStatusIndicator()}
          {renderQueryStats()}
        </div>
      </div>

      {/* AI Summary Section */}
      {renderAISummary()}

      {/* Content */}
      {renderContent()}

      {/* Footer */}
      {queryResult && !queryResult.error && (
        <div className="px-4 py-2 bg-databricks-light-gray border-t border-databricks-medium-gray">
          <div className="flex items-center justify-between text-xs text-databricks-dark-gray">
            <span>
              Showing {Math.min(queryResult.rowCount, queryResult.rows.length)} of {queryResult.rowCount} rows
            </span>
            <span>
              Results auto-refresh when query changes
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryPreview;
