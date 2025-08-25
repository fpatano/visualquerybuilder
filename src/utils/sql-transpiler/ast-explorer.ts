/**
 * AST Explorer for dt-sql-parser
 * 
 * This utility helps us understand the AST structure from dt-sql-parser
 * so we can properly implement the extraction methods in robust-parser.ts
 */

import { Parser } from 'node-sql-parser';

export function exploreAST(sql: string): void {
  console.log('🔍 Exploring AST for SQL:', sql);
  
  const parser = new Parser();
  
  try {
    const ast = parser.astify(sql);
    console.log('📊 AST Structure:', JSON.stringify(ast, null, 2));
    
    // Analyze structure
    if (ast) {
      console.log('📋 AST Analysis:');
      if (Array.isArray(ast)) {
        console.log('- Type: Array of', ast.length, 'statements');
        if (ast.length > 0) {
          console.log('- First statement type:', (ast[0] as any).type);
          console.log('- Keys:', Object.keys(ast[0]));
        }
      } else {
        console.log('- Type:', (ast as any).type);
        console.log('- Keys:', Object.keys(ast));
      }
      
      // Look for common SQL elements
      analyzeNode(ast, 'tables');
      analyzeNode(ast, 'joins');
      analyzeNode(ast, 'columns');
      analyzeNode(ast, 'where');
      analyzeNode(ast, 'select');
    }
    
  } catch (error) {
    console.error('❌ AST parsing failed:', error);
  }
}

function analyzeNode(node: any, targetType: string, depth: number = 0): void {
  if (!node || depth > 5) return; // Prevent infinite recursion
  
  if (typeof node === 'object') {
    if (node.type === targetType) {
      console.log(`🎯 Found ${targetType}:`, node);
    }
    
    // Recursively search
    if (Array.isArray(node)) {
      node.forEach(child => analyzeNode(child, targetType, depth + 1));
    } else {
      Object.values(node).forEach(child => analyzeNode(child, targetType, depth + 1));
    }
  }
}

// Test with sample queries
export function runASTTests(): void {
  console.log('🧪 Running AST exploration tests...\n');
  
  const testQueries = [
    'SELECT * FROM catalog.schema.table1 AS t1',
    'SELECT t1.col1, t2.col2 FROM catalog.schema.table1 AS t1 INNER JOIN catalog.schema.table2 AS t2 ON t1.id = t2.id',
    'SELECT COUNT(*) FROM catalog.schema.table1 WHERE col1 > 100',
    'WITH cte AS (SELECT * FROM catalog.schema.table1) SELECT * FROM cte',
    'SELECT col1, COUNT(*) OVER (PARTITION BY col2) FROM catalog.schema.table1'
  ];
  
  testQueries.forEach((sql, index) => {
    console.log(`\n--- Test ${index + 1} ---`);
    exploreAST(sql);
  });
}

// Export for testing
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  // Only run in Node.js environment during development
  runASTTests();
}
