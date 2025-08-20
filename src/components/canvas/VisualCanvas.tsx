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
  BackgroundVariant,
  MiniMap,
  ReactFlowProvider,
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

const VisualCanvas: React.FC = () => {
  const { state, dispatch } = useQueryBuilder();
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

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
        }
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
    return state.joins.map(join => ({
      id: join.id,
      source: join.sourceTable,
      target: join.targetTable,
      sourceHandle: join.sourceColumn,
      targetHandle: join.targetColumn,
      type: 'smoothstep',
      label: join.joinType,
      labelStyle: { fontSize: 12, fontWeight: 600 },
      style: { stroke: '#00A1C9', strokeWidth: 2 },
    }));
  }, [state.joins]);

  // Update React Flow nodes and edges when they change
  React.useEffect(() => {
    setNodes(reactFlowNodes);
  }, [reactFlowNodes, setNodes]);

  React.useEffect(() => {
    setEdges(reactFlowEdges);
  }, [reactFlowEdges, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && connection.sourceHandle && connection.targetHandle) {
        const joinId = `${connection.source}-${connection.target}`;
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

          const newTable = {
            id: `table_${Date.now()}`,
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
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          className="bg-databricks-light-gray"
        >
          <Controls 
            className="bg-white border border-databricks-medium-gray shadow-md"
            showInteractive={false}
          />
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
      </ReactFlowProvider>

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

export default VisualCanvas;
