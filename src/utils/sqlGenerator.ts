import { QueryState, ParsedSQL } from '../types';
import { RobustSQLParser, parseSQL as parseRobustSQL, generateSQL as generateRobustSQL } from './sql-transpiler/robust-parser';
import { SQLTranspiler } from './sql-transpiler';

// Create a singleton parser instance for better performance
const robustParser = new RobustSQLParser({
  debugMode: process.env.NODE_ENV === 'development'
});

// Create a singleton transpiler instance for better performance
const transpiler = new SQLTranspiler({
  debugMode: process.env.NODE_ENV === 'development',
  preserveUserPositions: true,
  enableColumnFetching: false // Disabled for performance in real-time generation
});

export function generateSQL(queryState: QueryState): string {
  // Multi-level fallback strategy for maximum reliability
  
  // Level 1: Try the robust parser (direct AST-based approach)
  try {
    const result = robustParser.generateSQL(queryState);
    if (result.success && result.sql) {
      console.log('✅ Using robust SQL generation (Level 1)');
      return result.sql;
    } else {
      console.warn('⚠️ Robust SQL generation failed (Level 1), trying transpiler (Level 2):', result.errors);
    }
  } catch (error) {
    console.warn('🚨 Robust SQL generation error (Level 1), trying transpiler (Level 2):', error);
  }
  
  // Level 2: Try the transpiler (higher-level orchestrator)
  try {
    const result = transpiler.canvasToSQL(queryState);
    if (result.success && result.data) {
      console.log('✅ Using transpiler SQL generation (Level 2)');
      return result.data;
    } else {
      console.warn('⚠️ Transpiler SQL generation failed (Level 2), falling back to legacy (Level 3):', result.errors);
    }
  } catch (error) {
    console.warn('🚨 Transpiler SQL generation error (Level 2), falling back to legacy (Level 3):', error);
  }
  
  // Level 3: Fallback to legacy generator
  try {
    const sql = generateSQLLegacy(queryState);
    console.log('⚠️ Using legacy SQL generation (Level 3)');
    return sql;
  } catch (legacyError) {
    console.error('🚨 All SQL generation methods failed:', legacyError);
    return '-- SQL generation failed: All methods exhausted';
  }
}

