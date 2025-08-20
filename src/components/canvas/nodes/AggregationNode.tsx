import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { BarChart3, X } from 'lucide-react';
import { AggregationBlock } from '../../../types';

interface AggregationNodeProps {
  data: {
    aggregation: AggregationBlock;
    onUpdate: (aggregation: AggregationBlock) => void;
    onRemove: () => void;
  };
}

const AggregationNode: React.FC<AggregationNodeProps> = ({ data }) => {
  const { aggregation, onUpdate, onRemove } = data;
  const [isEditing, setIsEditing] = useState(false);

  const aggregationFunctions = [
    { value: 'COUNT', label: 'COUNT' },
    { value: 'SUM', label: 'SUM' },
    { value: 'AVG', label: 'AVG' },
    { value: 'MIN', label: 'MIN' },
    { value: 'MAX', label: 'MAX' },
    { value: 'COUNT_DISTINCT', label: 'COUNT DISTINCT' },
  ];

  const handleUpdate = (updates: Partial<AggregationBlock>) => {
    onUpdate({ ...aggregation, ...updates });
    setIsEditing(false);
  };

  return (
    <div className="bg-white border-2 border-green-500 rounded-lg shadow-lg min-w-64">
      <Handle
        type="target"
        position={Position.Left}
        style={{
          left: -8,
          backgroundColor: '#10B981',
          border: '2px solid white',
        }}
      />

      {/* Aggregation Header */}
      <div className="bg-green-500 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4" />
          <span className="font-semibold text-sm">Aggregation</span>
        </div>
        
        <button
          onClick={onRemove}
          className="p-1 hover:bg-white/20 rounded text-red-200 hover:text-red-100"
          title="Remove aggregation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Aggregation Content */}
      <div className="p-4">
        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-databricks-dark-gray mb-1">
                Function
              </label>
              <select
                value={aggregation.function}
                onChange={(e) => handleUpdate({ function: e.target.value as any })}
                className="w-full px-2 py-1 text-sm border border-databricks-medium-gray rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              >
                {aggregationFunctions.map(func => (
                  <option key={func.value} value={func.value}>
                    {func.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-databricks-dark-gray mb-1">
                Column
              </label>
              <input
                type="text"
                value={`${aggregation.table}.${aggregation.column}`}
                className="w-full px-2 py-1 text-sm border border-databricks-medium-gray rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                readOnly
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-databricks-dark-gray mb-1">
                Alias (optional)
              </label>
              <input
                type="text"
                value={aggregation.alias || ''}
                onChange={(e) => handleUpdate({ alias: e.target.value || undefined })}
                placeholder="Enter alias name"
                className="w-full px-2 py-1 text-sm border border-databricks-medium-gray rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-xs text-databricks-dark-gray hover:text-databricks-dark-blue"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdate({})}
                className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
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
              {aggregation.function}({aggregation.table}.{aggregation.column})
            </div>
            {aggregation.alias && (
              <div className="text-xs text-databricks-dark-gray mt-1">
                AS {aggregation.alias}
              </div>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{
          right: -8,
          backgroundColor: '#10B981',
          border: '2px solid white',
        }}
      />
    </div>
  );
};

export default AggregationNode;
