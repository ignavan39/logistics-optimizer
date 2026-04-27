import { Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { type DataSource } from 'typeorm';
import { type ConfigService } from '@nestjs/config';
import { Kafka, type Admin } from 'kafkajs';

interface PartitionInfo {
  name: string;
  fromValue: Date;
}

@Injectable()
export class RetentionService implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(RetentionService.name);
  private kafka: Kafka;
  private admin: Admin;
  private readonly TOPIC = 'vehicle.telemetry';
  private readonly LAG_THRESHOLD = 1000;
  private readonly RETENTION_DAYS = 7;

  constructor(
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    const broker = this.configService.get('KAFKA_BROKER', 'kafka:9092');
    this.kafka = new Kafka({
      clientId: 'retention-service',
      brokers: [broker],
    });
    this.admin = this.kafka.admin();
  }

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.admin.connect();
      this.logger.log('RetentionService started');
    } catch (e) {
      this.logger.warn(`Failed to connect Kafka admin: ${e}`);
    }
  }

  onApplicationShutdown(): Promise<void> {
    return this.admin.disconnect();
  }

  private async getTopicLag(): Promise<number> {
    try {
      const offsets = await this.admin.fetchOffsets({
        groupId: `${this.configService.get('KAFKA_GROUP_ID_PREFIX', 'logistics')}.tracking-service`,
        topics: [this.TOPIC],
      });

      let totalLag = 0;
      for (const topic of offsets) {
        for (const partition of topic.partitions) {
          const highOffset = (partition as any).highOffset;
          const currentOffset = (partition as any).offset;
          if (highOffset && currentOffset) {
            totalLag += parseInt(highOffset) - parseInt(currentOffset);
          }
        }
      }

      return totalLag;
    } catch (e) {
      this.logger.warn(`Failed to get lag: ${e}`);
      return 0;
    }
  }

  private async findOldPartitions(daysOld: number): Promise<PartitionInfo[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    try {
      const result = await this.dataSource.query(`
        SELECT 
          inh.relname AS partition_name,
          pg_get_expr(at.atmstart_val, at.attrelid) AS range_start
        FROM pg_inherits inh
        JOIN pg_class AS child ON inh.inhrelid = child.oid
        JOIN pg_attribute at ON at.attrelid = child.oid AND at.attname = 'recorded_at'
        WHERE child.relkind = 'r'
          AND pg_get_expr(at.atmstart_val, at.attrelid)::timestamptz < $1
        ORDER BY range_start ASC
      `, [cutoffDate]);

      return result.map((row: any) => ({
        name: row.partition_name,
        fromValue: new Date(row.range_start),
      }));
    } catch (e) {
      this.logger.error(`Failed to find partitions: ${e}`);
      return [];
    }
  }

  private async detachPartition(partitionName: string): Promise<void> {
    await this.dataSource.query(`
      ALTER TABLE telemetry_points DETACH PARTITION ${partitionName}
    `);
  }

  private isEnabled(): boolean {
    return this.configService.get('RETENTION_ENABLED', 'false') === 'true';
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldPartitions(): Promise<void> {
    await this.runCleanup();
  }

  async runCleanup(): Promise<{ detached: number; reason: string }> {
    this.logger.log('Starting cleanup...');

    if (!this.isEnabled()) {
      this.logger.log('RETENTION_ENABLED=false, skipping');
      return { detached: 0, reason: 'disabled' };
    }

    const lag = await this.getTopicLag();
    this.logger.log(`Current lag: ${lag}`);

    if (lag > this.LAG_THRESHOLD) {
      this.logger.warn(`Lag ${lag} > ${this.LAG_THRESHOLD}, skipping`);
      return { detached: 0, reason: `high_lag_${lag}` };
    }

    const oldPartitions = await this.findOldPartitions(this.RETENTION_DAYS);
    this.logger.log(`Found ${oldPartitions.length} partitions older than ${this.RETENTION_DAYS} days`);

    if (oldPartitions.length === 0) {
      return { detached: 0, reason: 'no_partitions' };
    }

    let detached = 0;
    for (const partition of oldPartitions) {
      try {
        await this.detachPartition(partition.name);
        this.logger.log(`Detached partition: ${partition.name}`);
        detached++;
      } catch (e) {
        this.logger.error(`Failed to detach ${partition.name}: ${e}`);
      }
    }

    this.logger.log(`Cleanup complete: detached ${detached} partitions`);
    return { detached, reason: 'success' };
  }
}