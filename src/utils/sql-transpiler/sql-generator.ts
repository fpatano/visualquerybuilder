/**
 * SQL Generator - Converts Canvas State back to SQL
 * 
 * This module handles the generation of SQL queries from the visual canvas state
 * with proper formatting, optimization, and best practices
 */

import type { 
  QueryState, 
  TableNode, 
  JoinRelation, 
  SelectColumn, 
  FilterCondition, 
  AggregationBlock 
} from '../../types';

export interface SQLGenerationOptions {
  formatOutput?: boolean;
  useTableAliases?: boolean;
  includeComments?: boolean;
  optimizeJoins?: boolean;
  dialect?: 'mysql' | 'postgresql' | 'oracle' | 'mssql' | 'sqlite' | 'bigquery';
  indentSize?: number;
  maxLineLength?: number;
}

export interface SQLGenerationResult {
  sql: string;
  warnings: string[];
  metadata: {
    tableCount: number;
    joinCount: number;
    filterCount: number;
    aggregationCount: number;
    complexity: 'simple' | 'medium' | 'complex';
  };
}

/**
 * SQL Generator for converting Canvas State to SQL
 */
export class SQLGenerator {
  private options: Required<SQLGenerationOptions>;
  private tableAliases: Map<string, string> = new Map();
  private columnAliases: Map<string, string> = new Map();
  private indentLevel: number = 0;

  constructor(options: SQLGenerationOptions = {}) {
    this.options = {
      formatOutput: true,
      useTableAliases: true,
      includeComments: true,
      optimizeJoins: true,
      dialect: 'mysql',
      indentSize: 2,
      maxLineLength: 120,
      ...options
    };
  }

