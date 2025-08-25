/**
 * Comprehensive Tests for Robust SQL Parser
 * 
 * These tests ensure the SQL transpiler can handle:
 * - Basic SELECT queries
 * - JOINs (INNER, LEFT, RIGHT, FULL)
 * - CTEs (Common Table Expressions)
 * - Subqueries
 * - Window functions
 * - Complex WHERE clauses
 * - Aggregations and GROUP BY
 * - ORDER BY and LIMIT
 * - Round-trip conversion (SQL -> Canvas -> SQL)
 */

import { RobustSQLParser, parseSQL, generateSQL, validateRoundTrip } from './robust-parser';
import type { QueryState } from '../../types';

interface TestCase {
  name: string;
  sql: string;
  expectedTables?: number;
  expectedJoins?: number;
  expectedColumns?: number;
  expectedFilters?: number;
  expectedAggregations?: number;
  shouldSucceed?: boolean;
  description?: string;
}

/**
 * Test Suite for SQL Parsing
 */
export class SQLParserTestSuite {
  private parser: RobustSQLParser;
  private results: { passed: number; failed: number; tests: any[] } = {
    passed: 0,
    failed: 0,
    tests: []
  };

  constructor() {
    this.parser = new RobustSQLParser({ debugMode: true });
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting comprehensive SQL parser tests...\n');

    // Basic SQL queries
    await this.runBasicTests();
    
    // JOIN tests
    await this.runJoinTests();
    
    // Complex query tests
    await this.runComplexTests();
    
    // Databricks-specific tests
    await this.runDatabricksTests();
    
    // Round-trip tests
    await this.runRoundTripTests();
    
    // Error handling tests
    await this.runErrorTests();

    this.printResults();
  }

  /**
   * Basic SQL parsing tests
   */
  private async runBasicTests(): Promise<void> {
    console.log('📝 Running basic SQL tests...');

    const basicTests: TestCase[] = [
      {
        name: 'Simple SELECT *',
        sql: 'SELECT * FROM table1',
        expectedTables: 1,
        expectedColumns: 1,
        shouldSucceed: true
      },
      {
        name: 'SELECT with specific columns',
        sql: 'SELECT col1, col2 FROM table1',
        expectedTables: 1,
        expectedColumns: 2,
        shouldSucceed: true
      },
      {
        name: 'SELECT with table alias',
        sql: 'SELECT t1.col1, t1.col2 FROM table1 AS t1',
        expectedTables: 1,
        expectedColumns: 2,
        shouldSucceed: true
      },
      {
        name: 'SELECT with WHERE clause',
        sql: 'SELECT * FROM table1 WHERE col1 > 100',
        expectedTables: 1,
        expectedFilters: 1,
        shouldSucceed: true
      },
      {
        name: 'SELECT with aggregation',
        sql: 'SELECT COUNT(*), SUM(col1) FROM table1',
        expectedTables: 1,
        expectedAggregations: 2,
        shouldSucceed: true
      }
    ];

    for (const test of basicTests) {
      await this.runTest(test);
    }
  }

  /**
   * JOIN query tests
   */
  private async runJoinTests(): Promise<void> {
    console.log('🔗 Running JOIN tests...');

    const joinTests: TestCase[] = [
      {
        name: 'Simple INNER JOIN',
        sql: 'SELECT t1.col1, t2.col2 FROM table1 AS t1 INNER JOIN table2 AS t2 ON t1.id = t2.id',
        expectedTables: 2,
        expectedJoins: 1,
        expectedColumns: 2,
        shouldSucceed: true
      },
      {
        name: 'LEFT JOIN',
        sql: 'SELECT t1.col1, t2.col2 FROM table1 AS t1 LEFT JOIN table2 AS t2 ON t1.id = t2.ref_id',
        expectedTables: 2,
        expectedJoins: 1,
        expectedColumns: 2,
        shouldSucceed: true
      },
      {
        name: 'Multiple JOINs',
        sql: `SELECT t1.col1, t2.col2, t3.col3 
              FROM table1 AS t1 
              INNER JOIN table2 AS t2 ON t1.id = t2.id 
              LEFT JOIN table3 AS t3 ON t2.ref_id = t3.id`,
        expectedTables: 3,
        expectedJoins: 2,
        expectedColumns: 3,
        shouldSucceed: true
      },
      {
        name: 'FULL OUTER JOIN',
        sql: 'SELECT t1.col1, t2.col2 FROM table1 AS t1 FULL OUTER JOIN table2 AS t2 ON t1.id = t2.id',
        expectedTables: 2,
        expectedJoins: 1,
        expectedColumns: 2,
        shouldSucceed: true
      }
    ];

    for (const test of joinTests) {
      await this.runTest(test);
    }
  }

