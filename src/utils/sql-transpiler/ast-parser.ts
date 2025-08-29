/**
 * AST Parser - Core logic for converting SQL AST to Canvas State
 * 
 * This module handles the complex task of parsing SQL AST structures
 * and converting them to our visual canvas representation
 */

import type { AST, Column, From, Where, Join, GroupBy, OrderBy, Limit } from 'node-sql-parser';
import type { 
  QueryState, 
  TableNode, 
  JoinRelation, 
  SelectColumn, 
  FilterCondition, 
  AggregationBlock 
} from '../../types';

export interface ASTParseContext {
  tableCounter: number;
  filterCounter: number;
  aggregationCounter: number;
  columnCounter: number;
  joinCounter: number;
  tableAliases: Map<string, string>;
  columnAliases: Map<string, string>;
  subqueryDepth: number;
  cteDefinitions: Map<string, any>;
}

export interface ASTParseResult {
  tables: TableNode[];
  joins: JoinRelation[];
  filters: FilterCondition[];
  aggregations: AggregationBlock[];
  selectedColumns: SelectColumn[];
  groupByColumns: string[];
  orderByColumns: { column: string; direction: 'ASC' | 'DESC' }[];
  limit?: number;
  warnings: string[];
}

/**
 * AST Parser for converting SQL AST to Canvas State
 */
export class ASTParser {
  private context: ASTParseContext;

  constructor() {
    this.resetContext();
  }

  /**
   * Reset parsing context for new query
   */
  resetContext(): void {
    this.context = {
      tableCounter: 0,
      filterCounter: 0,
      aggregationCounter: 0,
      columnCounter: 0,
      joinCounter: 0,
      tableAliases: new Map(),
      columnAliases: new Map(),
      subqueryDepth: 0,
      cteDefinitions: new Map()
    };
  }

  /**
   * Parse AST to Canvas State
   */
  parseAST(ast: AST, originalSQL: string): ASTParseResult {
    this.resetContext();
    
    try {
      // Handle different AST structures
      if (Array.isArray(ast)) {
        return this.parseMultipleStatements(ast, originalSQL);
      } else {
        return this.parseSingleStatement(ast, originalSQL);
      }
    } catch (error) {
      console.error('AST parsing failed:', error);
      return this.createEmptyResult();
    }
  }

