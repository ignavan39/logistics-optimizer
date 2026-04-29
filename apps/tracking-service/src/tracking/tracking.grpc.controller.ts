import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { Observable, Subject } from 'rxjs';
import { TrackingBatchWriter } from './batch/tracking-batch-writer';
import { TrackingMetrics } from '../metrics/tracking.metrics';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

interface TelemetryPoint {
  vehicle_id: string;
  lat: number;
  lng: number;
  speed_kmh: number;
  heading_deg: number;
  accuracy_m: number;
  recorded_at_unix: number;
}

interface PositionResponse {
  vehicle_id: string;
  lat: number;
  lng: number;
  speed_kmh: number;
  heading_deg: number;
  recorded_at_unix: number;
  ingested_at_unix: number;
}

interface StreamVehiclePositionRequest {
  vehicle_id: string;
  update_interval_ms: number;
}

interface TrackingCommand {
  type: string;
  message: string;
  server_time_unix: number;
}

@Controller()
export class TrackingGrpcController {
  private readonly logger = new Logger(TrackingGrpcController.name);

  constructor(
    private readonly batchWriter: TrackingBatchWriter,
    private readonly metrics: TrackingMetrics,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  /**
   * Unary RPC: возвращает последнюю известную позицию машины.
   * Читает из in-memory кэша (O(1)) для минимальной задержки.
   */
  @GrpcMethod('TrackingService', 'GetLatestPosition')
  async getLatestPosition(req: { vehicle_id: string }): Promise<PositionResponse | null> {
    // First check in-memory cache (fastest path)
    const cached = this.batchWriter.getLatestPosition(req.vehicle_id);
    if (cached) {
      return {
        vehicle_id: cached.vehicleId,
        lat: cached.lat,
        lng: cached.lng,
        speed_kmh: cached.speedKmh,
        heading_deg: cached.headingDeg,
        recorded_at_unix: Math.floor(cached.recordedAt.getTime() / 1000),
        ingested_at_unix: Math.floor(Date.now() / 1000),
      };
    }

    // Fall back to DB for vehicles not currently active
    const rows = await this.ds.query(
      `SELECT vehicle_id,
              ST_Y(location::geometry) AS lat,
              ST_X(location::geometry) AS lng,
              speed, heading, recorded_at
       FROM telemetry_points
       WHERE vehicle_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [req.vehicle_id],
    );

    if (!rows.length) return null;
    const row = rows[0];
    return {
      vehicle_id: row.vehicle_id,
      lat: parseFloat(row.lat),
      lng: parseFloat(row.lng),
      speed_kmh: parseFloat(row.speed ?? 0),
      heading_deg: parseFloat(row.heading ?? 0),
      recorded_at_unix: Math.floor(new Date(row.recorded_at).getTime() / 1000),
      ingested_at_unix: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Server streaming RPC: клиент подписывается на позицию машины.
   * Сервер пушит обновления с заданным интервалом.
   *
   * Использует polling кэша (не DB!) для минимальной задержки.
   */
  @GrpcStreamMethod('TrackingService', 'StreamVehiclePosition')
  streamVehiclePosition(
    req: StreamVehiclePositionRequest,
  ): Observable<PositionResponse> {
    const intervalMs = Math.max(req.update_interval_ms ?? 1000, 500); // min 500ms
    this.metrics.activeStreamSubscribers.inc();
    this.logger.log(
      `Stream started: vehicle=${req.vehicle_id} interval=${intervalMs}ms`,
    );

    return new Observable<PositionResponse>((subscriber) => {
      const timer = setInterval(() => {
        const pos = this.batchWriter.getLatestPosition(req.vehicle_id);
        if (pos) {
          subscriber.next({
            vehicle_id: pos.vehicleId,
            lat: pos.lat,
            lng: pos.lng,
            speed_kmh: pos.speedKmh,
            heading_deg: pos.headingDeg,
            recorded_at_unix: Math.floor(pos.recordedAt.getTime() / 1000),
            ingested_at_unix: Math.floor(Date.now() / 1000),
          });
        }
      }, intervalMs);

      return () => {
        clearInterval(timer);
        this.metrics.activeStreamSubscribers.dec();
        this.logger.log(`Stream ended: vehicle=${req.vehicle_id}`);
      };
    });
  }

  /**
   * Bidirectional streaming RPC: водитель шлёт GPS пачками,
   * сервер шлёт команды (ACK / REROUTE / STOP).
   *
   * Это демонстрирует двунаправленный gRPC стриминг в портфолио.
   */
  @GrpcStreamMethod('TrackingService', 'TrackVehicle')
  trackVehicle(messages: Observable<TelemetryPoint>): Observable<TrackingCommand> {
    const commands$ = new Subject<TrackingCommand>();
    this.metrics.activeStreamSubscribers.inc();

    messages.subscribe({
      next: async (point) => {
        // Enqueue to batch writer
        await this.batchWriter.enqueue({
          vehicleId: point.vehicle_id,
          lat: point.lat,
          lng: point.lng,
          speedKmh: point.speed_kmh ?? 0,
          headingDeg: point.heading_deg ?? 0,
          accuracyM: point.accuracy_m ?? 0,
          recordedAt: new Date(point.recorded_at_unix * 1000),
        });

        // Send ACK command back to driver
        commands$.next({
          type: 'COMMAND_TYPE_ACK',
          message: `ok:${point.vehicle_id}`,
          server_time_unix: Math.floor(Date.now() / 1000),
        });
      },
      error: (err) => {
        this.logger.error(`TrackVehicle stream error`, err);
        this.metrics.activeStreamSubscribers.dec();
        commands$.complete();
      },
      complete: () => {
        this.metrics.activeStreamSubscribers.dec();
        commands$.complete();
      },
    });

    return commands$.asObservable();
  }
}