  /**
   * Generate SQL from canvas state
   */
  generateSQL(canvasState: QueryState): SQLGenerationResult {
    try {
      // Reset state
      this.resetState();
      
      // Validate input
      const validationErrors = this.validateCanvasState(canvasState);
      if (validationErrors.length > 0) {
        throw new Error(`Canvas state validation failed: ${validationErrors.join(', ')}`);
      }

      // Generate SQL parts
      const selectClause = this.generateSelectClause(canvasState);
      const fromClause = this.generateFromClause(canvasState);
      const joinClause = this.generateJoinClause(canvasState);
      const whereClause = this.generateWhereClause(canvasState);
      const groupByClause = this.generateGroupByClause(canvasState);
      const havingClause = this.generateHavingClause(canvasState);
      const orderByClause = this.generateOrderByClause(canvasState);
      const limitClause = this.generateLimitClause(canvasState);

      // Combine all clauses
      const sql = this.combineClauses(
        selectClause,
        fromClause,
        joinClause,
        whereClause,
        groupByClause,
        havingClause,
        orderByClause,
        limitClause
      );

      // Format if requested
      const formattedSQL = this.options.formatOutput ? this.formatSQL(sql) : sql;

      // Analyze complexity
      const complexity = this.analyzeComplexity(canvasState);

      return {
        sql: formattedSQL,
        warnings: this.generateWarnings(canvasState),
        metadata: {
          tableCount: canvasState.tables.length,
          joinCount: canvasState.joins.length,
          filterCount: canvasState.filters.length,
          aggregationCount: canvasState.aggregations.length,
          complexity
        }
      };

    } catch (error) {
      throw new Error(`SQL generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate SELECT clause
   */
  private generateSelectClause(canvasState: QueryState): string {
    if (canvasState.selectedColumns.length === 0) {
      return 'SELECT *';
    }

    const columns = canvasState.selectedColumns.map(col => {
      let columnRef = this.formatColumnReference(col.column, col.table);
      
      if (col.alias) {
        columnRef += ` AS ${this.quoteIdentifier(col.alias)}`;
      }
      
      return columnRef;
    });

    // Add aggregation columns
    canvasState.aggregations.forEach(agg => {
      let aggColumn = `${agg.function}(${this.formatColumnReference(agg.column, agg.table)})`;
      
      if (agg.alias) {
        aggColumn += ` AS ${this.quoteIdentifier(agg.alias)}`;
      }
      
      columns.push(aggColumn);
    });

    return `SELECT ${columns.join(', ')}`;
  }

  /**
   * Generate FROM clause
   */
  private generateFromClause(canvasState: QueryState): string {
    if (canvasState.tables.length === 0) {
      throw new Error('No tables specified in canvas state');
    }

    const tables = canvasState.tables.map(table => {
      let tableRef = this.formatTableReference(table);
      
      if (this.options.useTableAliases) {
        const alias = this.generateTableAlias(table);
        this.tableAliases.set(table.id, alias);
        tableRef += ` AS ${this.quoteIdentifier(alias)}`;
      }
      
      return tableRef;
    });

    return `FROM ${tables.join(', ')}`;
  }

  /**
   * Generate JOIN clause
   */
  private generateJoinClause(canvasState: QueryState): string {
    if (canvasState.joins.length === 0) {
      return '';
    }

    // Optimize join order if requested
    const joins = this.options.optimizeJoins 
      ? this.optimizeJoinOrder(canvasState.joins)
      : canvasState.joins;

    const joinClauses = joins.map(join => {
      const sourceTable = this.getTableById(join.sourceTable, canvasState);
      const targetTable = this.getTableById(join.targetTable, canvasState);
      
      if (!sourceTable || !targetTable) {
        throw new Error(`Invalid join: table not found`);
      }

      const sourceAlias = this.options.useTableAliases 
        ? this.tableAliases.get(join.sourceTable) || join.sourceTable
        : join.sourceTable;
      
      const targetAlias = this.options.useTableAliases 
        ? this.tableAliases.get(join.targetTable) || join.targetTable
        : join.targetTable;

      const sourceColumn = this.formatColumnReference(join.sourceColumn, sourceAlias);
      const targetColumn = this.formatColumnReference(join.targetColumn, targetAlias);

      return `${join.joinType} JOIN ${this.formatTableReference(targetTable)} AS ${this.quoteIdentifier(targetAlias)} ON ${sourceColumn} = ${targetColumn}`;
    });

    return joinClauses.join('\n');
  }

  /**
   * Generate WHERE clause
   */
  private generateWhereClause(canvasState: QueryState): string {
    if (canvasState.filters.length === 0) {
      return '';
    }

    const conditions = canvasState.filters.map(filter => {
      const columnRef = this.formatColumnReference(filter.column, filter.table);
      const operator = this.normalizeOperator(filter.operator);
      const value = this.formatValue(filter.value, filter.operator);

      return `${columnRef} ${operator} ${value}`;
    });

    return `WHERE ${conditions.join(' AND ')}`;
  }

  /**
   * Generate GROUP BY clause
   */
  private generateGroupByClause(canvasState: QueryState): string {
    if (canvasState.groupByColumns.length === 0) {
      return '';
    }

    const columns = canvasState.groupByColumns.map(col => {
      return this.formatColumnReference(col, 'unknown');
    });

    return `GROUP BY ${columns.join(', ')}`;
  }

  /**
   * Generate HAVING clause
   */
  private generateHavingClause(canvasState: QueryState): string {
    // HAVING is typically used with aggregations, but we'll keep it simple for now
    return '';
  }

  /**
   * Generate ORDER BY clause
   */
  private generateOrderByClause(canvasState: QueryState): string {
    if (canvasState.orderByColumns.length === 0) {
      return '';
    }

    const columns = canvasState.orderByColumns.map(col => {
      const columnRef = this.formatColumnReference(col.column, 'unknown');
      return `${columnRef} ${col.direction}`;
    });

    return `ORDER BY ${columns.join(', ')}`;
  }

  /**
   * Generate LIMIT clause
   */
  private generateLimitClause(canvasState: QueryState): string {
    if (!canvasState.limit) {
      return '';
    }

    return `LIMIT ${canvasState.limit}`;
  }

  /**
   * Combine all SQL clauses
   */
  private combineClauses(...clauses: string[]): string {
    const nonEmptyClauses = clauses.filter(clause => clause.trim().length > 0);
    
    if (nonEmptyClauses.length === 0) {
      return 'SELECT 1';
    }

    return nonEmptyClauses.join('\n');
  }

  /**
   * Format SQL for readability
   */
  private formatSQL(sql: string): string {
    if (!this.options.formatOutput) {
      return sql;
    }

    // Simple formatting - in a real implementation, you might use a proper SQL formatter
    let formatted = sql;
    
    // Add line breaks after major clauses
    formatted = formatted.replace(/\b(FROM|WHERE|GROUP BY|ORDER BY|LIMIT)\b/gi, '\n$1');
    
    // Add indentation
    const lines = formatted.split('\n');
    const indentedLines = lines.map((line, index) => {
      if (index === 0) return line;
      if (line.trim().length === 0) return line;
      
      const indent = ' '.repeat(this.options.indentSize);
      return indent + line;
    });

    return indentedLines.join('\n');
  }

  /**
   * Format column reference
   */
  private formatColumnReference(column: string, table: string): string {
    if (table === 'unknown' || !table) {
      return this.quoteIdentifier(column);
    }

    const tableAlias = this.options.useTableAliases 
      ? this.tableAliases.get(table) || table
      : table;

    return `${this.quoteIdentifier(tableAlias)}.${this.quoteIdentifier(column)}`;
  }

  /**
   * Format table reference
   */
  private formatTableReference(table: TableNode): string {
    const parts = [];
    
    if (table.catalog && table.catalog !== 'default') {
      parts.push(this.quoteIdentifier(table.catalog));
    }
    
    if (table.schema && table.schema !== 'default') {
      parts.push(this.quoteIdentifier(table.schema));
    }
    
    parts.push(this.quoteIdentifier(table.name));
    
    return parts.join('.');
  }

  /**
   * Format value based on operator
   */
  private formatValue(value: string | string[], operator: string): string {
    if (Array.isArray(value)) {
      if (operator === 'in') {
        const formattedValues = value.map(v => this.quoteValue(v));
        return `(${formattedValues.join(', ')})`;
      }
      return value.map(v => this.quoteValue(v)).join(', ');
    }

    return this.quoteValue(value);
  }

  /**
   * Quote identifier based on dialect
   */
  private quoteIdentifier(identifier: string): string {
    if (!identifier || identifier.includes('.')) {
      return identifier;
    }

    switch (this.options.dialect) {
      case 'mysql':
        return `\`${identifier}\``;
      case 'postgresql':
      case 'bigquery':
        return `"${identifier}"`;
      case 'oracle':
      case 'mssql':
        return `[${identifier}]`;
      default:
        return `"${identifier}"`;
    }
  }

  /**
   * Quote value
   */
  private quoteValue(value: string): string {
    if (typeof value === 'number' || !isNaN(Number(value))) {
      return value.toString();
    }

    if (value.toLowerCase() === 'null') {
      return 'NULL';
    }

    if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
      return value.toLowerCase();
    }

    // Escape single quotes and wrap in single quotes
    const escaped = value.replace(/'/g, "''");
    return `'${escaped}'`;
  }

  /**
   * Normalize operator
   */
  private normalizeOperator(operator: string): string {
    const operatorMap: { [key: string]: string } = {
      'equals': '=',
      'not_equals': '!=',
      'greater_than': '>',
      'less_than': '<',
      'greater_than_or_equal': '>=',
      'less_than_or_equal': '<=',
      'like': 'LIKE',
      'in': 'IN',
      'is_null': 'IS NULL',
      'is_not_null': 'IS NOT NULL'
    };

    return operatorMap[operator] || '=';
  }

  /**
   * Generate table alias
   */
  private generateTableAlias(table: TableNode): string {
    // Generate a short, meaningful alias
    const name = table.name.toLowerCase();
    const words = name.split(/[_\s]+/);
    const alias = words.map(word => word.charAt(0)).join('').substring(0, 3);
    
    return alias || 't';
  }

  /**
   * Get table by ID
   */
  private getTableById(id: string, canvasState: QueryState): TableNode | undefined {
    return canvasState.tables.find(table => table.id === id);
  }

  /**
   * Optimize join order for better performance
   */
  private optimizeJoinOrder(joins: JoinRelation[]): JoinRelation[] {
    // Simple optimization: prioritize INNER joins and smaller tables first
    return [...joins].sort((a, b) => {
      // INNER joins first
      if (a.joinType === 'INNER' && b.joinType !== 'INNER') return -1;
      if (b.joinType === 'INNER' && a.joinType !== 'INNER') return 1;
      
      // Then by join type
      const joinOrder = { 'INNER': 0, 'LEFT': 1, 'RIGHT': 2, 'FULL': 3 };
      return joinOrder[a.joinType] - joinOrder[b.joinType];
    });
  }

  /**
   * Validate canvas state
   */
  private validateCanvasState(canvasState: QueryState): string[] {
    const errors: string[] = [];

    if (!canvasState.tables || canvasState.tables.length === 0) {
      errors.push('At least one table must be specified');
    }

    if (canvasState.joins) {
      canvasState.joins.forEach(join => {
        if (!canvasState.tables.find(t => t.id === join.sourceTable)) {
          errors.push(`Join source table '${join.sourceTable}' not found`);
        }
        if (!canvasState.tables.find(t => t.id === join.targetTable)) {
          errors.push(`Join target table '${join.targetTable}' not found`);
        }
      });
    }

    if (canvasState.filters) {
      canvasState.filters.forEach(filter => {
        if (!canvasState.tables.find(t => t.id === filter.table)) {
          errors.push(`Filter table '${filter.table}' not found`);
        }
      });
    }

    return errors;
  }

  /**
   * Analyze query complexity
   */
  private analyzeComplexity(canvasState: QueryState): 'simple' | 'medium' | 'complex' {
    const tableCount = canvasState.tables.length;
    const joinCount = canvasState.joins.length;
    const filterCount = canvasState.filters.length;
    const aggregationCount = canvasState.aggregations.length;

    const complexityScore = tableCount + joinCount * 2 + filterCount + aggregationCount * 1.5;

    if (complexityScore <= 3) return 'simple';
    if (complexityScore <= 8) return 'medium';
    return 'complex';
  }

  /**
   * Generate warnings for the query
   */
  private generateWarnings(canvasState: QueryState): string[] {
    const warnings: string[] = [];

    // Check for potential performance issues
    if (canvasState.joins.length > 5) {
      warnings.push('Query has many joins which may impact performance');
    }

    if (canvasState.filters.length > 10) {
      warnings.push('Query has many filters which may impact performance');
    }

    // Check for missing indexes
    if (canvasState.joins.some(join => 
      !canvasState.filters.some(filter => 
        filter.table === join.sourceTable && filter.column === join.sourceColumn
      )
    )) {
      warnings.push('Some join columns may benefit from indexes');
    }

    // Check for SELECT *
    if (canvasState.selectedColumns.length === 0) {
      warnings.push('Using SELECT * - consider specifying only needed columns');
    }

    return warnings;
  }

  /**
   * Reset generator state
   */
  private resetState(): void {
    this.tableAliases.clear();
    this.columnAliases.clear();
    this.indentLevel = 0;
  }
}

// Export convenience functions
export function generateSQL(canvasState: QueryState, options?: SQLGenerationOptions): string {
  const generator = new SQLGenerator(options);
  const result = generator.generateSQL(canvasState);
  return result.sql;
}

export function generateSQLWithMetadata(canvasState: QueryState, options?: SQLGenerationOptions): SQLGenerationResult {
  const generator = new SQLGenerator(options);
  return generator.generateSQL(canvasState);
}

export { SQLGenerator as default };
