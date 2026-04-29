import { DataSource } from 'typeorm';

export class PgAdvisoryLock {
  constructor(private readonly dataSource: DataSource) {}

  async acquire(key: string): Promise<boolean> {
    const keyHash = this.hashKey(key);
    const result = await this.dataSource.query(
      `SELECT pg_try_advisory_lock(${keyHash}) as acquired`,
    );
    return result[0]?.acquired === true;
  }

  async release(key: string): Promise<void> {
    const keyHash = this.hashKey(key);
    await this.dataSource.query(
      `SELECT pg_advisory_unlock(${keyHash})`,
    );
  }

  async withLock<T>(
    key: string,
    fn: () => Promise<T>,
    options: { timeoutMs?: number } = {},
  ): Promise<T | null> {
    const { timeoutMs = 30000 } = options;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      if (await this.acquire(key)) {
        try {
          return await fn();
        } finally {
          await this.release(key);
        }
      }
      await this.sleep(100);
    }
    return null;
  }

  private hashKey(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 2147483647;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}