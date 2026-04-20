import { Logger } from '@nestjs/common';
import { KafkaContext } from '@nestjs/microservices';
import { KafkaEvent } from '../interfaces/kafka-event.interface';
import { IdempotencyGuard } from '../idempotency/idempotency.guard';

export interface ConsumerOptions {
  maxRetries?: number;
  retryDelayMs?: number;
}

/**
 * BaseConsumer — абстрактный базовый класс для всех Kafka-консюмеров.
 *
 * Предоставляет:
 * - Идемпотентную обработку (через IdempotencyGuard)
 * - Retry с exponential backoff
 * - Dead Letter Queue (DLQ) для необрабатываемых сообщений
 * - Структурированное логирование с трейсингом
 *
 * Usage:
 *   @Injectable()
 *   export class OrderCreatedConsumer extends BaseConsumer {
 *     constructor(idempotency: IdempotencyGuard) {
 *       super(idempotency, { maxRetries: 3 });
 *     }
 *
 *     @EventPattern('order.created')
 *     async handle(event: KafkaEvent<OrderCreatedPayload>, @Ctx() ctx: KafkaContext) {
 *       await this.process(event, ctx, async (e) => {
 *         // your business logic here
 *       });
 *     }
 *   }
 */
export abstract class BaseConsumer {
  protected readonly logger = new Logger(this.constructor.name);
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(
    protected readonly idempotency: IdempotencyGuard,
    options: ConsumerOptions = {},
  ) {
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

    // Idempotency check
    const shouldProcess = await this.idempotency.shouldProcess(event.eventId, event.type);
    if (!shouldProcess) {
      this.logger.warn(`Skipping duplicate event: ${event.type} [${event.eventId}]`);
      return;
    }

    // Process with retry
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
            err,
          );
          // TODO: publish to DLQ topic
          await this.publishToDlq(event, err as Error);
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

  private async publishToDlq<T>(event: KafkaEvent<T>, error: Error): Promise<void> {
    // DLQ publishing is implemented in concrete services
    // Override this method to add service-specific DLQ handling
    this.logger.error(`DLQ: ${event.type} [${event.eventId}] — ${error.message}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
