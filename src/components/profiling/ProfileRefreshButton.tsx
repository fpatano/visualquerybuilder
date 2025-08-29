import React, { useState } from 'react';
import { RefreshCw, Database, BarChart3, Loader2 } from 'lucide-react';
import { profileCache } from '../../utils/profileCache';
import { backgroundProfiling } from '../../services/backgroundProfiling';

interface ProfileRefreshButtonProps {
  className?: string;
  variant?: 'button' | 'icon' | 'full';
}

const ProfileRefreshButton: React.FC<ProfileRefreshButtonProps> = ({ 
  className = '', 
  variant = 'button' 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cacheStats, setCacheStats] = useState(() => profileCache.getCacheStats());

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      console.log('🔄 Manual profile refresh initiated');
      
      // Refresh all cached profiles
      await profileCache.refreshAll();
      
      // Update cache stats
      setCacheStats(profileCache.getCacheStats());
      
      console.log('✅ Profile refresh completed');
    } catch (error) {
      console.error('Profile refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear all cached profiling data? This will require re-profiling all tables.')) {
      profileCache.clearAll();
      setCacheStats(profileCache.getCacheStats());
      console.log('🗑️ Profile cache cleared');
    }
  };

  const getStatusColor = () => {
    const { freshEntries, staleEntries, errorEntries } = cacheStats;
    
    if (errorEntries > 0) return 'text-red-600';
    if (staleEntries > 0) return 'text-yellow-600';
    if (freshEntries > 0) return 'text-green-600';
    return 'text-gray-600';
  };

  const getStatusText = () => {
    const { freshEntries, staleEntries, errorEntries, isProfiling } = cacheStats;
    
    if (isProfiling) return 'Profiling...';
    if (errorEntries > 0) return `${errorEntries} errors`;
    if (staleEntries > 0) return `${staleEntries} stale`;
    if (freshEntries > 0) return `${freshEntries} fresh`;
    return 'No data';
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${className}`}
        title="Refresh profiling data"
      >
        {isRefreshing ? (
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        ) : (
          <RefreshCw className="w-4 h-4 text-gray-600" />
        )}
      </button>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 shadow-sm ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Profile Cache Status</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {isRefreshing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              <span>Refresh</span>
            </button>
            <button
              onClick={handleClearCache}
              className="px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Database className="w-3 h-3 text-blue-600" />
              <span className="text-gray-600">Total:</span>
              <span className="font-medium">{cacheStats.totalEntries}</span>
            </div>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-3 h-3 text-green-600" />
              <span className="text-gray-600">Fresh:</span>
              <span className="font-medium text-green-600">{cacheStats.freshEntries}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
              <span className="text-gray-600">Status:</span>
              <span className={`font-medium ${getStatusColor()}`}>{getStatusText()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-gray-400" />
              <span className="text-gray-600">Queue:</span>
              <span className="font-medium">{cacheStats.backgroundQueueLength}</span>
            </div>
          </div>
        </div>

        {cacheStats.isProfiling && (
          <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
            <div className="flex items-center space-x-2">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Background profiling in progress...</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default button variant
  return (
    <button
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={`flex items-center space-x-2 px-3 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors ${className}`}
    >
      {isRefreshing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <RefreshCw className="w-4 h-4" />
      )}
      <span>Refresh Profiles</span>
    </button>
  );
};

export default ProfileRefreshButton;
