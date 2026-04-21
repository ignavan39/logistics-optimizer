import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  customerId?: string;
}

export interface ClientEventPayload {
  event: string;
  data: unknown;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(): void {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        this.logger.warn(`Client ${client.id} — no token, disconnecting`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      if (!payload?.sub) {
        client.disconnect();
        return;
      }

      client.userId = payload.sub;
      client.customerId = payload.customerId;

      if (client.customerId) {
        client.join(`customer:${client.customerId}`);
      }

      this.logger.log(`Client ${client.id} connected: user=${client.userId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('subscribe:order')
  handleSubscribeOrder(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): { event: string; data: unknown } {
    client.join(`order:${orderId}`);
    this.logger.log(`Client ${client.id} subscribed to order:${orderId}`);
    return { event: 'subscribed', data: { room: `order:${orderId}` } };
  }

  @SubscribeMessage('unsubscribe:order')
  handleUnsubscribeOrder(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): { event: string; data: unknown } {
    client.leave(`order:${orderId}`);
    return { event: 'unsubscribed', data: { room: `order:${orderId}` } };
  }

  emitOrderEvent(
    orderId: string,
    event: string,
    payload: {
      orderId: string;
      customerId: string;
      status?: string;
      vehicleId?: string;
      eta?: number;
    },
  ): void {
    this.server.to(`order:${orderId}`).emit(event, payload);
    this.server.to(`customer:${payload.customerId}`).emit(event, payload);
  }
}