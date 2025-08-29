import React, { useState, useEffect } from 'react';
import { Play, Square, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface WarehouseStatus {
  status: 'RUNNING' | 'STOPPED' | 'STARTING' | 'STOPPING' | 'UNKNOWN';
  message: string;
}

export default function Header() {
  const [warehouseStatus, setWarehouseStatus] = useState<WarehouseStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkWarehouseStatus = async () => {
    try {
      setIsChecking(true);
      const response = await fetch('/api/warehouse/status', { method: 'POST' });
      const result = await response.json();
      setWarehouseStatus(result);
    } catch (error) {
      console.error('Failed to check warehouse status:', error);
      setWarehouseStatus({ status: 'UNKNOWN', message: 'Failed to check status' });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Check warehouse status on component mount
    checkWarehouseStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkWarehouseStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    if (isChecking) return <Loader2 className="w-4 h-4 animate-spin" />;
    
    switch (warehouseStatus?.status) {
      case 'RUNNING':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'STARTING':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
      case 'STOPPED':
        return <Square className="w-4 h-4 text-red-500" />;
      case 'STOPPING':
        return <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    if (isChecking) return 'Checking...';
    return warehouseStatus?.status || 'Unknown';
  };

  const getStatusColor = () => {
    switch (warehouseStatus?.status) {
      case 'RUNNING':
        return 'text-green-600';
      case 'STARTING':
        return 'text-blue-600';
      case 'STOPPED':
        return 'text-red-600';
      case 'STOPPING':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-semibold text-gray-900">Visual SQL Query Builder</h1>
          
          {/* Warehouse Status Indicator */}
          <div className="flex items-center space-x-2 px-3 py-1 bg-gray-50 rounded-lg border">
            <span className="text-sm text-gray-600">Warehouse:</span>
            <div className="flex items-center space-x-1">
              {getStatusIcon()}
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
            Import
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
            Export
          </button>
          <button className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-md hover:bg-orange-600">
            Run Query
          </button>
          <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
            Cancel
          </button>
          <button className="p-2 text-gray-700 hover:text-gray-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