  /**
   * Complex query tests
   */
  private async runComplexTests(): Promise<void> {
    console.log('🔬 Running complex query tests...');

    const complexTests: TestCase[] = [
      {
        name: 'Query with GROUP BY and HAVING',
        sql: `SELECT dept, COUNT(*), AVG(salary) 
              FROM employees 
              WHERE active = 1 
              GROUP BY dept 
              HAVING COUNT(*) > 5 
              ORDER BY dept`,
        expectedTables: 1,
        expectedFilters: 1,
        expectedAggregations: 2,
        shouldSucceed: true
      },
      {
        name: 'Query with ORDER BY and LIMIT',
        sql: 'SELECT name, age FROM users ORDER BY age DESC LIMIT 10',
        expectedTables: 1,
        expectedColumns: 2,
        shouldSucceed: true
      },
      {
        name: 'Subquery in WHERE clause',
        sql: `SELECT name FROM users 
              WHERE id IN (SELECT user_id FROM orders WHERE total > 1000)`,
        expectedTables: 1,
        expectedColumns: 1,
        shouldSucceed: true // May have limited subquery support
      },
      {
        name: 'Common Table Expression (CTE)',
        sql: `WITH high_value_customers AS (
                SELECT user_id, SUM(total) as total_spent
                FROM orders
                GROUP BY user_id
                HAVING SUM(total) > 5000
              )
              SELECT u.name, hvc.total_spent
              FROM users u
              INNER JOIN high_value_customers hvc ON u.id = hvc.user_id`,
        expectedTables: 2,
        expectedJoins: 1,
        expectedColumns: 2,
        shouldSucceed: true // CTE support may be limited
      }
    ];

    for (const test of complexTests) {
      await this.runTest(test);
    }
  }

  /**
   * Databricks-specific SQL tests
   */
  private async runDatabricksTests(): Promise<void> {
    console.log('🏢 Running Databricks-specific tests...');

    const databricksTests: TestCase[] = [
      {
        name: 'Three-part table names',
        sql: 'SELECT t1.col1, t2.col2 FROM catalog1.schema1.table1 AS t1 INNER JOIN catalog2.schema2.table2 AS t2 ON t1.id = t2.id',
        expectedTables: 2,
        expectedJoins: 1,
        expectedColumns: 2,
        shouldSucceed: true,
        description: 'Tests Databricks catalog.schema.table naming'
      },
      {
        name: 'Window functions',
        sql: `SELECT 
                name, 
                salary, 
                ROW_NUMBER() OVER (PARTITION BY dept ORDER BY salary DESC) as rank
              FROM employees`,
        expectedTables: 1,
        expectedColumns: 3,
        shouldSucceed: true,
        description: 'Tests window function support'
      },
      {
        name: 'Delta table operations',
        sql: 'SELECT * FROM delta.`/path/to/table` WHERE _change_type != "delete"',
        expectedTables: 1,
        expectedFilters: 1,
        shouldSucceed: true,
        description: 'Tests Delta table path syntax'
      }
    ];

    for (const test of databricksTests) {
      await this.runTest(test);
    }
  }

