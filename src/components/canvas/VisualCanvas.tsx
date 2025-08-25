import React, { useCallback, useMemo } from 'react';
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
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useQueryBuilder } from '../../contexts/QueryBuilderContext';
import { CatalogItem } from '../../types';
import TableNode from './nodes/TableNode';
import FilterNode from './nodes/FilterNode';
import AggregationNode from './nodes/AggregationNode';

const nodeTypes = {
  table: TableNode,
  filter: FilterNode,
  aggregation: AggregationNode,
};

const VisualCanvasInner: React.FC = () => {
  const { state, dispatch } = useQueryBuilder();
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [editingJoinId, setEditingJoinId] = React.useState<string | null>(null);
  const [editorSourceCol, setEditorSourceCol] = React.useState<string>('');
  const [editorTargetCol, setEditorTargetCol] = React.useState<string>('');
  const [editorJoinType, setEditorJoinType] = React.useState<'INNER'|'LEFT'|'RIGHT'|'FULL'>('INNER');
  const [connectFrom, setConnectFrom] = React.useState<{ tableId: string; column: string } | null>(null);

  // Convert query state to React Flow nodes and edges
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
          dispatch({ type: 'ADD_JOIN', payload: {
            id: joinId,
            sourceTable: connectFrom.tableId,
            targetTable: table.id,
            sourceColumn: connectFrom.column,
            targetColumn: targetColumn,
            joinType: 'INNER' as const,
          }});
          setConnectFrom(null);
        },
        activeConnect: connectFrom,
      },
    }));

    // Add filter nodes
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

    // Add aggregation nodes
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
  }, [state.tables, state.filters, state.aggregations, dispatch]);

  const reactFlowEdges = useMemo(() => {
    const edges = state.joins.map(join => ({
      id: join.id,
      source: join.sourceTable,
      target: join.targetTable,
      sourceHandle: join.sourceColumn,
      targetHandle: join.targetColumn,
      type: 'smoothstep',
      label: `${join.joinType}\n${join.sourceColumn} = ${join.targetColumn}`,
      labelStyle: { fontSize: 11, fontWeight: 600, lineHeight: 1.2 },
      style: { stroke: join.joinType === 'INNER' ? '#00A1C9' : join.joinType === 'LEFT' ? '#10B981' : join.joinType === 'RIGHT' ? '#F59E0B' : '#8B5CF6', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed
      }
    }));
    
    if (edges.length > 0) {
      console.log('🔗 Created', edges.length, 'join edges');
    }
    
    return edges;
  }, [state.joins]);

  // Update React Flow nodes and edges when they change
  React.useEffect(() => {
    setNodes(reactFlowNodes);
  }, [reactFlowNodes, setNodes]);

  React.useEffect(() => {
    setEdges(reactFlowEdges);
  }, [reactFlowEdges, setEdges]);

  // Auto-fit view when tables are added (especially from SQL import)
  React.useEffect(() => {
    if (state.tables.length > 0 && reactFlowNodes.length > 0) {
      // Small delay to ensure nodes are rendered before fitting
      setTimeout(() => {
        // Calculate optimal padding based on number of tables
        const padding = Math.min(0.3, Math.max(0.1, 0.1 + (state.tables.length * 0.02)));
        
        fitView({ 
          padding, // Dynamic padding based on table count
          includeHiddenNodes: false,
          maxZoom: state.tables.length > 5 ? 0.8 : 1.2, // Zoom out more for many tables
          minZoom: 0.1, // Allow more zoom out for complex queries
          duration: 1000 // Slightly longer animation for better UX
        });
        
        console.log(`🔍 Auto-fitting view for ${state.tables.length} tables with padding ${padding}`);
      }, 150); // Slightly longer delay for complex layouts
    }
  }, [state.tables.length, reactFlowNodes.length, fitView]);

  // Close join editor and clear any pending connection when related items disappear
  React.useEffect(() => {
    if (editingJoinId && !state.joins.some(j => j.id === editingJoinId)) {
      setEditingJoinId(null);
    }
  }, [state.joins, editingJoinId]);

  React.useEffect(() => {
    // If an active connection was from a table that no longer exists, clear it
    if (connectFrom && !state.tables.some(t => t.id === connectFrom.tableId)) {
      setConnectFrom(null);
    }
  }, [state.tables, connectFrom]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && connection.sourceHandle && connection.targetHandle) {
        const joinId = `${connection.source}.${connection.sourceHandle}__${connection.target}.${connection.targetHandle}`;
        const newJoin = {
          id: joinId,
          sourceTable: connection.source,
          targetTable: connection.target,
          sourceColumn: connection.sourceHandle,
          targetColumn: connection.targetHandle,
          joinType: 'INNER' as const,
        };

        dispatch({ type: 'ADD_JOIN', payload: newJoin });
      }
    },
    [dispatch]
  );

  const onConnectStart = useCallback((event: any, params: { nodeId?: string; handleId?: string; handleType?: string }) => {
    if (params?.nodeId && params?.handleId) {
      setConnectFrom({ tableId: params.nodeId, column: params.handleId });
    }
  }, []);

  const onConnectEnd = useCallback((event: MouseEvent | TouchEvent) => {
    // Clear only if not over a valid target: React Flow will call onConnect for valid drops
    setTimeout(() => {
      setConnectFrom(null);
    }, 0);
  }, []);

  const onEdgeClick = useCallback((event: any, edge: Edge) => {
    event.stopPropagation();
    const join = state.joins.find(j => j.id === edge.id);
    if (!join) return;
    setEditingJoinId(join.id);
    setEditorSourceCol(join.sourceColumn);
    setEditorTargetCol(join.targetColumn);
    setEditorJoinType(join.joinType);
  }, [state.joins]);

  const onEdgeDoubleClick = useCallback((event: any, edge: Edge) => {
    event.stopPropagation();
    const join = state.joins.find(j => j.id === edge.id);
    if (!join) return;
    // Simple prompt-based editor for columns; later replace with popover UI
    const src = prompt('Source column', join.sourceColumn) || join.sourceColumn;
    const tgt = prompt('Target column', join.targetColumn) || join.targetColumn;
    dispatch({ type: 'UPDATE_JOIN_COLUMNS', payload: { id: join.id, sourceColumn: src, targetColumn: tgt } });
  }, [state.joins, dispatch]);

  const onNodeDragStop = useCallback(
    (event: any, node: Node) => {
      if (node.type === 'table') {
        dispatch({
          type: 'UPDATE_TABLE_POSITION',
          payload: { id: node.id, position: node.position }
        });
      }
    },
    [dispatch]
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      };

      try {
        const catalogItem: CatalogItem = JSON.parse(
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
            columns: catalogItem.children?.map(col => ({
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
    [dispatch]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  return (
    <div className="h-full w-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onConnectStart={onConnectStart}
          onConnectEnd={onConnectEnd}
          onNodeDragStop={onNodeDragStop}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          // Dragging is constrained to header via event handlers in nodes; no dragHandle prop to avoid warnings
          connectOnClick
          nodesConnectable
          fitView
          attributionPosition="bottom-left"
          className="bg-databricks-light-gray"
          onEdgeClick={onEdgeClick}
          onEdgeDoubleClick={onEdgeDoubleClick}
        >
          <Controls 
            className="bg-white border border-databricks-medium-gray shadow-md"
            showInteractive={false}
          >
            {/* Custom fit view button */}
            <button
              onClick={() => {
                fitView({ 
                  padding: 0.15,
                  includeHiddenNodes: false,
                  maxZoom: 1.0,
                  minZoom: 0.1,
                  duration: 600
                });
              }}
              className="react-flow__controls-button"
              title="Fit all tables in view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15,3l2.3,2.3l-2.89,2.87l1.42,1.42L18.7,6.7L21,9V3z M6.7,18.7L9,21H3v-6l2.3,2.3l-2.89,2.87l1.42,1.42z M3,9l2.3-2.3l2.87,2.89l1.42-1.42L6.7,6.7L9,3H3z M18.7,17.3L15,21v-6l2.3,2.3l2.87-2.89l1.42,1.42z"/>
              </svg>
            </button>
          </Controls>
          <MiniMap 
            className="bg-white border border-databricks-medium-gray"
            nodeColor="#00A1C9"
            maskColor="rgba(0, 161, 201, 0.1)"
          />
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={20} 
            size={1}
            color="#E0E0E0"
          />
        </ReactFlow>

      {editingJoinId && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setEditingJoinId(null)}>
          <div className="bg-white rounded-lg border border-databricks-medium-gray shadow-lg p-4 w-[420px]" onClick={(e) => e.stopPropagation()}>
            <div className="text-databricks-dark-blue font-semibold mb-3">Edit Join</div>
            {(() => {
              const join = state.joins.find(j => j.id === editingJoinId);
              const sourceTable = state.tables.find(t => t.id === join?.sourceTable);
              const targetTable = state.tables.find(t => t.id === join?.targetTable);
              const sourceCols = sourceTable?.columns?.map(c => c.name) || [];
              const targetCols = targetTable?.columns?.map(c => c.name) || [];
              return (
                <>
                  <div className="mb-3">
                    <label className="block text-xs text-databricks-dark-gray mb-1">Join type</label>
                    <select value={editorJoinType} onChange={e => setEditorJoinType(e.target.value as any)} className="w-full border rounded px-2 py-1 text-sm">
                      <option value="INNER">INNER</option>
                      <option value="LEFT">LEFT</option>
                      <option value="RIGHT">RIGHT</option>
                      <option value="FULL">FULL</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-databricks-dark-gray mb-1">Source column ({sourceTable?.name})</label>
                      <select value={editorSourceCol} onChange={e => setEditorSourceCol(e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                        {sourceCols.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-databricks-dark-gray mb-1">Target column ({targetTable?.name})</label>
                      <select value={editorTargetCol} onChange={e => setEditorTargetCol(e.target.value)} className="w-full border rounded px-2 py-1 text-sm">
                        {targetCols.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between">
                    <button 
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded"
                      onClick={() => {
                        if (!editingJoinId) return;
                        dispatch({ type: 'REMOVE_JOIN', payload: editingJoinId });
                        setEditingJoinId(null);
                      }}
                    >
                      Delete Join
                    </button>
                    <div className="space-x-2">
                      <button className="px-3 py-1 text-sm" onClick={() => setEditingJoinId(null)}>Cancel</button>
                      <button
                        className="px-3 py-1 text-sm databricks-button"
                        onClick={() => {
                          if (!editingJoinId) return;
                          dispatch({ type: 'UPDATE_JOIN_COLUMNS', payload: { id: editingJoinId, sourceColumn: editorSourceCol, targetColumn: editorTargetCol } });
                          dispatch({ type: 'UPDATE_JOIN_TYPE', payload: { id: editingJoinId, joinType: editorJoinType } });
                          setEditingJoinId(null);
                        }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Canvas Instructions */}
      {state.tables.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center p-8 bg-white/90 rounded-lg border border-databricks-medium-gray shadow-sm">
            <h3 className="text-lg font-semibold text-databricks-dark-blue mb-2">
              Start Building Your Query
            </h3>
            <p className="text-databricks-dark-gray mb-4">
              Drag tables from the catalog explorer to begin
            </p>
            <div className="text-sm text-databricks-dark-gray/70 space-y-1">
              <p>• Drag tables to add them to your query</p>
              <p>• Connect tables by dragging from column to column</p>
              <p>• Right-click on tables to add filters and aggregations</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const VisualCanvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <VisualCanvasInner />
    </ReactFlowProvider>
  );
};

export default VisualCanvas;
