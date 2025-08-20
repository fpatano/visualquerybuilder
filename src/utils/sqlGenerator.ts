import { QueryState } from '../types';

export function generateSQL(queryState: QueryState): string {
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
    const joinType = join.joinType === 'INNER' ? 'INNER JOIN' : 
                    join.joinType === 'LEFT' ? 'LEFT JOIN' :
                    join.joinType === 'RIGHT' ? 'RIGHT JOIN' : 'FULL OUTER JOIN';
    
    const targetTable = tables.find(t => t.id === join.targetTable);
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

      if (sourceCol && targetCol && !compatible(sourceCol.dataType, targetCol.dataType)) {
        throw new Error(`Invalid JOIN: ${join.sourceTable}.${join.sourceColumn} (${sourceCol.dataType}) incompatible with ${join.targetTable}.${join.targetColumn} (${targetCol.dataType})`);
      }

      sql += `\n${joinType} ${targetTable.catalog}.${targetTable.schema}.${targetTable.name} AS ${join.targetTable}`;
      sql += `\n  ON ${join.sourceTable}.${join.sourceColumn} = ${join.targetTable}.${join.targetColumn}`;
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
  // Basic SQL parsing - this is a simplified implementation
  // In a production app, you'd want a more robust SQL parser
  
  const queryState: Partial<QueryState> = {
    tables: [],
    joins: [],
    filters: [],
    aggregations: [],
    selectedColumns: [],
    groupByColumns: [],
    orderByColumns: []
  };
  
  // This is a placeholder - implement proper SQL parsing based on your needs
  console.log('Parsing SQL:', sql);
  
  return queryState;
}
