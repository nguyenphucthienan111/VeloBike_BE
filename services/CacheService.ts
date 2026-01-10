import { createClient, RedisClientType } from "redis";

export class CacheService {
  private static client: RedisClientType;
  private static isConnected = false;

  /**
   * Initialize Redis connection
   */
  static async init(): Promise<void> {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || "redis://localhost:6379",
        password: process.env.REDIS_PASSWORD,
      });

      this.client.on("error", (err) => {
        console.error("Redis Client Error:", err);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        console.log("✅ Redis Connected");
        this.isConnected = true;
      });

      this.client.on("disconnect", () => {
        console.log("❌ Redis Disconnected");
        this.isConnected = false;
      });

      await this.client.connect();
    } catch (error) {
      console.error("Failed to initialize Redis:", error);
      this.isConnected = false;
    }
  }

  /**
   * Set cache with expiration
   */
  static async set(key: string, value: any, ttlSeconds: number = 3600): Promise<boolean> {
    try {
      if (!this.isConnected) return false;

      const serializedValue = JSON.stringify(value);
      await this.client.setEx(key, ttlSeconds, serializedValue);
      return true;
    } catch (error) {
      console.error("Cache set error:", error);
      return false;
    }
  }

  /**
   * Get cache value
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      if (!this.isConnected) return null;

      const value = await this.client.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      console.error("Cache get error:", error);
      return null;
    }
  }

  /**
   * Delete cache key
   */
  static async del(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;

      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      console.error("Cache delete error:", error);
      return false;
    }
  }

  /**
   * Check if key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) return false;

      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      console.error("Cache exists error:", error);
      return false;
    }
  }

  /**
   * Set cache with no expiration
   */
  static async setPersistent(key: string, value: any): Promise<boolean> {
    try {
      if (!this.isConnected) return false;

      const serializedValue = JSON.stringify(value);
      await this.client.set(key, serializedValue);
      return true;
    } catch (error) {
      console.error("Cache setPersistent error:", error);
      return false;
    }
  }

  /**
   * Increment counter
   */
  static async incr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      if (!this.isConnected) return 0;

      const result = await this.client.incr(key);
      
      if (ttlSeconds && result === 1) {
        // Set expiration only on first increment
        await this.client.expire(key, ttlSeconds);
      }

      return result;
    } catch (error) {
      console.error("Cache incr error:", error);
      return 0;
    }
  }

  /**
   * Get multiple keys
   */
  static async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (!this.isConnected) return keys.map(() => null);

      const values = await this.client.mGet(keys);
      return values.map(value => value ? JSON.parse(value) as T : null);
    } catch (error) {
      console.error("Cache mget error:", error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple keys
   */
  static async mset(keyValuePairs: Record<string, any>, ttlSeconds?: number): Promise<boolean> {
    try {
      if (!this.isConnected) return false;

      const serializedPairs: string[] = [];
      for (const [key, value] of Object.entries(keyValuePairs)) {
        serializedPairs.push(key, JSON.stringify(value));
      }

      await this.client.mSet(serializedPairs);

      // Set expiration for all keys if specified
      if (ttlSeconds) {
        const promises = Object.keys(keyValuePairs).map(key =>
          this.client.expire(key, ttlSeconds)
        );
        await Promise.all(promises);
      }

      return true;
    } catch (error) {
      console.error("Cache mset error:", error);
      return false;
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  static async flushAll(): Promise<boolean> {
    try {
      if (!this.isConnected) return false;

      await this.client.flushAll();
      console.log("All cache cleared");
      return true;
    } catch (error) {
      console.error("Cache flushAll error:", error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<any> {
    try {
      if (!this.isConnected) return null;

      const info = await this.client.info("memory");
      const keyspace = await this.client.info("keyspace");
      
      return {
        connected: this.isConnected,
        memory: info,
        keyspace: keyspace,
      };
    } catch (error) {
      console.error("Cache getStats error:", error);
      return null;
    }
  }

  /**
   * Cache helper for listings
   */
  static async cacheListings(key: string, listings: any[], ttlSeconds: number = 300): Promise<void> {
    await this.set(`listings:${key}`, listings, ttlSeconds);
  }

  /**
   * Get cached listings
   */
  static async getCachedListings(key: string): Promise<any[] | null> {
    return this.get<any[]>(`listings:${key}`);
  }

  /**
   * Cache user session
   */
  static async cacheUserSession(userId: string, sessionData: any, ttlSeconds: number = 86400): Promise<void> {
    await this.set(`session:${userId}`, sessionData, ttlSeconds);
  }

  /**
   * Get cached user session
   */
  static async getCachedUserSession(userId: string): Promise<any | null> {
    return this.get(`session:${userId}`);
  }

  /**
   * Cache search results
   */
  static async cacheSearchResults(query: string, results: any[], ttlSeconds: number = 600): Promise<void> {
    const cacheKey = `search:${Buffer.from(query).toString("base64")}`;
    await this.set(cacheKey, results, ttlSeconds);
  }

  /**
   * Get cached search results
   */
  static async getCachedSearchResults(query: string): Promise<any[] | null> {
    const cacheKey = `search:${Buffer.from(query).toString("base64")}`;
    return this.get<any[]>(cacheKey);
  }

  /**
   * Rate limiting helper
   */
  static async checkRateLimit(
    identifier: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      if (!this.isConnected) {
        return { allowed: true, remaining: maxRequests - 1, resetTime: Date.now() + windowSeconds * 1000 };
      }

      const key = `rate_limit:${identifier}`;
      const current = await this.incr(key, windowSeconds);
      const ttl = await this.client.ttl(key);
      
      const remaining = Math.max(0, maxRequests - current);
      const resetTime = Date.now() + (ttl * 1000);

      return {
        allowed: current <= maxRequests,
        remaining,
        resetTime,
      };
    } catch (error) {
      console.error("Rate limit check error:", error);
      return { allowed: true, remaining: maxRequests - 1, resetTime: Date.now() + windowSeconds * 1000 };
    }
  }

  /**
   * Close Redis connection
   */
  static async close(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.quit();
        console.log("Redis connection closed");
      }
    } catch (error) {
      console.error("Error closing Redis connection:", error);
    }
  }
}