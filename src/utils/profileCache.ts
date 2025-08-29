import { DataProfile, ProfileMode } from '../types';

export interface ProfileCacheEntry {
  key: string;
  mode: ProfileMode;
  data?: DataProfile;
  status: 'fresh' | 'stale' | 'loading' | 'error';
  error?: string;
  updatedAt?: number;
  ttlMs: number;
  lastAccessed?: number;
}

export interface BackgroundProfilingConfig {
  enabled: boolean;
  idleDelay: number; // ms to wait before starting background profiling
  batchSize: number; // how many tables to profile in each batch
  maxConcurrent: number; // max concurrent profiling requests
  priorityTables: string[]; // tables to profile first (recently accessed)
}

export class ProfileCacheManager {
  private memoryCache = new Map<string, ProfileCacheEntry>();
  private backgroundQueue: string[] = [];
  private isProfiling = false;
  private idleTimer: NodeJS.Timeout | null = null;
  private config: BackgroundProfilingConfig;

  constructor(config: Partial<BackgroundProfilingConfig> = {}) {
    this.config = {
      enabled: true,
      idleDelay: 5000, // 5 seconds
      batchSize: 3,
      maxConcurrent: 2,
      priorityTables: [],
      ...config
    };

    this.loadFromStorage();
    this.setupIdleDetection();
  }

  // Get profile from cache (fastest path)
  getProfile(key: string): ProfileCacheEntry | null {
    const cached = this.memoryCache.get(key);
    if (cached && !this.isExpired(cached)) {
      // Update last accessed for LRU
      cached.lastAccessed = Date.now();
      this.memoryCache.set(key, cached);
      this.saveToStorage();
      return cached;
    }
    return null;
  }

  // Store profile in cache
  setProfile(key: string, profile: ProfileCacheEntry): void {
    profile.lastAccessed = Date.now();
    this.memoryCache.set(key, profile);
    
    // Add to priority list for background profiling
    if (!this.config.priorityTables.includes(key)) {
      this.config.priorityTables.unshift(key);
      this.config.priorityTables = this.config.priorityTables.slice(0, 50); // Keep last 50
    }
    
    this.saveToStorage();
  }

  // Check if profile is expired
  private isExpired(entry: ProfileCacheEntry): boolean {
    if (!entry.updatedAt) return true;
    return Date.now() - entry.updatedAt > entry.ttlMs;
  }

  // Get TTL for profile mode
  private getTtl(mode: ProfileMode): number {
    switch (mode) {
      case 'fast': return 10 * 60 * 1000; // 10 minutes
      case 'standard': return 30 * 60 * 1000; // 30 minutes
      case 'deep': return 24 * 60 * 60 * 1000; // 24 hours
      default: return 10 * 60 * 1000;
    }
  }

  // Queue table for background profiling
  queueForProfiling(tableKey: string, priority: 'high' | 'normal' = 'normal'): void {
    if (!this.config.enabled) return;
    
    // Remove if already in queue
    this.backgroundQueue = this.backgroundQueue.filter(k => k !== tableKey);
    
    if (priority === 'high') {
      this.backgroundQueue.unshift(tableKey); // Add to front
    } else {
      this.backgroundQueue.push(tableKey); // Add to back
    }
    
    this.scheduleBackgroundProfiling();
  }

  // Schedule background profiling after idle period
  private scheduleBackgroundProfiling(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    
    this.idleTimer = setTimeout(() => {
      this.startBackgroundProfiling();
    }, this.config.idleDelay);
  }

