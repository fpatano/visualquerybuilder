import { profileCache } from '../utils/profileCache';
import { getTableProfile, getColumnProfile } from './databricksApi';
import { DataProfile, ProfileMode } from '../types';

export class BackgroundProfilingService {
  private isRunning = false;
  private catalogTables: string[] = [];
  private currentIndex = 0;

  constructor() {
    // Start background profiling when service is created
    this.startBackgroundProfiling();
  }

  // Add catalog tables for background profiling
  addCatalogTables(tables: string[]): void {
    // Filter out tables we already have fresh profiles for
    const newTables = tables.filter(tableKey => {
      const cached = profileCache.getProfile(tableKey);
      return !cached || cached.status === 'stale' || cached.status === 'error';
    });

    this.catalogTables.push(...newTables);
    console.log(`📚 Added ${newTables.length} new tables to background profiling queue`);
    
    // Start profiling if not already running
    if (!this.isRunning) {
      this.startBackgroundProfiling();
    }
  }

  // Start background profiling
  private async startBackgroundProfiling(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 Background profiling service started');
    
    try {
      while (this.catalogTables.length > 0 && this.isRunning) {
        // Process tables in small batches to be nice to the warehouse
        const batch = this.catalogTables.splice(0, 3);
        
        console.log(`📊 Processing batch of ${batch.length} tables for background profiling`);
        
        // Process batch concurrently
        const promises = batch.map(tableKey => this.profileTable(tableKey));
        await Promise.allSettled(promises);
        
        // Small delay between batches
        if (this.catalogTables.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    } catch (error) {
      console.error('Background profiling service error:', error);
    } finally {
      this.isRunning = false;
      console.log('✅ Background profiling service completed');
    }
  }

  // Profile a single table
  private async profileTable(tableKey: string): Promise<void> {
    try {
      console.log(`📊 Background profiling table: ${tableKey}`);
      
      // Parse table key
      const parts = tableKey.split('.');
      if (parts.length < 3) {
        console.warn(`Invalid table key format: ${tableKey}`);
        return;
      }
      
      const [catalog, schema, table] = parts;
      
      // Get table profile
      const tableProfile = await getTableProfile(catalog, schema, table, 'fast');
      
      // Store in cache
      profileCache.setProfile(tableKey, {
        key: tableKey,
        mode: 'fast',
        data: tableProfile,
        status: 'fresh',
        updatedAt: Date.now(),
        ttlMs: 10 * 60 * 1000 // 10 minutes
      });
      
      console.log(`✅ Background profiling completed for ${tableKey}`);
      
      // Queue column profiling for next batch
      if (tableProfile.metadata?.columnCount) {
        const columnCount = tableProfile.metadata.columnCount;
        for (let i = 0; i < Math.min(columnCount, 10); i++) { // Limit to first 10 columns
          const columnKey = `${tableKey}::${i}::fast`;
          profileCache.queueForProfiling(columnKey, 'normal');
        }
      }
      
    } catch (error) {
      console.error(`Failed to background profile ${tableKey}:`, error);
      
      // Store error in cache
      profileCache.setProfile(tableKey, {
        key: tableKey,
        mode: 'fast',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: Date.now(),
        ttlMs: 5 * 60 * 1000 // 5 minutes for errors
      });
    }
  }

  // Stop background profiling
  stop(): void {
    this.isRunning = false;
    console.log('⏹️ Background profiling service stopped');
  }

  // Get service status
  getStatus(): {
    isRunning: boolean;
    queueLength: number;
    processedCount: number;
    totalTables: number;
  } {
    return {
      isRunning: this.isRunning,
      queueLength: this.catalogTables.length,
      processedCount: this.currentIndex,
      totalTables: this.catalogTables.length + this.currentIndex
    };
  }

  // Manually trigger profiling of specific tables
  async profileTables(tableKeys: string[]): Promise<void> {
    console.log(`🔄 Manual profiling of ${tableKeys.length} tables`);
    
    for (const tableKey of tableKeys) {
      await this.profileTable(tableKey);
      // Small delay between tables
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
}

// Export singleton instance
export const backgroundProfiling = new BackgroundProfilingService();
