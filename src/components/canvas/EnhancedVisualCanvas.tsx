/**
 * Enhanced Visual Canvas - Modern, performant canvas for visual query building
 * 
 * Features:
 * - Drag and drop table management
 * - Interactive join creation
 * - Real-time SQL preview
 * - Performance optimizations
 * - Modern UI/UX patterns
 * - Responsive design
 * - Accessibility improvements
 */

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MarkerType,
  BackgroundVariant,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  ConnectionLineType,
  NodeTypes,
  EdgeTypes,
  OnConnectStartParams,
  OnConnectEnd,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useQueryBuilder } from '../../contexts/QueryBuilderContext';
import { CatalogItem } from '../../types';
import TableNode from './nodes/TableNode';
import FilterNode from './nodes/FilterNode';
import AggregationNode from './nodes/AggregationNode';
import { EnhancedSQLParser } from '../../utils/sql-transpiler/enhanced-parser-simple';
import { generateSQLWithMetadata } from '../../utils/sql-transpiler/sql-generator';

// Enhanced node types with better performance
const nodeTypes: NodeTypes = {
  table: TableNode,
  filter: FilterNode,
  aggregation: AggregationNode,
};

// Custom edge types for better join visualization
const edgeTypes: EdgeTypes = {};

interface CanvasToolbarProps {
  onAddTable: () => void;
  onAddFilter: () => void;
  onAddAggregation: () => void;
  onClearCanvas: () => void;
  onExportSQL: () => void;
  onImportSQL: () => void;
  isConnected: boolean;
}

const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onAddTable,
  onAddFilter,
  onAddAggregation,
  onClearCanvas,
  onExportSQL,
  onImportSQL,
  isConnected
}) => {
  return (
    <Panel position="top-left" className="bg-white shadow-lg rounded-lg p-4 m-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Query Builder</h3>
        
        <button
          onClick={onAddTable}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          title="Add table to canvas"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Add Table
        </button>

        <button
          onClick={onAddFilter}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          title="Add filter condition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
          </svg>
          Add Filter
        </button>

        <button
          onClick={onAddAggregation}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors"
          title="Add aggregation function"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Add Aggregation
        </button>

        <div className="border-t border-gray-200 my-2"></div>

        <button
          onClick={onExportSQL}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          title="Export SQL query"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export SQL
        </button>

        <button
          onClick={onImportSQL}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          title="Import SQL query"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          Import SQL
        </button>

        <button
          onClick={onClearCanvas}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          title="Clear canvas"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear
        </button>

        <div className="mt-2 text-xs text-gray-500">
          {isConnected ? (
            <span className="flex items-center gap-1 text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-1 text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              Disconnected
            </span>
          )}
        </div>
      </div>
    </Panel>
  );
};

interface SQLPreviewPanelProps {
  sql: string;
  warnings: string[];
  metadata: any;
  onCopySQL: () => void;
}