  // Start background profiling
  private async startBackgroundProfiling(): Promise<void> {
    if (this.isProfiling || this.backgroundQueue.length === 0) return;
    
    this.isProfiling = true;
    console.log(`🚀 Starting background profiling of ${this.backgroundQueue.length} tables`);
    
    try {
      // Process in batches
      while (this.backgroundQueue.length > 0 && this.isProfiling) {
        const batch = this.backgroundQueue.splice(0, this.config.batchSize);
        
        // Process batch concurrently
        const promises = batch.map(tableKey => this.profileTable(tableKey));
        await Promise.allSettled(promises);
        
        // Small delay between batches to be nice to the warehouse
        if (this.backgroundQueue.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('Background profiling error:', error);
    } finally {
      this.isProfiling = false;
      console.log('✅ Background profiling completed');
    }
  }

  // Profile a single table (this would call your existing profiling functions)
  private async profileTable(tableKey: string): Promise<void> {
    try {
      console.log(`📊 Background profiling: ${tableKey}`);
      
      // This is where you'd call your existing getTableProfile/getColumnProfile
      // For now, we'll just mark it as loading
      const entry: ProfileCacheEntry = {
        key: tableKey,
        mode: 'fast',
        status: 'loading',
        updatedAt: Date.now(),
        ttlMs: this.getTtl('fast')
      };
      
      this.setProfile(tableKey, entry);
      
      // TODO: Actually call your profiling functions here
      // const profile = await getTableProfile(catalog, schema, table);
      // this.setProfile(tableKey, { ...entry, data: profile, status: 'fresh' });
      
    } catch (error) {
      console.error(`Failed to profile ${tableKey}:`, error);
      const entry: ProfileCacheEntry = {
        key: tableKey,
        mode: 'fast',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: Date.now(),
        ttlMs: this.getTtl('fast')
      };
      this.setProfile(tableKey, entry);
    }
  }

  // Stop background profiling
  stopBackgroundProfiling(): void {
    this.isProfiling = false;
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  // Manual refresh of specific table
  async refreshTable(tableKey: string): Promise<void> {
    // Remove from cache to force refresh
    this.memoryCache.delete(tableKey);
    
    // Queue for immediate profiling
    this.queueForProfiling(tableKey, 'high');
    
    // Start profiling immediately
    setTimeout(() => this.startBackgroundProfiling(), 100);
  }

  // Manual refresh of all tables
  async refreshAll(): Promise<void> {
    console.log('🔄 Manual refresh of all profiling data');
    
    // Get all table keys from cache
    const tableKeys = Array.from(this.memoryCache.keys())
      .filter(key => !key.includes('::')) // Only table-level keys
      .map(key => key.split('::')[0]);
    
    // Clear cache
    this.memoryCache.clear();
    
    // Queue all for profiling
    tableKeys.forEach(key => this.queueForProfiling(key, 'high'));
    
    // Start profiling immediately
    setTimeout(() => this.startBackgroundProfiling(), 100);
  }

  // Get cache statistics
  getCacheStats(): {
    totalEntries: number;
    freshEntries: number;
    staleEntries: number;
    errorEntries: number;
    backgroundQueueLength: number;
    isProfiling: boolean;
  } {
    let fresh = 0, stale = 0, error = 0;
    
    this.memoryCache.forEach(entry => {
      if (entry.status === 'error') error++;
      else if (this.isExpired(entry)) stale++;
      else fresh++;
    });
    
    return {
      totalEntries: this.memoryCache.size,
      freshEntries: fresh,
      staleEntries: stale,
      errorEntries: error,
      backgroundQueueLength: this.backgroundQueue.length,
      isProfiling: this.isProfiling
    };
  }

  // Clear expired entries
  clearExpired(): void {
    const before = this.memoryCache.size;
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        this.memoryCache.delete(key);
      }
    }
    const after = this.memoryCache.size;
    if (before !== after) {
      console.log(`🧹 Cleared ${before - after} expired cache entries`);
      this.saveToStorage();
    }
  }

  // Setup idle detection
  private setupIdleDetection(): void {
    let idleTime = 0;
    const idleInterval = setInterval(() => {
      idleTime += 1000;
      if (idleTime >= this.config.idleDelay && this.backgroundQueue.length > 0) {
        this.startBackgroundProfiling();
        idleTime = 0;
      }
    }, 1000);

    // Reset idle timer on user activity
    const resetIdle = () => {
      idleTime = 0;
      this.scheduleBackgroundProfiling();
    };

    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, resetIdle, true);
    });
  }

  // Save to localStorage
  private saveToStorage(): void {
    try {
      const data = {
        profiles: Array.from(this.memoryCache.entries()),
        priorityTables: this.config.priorityTables,
        timestamp: Date.now()
      };
      localStorage.setItem('profileCache', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save profile cache to localStorage:', error);
    }
  }

  // Load from localStorage
  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('profileCache');
      if (data) {
        const parsed = JSON.parse(data);
        
        // Restore profiles
        if (parsed.profiles) {
          parsed.profiles.forEach(([key, entry]: [string, ProfileCacheEntry]) => {
            // Only restore if not expired
            if (!this.isExpired(entry)) {
              this.memoryCache.set(key, entry);
            }
          });
        }
        
        // Restore priority tables
        if (parsed.priorityTables) {
          this.config.priorityTables = parsed.priorityTables;
        }
        
        console.log(`📦 Loaded ${this.memoryCache.size} cached profiles from localStorage`);
      }
    } catch (error) {
      console.warn('Failed to load profile cache from localStorage:', error);
    }
  }

  // Clear all cache
  clearAll(): void {
    this.memoryCache.clear();
    this.backgroundQueue = [];
    this.stopBackgroundProfiling();
    localStorage.removeItem('profileCache');
    console.log('🗑️ Cleared all profile cache');
  }
}

// Export singleton instance
export const profileCache = new ProfileCacheManager();
