import { Module, Global } from '@nestjs/common';
import { OutboxService } from './outbox/outbox.service';
import { OutboxProcessor } from './outbox/outbox.processor';
import { IdempotencyGuard } from './idempotency/idempotency.guard';

@Global()
@Module({
  providers: [OutboxService, OutboxProcessor, IdempotencyGuard],
  exports: [OutboxService, OutboxProcessor, IdempotencyGuard],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class KafkaUtilsModule {}