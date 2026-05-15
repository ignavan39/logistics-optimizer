import { Logger as NestLogger } from '@nestjs/common';
import type { Logger } from '@nestjs/common';
import type { KafkaContext } from '@nestjs/microservices';
import type { KafkaEvent } from '../interfaces/kafka-event.interface';
import type { IdempotencyGuard } from '../idempotency/idempotency.guard';

export interface ConsumerOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

export abstract class BaseConsumer {
  protected readonly logger: Logger;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(
    protected readonly idempotency: IdempotencyGuard,
    options: ConsumerOptions = {},
  ) {
    this.logger = new NestLogger(this.constructor.name);
    this.maxRetries = options.maxRetries ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 500;
  }

  protected async process<T>(
    event: KafkaEvent<T>,
    ctx: KafkaContext,
    handler: (event: KafkaEvent<T>) => Promise<void>,
  ): Promise<void> {
    const topic = ctx.getTopic();
    const partition = ctx.getPartition();
    const offset = ctx.getMessage().offset;

    this.logger.log(
      `Processing ${event.type} [${event.eventId}] topic=${topic} partition=${partition} offset=${offset}`,
    );

    const shouldProcess = await this.idempotency.shouldProcess(event.eventId, event.type);
    if (!shouldProcess) {
      this.logger.warn(`Skipping duplicate event: ${event.type} [${event.eventId}]`);
      return;
    }

    let attempt = 0;
    while (attempt <= this.maxRetries) {
      try {
        const startMs = Date.now();
        await handler(event);
        const durationMs = Date.now() - startMs;

        this.logger.log(
          `Event processed: ${event.type} [${event.eventId}] in ${durationMs}ms`,
        );
        return;
      } catch (err) {
        attempt++;
        if (attempt > this.maxRetries) {
          this.logger.error(
            `Event permanently failed after ${this.maxRetries} retries: ${event.type} [${event.eventId}]`,
            err instanceof Error ? err : new Error(String(err)),
          );
          void this.publishToDlq(event, err instanceof Error ? err : new Error(String(err)));
          return;
        }

        const delay = this.retryDelayMs * Math.pow(2, attempt - 1);
        this.logger.warn(
          `Retry ${attempt}/${this.maxRetries} for ${event.type} [${event.eventId}] in ${delay}ms`,
        );
        await this.sleep(delay);
      }
    }
  }

  protected async publishToDlq<T>(_event: KafkaEvent<T>, _error: Error): Promise<void> {
    // DLQ publishing is implemented in concrete services
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}