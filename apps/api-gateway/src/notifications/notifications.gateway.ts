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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  customerId?: string;
  permissions?: string[];
  isAuthenticated?: boolean;
}

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env['CORS_ORIGIN'] || false,
    credentials: true,
  },
  pingTimeout: 10000,
  pingInterval: 5000,
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly allowedOrigins: string[];

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.allowedOrigins = (configService.get('CORS_ORIGIN', '*') as string)
      .split(',')
      .map((o) => o.trim());
  }

  afterInit(server: Server): void {
    this.logger.log('WebSocket Gateway initialized');
    this.server = server;
  }

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const origin = client.handshake.headers?.origin;
    if (this.allowedOrigins[0] !== '*' && origin && !this.allowedOrigins.includes(origin)) {
      this.logger.warn(`Client ${client.id} — invalid origin: ${origin}`);
      client.disconnect();
      return;
    }

    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`Client ${client.id} — no token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });

      if (!payload?.sub) {
        this.logger.warn(`Client ${client.id} — invalid token`);
        client.disconnect();
        return;
      }

      client.userId = payload.sub;
      client.customerId = payload.customerId;
      client.permissions = payload.permissions || [];
      client.isAuthenticated = true;

      if (client.customerId) {
        client.join(`customer:${client.customerId}`);
        this.logger.log(`Client ${client.id} joined customer:${client.customerId}`);
      }

      this.logger.log(`Client ${client.id} authenticated: user=${payload.sub}`);

      client.emit('connected', {
        userId: payload.sub,
        timestamp: Date.now(),
      });
    } catch (err) {
      this.logger.warn(`Client ${client.id} — auth failed: ${err}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket): void {
    this.logger.log(`Client ${client.id} disconnected (was auth: ${client.isAuthenticated})`);
  }

  @SubscribeMessage('subscribe:order')
  handleSubscribeOrder(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): { event: string; data: unknown } {
    if (!client.isAuthenticated) {
      return { event: 'error', data: { message: 'Not authenticated' } };
    }

    const canAccess = this.canAccessOrder(client, orderId);
    if (!canAccess) {
      return { event: 'error', data: { message: 'Access denied' } };
    }

    client.join(`order:${orderId}`);
    this.logger.log(`Client ${client.id} subscribed to order:${orderId}`);
    return { event: 'subscribed', data: { room: `order:${orderId}` } };
  }

  @SubscribeMessage('unsubscribe:order')
  handleUnsubscribeOrder(
    @MessageBody() orderId: string,
    @ConnectedSocket() client: AuthenticatedSocket,
  ): { event: string; data: unknown } {
    if (!client.isAuthenticated) {
      return { event: 'error', data: { message: 'Not authenticated' } };
    }

    client.leave(`order:${orderId}`);
    return { event: 'unscribed', data: { room: `order:${orderId}` } };
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket): { event: string; data: unknown } {
    return { event: 'pong', data: { timestamp: Date.now() } };
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

  private canAccessOrder(client: AuthenticatedSocket, orderId: string): boolean {
    if (client.customerId) {
      return orderId.startsWith(client.customerId) || orderId.includes(client.userId || '');
    }
    return true;
  }

  private hasPermission(client: AuthenticatedSocket, required: string): boolean {
    const permissions = client.permissions || [];
    if (permissions.includes(required)) {
      return true;
    }
    const [resource] = required.split('.');
    return permissions.some((p) => p === `${resource}.*`);
  }
}