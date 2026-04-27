import { Injectable, Logger, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import { type DataSource } from 'typeorm';
import Redis from 'ioredis';
import { type Route } from '../routing.service';

interface CacheEntry {
  routeData: Route;
  createdAt: Date;
}

@Injectable()
export class RouteCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RouteCacheService.name);
  private redis: Redis;
  private readonly CACHE_TTL = 86400;
  private readonly CACHE_PREFIX = 'route:';

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const redisHost = this.configService.get('CACHE_REDIS_HOST', 'redis');
    const redisPort = this.configService.get<number>('CACHE_REDIS_PORT', 6379);
    
    if (redisHost && redisHost !== 'false') {
      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        lazyConnect: true,
      });
      try {
        await this.redis.connect();
        this.logger.log(`Redis connected: ${redisHost}:${redisPort}`);
      } catch (e) {
        this.logger.warn(`Redis not available: ${e}`);
        this.redis = undefined;
      }
    }

    await this.warmup();
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  private normalizeKey(originLat: number, originLng: number, destLat: number, destLng: number, vehicleId?: string): string {
    const round = (n: number) => Math.round(n * 100) / 100;
    return `${round(originLat)}:${round(originLng)}:${round(destLat)}:${round(destLng)}${vehicleId ? ':' + vehicleId : ''}`;
  }

  async getRoute(originLat: number, originLng: number, destLat: number, destLng: number, vehicleId?: string): Promise<Route | null> {
    const key = this.normalizeKey(originLat, originLng, destLat, destLng, vehicleId);

    if (this.redis) {
      try {
        const cached = await this.redis.get(this.CACHE_PREFIX + key);
        if (cached) {
          const entry: CacheEntry = JSON.parse(cached);
          this.logger.debug(`Redis cache hit: ${key}`);
          return entry.routeData;
        }
      } catch (e) {
        this.logger.warn(`Redis get failed: ${e}`);
      }
    }

    try {
      const result = await this.dataSource.query(`
        SELECT route_data, created_at 
        FROM route_cache 
        WHERE route_key = $1 
          AND created_at > NOW() - INTERVAL '24 hours'
        LIMIT 1
      `, [key]);

      if (result.length > 0) {
        const row = result[0];
        const entry: CacheEntry = {
          routeData: row.route_data,
          createdAt: row.created_at,
        };

        if (this.redis) {
          await this.redis.setex(
            this.CACHE_PREFIX + key,
            this.CACHE_TTL,
            JSON.stringify(entry)
          );
        }

        this.logger.debug(`PG cache hit: ${key}`);
        return entry.routeData;
      }
    } catch (e) {
      this.logger.warn(`Cache lookup failed: ${e}`);
    }

    return null;
  }

  async setRoute(route: Route, originLat: number, originLng: number, destLat: number, destLng: number, vehicleId?: string): Promise<void> {
    const key = this.normalizeKey(originLat, originLng, destLat, destLng, vehicleId);
    const entry: CacheEntry = {
      routeData: route,
      createdAt: new Date(),
    };

    if (this.redis) {
      try {
        await this.redis.setex(this.CACHE_PREFIX + key, this.CACHE_TTL, JSON.stringify(entry));
      } catch (e) {
        this.logger.warn(`Redis set failed: ${e}`);
      }
    }

    try {
      await this.dataSource.query(`
        INSERT INTO route_cache (id, route_key, origin_lat, origin_lng, dest_lat, dest_lng, route_data, vehicle_id, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (route_key) 
        DO UPDATE SET route_data = EXCLUDED.route_data, created_at = NOW()
        WHERE route_cache.created_at > NOW() - INTERVAL '24 hours'
      `, [key, originLat, originLng, destLat, destLng, JSON.stringify(route), vehicleId || null]);
    } catch (e) {
      this.logger.warn(`Cache write failed: ${e}`);
    }

    this.logger.debug(`Cached route: ${key}`);
  }

  async warmup(): Promise<void> {
    const enabled = this.configService.get('ROUTE_CACHE_WARMUP', 'true') === 'true';
    if (!enabled || !this.redis) {
      return;
    }

    const popularRoutes = this.configService.get('WARMUP_ROUTES', '55.75:37.61:55.76:37.62,55.75:37.61:59.93:truck');
    if (!popularRoutes) {
      return;
    }

    this.logger.log(`Warming up routes: ${popularRoutes}`);
  }

  async clearStaleCache(): Promise<void> {
    try {
      const result = await this.dataSource.query(`
        DELETE FROM route_cache 
        WHERE created_at < NOW() - INTERVAL '24 hours'
      `);
      
      if (result.length > 0) {
        this.logger.log(`Cleared ${result.length} stale cache entries`);
      }
    } catch (e) {
      this.logger.warn(`Cache cleanup failed: ${e}`);
    }
  }
}