import React, { useState, useEffect, useMemo } from 'react';
import { Search, Database, Table, Columns, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { useQueryBuilder } from '../../contexts/QueryBuilderContext';
import { fetchCatalogMetadata, fetchSchemas, fetchTables, fetchColumns } from '../../services/databricksApi';
import CatalogItem from './CatalogItem';
import { CatalogItem as CatalogItemType } from '../../types';

const CatalogExplorer: React.FC = () => {
  const { state, dispatch } = useQueryBuilder();
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [loadingItems, setLoadingItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCatalogData();
  }, []);

  const loadCatalogData = async () => {
    try {
      setIsLoading(true);
      const catalog = await fetchCatalogMetadata();
      dispatch({ type: 'SET_CATALOG', payload: catalog });
    } catch (error) {
      console.error('Failed to load catalog:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCatalog = useMemo(() => {
    if (!searchTerm) return state.catalog;

    const filterItems = (items: CatalogItemType[]): CatalogItemType[] => {
      return items.reduce((acc: CatalogItemType[], item) => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const filteredChildren = item.children ? filterItems(item.children) : [];
        
        if (matchesSearch || filteredChildren.length > 0) {
          acc.push({
            ...item,
            children: filteredChildren.length > 0 ? filteredChildren : item.children
          });
        }
        
        return acc;
      }, []);
    };

    return filterItems(state.catalog);
  }, [state.catalog, searchTerm]);

  const loadChildrenForItem = async (item: CatalogItemType) => {
    if (item.isLoaded || loadingItems.has(item.id)) return;

    setLoadingItems(prev => new Set(prev).add(item.id));
    
    try {
      let children: CatalogItemType[] = [];
      
      if (item.type === 'catalog') {
        children = await fetchSchemas(item.name);
      } else if (item.type === 'schema') {
        const parts = item.id.split('.');
        children = await fetchTables(parts[0], parts[1]);
      } else if (item.type === 'table') {
        const parts = item.id.split('.');
        children = await fetchColumns(parts[0], parts[1], parts[2]);
      }

      // Update the catalog in state
      const updateCatalogItem = (items: CatalogItemType[]): CatalogItemType[] => {
        return items.map(catalogItem => {
          if (catalogItem.id === item.id) {
            return { ...catalogItem, children, isLoaded: true };
          }
          if (catalogItem.children) {
            return { ...catalogItem, children: updateCatalogItem(catalogItem.children) };
          }
          return catalogItem;
        });
      };

      dispatch({ 
        type: 'SET_CATALOG', 
        payload: updateCatalogItem(state.catalog) 
      });
    } catch (error) {
      console.error(`Failed to load children for ${item.id}:`, error);
    } finally {
      setLoadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const handleItemClick = async (item: CatalogItemType) => {
    if (item.type === 'table') {
      dispatch({ type: 'SELECT_TABLE', payload: item.id });
    } else if (item.type === 'column') {
      dispatch({ type: 'SELECT_COLUMN', payload: item.id });
    }
    
    // Handle expansion for containers
    const isExpanded = expandedItems.has(item.id);
    const newExpanded = new Set(expandedItems);
    
    if (isExpanded) {
      newExpanded.delete(item.id);
    } else {
      newExpanded.add(item.id);
      // Load children if not already loaded
      if (item.type !== 'column' && !item.isLoaded) {
        await loadChildrenForItem(item);
      }
    }
    
    setExpandedItems(newExpanded);
  };

  const handleDragStart = (e: React.DragEvent, item: CatalogItemType) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

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

  const renderCatalogItem = (item: CatalogItemType, level: number = 0) => {
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const canHaveChildren = item.type !== 'column';
    const isLoading = loadingItems.has(item.id);
    const isSelected = (item.type === 'table' && state.selectedTable === item.id) ||
                     (item.type === 'column' && state.selectedColumn === item.id);

    return (
      <div key={item.id}>
        <div
          className={`flex items-center space-x-2 px-3 py-2 cursor-pointer hover:bg-databricks-light-gray transition-colors ${
            isSelected ? 'bg-databricks-blue/10 border-r-2 border-databricks-blue' : ''
          }`}
          style={{ paddingLeft: `${12 + level * 16}px` }}
          onClick={() => handleItemClick(item)}
          draggable={item.type === 'table' || item.type === 'column'}
          onDragStart={(e) => handleDragStart(e, item)}
        >
          {canHaveChildren && (
            <button className="p-0.5 hover:bg-databricks-medium-gray rounded">
              {isLoading ? (
                <Loader2 className="w-3 h-3 text-databricks-blue animate-spin" />
              ) : isExpanded ? (
                <ChevronDown className="w-3 h-3 text-databricks-dark-gray" />
              ) : (
                <ChevronRight className="w-3 h-3 text-databricks-dark-gray" />
              )}
            </button>
          )}
          
          {!canHaveChildren && <div className="w-4" />}
          
          {getItemIcon(item.type)}
          
          <span className={`text-sm truncate ${isSelected ? 'font-medium text-databricks-blue' : 'text-databricks-dark-gray'}`}>
            {item.name}
          </span>
          
          {item.type === 'column' && item.dataType && (
            <span className="text-xs text-databricks-dark-gray/70 ml-auto">
              {item.dataType}
            </span>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {item.children!.map(child => renderCatalogItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-databricks-medium-gray">
        <h2 className="text-lg font-semibold text-databricks-dark-blue mb-3">
          Unity Catalog
        </h2>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-databricks-dark-gray" />
          <input
            type="text"
            placeholder="Search catalogs, tables, columns..."
            className="w-full pl-10 pr-3 py-2 text-sm border border-databricks-medium-gray rounded-md focus:outline-none focus:ring-2 focus:ring-databricks-blue focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      {/* Catalog Tree */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-databricks-blue animate-spin" />
            <span className="ml-2 text-sm text-databricks-dark-gray">Loading catalog...</span>
          </div>
        ) : filteredCatalog.length === 0 ? (
          <div className="p-4 text-center text-sm text-databricks-dark-gray">
            {searchTerm ? 'No items match your search' : 'No catalog items found'}
          </div>
        ) : (
          <div className="py-2">
            {filteredCatalog.map(item => renderCatalogItem(item))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t border-databricks-medium-gray text-xs text-databricks-dark-gray">
        Drag tables and columns to the canvas to build your query
      </div>
    </div>
  );
};

export default CatalogExplorer;
