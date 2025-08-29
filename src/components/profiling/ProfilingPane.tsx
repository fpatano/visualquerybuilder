import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Database, Hash, Percent, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { useQueryBuilder } from '../../contexts/QueryBuilderContext';
import ProfileRefreshButton from './ProfileRefreshButton';
import { backgroundProfiling } from '../../services/backgroundProfiling';

const ProfilingPane: React.FC = () => {
  const { state, loadDataProfile } = useQueryBuilder();
  const { selectedTable, selectedColumn, dataProfile, isLoadingProfile } = state;
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (selectedTable) {
      loadDataProfile(selectedTable, selectedColumn || undefined, 'fast');
    }
  }, [selectedTable, selectedColumn, loadDataProfile]);

  const renderTableProfile = () => {
    if (!dataProfile) return null;

    const distributionData = dataProfile.distribution 
      ? Object.entries(dataProfile.distribution).map(([key, value]) => ({
          name: key,
          value,
          percentage: ((value / dataProfile.totalRows) * 100).toFixed(1)
        }))
      : [];

    const COLORS = ['#FF6B35', '#00A1C9', '#1B3139', '#10B981', '#8B5CF6'];

    return (
      <div className="space-y-4">
        {/* Basic Statistics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-databricks-light-gray p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <Hash className="w-4 h-4 text-databricks-blue" />
              <span className="text-xs font-medium text-databricks-dark-gray">Total Rows</span>
            </div>
            <div className="text-lg font-semibold text-databricks-dark-blue">
              {dataProfile.totalRows.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-databricks-light-gray p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="w-4 h-4 text-databricks-orange" />
              <span className="text-xs font-medium text-databricks-dark-gray">Unique Values</span>
            </div>
            <div className="text-lg font-semibold text-databricks-dark-blue">
              {dataProfile.uniqueCount.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-databricks-light-gray p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-xs font-medium text-databricks-dark-gray">Null Count</span>
            </div>
            <div className="text-lg font-semibold text-databricks-dark-blue">
              {dataProfile.nullCount.toLocaleString()}
            </div>
          </div>
          
          <div className="bg-databricks-light-gray p-3 rounded-lg">
            <div className="flex items-center space-x-2 mb-1">
              <Percent className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium text-databricks-dark-gray">Completeness</span>
            </div>
            <div className="text-lg font-semibold text-databricks-dark-blue">
              {dataProfile.totalRows > 0 
                ? (((dataProfile.totalRows - dataProfile.nullCount) / dataProfile.totalRows) * 100).toFixed(1)
                : '0.0'
              }%
            </div>
          </div>
        </div>

        {/* Performance Notice */}
        {dataProfile.metadata?.isApproximate && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <Clock className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-xs">
                <p className="font-medium text-yellow-800 mb-1">
                  ⚡ {dataProfile.metadata.profilingMethod}
                </p>
                <p className="text-yellow-700">
                  {dataProfile.metadata.performanceNote}
                </p>
                {dataProfile.metadata.tableSize && (
                  <p className="text-yellow-600 mt-1">
                    Table size: {dataProfile.metadata.tableSize} • 
                    {dataProfile.metadata.columnCount} columns
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Data Quality Metrics */}
        <div>
          <h4 className="text-sm font-semibold text-databricks-dark-blue mb-3">Data Quality</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-lg p-3 border">
              <div className="text-xs text-databricks-gray mb-1">Null %</div>
              <div className="text-lg font-semibold text-databricks-dark-blue">
                {dataProfile.metadata?.nullPercentage?.toFixed(1) || '0.0'}%
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border">
              <div className="text-xs text-databricks-gray mb-1">~Unique Values</div>
              <div className="text-lg font-semibold text-databricks-dark-blue">
                {dataProfile.uniqueCount.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Numeric Stats (if available) */}
        {(dataProfile.min !== null || dataProfile.max !== null || dataProfile.mean !== null || dataProfile.stddev !== undefined) && (
          <div>
            <h4 className="text-sm font-semibold text-databricks-dark-blue mb-3">Numeric Range</h4>
            <div className="grid grid-cols-3 gap-2">
              {dataProfile.min !== null && (
                <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                  <div className="text-xs text-blue-700 mb-1">Min</div>
                  <div className="text-sm font-semibold text-blue-900">{dataProfile.min}</div>
                </div>
              )}
              {dataProfile.mean !== null && (
                <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                  <div className="text-xs text-green-700 mb-1">Avg</div>
                  <div className="text-sm font-semibold text-green-900">{Number(dataProfile.mean).toFixed(2)}</div>
                </div>
              )}
              {dataProfile.max !== null && (
                <div className="bg-red-50 rounded-lg p-2 border border-red-200">
                  <div className="text-xs text-red-700 mb-1">Max</div>
                  <div className="text-sm font-semibold text-red-900">{dataProfile.max}</div>
                </div>
              )}
            </div>
            {(dataProfile.percentiles || dataProfile.stddev !== undefined) && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {dataProfile.stddev !== undefined && (
                  <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
                    <div className="text-xs text-purple-700 mb-1">Std Dev</div>
                    <div className="text-sm font-semibold text-purple-900">{Number(dataProfile.stddev).toFixed(2)}</div>
                  </div>
                )}
                {dataProfile.percentiles && (
                  <div className="bg-white rounded-lg p-2 border">
                    <div className="text-xs text-databricks-dark-gray mb-1">Percentiles</div>
                    <div className="text-xs text-databricks-dark-blue space-x-2">
                      {dataProfile.percentiles.p25 !== undefined && <span>P25: {Number(dataProfile.percentiles.p25).toFixed(2)}</span>}
                      {dataProfile.percentiles.p50 !== undefined && <span>P50: {Number(dataProfile.percentiles.p50).toFixed(2)}</span>}
                      {dataProfile.percentiles.p75 !== undefined && <span>P75: {Number(dataProfile.percentiles.p75).toFixed(2)}</span>}
                      {dataProfile.percentiles.p90 !== undefined && <span>P90: {Number(dataProfile.percentiles.p90).toFixed(2)}</span>}
                      {dataProfile.percentiles.p99 !== undefined && <span>P99: {Number(dataProfile.percentiles.p99).toFixed(2)}</span>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Note about sample data */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <Database className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">📊 Sample Data</p>
              <p>View sample data in the <strong>Query Results</strong> pane below. Use <code>SELECT * FROM table LIMIT 10</code> or <code>TABLESAMPLE</code> for random sampling.</p>
            </div>
          </div>
        </div>

        {/* Value Distribution */}
        {distributionData.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-databricks-dark-blue mb-3">Top Values</h4>
            <div className="bg-white rounded-lg border">
              {/* Top-N frequency bars */}
              <div className="p-3 space-y-2">
                {distributionData.slice(0, 5).map((item, index) => {
                  const maxValue = Math.max(...distributionData.map(d => d.value));
                  const percentage = (item.value / maxValue) * 100;
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="text-xs font-medium text-databricks-dark-gray truncate">
                          {String(item.name)}
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-databricks-blue h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-databricks-dark-blue">
                        {item.value.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Mini chart for visual appeal */}
              {distributionData.length > 1 && (
                <div className="border-t p-2">
                  <div className="h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distributionData.slice(0, 8)}>
                        <XAxis hide />
                        <YAxis hide />
                        <Tooltip 
                          formatter={(value, name) => [`${value} occurrences`, 'Frequency']}
                          labelFormatter={(label) => `Value: ${label}`}
                        />
                        <Bar dataKey="value" fill="#0ea5e9" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderColumnProfile = () => {
    if (!dataProfile || !selectedColumn) return null;

    const distributionData = dataProfile.distribution 
      ? Object.entries(dataProfile.distribution).map(([key, value]) => ({
          name: key,
          value,
          percentage: ((value / dataProfile.totalRows) * 100).toFixed(1)
        }))
      : [];

    const COLORS = ['#FF6B35', '#00A1C9', '#1B3139', '#10B981', '#8B5CF6'];

    return (
      <div className="space-y-4">
        {/* Column Info */}
        <div className="bg-databricks-light-gray p-3 rounded-lg">
          <div className="text-sm font-medium text-databricks-dark-blue mb-1">
            Column: {selectedColumn.split('.').pop()}
          </div>
          <div className="text-xs text-databricks-dark-gray">
            Type: {dataProfile.dataType}
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white p-2 rounded border">
            <div className="text-xs text-databricks-dark-gray">Unique</div>
            <div className="text-sm font-semibold">{dataProfile.uniqueCount.toLocaleString()}</div>
          </div>
          <div className="bg-white p-2 rounded border">
            <div className="text-xs text-databricks-dark-gray">Nulls</div>
            <div className="text-sm font-semibold">{dataProfile.nullCount.toLocaleString()}</div>
          </div>
          {dataProfile.min !== undefined && (
            <div className="bg-white p-2 rounded border">
              <div className="text-xs text-databricks-dark-gray">Min</div>
              <div className="text-sm font-semibold">{String(dataProfile.min)}</div>
            </div>
          )}
          {dataProfile.max !== undefined && (
            <div className="bg-white p-2 rounded border">
              <div className="text-xs text-databricks-dark-gray">Max</div>
              <div className="text-sm font-semibold">{String(dataProfile.max)}</div>
            </div>
          )}
        </div>

        {/* Sample Values */}
        <div>
          <h4 className="text-sm font-semibold text-databricks-dark-blue mb-2">Sample Values</h4>
          <div className="space-y-1 max-h-24 overflow-y-auto">
            {dataProfile.sampleValues.slice(0, 5).map((value, index) => (
              <div key={index} className="text-sm text-databricks-dark-gray font-mono bg-white px-2 py-1 rounded text-xs">
                {String(value)}
              </div>
            ))}
          </div>
        </div>

        {/* Distribution Pie Chart */}
        {distributionData.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-databricks-dark-blue mb-2">Distribution</h4>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ percentage }) => `${percentage}%`}
                  labelLine={false}
                  fontSize={10}
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [value, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-databricks-medium-gray flex items-center justify-between">
        <h3 className="text-lg font-semibold text-databricks-dark-blue flex items-center space-x-2">
          <Database className="w-5 h-5" />
          <span>Data Profile</span>
        </h3>
        <div className="flex items-center space-x-2">
          <ProfileRefreshButton variant="full" />
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-databricks-dark-gray hover:text-databricks-blue transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            <span className="text-xs">{isExpanded ? 'Collapse' : 'Expand'}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Background Profiling Status */}
        {backgroundProfiling.getStatus().isRunning && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center space-x-2 text-blue-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Background profiling in progress...</span>
            </div>
          </div>
        )}
        
        {isLoadingProfile ? (
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 border-2 border-databricks-blue border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-databricks-dark-gray">Loading profile...</span>
            </div>
          </div>
        ) : !selectedTable && !selectedColumn ? (
          <div className="flex items-center justify-center h-32 text-center">
            <div className="text-databricks-dark-gray">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm mb-1">Select a table or column</p>
              <p className="text-xs opacity-70">from the catalog to view its profile</p>
            </div>
          </div>
        ) : selectedColumn ? (
          // Minimal column view
          <div className={`${isExpanded ? '' : ''} space-y-3`}>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-databricks-light-gray p-3 rounded-lg">
                <div className="text-xs text-databricks-dark-gray">Null Count</div>
                <div className="text-lg font-semibold text-databricks-dark-blue">{dataProfile?.nullCount?.toLocaleString?.() || 0}</div>
              </div>
              <div className="bg-databricks-light-gray p-3 rounded-lg">
                <div className="text-xs text-databricks-dark-gray">Distinct</div>
                <div className="text-lg font-semibold text-databricks-dark-blue">{dataProfile?.uniqueCount?.toLocaleString?.() || 0}</div>
              </div>
            </div>

            {/* Numeric summary */}
            {(dataProfile?.dataType || '').toLowerCase().match(/int|bigint|float|double|real|decimal|numeric/) ? (
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded border">
                  <div className="text-xs text-databricks-dark-gray">Min</div>
                  <div className="text-sm font-semibold">{String(dataProfile?.min ?? '')}</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-xs text-databricks-dark-gray">Avg</div>
                  <div className="text-sm font-semibold">{dataProfile?.mean != null ? Number(dataProfile.mean).toFixed(2) : ''}</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-xs text-databricks-dark-gray">Max</div>
                  <div className="text-sm font-semibold">{String(dataProfile?.max ?? '')}</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-xs text-databricks-dark-gray">Sum</div>
                  <div className="text-sm font-semibold">{/* sum stored in metadata if available */}{(dataProfile?.metadata as any)?.sum ?? ''}</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded border">
                  <div className="text-xs text-databricks-dark-gray">Avg Length</div>
                  <div className="text-sm font-semibold">{(dataProfile?.metadata as any)?.lengthAvg != null ? Number((dataProfile?.metadata as any)?.lengthAvg).toFixed(1) : ''}</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Minimal table view
          <div className={`${isExpanded ? '' : ''} space-y-3`}>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-databricks-light-gray p-3 rounded-lg">
                <div className="text-xs text-databricks-dark-gray">Row Count</div>
                <div className="text-lg font-semibold text-databricks-dark-blue">{dataProfile?.totalRows?.toLocaleString?.() || 0}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilingPane;
