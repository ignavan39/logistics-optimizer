import { Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ClientKafka, Transport } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceType } from './entities/invoice.entity';

@Injectable()
export class InvoiceEventHandler implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger(InvoiceEventHandler.name);

  constructor(
    @Inject('KAFKA_CLIENT') private readonly kafka: ClientKafka,
    private readonly invoiceService: InvoiceService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.kafka.connect();
    this.logger.log('InvoiceEventHandler started — listening for order.delivered');
  }

  onApplicationShutdown(): void {
    this.logger.log('InvoiceEventHandler stopped');
  }

  async handleOrderDelivered(event: any): Promise<void> {
    const { orderId, contractId, counterpartyId, tariffSnapshot, originLat, originLng, destinationLat, destinationLng, weightKg } = event;

    this.logger.log(`Received order.delivered for order ${orderId}`);

    try {
      const invoiceNumber = `INV-${Date.now()}`;
      const vatRate = 20;

      // Calculate price using snapshot
      let price = 0;
      if (tariffSnapshot) {
        // Distance will be 0 since we don't have routing service here
        // In production, this would be calculated by the routing service
        price = Number(tariffSnapshot.minPrice) || 0;
      }

      const vatAmount = price * (vatRate / 100);
      const totalAmount = price + vatAmount;

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      await this.invoiceService.createInvoice({
        orderId,
        number: invoiceNumber,
        type: InvoiceType.INVOICE,
        amountRub: totalAmount,
        vatRate,
        vatAmount,
        dueDate,
        counterpartyId,
        contractId,
        description: `Invoice for order ${orderId.substring(0, 8)}`,
      });

      this.logger.log(`Created invoice ${invoiceNumber} for order ${orderId}`);
    } catch (error) {
      this.logger.error(`Failed to create invoice for order ${orderId}: ${error}`);
      throw error;
    }
  }
}