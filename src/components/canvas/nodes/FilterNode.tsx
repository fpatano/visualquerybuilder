import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Filter, X } from 'lucide-react';
import { FilterCondition } from '../../../types';

interface FilterNodeProps {
  data: {
    filter: FilterCondition;
    onUpdate: (filter: FilterCondition) => void;
    onRemove: () => void;
  };
}

const FilterNode: React.FC<FilterNodeProps> = ({ data }) => {
  const { filter, onUpdate, onRemove } = data;
  const [isEditing, setIsEditing] = useState(false);

  const operators = [
    { value: 'equals', label: '=' },
    { value: 'not_equals', label: '!=' },
    { value: 'greater_than', label: '>' },
    { value: 'less_than', label: '<' },
    { value: 'like', label: 'LIKE' },
    { value: 'in', label: 'IN' },
    { value: 'is_null', label: 'IS NULL' },
    { value: 'is_not_null', label: 'IS NOT NULL' },
  ];

  const handleUpdate = (updates: Partial<FilterCondition>) => {
    onUpdate({ ...filter, ...updates });
    setIsEditing(false);
  };

  const getOperatorLabel = (op: string) => {
    return operators.find(o => o.value === op)?.label || op;
  };

  const needsValue = !['is_null', 'is_not_null'].includes(filter.operator);

  return (
    <div className="bg-white border-2 border-databricks-orange rounded-lg shadow-lg min-w-64">
      <Handle
        type="target"
        position={Position.Left}
        style={{
          left: -8,
          backgroundColor: '#FF6B35',
          border: '2px solid white',
        }}
      />

      {/* Filter Header */}
      <div className="bg-databricks-orange text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4" />
          <span className="font-semibold text-sm">Filter</span>
        </div>
        
        <button
          onClick={onRemove}
          className="p-1 hover:bg-white/20 rounded text-red-200 hover:text-red-100"
          title="Remove filter"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Content */}
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-databricks-dark-gray mb-1">
                Column
              </label>
              <input
                type="text"
                value={`${filter.table}.${filter.column}`}
                className="w-full px-2 py-1 text-sm border border-databricks-medium-gray rounded focus:outline-none focus:ring-1 focus:ring-databricks-orange"
                readOnly
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-databricks-dark-gray mb-1">
                Operator
              </label>
              <select
                value={filter.operator}
                onChange={(e) => handleUpdate({ operator: e.target.value as any })}
                className="w-full px-2 py-1 text-sm border border-databricks-medium-gray rounded focus:outline-none focus:ring-1 focus:ring-databricks-orange"
              >
                {operators.map(op => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
            </div>
            
            {needsValue && (
              <div>
                <label className="block text-xs font-medium text-databricks-dark-gray mb-1">
                  Value
                </label>
                <input
                  type="text"
                  value={Array.isArray(filter.value) ? filter.value.join(', ') : filter.value}
                  onChange={(e) => {
                    const value = filter.operator === 'in' 
                      ? e.target.value.split(',').map(v => v.trim())
                      : e.target.value;
                    handleUpdate({ value });
                  }}
                  placeholder={filter.operator === 'in' ? 'value1, value2, value3' : 'Enter value'}
                  className="w-full px-2 py-1 text-sm border border-databricks-medium-gray rounded focus:outline-none focus:ring-1 focus:ring-databricks-orange"
                />
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-xs text-databricks-dark-gray hover:text-databricks-dark-blue"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdate({})}
                className="px-3 py-1 text-xs bg-databricks-orange text-white rounded hover:bg-databricks-orange/90"
              >
                Apply
              </button>
            </div>
          </div>
        ) : (
          <div 
            className="cursor-pointer hover:bg-databricks-light-gray p-2 rounded"
            onClick={() => setIsEditing(true)}
          >
            <div className="text-sm font-medium text-databricks-dark-blue">
              {filter.table}.{filter.column}
            </div>
            <div className="text-sm text-databricks-dark-gray mt-1">
              {getOperatorLabel(filter.operator)}
              {needsValue && (
                <span className="ml-1 font-mono bg-databricks-light-gray px-1 rounded">
                  {Array.isArray(filter.value) ? filter.value.join(', ') : filter.value}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          right: -8,
          backgroundColor: '#FF6B35',
          border: '2px solid white',
        }}
      />
    </div>
  );
};

export default FilterNode;
