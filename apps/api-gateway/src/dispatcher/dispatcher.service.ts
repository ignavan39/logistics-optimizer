import { Injectable, type OnModuleInit, type OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClientGrpc } from '@nestjs/microservices'
import { Inject } from '@nestjs/common'
import { DispatchOrderDto, type GetDispatchStateDto, type CancelDispatchDto } from './dto/dispatcher.dto'

interface DispatcherGrpcClient {
  dispatchOrder(data: DispatchOrderDto): Promise<any>
  getDispatchState(data: GetDispatchStateDto): Promise<any>
  cancelDispatch(data: CancelDispatchDto): Promise<any>
  listDispatches(data: { status?: string; limit?: number; offset?: number }): Promise<any>
}

@Injectable()
export class DispatcherService implements OnModuleInit, OnModuleDestroy {
  private dispatcherClient!: DispatcherGrpcClient

  constructor(
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

  async listDispatches(options: { status?: string }) {
    const result = await this.dispatcherClient.listDispatches(options)
    return { sagas: result.sagas || [] }
  }
}