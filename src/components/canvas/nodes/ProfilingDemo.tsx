import React from 'react';
import { MiniSparkline, CompletenessBars, TableProfileBadge, ColumnMicroProfile } from './TableNode';

// Demo component to showcase the new profiling features
const ProfilingDemo: React.FC = () => {
  // Sample data for demonstration
  const sampleTableProfile = {
    totalRows: 15420,
    nullCount: 1234,
    uniqueCount: 15420,
    dataType: 'TABLE',
    sampleValues: [],
    distribution: undefined,
    metadata: {
      columnCount: 18,
      nullableColumns: 3,
      tableSize: '2.3 MB',
      lastUpdated: '2024-01-15',
      profilingMethod: 'Enhanced: COUNT(*) + completeness',
      isApproximate: false,
      performanceNote: 'Fast profiling enabled',
      mode: 'fast' as const,
      updatedAt: '2024-01-15T10:30:00Z',
      completenessPercentage: 92
    }
  };

  const sampleColumnProfile = {
    totalRows: 15420,
    nullCount: 156,
    uniqueCount: 1247,
    dataType: 'INTEGER',
    sampleValues: [],
    distribution: {
      '0': 2340,
      '1': 1890,
      '2': 1567,
      '3': 1234,
      '4': 987,
      '5': 756,
      '6': 543,
      '7': 432,
      '8': 321,
      '9': 234,
      '10+': 1508
    },
    min: 0,
    max: 150,
    mean: 4.7,
    metadata: {
      isApproximate: true,
      profilingMethod: 'Enhanced: null count, distinct, numeric summary + distribution',
      performanceNote: 'Fast profiling with distribution data'
    }
  };

  const sampleStringColumnProfile = {
    totalRows: 15420,
    nullCount: 89,
    uniqueCount: 8923,
    dataType: 'STRING',
    sampleValues: [],
    distribution: {
      'SHORT': 5678,
      'MEDIUM': 6234,
      'LONG': 2345,
      'VERY_LONG': 1164
    },
    min: undefined,
    max: undefined,
    mean: undefined,
    metadata: {
      isApproximate: true,
      profilingMethod: 'Enhanced: null count, distinct, length distribution',
      performanceNote: 'Fast profiling with length categorization'
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Tufte-Inspired Data Profiling Demo
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Table Profile Badge Demo */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Table Profile Badge
            </h2>
            <div className="bg-databricks-blue text-white px-4 py-3 rounded-t-lg">
              <div className="text-sm font-semibold">Sample Table</div>
              <div className="text-xs opacity-90">samples.tpch.customer</div>
            </div>
            <div className="px-4 py-2 bg-databricks-light-gray border-b border-databricks-medium-gray">
              <TableProfileBadge 
                table={{ id: 'demo', name: 'customer', schema: 'tpch', catalog: 'samples', columns: [], position: { x: 0, y: 0 } }}
                profile={sampleTableProfile}
                isLoading={false}
              />
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-600">
                This badge shows row count, column count, and a visual completeness bar 
                that gives immediate insight into data quality.
              </p>
            </div>
          </div>

          {/* Column Micro-Profile Demo */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Column Micro-Profile
            </h2>
            <div className="space-y-4">
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">customer_id</div>
                    <div className="text-xs text-blue-600">INTEGER</div>
                  </div>
                  <ColumnMicroProfile 
                    column={{ name: 'customer_id', dataType: 'INTEGER' }}
                    profile={sampleColumnProfile}
                    isLoading={false}
                  />
                </div>
              </div>
              
              <div className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-900">customer_name</div>
                    <div className="text-xs text-green-600">STRING</div>
                  </div>
                  <ColumnMicroProfile 
                    column={{ name: 'customer_name', dataType: 'STRING' }}
                    profile={sampleStringColumnProfile}
                    isLoading={false}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                Each column shows a sparkline, completeness bars, and summary statistics 
                in a compact, information-rich format.
              </p>
            </div>
          </div>

          {/* Component Breakdown */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Component Breakdown
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Mini Sparkline</h3>
                <div className="flex items-center space-x-2">
                  <MiniSparkline data={[10, 15, 8, 20, 12, 18, 14, 16]} />
                  <span className="text-xs text-gray-500">Value distribution</span>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Completeness Bars</h3>
                <div className="flex items-center space-x-2">
                  <CompletenessBars nullPercentage={15} uniquePercentage={85} />
                  <span className="text-xs text-gray-500">Red: null%, Blue: unique%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Design Principles */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Tufte Design Principles
            </h2>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• <strong>Data-ink maximization:</strong> Every visual element conveys information</li>
              <li>• <strong>Minimal chartjunk:</strong> No unnecessary decorations or backgrounds</li>
              <li>• <strong>Information density:</strong> Maximum insight in minimum space</li>
              <li>• <strong>Clear hierarchy:</strong> Visual importance matches data importance</li>
              <li>• <strong>Efficient encoding:</strong> Sparklines and bars use space effectively</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Implementation Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 rounded">
              <h3 className="font-medium text-blue-800">Smart Caching</h3>
              <p className="text-sm text-blue-600">SWR-style caching with background refresh</p>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <h3 className="font-medium text-green-800">Progressive Loading</h3>
              <p className="text-sm text-green-600">Fast mode for immediate feedback</p>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <h3 className="font-medium text-purple-800">Type-Aware Profiling</h3>
              <p className="text-sm text-purple-600">Different strategies for numeric, string, and date columns</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilingDemo;
