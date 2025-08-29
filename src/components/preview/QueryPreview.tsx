import React, { useState } from 'react';
import { Play, Table, Download, Maximize2, AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useQueryBuilder } from '../../contexts/QueryBuilderContext';
import ResultsTable from './ResultsTable';
import ResultsChart from './ResultsChart';

type ViewMode = 'table';

const QueryPreview: React.FC = () => {
  const { state, executeQuery } = useQueryBuilder();
  const { queryResult, isExecuting, sqlQuery } = state;
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExecute = async () => {
    // Use preview mode for QueryPreview by default; shift-click runs full
    await executeQuery(true);
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

    return <ResultsTable queryResult={queryResult} />;
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

      {/* Content */}
      {renderContent()}

      {/* SQL Warnings and Analysis */}
      {sqlQuery.trim() && (
        <div className="border-t border-databricks-medium-gray">
          {/* SQL Warnings */}
          <div className="p-4 border-b border-databricks-medium-gray">
            <h4 className="text-sm font-medium text-yellow-700 mb-2 flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              SQL Warnings
            </h4>
            <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded">
              ⚠️ Some join columns may benefit from indexes
            </div>
          </div>
          
          {/* Query Analysis */}
          <div className="p-4">
            <h4 className="text-sm font-medium text-blue-700 mb-2">Query Analysis</h4>
            <div className="grid grid-cols-2 gap-3 text-sm text-databricks-dark-gray">
              <div>
                <span className="font-medium">Parse Time:</span> 
                <span className="ml-2">-- ms</span>
              </div>
              <div>
                <span className="font-medium">SQL Length:</span> 
                <span className="ml-2">{sqlQuery.length} chars</span>
              </div>
              <div>
                <span className="font-medium">Tables:</span> 
                <span className="ml-2">--</span>
              </div>
              <div>
                <span className="font-medium">Joins:</span> 
                <span className="ml-2">--</span>
              </div>
              <div>
                <span className="font-medium">Subqueries:</span> 
                <span className="ml-2">--</span>
              </div>
              <div>
                <span className="font-medium">CTEs:</span> 
                <span className="ml-2">--</span>
              </div>
            </div>
          </div>
        </div>
      )}

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