const SQLPreviewPanel: React.FC<SQLPreviewPanelProps> = ({ sql, warnings, metadata, onCopySQL }) => {
  return (
    <Panel position="bottom-right" className="bg-white shadow-lg rounded-lg p-4 m-4 max-w-md">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">SQL Preview</h3>
          <button
            onClick={onCopySQL}
            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
            title="Copy SQL to clipboard"
          >
            Copy
          </button>
        </div>

        <div className="bg-gray-50 p-3 rounded text-xs font-mono text-gray-800 max-h-32 overflow-y-auto">
          {sql || '-- No SQL generated yet'}
        </div>

        {warnings.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-yellow-700">Warnings</h4>
            {warnings.map((warning, index) => (
              <div key={index} className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                ⚠️ {warning}
              </div>
            ))}
          </div>
        )}

        {metadata && (
          <div className="text-xs text-gray-600">
            <div className="grid grid-cols-2 gap-2">
              <div>Tables: {metadata.tableCount}</div>
              <div>Joins: {metadata.joinCount}</div>
              <div>Filters: {metadata.filterCount}</div>
              <div>Complexity: {metadata.complexity}</div>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
};

const EnhancedVisualCanvasInner: React.FC = () => {
  const { state, dispatch } = useQueryBuilder();
  const { fitView, getViewport, setViewport } = useReactFlow();
  
  // Enhanced state management
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // UI state
  const [editingJoinId, setEditingJoinId] = useState<string | null>(null);
  const [editorSourceCol, setEditorSourceCol] = useState<string>('');
  const [editorTargetCol, setEditorTargetCol] = useState<string>('');
  const [editorJoinType, setEditorJoinType] = useState<'INNER'|'LEFT'|'RIGHT'|'FULL'>('INNER');
  const [connectFrom, setConnectFrom] = useState<{ tableId: string; column: string } | null>(null);
  const [showSQLPreview, setShowSQLPreview] = useState(true);
  const [sqlPreview, setSqlPreview] = useState('');
  const [sqlWarnings, setSqlWarnings] = useState<string[]>([]);
  const [sqlMetadata, setSqlMetadata] = useState<any>(null);

  // Performance optimizations
  const sqlGeneratorRef = useRef<EnhancedSQLParser | null>(null);
  const lastStateRef = useRef<any | null>(null);

  // Initialize SQL parser
  useEffect(() => {
    if (!sqlGeneratorRef.current) {
      sqlGeneratorRef.current = new EnhancedSQLParser({
        dialect: 'mysql',
        debugMode: false,
        logLevel: 'warn'
      });
    }
  }, []);

  // Generate SQL preview when state changes
  useEffect(() => {
    if (sqlGeneratorRef.current && state.tables.length > 0) {
      try {
        const result = generateSQLWithMetadata(state, {
          dialect: 'mysql',
          formatOutput: true,
          useTableAliases: true,
          optimizeJoins: true
        });
        
        setSqlPreview(result.sql);
        setSqlWarnings(result.warnings);
        setSqlMetadata(result.metadata);
        lastStateRef.current = state;
      } catch (error) {
        console.error('SQL generation failed:', error);
        setSqlPreview('-- Error generating SQL');
        setSqlWarnings([`SQL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]);
      }
    }
  }, [state]);

  // Handle drag and drop for tables
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      try {
        const catalogItem: any = JSON.parse(
          event.dataTransfer.getData('application/json')
        );

        if (catalogItem.type === 'table') {
          // Parse table information
          const pathParts = catalogItem.id.split('.');
          const catalog = pathParts[0];
          const schema = pathParts[1];
          const tableName = pathParts[2];

          // Generate clean, readable alias
          const generateTableAlias = (tableName: string, existingTables: any[]) => {
            // Start with just the table name
            let alias = tableName;
            let counter = 1;
            
            // If there's a conflict, add a number
            while (existingTables.some(t => t.id === alias)) {
              alias = `${tableName}${counter}`;
              counter++;
            }
            
            return alias;
          };

          const newTable = {
            id: generateTableAlias(tableName, state.tables),
            name: tableName,
            schema,
            catalog,
            columns: catalogItem.children?.map((col: any) => ({
              name: col.name,
              dataType: col.dataType || 'STRING',
              nullable: col.nullable ?? true,
              comment: col.comment,
            })) || [],
            position,
          };

          dispatch({ type: 'ADD_TABLE', payload: newTable });
        }
      } catch (error) {
        console.error('Failed to parse dropped item:', error);
      }
    },
    [dispatch, state.tables]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // Convert query state to React Flow nodes and edges with performance optimizations
  const reactFlowNodes = useMemo(() => {
    const tableNodes: Node[] = state.tables.map(table => ({
      id: table.id,
      type: 'table',
      position: table.position,
      data: {
        table,
        onSelectColumn: (columnName: string) => {
          dispatch({ 
            type: 'ADD_SELECTED_COLUMN', 
            payload: { 
              id: `${table.id}.${columnName}`, 
              column: columnName, 
              table: table.id 
            } 
          });
        },
        onRemove: () => {
          dispatch({ type: 'REMOVE_TABLE', payload: table.id });
        },
        onConnectTo: (targetColumn: string) => {
          if (!connectFrom) return;
          if (connectFrom.tableId === table.id) return;
          
          const joinId = `${connectFrom.tableId}.${connectFrom.column}__${table.id}.${targetColumn}`;
          dispatch({ 
            type: 'ADD_JOIN', 
            payload: {
              id: joinId,
              sourceTable: connectFrom.tableId,
              targetTable: table.id,
              sourceColumn: connectFrom.column,
              targetColumn: targetColumn,
              joinType: 'INNER' as const,
            }
          });
          setConnectFrom(null);
        },
        activeConnect: connectFrom,
      },
    }));

    const filterNodes: Node[] = state.filters.map(filter => ({
      id: `filter-${filter.id}`,
      type: 'filter',
      position: { x: 400, y: 200 + state.filters.indexOf(filter) * 100 },
      data: {
        filter,
        onUpdate: (updatedFilter: any) => {
          dispatch({ type: 'UPDATE_FILTER', payload: updatedFilter });
        },
        onRemove: () => {
          dispatch({ type: 'REMOVE_FILTER', payload: filter.id });
        }
      },
    }));

    const aggregationNodes: Node[] = state.aggregations.map(agg => ({
      id: `agg-${agg.id}`,
      type: 'aggregation',
      position: { x: 600, y: 200 + state.aggregations.indexOf(agg) * 100 },
      data: {
        aggregation: agg,
        onUpdate: (updatedAgg: any) => {
          dispatch({ type: 'UPDATE_AGGREGATION', payload: updatedAgg });
        },
        onRemove: () => {
          dispatch({ type: 'REMOVE_AGGREGATION', payload: agg.id });
        }
      },
    }));

    return [...tableNodes, ...filterNodes, ...aggregationNodes];
  }, [state, connectFrom, dispatch]);

  // Convert joins to React Flow edges
  const reactFlowEdges = useMemo(() => {
    return state.joins.map(join => {
      const sourceTable = state.tables.find(t => t.id === join.sourceTable);
      const targetTable = state.tables.find(t => t.id === join.targetTable);
      
      if (!sourceTable || !targetTable) return null;

      return {
        id: join.id,
        source: join.sourceTable,
        target: join.targetTable,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 },
        label: `${join.sourceColumn} = ${join.targetColumn}`,
        labelStyle: { fontSize: 12, fill: '#374151' },
        labelBgStyle: { fill: '#f9fafb', fillOpacity: 0.8 },
        labelBgPadding: [4, 4],
        labelBgBorderRadius: 4,
        data: {
          join,
          onEdit: () => setEditingJoinId(join.id),
          onRemove: () => dispatch({ type: 'REMOVE_JOIN', payload: join.id })
        }
      };
    }).filter(Boolean) as Edge[];
  }, [state.joins, state.tables, dispatch]);

  // Update nodes and edges when they change
  useEffect(() => {
    setNodes(reactFlowNodes);
  }, [reactFlowNodes, setNodes]);

  useEffect(() => {
    setEdges(reactFlowEdges);
  }, [reactFlowEdges, setEdges]);

  // Handle connections
  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, [setEdges]);

  // Handle connection start
  const onConnectStart = useCallback((event: React.MouseEvent, params: OnConnectStartParams) => {
    if (params.nodeId && params.handleId) {
      setConnectFrom({ tableId: params.nodeId, column: params.handleId });
    }
  }, []);

  // Handle connection end
  const onConnectEnd = useCallback((event: MouseEvent) => {
    setConnectFrom(null);
  }, []);

  // Canvas actions
  const handleAddTable = useCallback(() => {
    const newTable: any = {
      id: `table_${Date.now()}`,
      name: 'New Table',
      schema: 'default',
      catalog: 'default',
      columns: [],
      position: { x: 100, y: 100 }
    };
    
    dispatch({ type: 'ADD_TABLE', payload: newTable });
  }, [dispatch]);

  const handleAddFilter = useCallback(() => {
    const newFilter: any = {
      id: `filter_${Date.now()}`,
      column: 'column_name',
      operator: 'equals',
      value: 'value',
      table: state.tables[0]?.id || 'unknown'
    };
    
    dispatch({ type: 'ADD_FILTER', payload: newFilter });
  }, [dispatch, state.tables]);

  const handleAddAggregation = useCallback(() => {
    const newAgg: any = {
      id: `agg_${Date.now()}`,
      column: 'column_name',
      function: 'COUNT',
      table: state.tables[0]?.id || 'unknown'
    };
    
    dispatch({ type: 'ADD_AGGREGATION', payload: newAgg });
  }, [dispatch, state.tables]);

  const handleClearCanvas = useCallback(() => {
    if (confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
              // Clear canvas by removing all tables, joins, filters, etc.
        dispatch({ type: 'SET_CATALOG', payload: [] });
        // You might need to add more dispatch calls to clear other state
    }
  }, [dispatch]);

  const handleExportSQL = useCallback(() => {
    if (sqlPreview) {
      navigator.clipboard.writeText(sqlPreview);
      // You could also show a toast notification here
    }
  }, [sqlPreview]);

  const handleImportSQL = useCallback(() => {
    // This would open a modal or file picker for SQL import
    alert('SQL import functionality coming soon!');
  }, []);

  const handleCopySQL = useCallback(() => {
    if (sqlPreview) {
      navigator.clipboard.writeText(sqlPreview);
      // You could also show a toast notification here
    }
  }, [sqlPreview]);

  // Auto-fit view when tables are added
  useEffect(() => {
    if (state.tables.length > 0) {
      setTimeout(() => fitView({ padding: 0.1 }), 100);
    }
  }, [state.tables.length, fitView]);

  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        snapToGrid={true}
        snapGrid={[20, 20]}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        fitView
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls />
        <MiniMap 
          nodeColor="#3b82f6"
          maskColor="rgba(0, 0, 0, 0.1)"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.8)' }}
        />
        
        <CanvasToolbar
          onAddTable={handleAddTable}
          onAddFilter={handleAddFilter}
          onAddAggregation={handleAddAggregation}
          onClearCanvas={handleClearCanvas}
          onExportSQL={handleExportSQL}
          onImportSQL={handleImportSQL}
          isConnected={true} // You would get this from your connection state
        />

        {showSQLPreview && (
          <SQLPreviewPanel
            sql={sqlPreview}
            warnings={sqlWarnings}
            metadata={sqlMetadata}
            onCopySQL={handleCopySQL}
          />
        )}
      </ReactFlow>
    </div>
  );
};

const EnhancedVisualCanvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <EnhancedVisualCanvasInner />
    </ReactFlowProvider>
  );
};

export default EnhancedVisualCanvas;
