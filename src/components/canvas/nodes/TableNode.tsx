import React, { useMemo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Table, X, Eye, EyeOff, GripVertical } from 'lucide-react';
import { TableNode as TableNodeType } from '../../../types';

interface TableNodeProps {
  data: {
    table: TableNodeType;
    onSelectColumn: (columnName: string) => void;
    onRemove: () => void;
    onConnectTo?: (targetColumn: string) => void;
    activeConnect?: { tableId: string; column: string } | null;
  };
}

const TableNode: React.FC<TableNodeProps> = ({ data }) => {
  const { table, onSelectColumn, onRemove, onConnectTo, activeConnect } = data;
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const INITIAL_COLUMN_COUNT = 5;
  const LOAD_MORE_STEP = 10;
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_COLUMN_COUNT);

  const displayColumns = showAllColumns ? table.columns : table.columns.slice(0, visibleCount);
  const hasMoreColumns = !showAllColumns && table.columns.length > visibleCount;

  // Simple instinctive affordance: when dragging from a column, visually mark compatible columns
  const [draggingColumnType, setDraggingColumnType] = useState<string | null>(null);
  const compatibleSet = useMemo(() => {
    // If an external connection is active from another node, prefer matching to that source column type
    const externalDragType = (() => {
      if (!activeConnect) return null;
      // Unknown type here; fallback to general highlight for matching names
      const fromSameTable = activeConnect.tableId === table.id;
      if (fromSameTable) return null;
      return null;
    })();
    const typeToUse = draggingColumnType || externalDragType;
    if (!typeToUse) return new Set<string>();
    const normalize = (t?: string) => (t || '').toLowerCase().split('(')[0];
    const numeric = new Set(['tinyint','smallint','int','integer','bigint','float','double','real','decimal','numeric']);
    const src = normalize(typeToUse);
    return new Set(
      table.columns
        .filter(c => {
          const dst = normalize(c.dataType);
          return dst === src || (numeric.has(dst) && numeric.has(src));
        })
        .map(c => c.name)
    );
  }, [draggingColumnType, table.columns]);

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
    if (type === 'error') {
      return 'text-red-600';
    }
    if (type === 'note') {
      return 'text-yellow-600';
    }
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
      <div className="node-drag-handle bg-databricks-blue text-white px-4 py-3 rounded-t-lg flex items-center justify-between cursor-move">
        <div className="flex items-center space-x-2">
          <Table className="w-4 h-4" />
          <div>
            <div className="font-semibold text-sm">{table.name}</div>
            <div className="text-xs opacity-90">{table.catalog}.{table.schema}</div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              setShowAllColumns(!showAllColumns);
              if (showAllColumns) {
                // When collapsing back, reset to initial visible count
                setVisibleCount(INITIAL_COLUMN_COUNT);
              }
            }}
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
            className={`flex items-center justify-between px-2 py-1.5 rounded transition-colors ${
              column.dataType === 'ERROR'
                ? 'bg-red-50 border border-red-200 opacity-60'
                : column.dataType === 'NOTE'
                  ? 'bg-yellow-50 border border-yellow-200 opacity-70'
                  : selectedColumns.has(column.name)
                    ? 'bg-databricks-orange/10 border border-databricks-orange/30'
                    : (draggingColumnType && compatibleSet.has(column.name))
                      ? 'bg-green-50 border border-green-300'
                      : 'hover:bg-databricks-light-gray'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              if (column.dataType !== 'ERROR' && column.dataType !== 'NOTE') {
                handleColumnClick(column.name);
              }
            }}
            draggable={false}
          >
            <div className="flex items-center space-x-2 flex-1 min-w-0 relative">
              {/* Thin invisible target handle along the left edge for intuitive drop */}
              <Handle
                type="target"
                position={Position.Left}
                id={column.name}
                style={{
                  left: -8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 14,
                  height: 18,
                  backgroundColor: activeConnect && activeConnect.tableId !== table.id ? 'rgba(234,179,8,0.25)' : 'transparent',
                  border: 'none'
                }}
                isConnectableEnd
              />
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

            {/* Grip start connector */}
            <div className="flex items-center pl-2">
              <div className="relative flex items-center" draggable={false} onMouseDown={(e) => e.stopPropagation()}>
                <GripVertical className={`w-4 h-4 ${selectedColumns.has(column.name) ? 'text-green-600' : 'text-databricks-dark-gray'} hover:text-databricks-blue cursor-crosshair`} />
                <Handle
                  type="source"
                  position={Position.Right}
                  id={column.name}
                  style={{
                    right: -6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 16,
                    height: 16,
                    backgroundColor: 'transparent',
                    border: 'none'
                  }}
                  isConnectableStart
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    setDraggingColumnType(column.dataType);
                  }}
                  onMouseUp={(e) => {
                    e.stopPropagation();
                    setDraggingColumnType(null);
                  }}
                />
              </div>
            </div>
          </div>
        ))}

        {hasMoreColumns && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const remaining = table.columns.length - visibleCount;
              setVisibleCount(Math.min(table.columns.length, visibleCount + Math.max(LOAD_MORE_STEP, 1)));
            }}
            className="w-full px-2 py-1 text-xs text-databricks-dark-gray/80 text-center hover:bg-databricks-light-gray rounded transition-colors"
            title="Load more columns"
          >
            Show {Math.min(LOAD_MORE_STEP, table.columns.length - visibleCount)} more...
          </button>
        )}
      </div>

      {/* Table Footer */}
      <div className="px-3 py-2 bg-databricks-light-gray rounded-b-lg border-t border-databricks-medium-gray">
        <div className="text-xs text-databricks-dark-gray">
          {table.columns.filter(c => c.dataType !== 'ERROR' && c.dataType !== 'NOTE').length} columns
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
