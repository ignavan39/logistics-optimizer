import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClientGrpc } from '@nestjs/microservices'
import { Inject } from '@nestjs/common'
import { DispatchOrderDto, GetDispatchStateDto, CancelDispatchDto } from './dto/dispatcher.dto'

interface DispatcherGrpcClient {
  dispatchOrder(data: DispatchOrderDto): Promise<any>
  getDispatchState(data: GetDispatchStateDto): Promise<any>
  cancelDispatch(data: CancelDispatchDto): Promise<any>
}

@Injectable()
export class DispatcherService implements OnModuleInit, OnModuleDestroy {
  private dispatcherClient!: DispatcherGrpcClient

  constructor(
    private configService: ConfigService,
    @Inject('DISPATCHER_PACKAGE') private client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.dispatcherClient = this.client.getService<DispatcherGrpcClient>('DispatcherService')
  }

  onModuleDestroy() {}

  async dispatchOrder(orderId: string) {
    return this.dispatcherClient.dispatchOrder({ order_id: orderId })
  }

  async getDispatchState(sagaId: string) {
    return this.dispatcherClient.getDispatchState({ saga_id: sagaId })
  }

  async cancelDispatch(dto: CancelDispatchDto) {
    return this.dispatcherClient.cancelDispatch({
      saga_id: dto.saga_id,
      reason: dto.reason,
    })
  }
}