  /**
   * Parse single SQL statement
   */
  private parseSingleStatement(ast: any, originalSQL: string): ASTParseResult {
    const result = this.createEmptyResult();

    try {
      // Handle CTEs first
      if (ast.with) {
        this.parseCTEs(ast.with, result);
      }

      // Parse main query
      if (ast.type === 'select') {
        this.parseSelectStatement(ast, result);
      } else if (ast.type === 'union') {
        this.parseUnionStatement(ast, result);
      }

      // Add warnings for unsupported features
      this.addUnsupportedFeatureWarnings(ast, result);

    } catch (error) {
      console.error('Single statement parsing failed:', error);
      result.warnings.push(`Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }

  /**
   * Parse multiple SQL statements
   */
  private parseMultipleStatements(astArray: any[], originalSQL: string): ASTParseResult {
    const result = this.createEmptyResult();
    
    // For now, parse only the first statement
    // In the future, we could support multiple statements
    if (astArray.length > 0) {
      const firstStatement = astArray[0];
      const statementResult = this.parseSingleStatement(firstStatement, originalSQL);
      
      // Merge results
      result.tables.push(...statementResult.tables);
      result.joins.push(...statementResult.joins);
      result.filters.push(...statementResult.filters);
      result.aggregations.push(...statementResult.aggregations);
      result.selectedColumns.push(...statementResult.selectedColumns);
      result.groupByColumns.push(...statementResult.groupByColumns);
      result.orderByColumns.push(...statementResult.orderByColumns);
      result.limit = statementResult.limit;
      result.warnings.push(...statementResult.warnings);
      
      if (astArray.length > 1) {
        result.warnings.push(`Multiple statements detected. Only the first statement was parsed.`);
      }
    }

    return result;
  }

  /**
   * Parse SELECT statement
   */
  private parseSelectStatement(ast: any, result: ASTParseResult): void {
    // Parse FROM clause (tables)
    if (ast.from) {
      this.parseFromClause(ast.from, result);
    }

    // Parse SELECT columns
    if (ast.columns) {
      this.parseSelectColumns(ast.columns, result);
    }

    // Parse JOINs
    if (ast.join) {
      this.parseJoinClause(ast.join, result);
    }

    // Parse WHERE clause
    if (ast.where) {
      this.parseWhereClause(ast.where, result);
    }

    // Parse GROUP BY
    if (ast.groupby) {
      this.parseGroupByClause(ast.groupby, result);
    }

    // Parse HAVING
    if (ast.having) {
      this.parseHavingClause(ast.having, result);
    }

    // Parse ORDER BY
    if (ast.orderby) {
      this.parseOrderByClause(ast.orderby, result);
    }

    // Parse LIMIT
    if (ast.limit) {
      this.parseLimitClause(ast.limit, result);
    }
  }

  /**
   * Parse FROM clause
   */
  private parseFromClause(from: any, result: ASTParseResult): void {
    if (Array.isArray(from)) {
      from.forEach(item => this.parseFromItem(item, result));
    } else {
      this.parseFromItem(from, result);
    }
  }

  /**
   * Parse individual FROM item
   */
  private parseFromItem(item: any, result: ASTParseResult): void {
    if (item.type === 'table') {
      this.parseTableReference(item, result);
    } else if (item.type === 'subquery') {
      this.parseSubqueryReference(item, result);
    } else if (item.type === 'function') {
      this.parseFunctionReference(item, result);
    }
  }

  /**
   * Parse table reference
   */
  private parseTableReference(item: any, result: ASTParseResult): void {
    const tableId = `table_${this.context.tableCounter++}`;
    
    // Extract table information
    let tableName = '';
    let schemaName = '';
    let catalogName = '';
    
    if (typeof item.table === 'string') {
      tableName = item.table;
    } else if (Array.isArray(item.table)) {
      // Handle multi-part table names (catalog.schema.table)
      if (item.table.length === 3) {
        [catalogName, schemaName, tableName] = item.table;
      } else if (item.table.length === 2) {
        [schemaName, tableName] = item.table;
      } else {
        tableName = item.table[0];
      }
    }

    // Handle table alias
    if (item.as) {
      this.context.tableAliases.set(item.as, tableId);
    }

    // Create table node
    const tableNode: TableNode = {
      id: tableId,
      name: tableName,
      schema: schemaName || 'default',
      catalog: catalogName || 'default',
      columns: [], // Will be populated later if available
      position: this.calculateTablePosition(result.tables.length)
    };

    result.tables.push(tableNode);
  }

  /**
   * Parse subquery reference
   */
  private parseSubqueryReference(item: any, result: ASTParseResult): void {
    this.context.subqueryDepth++;
    
    try {
      // Create a virtual table for the subquery
      const tableId = `subquery_${this.context.tableCounter++}`;
      
      if (item.as) {
        this.context.tableAliases.set(item.as, tableId);
      }

      // Parse the subquery content
      if (item.subquery) {
        const subqueryResult = this.parseAST(item.subquery, '');
        
        // Merge subquery results (simplified)
        result.tables.push(...subqueryResult.tables);
        result.joins.push(...subqueryResult.joins);
        result.filters.push(...subqueryResult.filters);
        result.aggregations.push(...subqueryResult.aggregations);
        result.selectedColumns.push(...subqueryResult.selectedColumns);
        result.warnings.push(...subqueryResult.warnings);
      }

    } finally {
      this.context.subqueryDepth--;
    }
  }

  /**
   * Parse function reference (e.g., table-valued functions)
   */
  private parseFunctionReference(item: any, result: ASTParseResult): void {
    const tableId = `function_${this.context.tableCounter++}`;
    
    if (item.as) {
      this.context.tableAliases.set(item.as, tableId);
    }

    // Create a virtual table for the function
    const tableNode: TableNode = {
      id: tableId,
      name: item.name || 'function_table',
      schema: 'function',
      catalog: 'function',
      columns: [],
      position: this.calculateTablePosition(result.tables.length)
    };

    result.tables.push(tableNode);
    result.warnings.push(`Table-valued function '${item.name}' converted to virtual table`);
  }

  /**
   * Parse SELECT columns
   */
  private parseSelectColumns(columns: any[], result: ASTParseResult): void {
    columns.forEach(column => {
      this.parseSelectColumn(column, result);
    });
  }

  /**
   * Parse individual SELECT column
   */
  private parseSelectColumn(column: any, result: ASTParseResult): void {
    const columnId = `column_${this.context.columnCounter++}`;
    
    let columnName = '';
    let tableName = '';
    let alias = '';

    // Extract column information
    if (typeof column.expr === 'string') {
      columnName = column.expr;
    } else if (column.expr && column.expr.type === 'column_ref') {
      columnName = column.expr.column;
      if (column.expr.table) {
        tableName = this.resolveTableReference(column.expr.table);
      }
    } else if (column.expr && column.expr.type === 'function') {
      // Handle function calls
      columnName = this.parseFunctionExpression(column.expr);
      if (this.isAggregationFunction(column.expr.name)) {
        this.parseAggregationColumn(column, result);
        return;
      }
    }

    // Handle column alias
    if (column.as) {
      alias = column.as;
      this.context.columnAliases.set(alias, columnId);
    }

    // Create selected column
    const selectColumn: SelectColumn = {
      id: columnId,
      column: columnName,
      table: tableName || 'unknown',
      alias
    };

    result.selectedColumns.push(selectColumn);
  }

  /**
   * Parse aggregation column
   */
  private parseAggregationColumn(column: any, result: ASTParseResult): void {
    const aggId = `agg_${this.context.aggregationCounter++}`;
    
    let columnName = '';
    let functionName = '';
    let alias = '';

    if (column.expr && column.expr.type === 'function') {
      functionName = column.expr.name.toUpperCase();
      
      // Extract column from function arguments
      if (column.expr.args && column.expr.args.length > 0) {
        const arg = column.expr.args[0];
        if (arg.type === 'column_ref') {
          columnName = arg.column;
        } else if (typeof arg === 'string') {
          columnName = arg;
        }
      }
    }

    if (column.as) {
      alias = column.as;
    }

    // Map function names to our supported types
    const supportedFunctions = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COUNT_DISTINCT'];
    if (!supportedFunctions.includes(functionName)) {
      result.warnings.push(`Unsupported aggregation function: ${functionName}`);
      return;
    }

    const aggregation: AggregationBlock = {
      id: aggId,
      column: columnName,
      function: functionName as any,
      alias,
      table: 'unknown'
    };

    result.aggregations.push(aggregation);
  }

  /**
   * Parse JOIN clause
   */
  private parseJoinClause(joins: any[], result: ASTParseResult): void {
    if (!Array.isArray(joins)) return;
    
    joins.forEach(join => {
      this.parseJoinItem(join, result);
    });
  }

  /**
   * Parse individual JOIN item
   */
  private parseJoinItem(join: any, result: ASTParseResult): void {
    const joinId = `join_${this.context.joinCounter++}`;
    
    // Parse the joined table
    if (join.from) {
      this.parseFromItem(join.from, result);
    }

    // Extract join information
    const joinType = this.normalizeJoinType(join.join);
    const onClause = join.on;

    if (onClause && onClause.length > 0) {
      onClause.forEach((condition: any) => {
        this.parseJoinCondition(condition, joinType, result);
      });
    }
  }

  /**
   * Parse JOIN condition
   */
  private parseJoinCondition(condition: any, joinType: string, result: ASTParseResult): void {
    if (condition.type !== 'binary_expr' || condition.operator !== '=') {
      result.warnings.push('Complex JOIN conditions are not fully supported');
      return;
    }

    const sourceColumn = this.extractColumnReference(condition.left);
    const targetColumn = this.extractColumnReference(condition.right);

    if (sourceColumn && targetColumn) {
      const joinRelation: JoinRelation = {
        id: `join_${this.context.joinCounter++}`,
        sourceTable: sourceColumn.table,
        targetTable: targetColumn.table,
        sourceColumn: sourceColumn.column,
        targetColumn: targetColumn.column,
        joinType: joinType as any
      };

      result.joins.push(joinRelation);
    }
  }

  /**
   * Parse WHERE clause
   */
  private parseWhereClause(where: any, result: ASTParseResult): void {
    if (Array.isArray(where)) {
      where.forEach(condition => this.parseWhereCondition(condition, result));
    } else {
      this.parseWhereCondition(where, result);
    }
  }

  /**
   * Parse WHERE condition
   */
  private parseWhereCondition(condition: any, result: ASTParseResult): void {
    if (!condition) return;

    const filterId = `filter_${this.context.filterCounter++}`;
    
    let columnName = '';
    let operator = 'equals';
    let value: string | string[] = '';
    let tableName = '';

    // Extract condition information
    if (condition.type === 'binary_expr') {
      columnName = this.extractColumnName(condition.left);
      operator = this.normalizeOperator(condition.operator);
      value = this.extractValue(condition.right);
      tableName = this.extractTableName(condition.left);
    } else if (condition.type === 'function') {
      // Handle function-based conditions (e.g., IS NULL, IS NOT NULL)
      columnName = this.extractColumnName(condition);
      operator = this.normalizeFunctionOperator(condition.name);
      value = '';
      tableName = this.extractTableName(condition);
    }

    if (columnName) {
      const filter: FilterCondition = {
        id: filterId,
        column: columnName,
        operator: operator as any,
        value,
        table: tableName || 'unknown'
      };

      result.filters.push(filter);
    }
  }

  /**
   * Parse GROUP BY clause
   */
  private parseGroupByClause(groupBy: any, result: ASTParseResult): void {
    if (Array.isArray(groupBy)) {
      groupBy.forEach(item => {
        const columnName = this.extractColumnName(item);
        if (columnName) {
          result.groupByColumns.push(columnName);
        }
      });
    }
  }

  /**
   * Parse HAVING clause
   */
  private parseHavingClause(having: any, result: ASTParseResult): void {
    // HAVING is similar to WHERE but for aggregated results
    this.parseWhereClause(having, result);
  }

  /**
   * Parse ORDER BY clause
   */
  private parseOrderByClause(orderBy: any, result: ASTParseResult): void {
    if (Array.isArray(orderBy)) {
      orderBy.forEach(item => {
        const columnName = this.extractColumnName(item.expr);
        const direction = item.type === 'DESC' ? 'DESC' : 'ASC';
        
        if (columnName) {
          result.orderByColumns.push({ column: columnName, direction });
        }
      });
    }
  }

  /**
   * Parse LIMIT clause
   */
  private parseLimitClause(limit: any, result: ASTParseResult): void {
    if (typeof limit === 'number') {
      result.limit = limit;
    } else if (limit && limit.value) {
      result.limit = parseInt(limit.value, 10);
    }
  }

  /**
   * Parse CTEs (Common Table Expressions)
   */
  private parseCTEs(withClause: any, result: ASTParseResult): void {
    if (Array.isArray(withClause)) {
      withClause.forEach(cte => {
        this.parseCTE(cte, result);
      });
    } else {
      this.parseCTE(withClause, result);
    }
  }

  /**
   * Parse individual CTE
   */
  private parseCTE(cte: any, result: ASTParseResult): void {
    if (cte.name && cte.stmt) {
      this.context.cteDefinitions.set(cte.name, cte.stmt);
      
      // Parse the CTE definition
      const cteResult = this.parseAST(cte.stmt, '');
      
      // Merge CTE results
      result.tables.push(...cteResult.tables);
      result.joins.push(...cteResult.joins);
      result.filters.push(...cteResult.filters);
      result.aggregations.push(...cteResult.aggregations);
      result.selectedColumns.push(...cteResult.selectedColumns);
      result.warnings.push(...cteResult.warnings);
    }
  }

  /**
   * Parse UNION statement
   */
  private parseUnionStatement(ast: any, result: ASTParseResult): void {
    // Parse left side
    if (ast.left) {
      const leftResult = this.parseAST(ast.left, '');
      this.mergeResults(result, leftResult);
    }

    // Parse right side
    if (ast.right) {
      const rightResult = this.parseAST(ast.right, '');
      this.mergeResults(result, rightResult);
    }

    result.warnings.push('UNION queries are partially supported');
  }

  // Helper methods

  private createEmptyResult(): ASTParseResult {
    return {
      tables: [],
      joins: [],
      filters: [],
      aggregations: [],
      selectedColumns: [],
      groupByColumns: [],
      orderByColumns: [],
      warnings: []
    };
  }

  private calculateTablePosition(index: number): { x: number; y: number } {
    const baseX = 100;
    const baseY = 100;
    const spacing = 300;
    
    return {
      x: baseX + (index % 3) * spacing,
      y: baseY + Math.floor(index / 3) * spacing
    };
  }

  private resolveTableReference(tableRef: any): string {
    if (typeof tableRef === 'string') {
      return tableRef;
    } else if (Array.isArray(tableRef)) {
      return tableRef[tableRef.length - 1]; // Last part is table name
    }
    return 'unknown';
  }

  private extractColumnName(expr: any): string {
    if (typeof expr === 'string') {
      return expr;
    } else if (expr && expr.type === 'column_ref') {
      return expr.column;
    }
    return '';
  }

  private extractTableName(expr: any): string {
    if (expr && expr.type === 'column_ref' && expr.table) {
      return this.resolveTableReference(expr.table);
    }
    return '';
  }

  private extractColumnReference(expr: any): { table: string; column: string } | null {
    if (expr && expr.type === 'column_ref') {
      return {
        table: this.resolveTableReference(expr.table) || 'unknown',
        column: expr.column
      };
    }
    return null;
  }

  private extractValue(expr: any): string | string[] {
    if (typeof expr === 'string' || typeof expr === 'number') {
      return expr.toString();
    } else if (expr && expr.type === 'string') {
      return expr.value;
    } else if (expr && expr.type === 'number') {
      return expr.value.toString();
    } else if (Array.isArray(expr)) {
      return expr.map(item => this.extractValue(item)).filter(Boolean);
    }
    return '';
  }

  private normalizeOperator(op: string): string {
    const operatorMap: { [key: string]: string } = {
      '=': 'equals',
      '!=': 'not_equals',
      '<>': 'not_equals',
      '>': 'greater_than',
      '<': 'less_than',
      '>=': 'greater_than',
      '<=': 'less_than',
      'LIKE': 'like',
      'IN': 'in',
      'IS': 'equals',
      'IS NOT': 'not_equals'
    };
    
    return operatorMap[op] || 'equals';
  }

  private normalizeFunctionOperator(funcName: string): string {
    const functionMap: { [key: string]: string } = {
      'ISNULL': 'is_null',
      'IS NOT NULL': 'is_not_null'
    };
    
    return functionMap[funcName] || 'equals';
  }

  private normalizeJoinType(joinType: string): string {
    const joinMap: { [key: string]: string } = {
      'INNER': 'INNER',
      'LEFT': 'LEFT',
      'RIGHT': 'RIGHT',
      'FULL': 'FULL',
      'CROSS': 'INNER' // Map CROSS to INNER for simplicity
    };
    
    return joinMap[joinType?.toUpperCase()] || 'INNER';
  }

  private parseFunctionExpression(expr: any): string {
    if (expr.name && expr.args) {
      const args = expr.args.map((arg: any) => this.extractValue(arg)).join(', ');
      return `${expr.name}(${args})`;
    }
    return 'function';
  }

  private isAggregationFunction(funcName: string): boolean {
    const aggFunctions = ['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COUNT_DISTINCT'];
    return aggFunctions.includes(funcName.toUpperCase());
  }

  private addUnsupportedFeatureWarnings(ast: any, result: ASTParseResult): void {
    if (ast.lock) {
      result.warnings.push('Lock hints are not supported');
    }
    if (ast.for) {
      result.warnings.push('FOR UPDATE clauses are not supported');
    }
    if (ast.with && ast.with.some((cte: any) => cte.recursive)) {
      result.warnings.push('Recursive CTEs are not fully supported');
    }
  }

  private mergeResults(target: ASTParseResult, source: ASTParseResult): void {
    target.tables.push(...source.tables);
    target.joins.push(...source.joins);
    target.filters.push(...source.filters);
    target.aggregations.push(...source.aggregations);
    target.selectedColumns.push(...source.selectedColumns);
    target.groupByColumns.push(...source.groupByColumns);
    target.orderByColumns.push(...source.orderByColumns);
    target.warnings.push(...source.warnings);
    
    if (source.limit && !target.limit) {
      target.limit = source.limit;
    }
  }
}

export default ASTParser;
