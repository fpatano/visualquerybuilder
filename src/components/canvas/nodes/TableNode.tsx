import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Table, X, Eye, EyeOff, MoreVertical } from 'lucide-react';
import { TableNode as TableNodeType } from '../../../types';

interface TableNodeProps {
  data: {
    table: TableNodeType;
    onSelectColumn: (columnName: string) => void;
    onRemove: () => void;
  };
}

const TableNode: React.FC<TableNodeProps> = ({ data }) => {
  const { table, onSelectColumn, onRemove } = data;
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());

  const displayColumns = showAllColumns ? table.columns : table.columns.slice(0, 5);
  const hasMoreColumns = table.columns.length > 5;

  const handleColumnClick = (columnName: string) => {
    const newSelected = new Set(selectedColumns);
    if (selectedColumns.has(columnName)) {
      newSelected.delete(columnName);
    } else {
      newSelected.add(columnName);
      onSelectColumn(columnName);
    }
    setSelectedColumns(newSelected);
  };

  const getDataTypeColor = (dataType: string) => {
    const type = dataType.toLowerCase();
    if (type.includes('int') || type.includes('bigint') || type.includes('decimal')) {
      return 'text-blue-600';
    }
    if (type.includes('string') || type.includes('varchar') || type.includes('char')) {
      return 'text-green-600';
    }
    if (type.includes('timestamp') || type.includes('date')) {
      return 'text-purple-600';
    }
    if (type.includes('boolean')) {
      return 'text-orange-600';
    }
    return 'text-gray-600';
  };

  return (
    <div className="bg-white border-2 border-databricks-blue rounded-lg shadow-lg min-w-64 max-w-80">
      {/* Table Header */}
      <div className="bg-databricks-blue text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Table className="w-4 h-4" />
          <div>
            <div className="font-semibold text-sm">{table.name}</div>
            <div className="text-xs opacity-90">{table.catalog}.{table.schema}</div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowAllColumns(!showAllColumns)}
            className="p-1 hover:bg-white/20 rounded"
            title={showAllColumns ? "Show fewer columns" : "Show all columns"}
          >
            {showAllColumns ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          
          <button
            onClick={onRemove}
            className="p-1 hover:bg-white/20 rounded text-red-200 hover:text-red-100"
            title="Remove table"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Columns List */}
      <div className="p-2">
        {displayColumns.map((column, index) => (
          <div
            key={column.name}
            className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
              selectedColumns.has(column.name)
                ? 'bg-databricks-orange/10 border border-databricks-orange/30'
                : 'hover:bg-databricks-light-gray'
            }`}
            onClick={() => handleColumnClick(column.name)}
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-databricks-dark-gray truncate">
                  {column.name}
                </div>
                <div className={`text-xs ${getDataTypeColor(column.dataType)} truncate`}>
                  {column.dataType}
                  {!column.nullable && (
                    <span className="ml-1 text-databricks-orange">NOT NULL</span>
                  )}
                </div>
              </div>
            </div>

            {/* Connection Handles */}
            <Handle
              type="source"
              position={Position.Right}
              id={column.name}
              style={{
                right: -8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 12,
                height: 12,
                backgroundColor: '#00A1C9',
                border: '2px solid white',
              }}
            />
            <Handle
              type="target"
              position={Position.Left}
              id={column.name}
              style={{
                left: -8,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 12,
                height: 12,
                backgroundColor: '#00A1C9',
                border: '2px solid white',
              }}
            />
          </div>
        ))}

        {hasMoreColumns && !showAllColumns && (
          <div className="px-2 py-1 text-xs text-databricks-dark-gray/70 text-center">
            +{table.columns.length - 5} more columns
          </div>
        )}
      </div>

      {/* Table Footer */}
      <div className="px-3 py-2 bg-databricks-light-gray rounded-b-lg border-t border-databricks-medium-gray">
        <div className="text-xs text-databricks-dark-gray">
          {table.columns.length} columns
          {selectedColumns.size > 0 && (
            <span className="ml-2 text-databricks-orange">
              • {selectedColumns.size} selected
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TableNode;