  /**
   * Round-trip conversion tests
   */
  private async runRoundTripTests(): Promise<void> {
    console.log('🔄 Running round-trip conversion tests...');

    const roundTripTests = [
      'SELECT * FROM table1',
      'SELECT t1.col1, t2.col2 FROM table1 AS t1 INNER JOIN table2 AS t2 ON t1.id = t2.id',
      'SELECT COUNT(*), dept FROM employees WHERE active = 1 GROUP BY dept ORDER BY dept',
      'SELECT name, age FROM users WHERE age > 25 ORDER BY age DESC LIMIT 10'
    ];

    for (const sql of roundTripTests) {
      await this.runRoundTripTest(sql);
    }
  }

  /**
   * Error handling tests
   */
  private async runErrorTests(): Promise<void> {
    console.log('❌ Running error handling tests...');

    const errorTests: TestCase[] = [
      {
        name: 'Invalid SQL syntax',
        sql: 'SELECT FROM WHERE',
        shouldSucceed: false,
        description: 'Should handle invalid SQL gracefully'
      },
      {
        name: 'Unsupported features',
        sql: 'CREATE TABLE test (id INT)',
        shouldSucceed: false,
        description: 'Should reject DDL statements'
      },
      {
        name: 'Empty SQL',
        sql: '',
        shouldSucceed: false,
        description: 'Should handle empty input'
      }
    ];

    for (const test of errorTests) {
      await this.runTest(test);
    }
  }

