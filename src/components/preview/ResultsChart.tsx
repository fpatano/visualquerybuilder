import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, AreaChart, Area
} from 'recharts';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, Zap as ScatterIcon, AreaChart as AreaChartIcon } from 'lucide-react';
import { QueryResult } from '../../types';

interface ResultsChartProps {
  queryResult: QueryResult;
}

type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area';

const ResultsChart: React.FC<ResultsChartProps> = ({ queryResult }) => {
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxis, setXAxis] = useState<string>('');
  const [yAxis, setYAxis] = useState<string>('');
  
  const { columns, rows } = queryResult;

  // Process data for charts
  const chartData = useMemo(() => {
    if (!xAxis || !yAxis || rows.length === 0) return [];

    const xIndex = columns.indexOf(xAxis);
    const yIndex = columns.indexOf(yAxis);

    if (xIndex === -1 || yIndex === -1) return [];

    // Group data by X axis value and aggregate Y values
    const dataMap = new Map();
    
    rows.forEach(row => {
      const xValue = row[xIndex];
      const yValue = row[yIndex];
      
      if (xValue != null && yValue != null) {
        const key = String(xValue);
        if (dataMap.has(key)) {
          // For numeric values, sum them; for non-numeric, count occurrences
          if (typeof yValue === 'number') {
            dataMap.set(key, dataMap.get(key) + yValue);
          } else {
            dataMap.set(key, dataMap.get(key) + 1);
          }
        } else {
          dataMap.set(key, typeof yValue === 'number' ? yValue : 1);
        }
      }
    });

    return Array.from(dataMap.entries()).map(([key, value]) => ({
      [xAxis]: key,
      [yAxis]: value,
      name: key,
      value: value
    }));
  }, [columns, rows, xAxis, yAxis]);

  // Auto-select appropriate columns for initial display
  React.useEffect(() => {
    if (columns.length >= 2 && !xAxis && !yAxis) {
      setXAxis(columns[0]);
      setYAxis(columns[1]);
    }
  }, [columns, xAxis, yAxis]);

  // Determine if columns are numeric
  const isNumericColumn = (columnName: string): boolean => {
    const columnIndex = columns.indexOf(columnName);
    if (columnIndex === -1) return false;
    
    return rows.slice(0, 10).every(row => {
      const value = row[columnIndex];
      return value == null || typeof value === 'number';
    });
  };

  const numericColumns = columns.filter(isNumericColumn);
  const allColumns = columns;

  const COLORS = ['#FF6B35', '#00A1C9', '#1B3139', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];

  const chartTypes = [
    { type: 'bar' as ChartType, icon: BarChart3, label: 'Bar Chart' },
    { type: 'line' as ChartType, icon: LineChartIcon, label: 'Line Chart' },
    { type: 'area' as ChartType, icon: AreaChartIcon, label: 'Area Chart' },
    { type: 'pie' as ChartType, icon: PieChartIcon, label: 'Pie Chart' },
    { type: 'scatter' as ChartType, icon: ScatterIcon, label: 'Scatter Plot' },
  ];

  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-databricks-dark-gray">
            <div className="text-4xl mb-4">📊</div>
            <p className="text-lg mb-1">Select columns to visualize</p>
            <p className="text-sm opacity-70">Choose X and Y axis columns from the dropdowns above</p>
          </div>
        </div>
      );
    }

    const commonProps = {
      width: '100%',
      height: 400,
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 60 }
    };

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer {...commonProps}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis 
                dataKey={xAxis} 
                tick={{ fontSize: 12, fill: '#666666' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12, fill: '#666666' }} />
              <Tooltip 
                formatter={(value: any) => [value, yAxis]}
                labelFormatter={(label) => `${xAxis}: ${label}`}
              />
              <Bar dataKey={yAxis} fill="#00A1C9" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer {...commonProps}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis 
                dataKey={xAxis} 
                tick={{ fontSize: 12, fill: '#666666' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12, fill: '#666666' }} />
              <Tooltip 
                formatter={(value: any) => [value, yAxis]}
                labelFormatter={(label) => `${xAxis}: ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey={yAxis} 
                stroke="#00A1C9" 
                strokeWidth={2}
                dot={{ fill: '#00A1C9', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer {...commonProps}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis 
                dataKey={xAxis} 
                tick={{ fontSize: 12, fill: '#666666' }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12, fill: '#666666' }} />
              <Tooltip 
                formatter={(value: any) => [value, yAxis]}
                labelFormatter={(label) => `${xAxis}: ${label}`}
              />
              <Area 
                type="monotone" 
                dataKey={yAxis} 
                stroke="#00A1C9" 
                fill="#00A1C9" 
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [value, yAxis]} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer {...commonProps}>
            <ScatterChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis 
                dataKey={xAxis} 
                tick={{ fontSize: 12, fill: '#666666' }}
                type="number"
              />
              <YAxis 
                dataKey={yAxis} 
                tick={{ fontSize: 12, fill: '#666666' }}
                type="number"
              />
              <Tooltip 
                formatter={(value: any, name: string) => [value, name]}
                labelFormatter={() => ''}
              />
              <Scatter dataKey={yAxis} fill="#00A1C9" />
            </ScatterChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  if (columns.length < 2) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-databricks-dark-gray">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-lg mb-1">Not enough data for visualization</p>
          <p className="text-sm opacity-70">Your query needs at least 2 columns to create a chart</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Chart Controls */}
      <div className="p-4 border-b border-databricks-medium-gray bg-databricks-light-gray">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Chart Type Selector */}
          <div>
            <label className="block text-sm font-medium text-databricks-dark-gray mb-2">
              Chart Type
            </label>
            <div className="flex flex-wrap gap-2">
              {chartTypes.map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors ${
                    chartType === type
                      ? 'bg-databricks-blue text-white'
                      : 'bg-white text-databricks-dark-gray hover:bg-databricks-medium-gray'
                  }`}
                  title={label}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* X Axis Selector */}
          <div>
            <label className="block text-sm font-medium text-databricks-dark-gray mb-2">
              X Axis
            </label>
            <select
              value={xAxis}
              onChange={(e) => setXAxis(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-databricks-medium-gray rounded-md focus:outline-none focus:ring-2 focus:ring-databricks-blue"
            >
              <option value="">Select column...</option>
              {allColumns.map(column => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </div>

          {/* Y Axis Selector */}
          <div>
            <label className="block text-sm font-medium text-databricks-dark-gray mb-2">
              Y Axis
            </label>
            <select
              value={yAxis}
              onChange={(e) => setYAxis(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-databricks-medium-gray rounded-md focus:outline-none focus:ring-2 focus:ring-databricks-blue"
            >
              <option value="">Select column...</option>
              {chartType === 'scatter' ? numericColumns : allColumns}
              {(chartType === 'scatter' ? numericColumns : allColumns).map(column => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex-1 p-4 overflow-auto">
        {renderChart()}
      </div>

      {/* Chart Info */}
      {chartData.length > 0 && (
        <div className="px-4 py-2 bg-databricks-light-gray border-t border-databricks-medium-gray">
          <div className="text-xs text-databricks-dark-gray">
            Showing {chartData.length} data points from {rows.length} rows
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsChart;
