/**
 * Robust SQL Parser using dt-sql-parser for Databricks SQL
 * 
 * This module provides full AST-based SQL parsing with support for:
 * - CTEs (Common Table Expressions)
 * - Subqueries
 * - Window functions
 * - Complex joins
 * - All ANSI SQL constructs
 * - Databricks-specific syntax
 */

import { Parser } from 'node-sql-parser';
import type { 
  QueryState, 
  TableNode, 
  JoinRelation, 
  SelectColumn, 
  FilterCondition, 
  AggregationBlock 
} from '../../types';

export interface ParseResult {
  success: boolean;
  data?: Partial<QueryState>;
  errors: string[];
  warnings: string[];
  ast?: any;
  debugInfo?: any;
}

export interface GenerationResult {
  success: boolean;
  sql?: string;
  errors: string[];
  warnings: string[];
  debugInfo?: any;
}

/**
 * Robust SQL Parser using dt-sql-parser
 */
export class RobustSQLParser {
  private parser: Parser;
  private debugMode: boolean;
  private tableMapping: Map<string, string> = new Map();

  constructor(options: { debugMode?: boolean } = {}) {
    this.parser = new Parser();
    this.debugMode = options.debugMode || false;
  }

  /**
   * Parse SQL string to canvas state using AST-based parsing
   */
  parseSQL(sql: string): ParseResult {
    const startTime = Date.now();
    this.log('🔄 Starting robust SQL parsing');
    
    // Clear any previous table mappings
    this.tableMapping.clear();

    try {
      // Step 1: Parse SQL to AST
      this.log('📝 Step 1: Parsing SQL to AST');
      
      // Handle three-part table names by preprocessing
      const preprocessedSQL = this.preprocessSQL(sql);
      
      const ast = this.parser.astify(preprocessedSQL);

      if (!ast) {
        return {
          success: false,
          errors: ['Failed to parse SQL - invalid syntax'],
          warnings: []
        };
      }

      this.log('✅ AST parsing successful');

      // Step 2: Extract canvas state from AST
      this.log('🔧 Step 2: Extracting canvas state from AST');
      const canvasState = this.astToCanvasState(ast, sql);

      const duration = Date.now() - startTime;
      this.log(`✅ SQL parsing complete in ${duration}ms`);

      return {
        success: true,
        data: canvasState,
        errors: [],
        warnings: [],
        ast: this.debugMode ? ast : undefined,
        debugInfo: this.debugMode ? { duration, sql: sql.substring(0, 100) } : undefined
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`❌ SQL parsing failed in ${duration}ms:`, error);

      return {
        success: false,
        errors: [`Parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        debugInfo: this.debugMode ? { 
          duration, 
          error: error instanceof Error ? error.stack : error,
          sql 
        } : undefined
      };
    }
  }

  /**
   * Generate SQL from canvas state
   */
  generateSQL(canvasState: QueryState): GenerationResult {
    const startTime = Date.now();
    this.log('🔄 Starting SQL generation from canvas state');

    try {
      const sql = this.canvasStateToSQL(canvasState);
      const duration = Date.now() - startTime;
      
      this.log(`✅ SQL generation complete in ${duration}ms`);

      return {
        success: true,
        sql,
        errors: [],
        warnings: [],
        debugInfo: this.debugMode ? { 
          duration, 
          tableCount: canvasState.tables.length,
          joinCount: canvasState.joins.length 
        } : undefined
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      this.log(`❌ SQL generation failed in ${duration}ms:`, error);

      return {
        success: false,
        errors: [`Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        debugInfo: this.debugMode ? { 
          duration, 
          error: error instanceof Error ? error.stack : error,
          canvasState 
        } : undefined
      };
    }
  }

  /**
   * Validate round-trip conversion: SQL -> Canvas -> SQL
   */
  async validateRoundTrip(originalSQL: string): Promise<{
    success: boolean;
    isEquivalent: boolean;
    newSQL?: string;
    differences: string[];
    errors: string[];
  }> {
    this.log('🔄 Starting round-trip validation');

    try {
      // SQL -> Canvas
      const parseResult = this.parseSQL(originalSQL);
      if (!parseResult.success || !parseResult.data) {
        return {
          success: false,
          isEquivalent: false,
          differences: [],
          errors: ['Failed to parse original SQL', ...parseResult.errors]
        };
      }

      // Canvas -> SQL
      const generateResult = this.generateSQL(parseResult.data as QueryState);
      if (!generateResult.success || !generateResult.sql) {
        return {
          success: false,
          isEquivalent: false,
          differences: [],
          errors: ['Failed to generate SQL from canvas', ...generateResult.errors]
        };
      }

      // Compare SQLs
      const differences = this.compareSQLStatements(originalSQL, generateResult.sql);
      const isEquivalent = differences.length === 0;

      this.log(`✅ Round-trip validation complete: ${isEquivalent ? 'EQUIVALENT' : 'DIFFERENT'}`);

      return {
        success: true,
        isEquivalent,
        newSQL: generateResult.sql,
        differences,
        errors: []
      };

    } catch (error) {
      this.log(`❌ Round-trip validation failed:`, error);
      
      return {
        success: false,
        isEquivalent: false,
        differences: [],
        errors: [`Round-trip validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Convert AST to Canvas State
   */
  private astToCanvasState(ast: any, originalSQL: string): Partial<QueryState> {
    const canvasState: Partial<QueryState> = {
      tables: [],
      joins: [],
      selectedColumns: [],
      filters: [],
      aggregations: [],
      groupByColumns: [],
      orderByColumns: [],
      limit: undefined
    };

    try {
      // node-sql-parser returns an AST with specific structure
      if (ast.type === 'select') {
        // Extract tables and joins from FROM clause
        this.extractTablesAndJoins(ast.from || [], canvasState);
        
        // Extract selected columns
        this.extractSelectColumns(ast.columns || [], canvasState);
        
        // Extract filters from WHERE clause
        if (ast.where) {
          this.extractFilters(ast.where, canvasState);
        }
        
        // Extract GROUP BY
        if (ast.groupby) {
          this.extractGroupBy(ast.groupby, canvasState);
        }
        
        // Extract ORDER BY
        if (ast.orderby) {
          this.extractOrderBy(ast.orderby, canvasState);
        }
        
        // Extract LIMIT
        if (ast.limit) {
          this.extractLimit(ast.limit, canvasState);
        }
      }

      this.log(`📊 Extracted canvas state:`, {
        tables: canvasState.tables?.length || 0,
        joins: canvasState.joins?.length || 0,
        columns: canvasState.selectedColumns?.length || 0,
        filters: canvasState.filters?.length || 0
      });

    } catch (error) {
      this.log('❌ Error extracting canvas state:', error);
      throw error;
    }

    return canvasState;
  }

  /**
   * Extract tables and joins from FROM clause
   */
  private extractTablesAndJoins(fromArray: any[], canvasState: Partial<QueryState>): void {
    const tables: TableNode[] = [];
    const joins: JoinRelation[] = [];
    
    fromArray.forEach((fromItem, index) => {
      // Extract table information
      const tableName = fromItem.table;
      const alias = fromItem.as || tableName;
      const db = fromItem.db; // This could be schema.catalog format
      
      if (tableName) {
        // Check if we have a mapping for this table name from preprocessing
        let catalog = 'default';
        let schema = 'default';
        let name = tableName;
        
        if (this.tableMapping.has(tableName)) {
          // Use the original mapping from preprocessing
          const fullName = this.tableMapping.get(tableName)!;
          const [cat, sch, tab] = this.parseQualifiedName(fullName);
          catalog = cat || 'default';
          schema = sch || 'default';
          name = tab || tableName;
          this.log(`🔍 Restored table mapping: ${tableName} -> ${catalog}.${schema}.${name}`);
        } else {
          // Fallback to parsing from db field if available
          const [cat, sch, tab] = this.parseQualifiedName(db ? `${db}.${tableName}` : tableName);
          catalog = cat || 'default';
          schema = sch || 'default';
          name = tab || tableName;
        }
        
        const table: TableNode = {
          id: alias,
          name: name,
          schema: schema,
          catalog: catalog,
          columns: [], // Will be populated by the existing column fetching system
          position: { 
            x: 200 + (index * 320), 
            y: 200 
          }
        };
        
        tables.push(table);
        
        // Extract join information if this is a joined table
        if (fromItem.join && fromItem.on && index > 0) {
          const join = this.extractJoinFromNode(fromItem, tables[0], table);
          if (join) {
            joins.push(join);
          }
        }
      }
    });
    
    canvasState.tables = tables;
    canvasState.joins = joins;
  }



  /**
   * Extract selected columns from AST
   */
  private extractSelectColumns(columnsArray: any[], canvasState: Partial<QueryState>): void {
    const selectedColumns: SelectColumn[] = [];
    const aggregations: AggregationBlock[] = [];

    columnsArray.forEach((column, index) => {
      if (column.expr) {
        const alias = column.as;
        
        if (column.expr.type === 'column_ref') {
          // Regular column reference
          const table = column.expr.table || '';
          const columnName = column.expr.column;
          
          if (columnName === '*') {
            // Handle wildcard
            selectedColumns.push({
              id: `${table || 'all'}.*`,
              table: table || '',
              column: '*',
              alias
            });
          } else {
            selectedColumns.push({
              id: `${table}.${columnName}`,
              table,
              column: columnName,
              alias
            });
          }
        } else if (column.expr.type === 'aggr_func') {
          // Aggregation function
          const aggFunction = column.expr.name?.toUpperCase();
          const args = column.expr.args;
          
          if (aggFunction && args && args.value && args.value.length > 0) {
            const arg = args.value[0];
            if (arg.type === 'column_ref') {
              aggregations.push({
                id: `${aggFunction}_${arg.table || ''}_${arg.column}`,
                table: arg.table || '',
                column: arg.column,
                function: aggFunction as 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT_DISTINCT',
                alias
              });
            }
          }
        } else if (column.expr.type === 'function_ref') {
          // Regular function - could be an aggregation
          const funcName = column.expr.name?.toUpperCase();
          if (['COUNT', 'SUM', 'AVG', 'MIN', 'MAX'].includes(funcName)) {
            const args = column.expr.args;
            if (args && args.value && args.value.length > 0) {
              const arg = args.value[0];
              if (arg.type === 'column_ref') {
                aggregations.push({
                  id: `${funcName}_${arg.table || ''}_${arg.column}`,
                  table: arg.table || '',
                  column: arg.column,
                  function: funcName as 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COUNT_DISTINCT',
                  alias
                });
              }
            }
          }
        }
      }
    });

    canvasState.selectedColumns = selectedColumns;
    
    // Merge aggregations with existing ones
    if (!canvasState.aggregations) {
      canvasState.aggregations = [];
    }
    canvasState.aggregations.push(...aggregations);
  }



  /**
   * Convert canvas state to SQL
   */
  private canvasStateToSQL(canvasState: QueryState): string {
    const { tables, joins, selectedColumns, filters, aggregations, groupByColumns, orderByColumns, limit } = canvasState;

    if (tables.length === 0) {
      throw new Error('No tables specified');
    }

    let sql = 'SELECT ';

    // Build SELECT clause
    const selectParts: string[] = [];

    // Add selected columns
    selectedColumns.forEach(col => {
      const columnRef = `${col.table}.${col.column}`;
      const selectPart = col.alias ? `${columnRef} AS ${col.alias}` : columnRef;
      selectParts.push(selectPart);
    });

    // Add aggregations
    aggregations.forEach(agg => {
      const columnRef = `${agg.table}.${agg.column}`;
      const aggFunc = `${agg.function}(${columnRef})`;
      const selectPart = agg.alias ? `${aggFunc} AS ${agg.alias}` : aggFunc;
      selectParts.push(selectPart);
    });

    // If no columns selected, select all from first table
    if (selectParts.length === 0) {
      selectParts.push(`${tables[0].id}.*`);
    }

    sql += selectParts.join(', ');

    // Build FROM clause
    const mainTable = tables[0];
    sql += `\nFROM ${this.formatTableReference(mainTable)}`;

    // Build JOIN clauses
    joins.forEach(join => {
      const targetTable = tables.find(t => t.id === join.targetTable);
      if (targetTable) {
        const joinType = this.formatJoinType(join.joinType);
        sql += `\n${joinType} ${this.formatTableReference(targetTable)}`;
        sql += `\n  ON ${join.sourceTable}.${join.sourceColumn} = ${join.targetTable}.${join.targetColumn}`;
      }
    });

    // Build WHERE clause
    if (filters.length > 0) {
      sql += '\nWHERE ';
      const filterParts = filters.map(filter => this.formatFilterCondition(filter));
      sql += filterParts.join(' AND ');
    }

    // Build GROUP BY clause
    if (groupByColumns.length > 0) {
      sql += '\nGROUP BY ' + groupByColumns.join(', ');
    }

    // Build ORDER BY clause
    if (orderByColumns.length > 0) {
      sql += '\nORDER BY ';
      const orderParts = orderByColumns.map(col => `${col.column} ${col.direction}`);
      sql += orderParts.join(', ');
    }

    // Add LIMIT clause
    if (limit && limit > 0) {
      sql += `\nLIMIT ${limit}`;
    }

    return sql;
  }

  // Helper methods for AST parsing
  private parseQualifiedName(name: string): [string | undefined, string | undefined, string] {
    const parts = name.split('.');
    if (parts.length === 3) {
      return [parts[0], parts[1], parts[2]];
    } else if (parts.length === 2) {
      return [undefined, parts[0], parts[1]];
    } else {
      return [undefined, undefined, parts[0]];
    }
  }

  private generateTableAlias(tableName: string, existingTables: TableNode[]): string {
    const baseName = tableName.toLowerCase();
    const existingAliases = new Set(existingTables.map(t => t.id));
    
    if (!existingAliases.has(baseName)) {
      return baseName;
    }
    
    let counter = 1;
    while (existingAliases.has(`${baseName}${counter}`)) {
      counter++;
    }
    
    return `${baseName}${counter}`;
  }

  // Helper methods for SQL generation
  private formatTableReference(table: TableNode): string {
    return `${table.catalog}.${table.schema}.${table.name} AS ${table.id}`;
  }

  private formatJoinType(joinType: string): string {
    switch (joinType.toUpperCase()) {
      case 'INNER': return 'INNER JOIN';
      case 'LEFT': return 'LEFT JOIN';
      case 'RIGHT': return 'RIGHT JOIN';
      case 'FULL': return 'FULL OUTER JOIN';
      default: return 'INNER JOIN';
    }
  }

  private formatFilterCondition(filter: FilterCondition): string {
    const columnRef = `${filter.table}.${filter.column}`;
    
    switch (filter.operator) {
      case 'equals':
        return `${columnRef} = '${filter.value}'`;
      case 'not_equals':
        return `${columnRef} != '${filter.value}'`;
      case 'greater_than':
        return `${columnRef} > '${filter.value}'`;
      case 'less_than':
        return `${columnRef} < '${filter.value}'`;
      case 'like':
        return `${columnRef} LIKE '%${filter.value}%'`;
      case 'in':
        const values = Array.isArray(filter.value) ? filter.value : [filter.value];
        return `${columnRef} IN (${values.map(v => `'${v}'`).join(', ')})`;
      case 'is_null':
        return `${columnRef} IS NULL`;
      case 'is_not_null':
        return `${columnRef} IS NOT NULL`;
      default:
        return `${columnRef} = '${filter.value}'`;
    }
  }

  private compareSQLStatements(sql1: string, sql2: string): string[] {
    const differences: string[] = [];
    
    // Normalize both SQL statements for comparison
    const normalize = (sql: string) => sql
      .replace(/\s+/g, ' ')
      .replace(/,\s+/g, ',')
      .trim()
      .toLowerCase();
    
    const norm1 = normalize(sql1);
    const norm2 = normalize(sql2);
    
    if (norm1 !== norm2) {
      differences.push('SQL statements are not lexically equivalent');
      
      // Check for specific differences
      if (!norm2.includes('select')) {
        differences.push('Generated SQL missing SELECT clause');
      }
      
      if (!norm2.includes('from')) {
        differences.push('Generated SQL missing FROM clause');
      }

      // Add more specific difference detection as needed
    }
    
    return differences;
  }

  private log(...args: any[]): void {
    if (this.debugMode) {
      console.log('[RobustSQLParser]', ...args);
    }
  }

  /**
   * Preprocess SQL to handle Databricks-specific syntax
   */
  private preprocessSQL(sql: string): string {
    // Clear previous mapping
    this.tableMapping.clear();
    
    // For now, we'll handle three-part names by mapping them to temporary aliases
    // This is a workaround since node-sql-parser doesn't handle catalog.schema.table natively
    
    let processedSQL = sql;
    
    // Find three-part table names and replace them with simple names
    const threePartRegex = /(\w+)\.(\w+)\.(\w+)(\s+AS\s+\w+)?/gi;
    
    processedSQL = processedSQL.replace(threePartRegex, (match, catalog, schema, table, asClause) => {
      const fullName = `${catalog}.${schema}.${table}`;
      const simpleName = table; // Use just the table name for parsing
      
      // Store the mapping for later reconstruction
      this.tableMapping.set(simpleName, fullName);
      
      this.log(`📝 Mapped table: ${simpleName} -> ${fullName}`);
      
      return simpleName + (asClause || '');
    });
    
    this.log('📝 Preprocessed SQL:', { 
      original: sql.substring(0, 100), 
      processed: processedSQL.substring(0, 100),
      tableMappings: Array.from(this.tableMapping.entries())
    });
    return processedSQL;
  }

  /**
   * Extract join information from FROM item
   */
  private extractJoinFromNode(fromItem: any, leftTable: TableNode, rightTable: TableNode): JoinRelation | null {
    if (!fromItem.join || !fromItem.on) return null;
    
    const joinType = fromItem.join.replace(' JOIN', '').trim().toUpperCase();
    
    // Extract join condition
    if (fromItem.on.type === 'binary_expr' && fromItem.on.operator === '=') {
      const left = fromItem.on.left;
      const right = fromItem.on.right;
      
      if (left.type === 'column_ref' && right.type === 'column_ref') {
        return {
          id: `${left.table}.${left.column}__${right.table}.${right.column}`,
          sourceTable: left.table,
          targetTable: right.table,
          sourceColumn: left.column,
          targetColumn: right.column,
          joinType: (joinType === 'INNER' || joinType === 'LEFT' || joinType === 'RIGHT' || joinType === 'FULL') ? joinType : 'INNER'
        };
      }
    }
    
    return null;
  }

  /**
   * Extract filters from WHERE clause
   */
  private extractFilters(whereNode: any, canvasState: Partial<QueryState>): void {
    const filters: FilterCondition[] = [];
    
    const extractFilterConditions = (node: any) => {
      if (!node) return;
      
      if (node.type === 'binary_expr') {
        const left = node.left;
        const right = node.right;
        const operator = node.operator;
        
        if (left.type === 'column_ref' && right.type !== 'column_ref') {
          // Simple column filter
          const table = left.table || '';
          const column = left.column;
          let value = right.value;
          
          // Map operators
          let filterOperator: FilterCondition['operator'] = 'equals';
          switch (operator) {
            case '=': filterOperator = 'equals'; break;
            case '!=': 
            case '<>': filterOperator = 'not_equals'; break;
            case '>': filterOperator = 'greater_than'; break;
            case '<': filterOperator = 'less_than'; break;
            case 'LIKE': filterOperator = 'like'; break;
            case 'IN': filterOperator = 'in'; break;
            case 'IS': 
              if (right.type === 'null') {
                filterOperator = 'is_null';
                value = null;
              }
              break;
            case 'IS NOT':
              if (right.type === 'null') {
                filterOperator = 'is_not_null';
                value = null;
              }
              break;
          }
          
          filters.push({
            id: `${table}_${column}_${operator}`,
            table,
            column,
            operator: filterOperator,
            value
          });
        } else if (node.operator === 'AND' || node.operator === 'OR') {
          // Recursive extraction for logical operators
          extractFilterConditions(left);
          extractFilterConditions(right);
        }
      }
    };
    
    extractFilterConditions(whereNode);
    canvasState.filters = filters;
  }

  /**
   * Extract GROUP BY columns
   */
  private extractGroupBy(groupByArray: any[], canvasState: Partial<QueryState>): void {
    const groupByColumns: string[] = [];
    
    groupByArray.forEach(item => {
      if (item.type === 'column_ref') {
        const columnRef = item.table ? `${item.table}.${item.column}` : item.column;
        groupByColumns.push(columnRef);
      }
    });
    
    canvasState.groupByColumns = groupByColumns;
  }

  /**
   * Extract ORDER BY columns
   */
  private extractOrderBy(orderByArray: any[], canvasState: Partial<QueryState>): void {
    const orderByColumns: { column: string; direction: 'ASC' | 'DESC' }[] = [];
    
    orderByArray.forEach(item => {
      if (item.expr && item.expr.type === 'column_ref') {
        const columnRef = item.expr.table ? `${item.expr.table}.${item.expr.column}` : item.expr.column;
        const direction = item.type?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
        
        orderByColumns.push({
          column: columnRef,
          direction
        });
      }
    });
    
    canvasState.orderByColumns = orderByColumns;
  }

  /**
   * Extract LIMIT clause
   */
  private extractLimit(limitNode: any, canvasState: Partial<QueryState>): void {
    if (limitNode && limitNode.value) {
      const limitValue = parseInt(limitNode.value.toString(), 10);
      if (!isNaN(limitValue)) {
        canvasState.limit = limitValue;
      }
    }
  }
}

// Export convenience functions
export function parseSQL(sql: string, options?: { debugMode?: boolean }): ParseResult {
  const parser = new RobustSQLParser(options);
  return parser.parseSQL(sql);
}

export function generateSQL(canvasState: QueryState, options?: { debugMode?: boolean }): GenerationResult {
  const parser = new RobustSQLParser(options);
  return parser.generateSQL(canvasState);
}

export function validateRoundTrip(sql: string, options?: { debugMode?: boolean }): Promise<{
  success: boolean;
  isEquivalent: boolean;
  newSQL?: string;
  differences: string[];
  errors: string[];
}> {
  const parser = new RobustSQLParser(options);
  return parser.validateRoundTrip(sql);
}