  /**
   * Run a single test case
   */
  private async runTest(testCase: TestCase): Promise<void> {
    const { name, sql, expectedTables, expectedJoins, expectedColumns, expectedFilters, expectedAggregations, shouldSucceed = true } = testCase;

    try {
      const startTime = Date.now();
      const result = this.parser.parseSQL(sql);
      const duration = Date.now() - startTime;

      const testResult: any = {
        name,
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        duration,
        success: result.success,
        expected: shouldSucceed,
        passed: result.success === shouldSucceed
      };

      if (result.success && result.data) {
        const data = result.data;
        testResult.extracted = {
          tables: data.tables?.length || 0,
          joins: data.joins?.length || 0,
          columns: data.selectedColumns?.length || 0,
          filters: data.filters?.length || 0,
          aggregations: data.aggregations?.length || 0
        };

        // Check expectations
        if (expectedTables !== undefined && data.tables?.length !== expectedTables) {
          testResult.passed = false;
          testResult.error = `Expected ${expectedTables} tables, got ${data.tables?.length}`;
        }
        if (expectedJoins !== undefined && data.joins?.length !== expectedJoins) {
          testResult.passed = false;
          testResult.error = `Expected ${expectedJoins} joins, got ${data.joins?.length}`;
        }
        if (expectedColumns !== undefined && data.selectedColumns?.length !== expectedColumns) {
          testResult.passed = false;
          testResult.error = `Expected ${expectedColumns} columns, got ${data.selectedColumns?.length}`;
        }
        if (expectedFilters !== undefined && data.filters?.length !== expectedFilters) {
          testResult.passed = false;
          testResult.error = `Expected ${expectedFilters} filters, got ${data.filters?.length}`;
        }
        if (expectedAggregations !== undefined && data.aggregations?.length !== expectedAggregations) {
          testResult.passed = false;
          testResult.error = `Expected ${expectedAggregations} aggregations, got ${data.aggregations?.length}`;
        }
      } else if (shouldSucceed) {
        testResult.passed = false;
        testResult.error = result.errors.join(', ');
      }

      if (testResult.passed) {
        this.results.passed++;
        console.log(`  ✅ ${name} (${duration}ms)`);
      } else {
        this.results.failed++;
        console.log(`  ❌ ${name} (${duration}ms)`);
        if (testResult.error) {
          console.log(`     Error: ${testResult.error}`);
        }
      }

      this.results.tests.push(testResult);

    } catch (error) {
      this.results.failed++;
      console.log(`  ❌ ${name} - Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      this.results.tests.push({
        name,
        sql: sql.substring(0, 100),
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Run round-trip test
   */
  private async runRoundTripTest(sql: string): Promise<void> {
    try {
      const startTime = Date.now();
      const result = await this.parser.validateRoundTrip(sql);
      const duration = Date.now() - startTime;

      if (result.success && result.isEquivalent) {
        this.results.passed++;
        console.log(`  ✅ Round-trip: ${sql.substring(0, 50)}... (${duration}ms)`);
      } else {
        this.results.failed++;
        console.log(`  ❌ Round-trip: ${sql.substring(0, 50)}... (${duration}ms)`);
        if (result.differences.length > 0) {
          console.log(`     Differences: ${result.differences.join(', ')}`);
        }
        if (result.errors.length > 0) {
          console.log(`     Errors: ${result.errors.join(', ')}`);
        }
      }

      this.results.tests.push({
        name: `Round-trip: ${sql.substring(0, 30)}...`,
        type: 'round-trip',
        sql: sql.substring(0, 100),
        duration,
        passed: result.success && result.isEquivalent,
        equivalent: result.isEquivalent,
        differences: result.differences,
        errors: result.errors
      });

    } catch (error) {
      this.results.failed++;
      console.log(`  ❌ Round-trip exception: ${sql.substring(0, 50)}...`);
      console.log(`     Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Print test results summary
   */
  private printResults(): void {
    console.log('\n📊 Test Results Summary:');
    console.log(`  Total tests: ${this.results.passed + this.results.failed}`);
    console.log(`  Passed: ${this.results.passed}`);
    console.log(`  Failed: ${this.results.failed}`);
    console.log(`  Success rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);

    if (this.results.failed > 0) {
      console.log('\n❌ Failed tests:');
      this.results.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`  - ${test.name}: ${test.error || 'Unknown error'}`);
        });
    }
  }

  /**
   * Get detailed test results
   */
  getResults(): any {
    return this.results;
  }
}

/**
 * Performance benchmarks
 */
export class SQLParserBenchmarks {
  private parser: RobustSQLParser;

  constructor() {
    this.parser = new RobustSQLParser({ debugMode: false });
  }

  async runBenchmarks(): Promise<void> {
    console.log('⚡ Running performance benchmarks...\n');

    const queries = [
      'SELECT * FROM table1',
      'SELECT t1.col1, t2.col2 FROM table1 AS t1 INNER JOIN table2 AS t2 ON t1.id = t2.id',
      `SELECT dept, COUNT(*), AVG(salary) 
       FROM employees 
       WHERE active = 1 
       GROUP BY dept 
       HAVING COUNT(*) > 5 
       ORDER BY dept LIMIT 100`,
      `WITH high_value AS (SELECT user_id, SUM(total) as total FROM orders GROUP BY user_id)
       SELECT u.name, hv.total FROM users u INNER JOIN high_value hv ON u.id = hv.user_id`
    ];

    for (const sql of queries) {
      await this.benchmarkQuery(sql);
    }
  }

  private async benchmarkQuery(sql: string): Promise<void> {
    const iterations = 100;
    const times: number[] = [];

    // Warm up
    for (let i = 0; i < 10; i++) {
      this.parser.parseSQL(sql);
    }

    // Benchmark
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      this.parser.parseSQL(sql);
      times.push(Date.now() - start);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    console.log(`Query: ${sql.substring(0, 50)}...`);
    console.log(`  Average: ${avg.toFixed(2)}ms`);
    console.log(`  Min: ${min}ms, Max: ${max}ms`);
    console.log(`  Iterations: ${iterations}\n`);
  }
}

// Export test runner functions
export async function runAllTests(): Promise<void> {
  const testSuite = new SQLParserTestSuite();
  await testSuite.runAllTests();
}

export async function runBenchmarks(): Promise<void> {
  const benchmarks = new SQLParserBenchmarks();
  await benchmarks.runBenchmarks();
}

// Auto-run tests in development
if (typeof window === 'undefined' && process.env.NODE_ENV === 'development') {
  // Only run in Node.js environment during development
  runAllTests().catch(console.error);
}
