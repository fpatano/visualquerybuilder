/**
 * Test the simple parser with the actual SQL
 */

import { parseSQLSimple } from './simple-parser';

const testSQL = `
SELECT customer.*
FROM samples.tpch.customer AS customer
INNER JOIN samples.tpch.orders AS orders
  ON customer.c_custkey = orders.o_custkey
`;

console.log('🧪 Testing Simple Parser');
console.log('Input SQL:', testSQL);

const result = parseSQLSimple(testSQL);

console.log('📊 Parse Result:');
console.log('Tables:', result.tables?.map(t => ({ id: t.id, name: t.name, catalog: t.catalog, schema: t.schema })));
console.log('Joins:', result.joins?.map(j => ({ id: j.id, sourceTable: j.sourceTable, targetTable: j.targetTable, sourceColumn: j.sourceColumn, targetColumn: j.targetColumn, joinType: j.joinType })));
console.log('Selected Columns:', result.selectedColumns?.map(c => ({ id: c.id, table: c.table, column: c.column })));

export { result as testResult };
