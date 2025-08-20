import React from 'react';
import { Database, Table, Columns, ChevronRight, ChevronDown } from 'lucide-react';
import { CatalogItem as CatalogItemType } from '../../types';

interface CatalogItemProps {
  item: CatalogItemType;
  level: number;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: (item: CatalogItemType) => void;
  onSelect: (item: CatalogItemType) => void;
  onDragStart: (e: React.DragEvent, item: CatalogItemType) => void;
}

const CatalogItem: React.FC<CatalogItemProps> = ({
  item,
  level,
  isExpanded,
  isSelected,
  onToggle,
  onSelect,
  onDragStart
}) => {
  const hasChildren = item.children && item.children.length > 0;

  const getItemIcon = (type: CatalogItemType['type']) => {
    switch (type) {
      case 'catalog':
        return <Database className="w-4 h-4 text-databricks-blue" />;
      case 'schema':
        return <Database className="w-4 h-4 text-databricks-dark-gray" />;
      case 'table':
        return <Table className="w-4 h-4 text-databricks-orange" />;
      case 'column':
        return <Columns className="w-4 h-4 text-databricks-dark-gray" />;
      default:
        return null;
    }
  };

  const handleClick = () => {
    if (hasChildren) {
      onToggle(item);
    }
    onSelect(item);
  };

  return (
    <div>
      <div
        className={`flex items-center space-x-2 px-3 py-2 cursor-pointer hover:bg-databricks-light-gray transition-colors ${
          isSelected ? 'bg-databricks-blue/10 border-r-2 border-databricks-blue' : ''
        }`}
        style={{ paddingLeft: `${12 + level * 16}px` }}
        onClick={handleClick}
        draggable={item.type === 'table' || item.type === 'column'}
        onDragStart={(e) => onDragStart(e, item)}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
      >
        {hasChildren ? (
          <button 
            className="p-0.5 hover:bg-databricks-medium-gray rounded"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(item);
            }}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-databricks-dark-gray" />
            ) : (
              <ChevronRight className="w-3 h-3 text-databricks-dark-gray" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}
        
        {getItemIcon(item.type)}
        
        <span className={`text-sm truncate ${isSelected ? 'font-medium text-databricks-blue' : 'text-databricks-dark-gray'}`}>
          {item.name}
        </span>
        
        {item.type === 'column' && item.dataType && (
          <span className="text-xs text-databricks-dark-gray/70 ml-auto">
            {item.dataType}
          </span>
        )}
        
        {item.nullable === false && item.type === 'column' && (
          <span className="text-xs bg-databricks-orange/20 text-databricks-orange px-1 rounded">
            NOT NULL
          </span>
        )}
      </div>
      
      {hasChildren && isExpanded && (
        <div role="group">
          {item.children!.map(child => (
            <CatalogItem
              key={child.id}
              item={child}
              level={level + 1}
              isExpanded={false} // You'd manage this in parent
              isSelected={false} // You'd manage this in parent
              onToggle={onToggle}
              onSelect={onSelect}
              onDragStart={onDragStart}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CatalogItem;