// Legacy SQL generator as fallback
function generateSQLLegacy(queryState: QueryState): string {
  const { tables, joins, filters, aggregations, selectedColumns, groupByColumns, orderByColumns, limit } = queryState;
  
  if (tables.length === 0) {
    return '';
  }

  let sql = 'SELECT ';
  
  // Build SELECT clause
  const selectParts: string[] = [];
  
  // Add selected columns
  selectedColumns.forEach(col => {
    const tableName = `${col.table}`;
    const columnRef = `${tableName}.${col.column}`;
    const selectPart = col.alias ? `${columnRef} AS ${col.alias}` : columnRef;
    selectParts.push(selectPart);
  });
  
  // Add aggregations
  aggregations.forEach(agg => {
    const tableName = `${agg.table}`;
    const columnRef = `${tableName}.${agg.column}`;
    const aggFunc = `${agg.function}(${columnRef})`;
    const selectPart = agg.alias ? `${aggFunc} AS ${agg.alias}` : aggFunc;
    selectParts.push(selectPart);
  });
  
  // If no columns selected, select all from first table
  if (selectParts.length === 0 && tables.length > 0) {
    selectParts.push(`${tables[0].id}.*`);
  }
  
  sql += selectParts.join(', ');
  
  // Build FROM clause
  sql += `\nFROM ${tables[0].catalog}.${tables[0].schema}.${tables[0].name} AS ${tables[0].id}`;
  
  // Build JOIN clauses
  joins.forEach(join => {
    console.log('🔗 Processing join in generator:', { join, availableTables: tables.map(t => ({ id: t.id, name: t.name })) });
    const joinType = join.joinType === 'INNER' ? 'INNER JOIN' : 
                    join.joinType === 'LEFT' ? 'LEFT JOIN' :
                    join.joinType === 'RIGHT' ? 'RIGHT JOIN' : 'FULL OUTER JOIN';
    
    const targetTable = tables.find(t => t.id === join.targetTable);
    console.log('🔍 Looking for targetTable:', join.targetTable, 'found:', targetTable?.id);
    if (targetTable) {
      // Basic compatibility guard: block obviously invalid joins if we have types on columns
      // Note: ColumnInfo.type naming aligns with Unity Catalog type names (string, int, bigint, decimal, date, timestamp, etc.)
      const sourceTableMeta = tables.find(t => t.id === join.sourceTable);
      const sourceCol = sourceTableMeta?.columns?.find(c => c.name === join.sourceColumn);
      const targetCol = targetTable.columns?.find(c => c.name === join.targetColumn);

      const normalizeType = (t?: string) => (t || '').toLowerCase().split('(')[0];
      const compatible = (a: string, b: string) => {
        if (!a || !b) return true; // if unknown, don't block here (UI should validate earlier)
        const x = normalizeType(a);
        const y = normalizeType(b);
        if (x === y) return true;
        const numeric = new Set(['tinyint','smallint','int','integer','bigint','float','double','real','decimal','numeric']);
        if (numeric.has(x) && numeric.has(y)) return true; // allow numeric family
        return false;
      };

      let joinIsCompatible = true;
      if (sourceCol && targetCol && !compatible(sourceCol.dataType, targetCol.dataType)) {
        joinIsCompatible = false;
        // Do not throw: add a comment and skip this JOIN to avoid crashing the UI
        sql += `\n-- Skipped invalid JOIN: ${join.sourceTable}.${join.sourceColumn} (${sourceCol.dataType}) incompatible with ${join.targetTable}.${join.targetColumn} (${targetCol.dataType})`;
      }

      if (joinIsCompatible) {
        sql += `\n${joinType} ${targetTable.catalog}.${targetTable.schema}.${targetTable.name} AS ${join.targetTable}`;
        sql += `\n  ON ${join.sourceTable}.${join.sourceColumn} = ${join.targetTable}.${join.targetColumn}`;
      }
    } else {
      // Target table not found; add a helpful comment and continue
      console.log('❌ Target table not found for join:', { targetTable: join.targetTable, availableTables: tables.map(t => t.id) });
      sql += `\n-- Skipped JOIN: target table not found for ${join.targetTable}`;
    }
  });
  
  // Build WHERE clause
  if (filters.length > 0) {
    sql += '\nWHERE ';
    const filterParts: string[] = [];
    
    filters.forEach(filter => {
      const columnRef = `${filter.table}.${filter.column}`;
      let condition = '';
      
      switch (filter.operator) {
        case 'equals':
          condition = `${columnRef} = '${filter.value}'`;
          break;
        case 'not_equals':
          condition = `${columnRef} != '${filter.value}'`;
          break;
        case 'greater_than':
          condition = `${columnRef} > '${filter.value}'`;
          break;
        case 'less_than':
          condition = `${columnRef} < '${filter.value}'`;
          break;
        case 'like':
          condition = `${columnRef} LIKE '%${filter.value}%'`;
          break;
        case 'in':
          const values = Array.isArray(filter.value) ? filter.value : [filter.value];
          condition = `${columnRef} IN (${values.map(v => `'${v}'`).join(', ')})`;
          break;
        case 'is_null':
          condition = `${columnRef} IS NULL`;
          break;
        case 'is_not_null':
          condition = `${columnRef} IS NOT NULL`;
          break;
      }
      
      filterParts.push(condition);
    });
    
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

export function parseSQL(sql: string): Partial<QueryState> {
  // Multi-level fallback strategy for maximum reliability
  
  // Level 1: Try the robust parser (direct AST-based approach)
  try {
    const result = robustParser.parseSQL(sql);
    if (result.success && result.data) {
      console.log('✅ Using robust SQL parsing (Level 1)');
      return result.data;
    } else {
      console.warn('⚠️ Robust SQL parsing failed (Level 1), trying transpiler (Level 2):', result.errors);
    }
  } catch (error) {
    console.warn('🚨 Robust SQL parsing error (Level 1), trying transpiler (Level 2):', error);
  }
  
  // Level 2: Skip transpiler for now due to async nature (would require API change)
  // TODO: Consider making parseSQL async in the future
  
  // Level 3: Fallback to legacy parser
  try {
    const result = parseSQLLegacy(sql);
    console.log('⚠️ Using legacy SQL parsing (Level 3)');
    return result;
  } catch (legacyError) {
    console.error('🚨 All SQL parsing methods failed:', legacyError);
    return {};
  }
}

// Legacy SQL parser as fallback
function parseSQLLegacy(sql: string): Partial<QueryState> {
  const parsed = quickParse(sql);
  if (!parsed) return {};

  const tablesMap = new Map<string, { id: string; catalog: string; schema: string; name: string }>();
  const tables = parsed.tables.map((t) => {
    // Preserve the original alias from SQL instead of generating new IDs
    const id = t.alias;
    tablesMap.set(t.alias, { id, catalog: t.catalog, schema: t.schema, name: t.name });
    return {
      id,
      name: t.name,
      schema: t.schema,
      catalog: t.catalog,
      columns: [],
      position: { x: 200 + tablesMap.size * 220, y: 160 }
    };
  });

  const joins = parsed.joins.map(j => {
    const left = tablesMap.get(j.leftAlias);
    const right = tablesMap.get(j.rightAlias);
    if (!left || !right) {
      console.warn('❌ Join references missing table:', { leftAlias: j.leftAlias, rightAlias: j.rightAlias, availableTables: Array.from(tablesMap.keys()) });
      return null as any;
    }
    const joinResult = {
      id: `${left.id}.${j.leftColumn}__${right.id}.${j.rightColumn}`,
      sourceTable: left.id,
      targetTable: right.id,
      sourceColumn: j.leftColumn,
      targetColumn: j.rightColumn,
      joinType: j.joinType
    };
    return joinResult;
  }).filter(Boolean);

  const selectedColumns = parsed.selects.map(s => ({
    id: `${s.alias}.${s.column}`,
    table: tablesMap.get(s.alias || '')?.id || tables[0]?.id || '',
    column: s.column,
    alias: s.as
  })).filter(sc => sc.table);

  return { tables, joins, selectedColumns } as Partial<QueryState>;
}

// Very lightweight parser for common patterns (catalog.schema.table alias, INNER/LEFT/RIGHT/FULL ... ON a.col = b.col)
function quickParse(sql: string): ParsedSQL | null {
  const text = sql.replace(/\s+/g, ' ').trim();
  console.log('🔍 Parsing SQL:', text);
  
  if (!/from\s+/i.test(text)) {
    console.log('❌ No FROM clause found');
    return null;
  }

  // SELECT list
  const selectMatch = text.match(/^select\s+(.*?)\s+from\s+/i);
  const selects: any[] = [];
  if (selectMatch) {
    const sel = selectMatch[1];
    sel.split(',').map(s => s.trim()).forEach(part => {
      // alias.col [AS name]
      const m = part.match(/^(\w+)\.(\w+)(?:\s+as\s+(\w+))?$/i);
      if (m) selects.push({ alias: m[1], column: m[2], as: m[3] });
    });
  }

  // FROM tables with aliases
  const fromToEnd = text.split(/\sfrom\s/i)[1] || '';
  const whereSplit = fromToEnd.split(/\swhere\s/i)[0];
  const fromPart = whereSplit;

  // Match both explicit (AS alias) and implicit (table alias) patterns
  const tableRegex = /(\w+)\.(\w+)\.(\w+)\s+(?:as\s+)?(\w+)/ig;
  const tables: any[] = [];
  let tm: RegExpExecArray | null;
  while ((tm = tableRegex.exec(fromPart))) {
    tables.push({ catalog: tm[1], schema: tm[2], name: tm[3], alias: tm[4] });
  }
  console.log('🔍 Parsed tables:', tables);
  
  if (tables.length === 0) {
    console.log('❌ No tables found with pattern catalog.schema.table [AS] alias');
    return null;
  }

  // Joins - handle multiple patterns
  const joins: any[] = [];
  
  // Pattern 1: JOIN catalog.schema.table [AS] alias ON alias1.col = alias2.col
  const joinRegex1 = /(inner|left|right|full)?\s*join\s+(\w+)\.(\w+)\.(\w+)\s+(?:as\s+)?(\w+)\s+on\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/ig;
  let jm1: RegExpExecArray | null;
  while ((jm1 = joinRegex1.exec(fromPart))) {
    const jt = (jm1[1] || 'INNER').toUpperCase();
    joins.push({
      joinType: (jt === 'INNER' || jt === 'LEFT' || jt === 'RIGHT' || jt === 'FULL') ? jt : 'INNER',
      leftAlias: jm1[6],
      leftColumn: jm1[7],
      rightAlias: jm1[8],
      rightColumn: jm1[9]
    });
  }
  
  // Pattern 2: JOIN table_name [AS] alias ON alias1.col = alias2.col (without full qualification)
  const joinRegex2 = /(inner|left|right|full)?\s*join\s+(\w+)\s+(?:as\s+)?(\w+)\s+on\s+(\w+)\.(\w+)\s*=\s*(\w+)\.(\w+)/ig;
  let jm2: RegExpExecArray | null;
  while ((jm2 = joinRegex2.exec(fromPart))) {
    const jt = (jm2[1] || 'INNER').toUpperCase();
    joins.push({
      joinType: (jt === 'INNER' || jt === 'LEFT' || jt === 'RIGHT' || jt === 'FULL') ? jt : 'INNER',
      leftAlias: jm2[4],
      leftColumn: jm2[5],
      rightAlias: jm2[6],
      rightColumn: jm2[7]
    });
  }
  
  console.log('🔍 Parsed:', { tables: tables.length, joins: joins.length, selects: selects.length });

  return { tables, joins, selects } as ParsedSQL;
}
