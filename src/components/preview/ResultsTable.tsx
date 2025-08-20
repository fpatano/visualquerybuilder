import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, ArrowUpDown } from 'lucide-react';
import { QueryResult } from '../../types';

interface ResultsTableProps {
  queryResult: QueryResult;
}

type SortDirection = 'asc' | 'desc' | null;

const ResultsTable: React.FC<ResultsTableProps> = ({ queryResult }) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);

  const { columns, rows } = queryResult;
  const MAX_COLUMNS = 50;
  const visibleColumns = useMemo(() => columns.slice(0, MAX_COLUMNS), [columns]);
  const hiddenCount = Math.max(0, columns.length - MAX_COLUMNS);

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = rows;

    // Apply search filter
    if (searchTerm) {
      filtered = rows.filter(row =>
        row.some(cell =>
          String(cell).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      const columnIndex = columns.indexOf(sortColumn);
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[columnIndex];
        const bVal = b[columnIndex];
        
        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortDirection === 'asc' ? -1 : 1;
        if (bVal == null) return sortDirection === 'asc' ? 1 : -1;
        
        // Compare values
        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [rows, columns, searchTerm, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = processedData.slice(startIndex, endIndex);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting
  };

  const renderSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-3 h-3 text-databricks-dark-gray/50" />;
    }
    
    if (sortDirection === 'asc') {
      return <ChevronUp className="w-3 h-3 text-databricks-blue" />;
    } else {
      return <ChevronDown className="w-3 h-3 text-databricks-blue" />;
    }
  };

  const formatCellValue = (value: any): string => {
    if (value == null) return '';
    if (typeof value === 'number') {
      // Format numbers with appropriate precision
      if (Number.isInteger(value)) {
        return value.toLocaleString();
      } else {
        return value.toLocaleString(undefined, { 
          minimumFractionDigits: 0, 
          maximumFractionDigits: 4 
        });
      }
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    return String(value);
  };

  const getDataTypeFromValue = (value: any): string => {
    if (value == null) return 'null';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'decimal';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    return 'string';
  };

  const getCellClassName = (value: any): string => {
    const baseClass = "px-3 py-2 text-sm border-b border-databricks-medium-gray";
    const type = getDataTypeFromValue(value);
    
    switch (type) {
      case 'integer':
      case 'decimal':
        return `${baseClass} text-right font-mono text-blue-700`;
      case 'boolean':
        return `${baseClass} text-center text-purple-700`;
      case 'date':
        return `${baseClass} text-green-700`;
      case 'null':
        return `${baseClass} text-databricks-dark-gray/50 italic`;
      default:
        return `${baseClass} text-databricks-dark-gray`;
    }
  };

  if (rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-databricks-dark-gray">
          <div className="text-6xl mb-4">📊</div>
          <p className="text-lg mb-1">No data returned</p>
          <p className="text-sm opacity-70">Your query executed successfully but returned no rows</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Search and Controls */}
      <div className="p-4 border-b border-databricks-medium-gray bg-databricks-light-gray">
        <div className="flex items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-databricks-dark-gray" />
            <input
              type="text"
              placeholder="Search in results..."
              className="pl-10 pr-3 py-2 text-sm border border-databricks-medium-gray rounded-md focus:outline-none focus:ring-2 focus:ring-databricks-blue focus:border-transparent"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          
          <div className="text-sm text-databricks-dark-gray flex items-center space-x-2">
            <span>Showing {startIndex + 1}-{Math.min(endIndex, processedData.length)} of {processedData.length} rows</span>
            {hiddenCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-xs" title="Some columns hidden for performance">
                +{hiddenCount} more columns
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-white sticky top-0 z-10">
            <tr>
              {visibleColumns.map((column) => (
                <th
                  key={column}
                  className="px-3 py-3 text-left text-xs font-semibold text-databricks-dark-blue border-b-2 border-databricks-medium-gray cursor-pointer hover:bg-databricks-light-gray transition-colors"
                  onClick={() => handleSort(column)}
                >
                  <div className="flex items-center space-x-2">
                    <span className="truncate">{column}</span>
                    {renderSortIcon(column)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {paginatedData.map((row, rowIndex) => (
              <tr
                key={startIndex + rowIndex}
                className="hover:bg-databricks-light-gray transition-colors"
              >
                {row.slice(0, MAX_COLUMNS).map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={getCellClassName(cell)}
                    title={formatCellValue(cell)}
                  >
                    <div className="truncate max-w-xs">
                      {cell == null ? (
                        <span className="italic text-databricks-dark-gray/50">null</span>
                      ) : (
                        formatCellValue(cell)
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-databricks-medium-gray bg-white">
          <div className="flex items-center justify-between">
            <div className="text-sm text-databricks-dark-gray">
              Page {currentPage} of {totalPages}
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-databricks-medium-gray rounded hover:bg-databricks-light-gray disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              
              <div className="flex items-center space-x-1">
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 text-sm rounded ${
                        currentPage === pageNum
                          ? 'bg-databricks-blue text-white'
                          : 'border border-databricks-medium-gray hover:bg-databricks-light-gray'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-databricks-medium-gray rounded hover:bg-databricks-light-gray disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsTable;
