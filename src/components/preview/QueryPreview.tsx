import React, { useState } from 'react';
import { Play, Table, BarChart3, Download, Maximize2, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useQueryBuilder } from '../../contexts/QueryBuilderContext';
import ResultsTable from './ResultsTable';
import ResultsChart from './ResultsChart';

type ViewMode = 'table' | 'chart';

const QueryPreview: React.FC = () => {
  const { state, executeQuery } = useQueryBuilder();
  const { queryResult, isExecuting, sqlQuery } = state;
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExecute = async () => {
    // Use preview mode for QueryPreview to prevent timeouts
    await executeQuery(true); // true = preview mode = auto LIMIT applied
  };

  const handleExport = () => {
    if (!queryResult || queryResult.error) return;

    // Convert to CSV
    const headers = queryResult.columns.join(',');
    const rows = queryResult.rows.map(row => 
      row.map(cell => 
        typeof cell === 'string' && cell.includes(',') 
          ? `"${cell.replace(/"/g, '""')}"` 
          : cell
      ).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderStatusIndicator = () => {
    if (isExecuting) {
      return (
        <div className="flex items-center space-x-2 text-databricks-blue">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Executing query...</span>
        </div>
      );
    }

    if (!queryResult) {
      return (
        <div className="flex items-center space-x-2 text-databricks-dark-gray">
          <Clock className="w-4 h-4" />
          <span className="text-sm">Ready to execute</span>
        </div>
      );
    }

    if (queryResult.error) {
      return (
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Query failed</span>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 text-green-600">
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm">Query completed</span>
      </div>
    );
  };

  const renderQueryStats = () => {
    if (!queryResult || queryResult.error) return null;

    return (
      <div className="flex items-center space-x-4 text-xs text-databricks-dark-gray">
        <span>{queryResult.rowCount} rows</span>
        <span>{Math.round(queryResult.executionTime)}ms</span>
        <span>{queryResult.columns.length} columns</span>
        {queryResult.metadata?.requestId && (
          <span className="opacity-70">req: {queryResult.metadata.requestId}</span>
        )}
        {queryResult.metadata?.isPreview && (
          <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded text-xs">
            Preview (LIMIT {queryResult.metadata.limitApplied})
          </span>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (isExecuting) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-databricks-blue animate-spin mx-auto mb-3" />
            <p className="text-sm text-databricks-dark-gray">Executing query...</p>
            <p className="text-xs text-databricks-dark-gray/70 mt-1">
              This may take a few moments
            </p>
          </div>
        </div>
      );
    }

    if (!queryResult) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-databricks-dark-gray">
            <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-1">No results yet</p>
            <p className="text-xs opacity-70">
              {sqlQuery.trim() ? 'Click "Run" in SQL Editor to execute query' : 'Build a query to see results'}
            </p>
          </div>
        </div>
      );
    }

    if (queryResult.error) {
      return (
        <div className="flex-1 p-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-800 mb-1">Query Error</h4>
                <p className="text-sm text-red-700 whitespace-pre-wrap">{queryResult.error}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (viewMode === 'table') {
      return <ResultsTable queryResult={queryResult} />;
    } else {
      return <ResultsChart queryResult={queryResult} />;
    }
  };

  return (
    <div className={`bg-white flex flex-col ${isExpanded ? 'fixed inset-0 z-50' : 'h-full'}`}>
      {/* Header */}
      <div className="p-4 border-b border-databricks-medium-gray">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-databricks-dark-blue">
            Query Results
          </h3>
          
          <div className="flex items-center space-x-2">
            {queryResult && !queryResult.error && (
              <>
                <button
                  onClick={handleExport}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm text-databricks-dark-gray hover:text-databricks-blue transition-colors"
                  title="Export results as CSV"
                >
                  <Download className="w-4 h-4" />
                  <span>Export</span>
                </button>
                
                <div className="flex bg-databricks-light-gray rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`flex items-center space-x-1 px-2 py-1 text-xs rounded transition-colors ${
                      viewMode === 'table' 
                        ? 'bg-white text-databricks-blue shadow-sm' 
                        : 'text-databricks-dark-gray hover:text-databricks-blue'
                    }`}
                  >
                    <Table className="w-3 h-3" />
                    <span>Table</span>
                  </button>
                  <button
                    onClick={() => setViewMode('chart')}
                    className={`flex items-center space-x-1 px-2 py-1 text-xs rounded transition-colors ${
                      viewMode === 'chart' 
                        ? 'bg-white text-databricks-blue shadow-sm' 
                        : 'text-databricks-dark-gray hover:text-databricks-blue'
                    }`}
                  >
                    <BarChart3 className="w-3 h-3" />
                    <span>Chart</span>
                  </button>
                </div>
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
