import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Response } from 'express'
import { RpcException } from '@nestjs/microservices'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'
    let errors: any = null

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exceptionResponse = exception.getResponse()
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message || exception.message
      errors = typeof exceptionResponse === 'object' ? exceptionResponse : null
    } 
    else if (exception instanceof RpcException) {
      const rpcError = exception.getError() as any
      status = this.mapGrpcToHttp(rpcError?.code)
      message = rpcError?.message || 'gRPC error'
      this.logger.error(`gRPC error: ${message}`, exception.stack)
    }
    else if (exception instanceof Error) {
      message = exception.message
      
      if (message.includes('UNAVAILABLE')) {
        status = HttpStatus.SERVICE_UNAVAILABLE
        message = 'Service temporarily unavailable'
      }
      else if (message.includes('NOT_FOUND')) {
        status = HttpStatus.NOT_FOUND
        message = 'Resource not found'
      }
      
      this.logger.error(`Unhandled error: ${message}`, exception.stack)
    }

    response.status(status).json({
      statusCode: status,
      message: Array.isArray(message) ? message : [message],
      errors,
      timestamp: new Date().toISOString(),
    })
  }

  private mapGrpcToHttp(grpcCode?: number): HttpStatus {
    if (grpcCode === undefined) return HttpStatus.INTERNAL_SERVER_ERROR
    const map: Record<number, HttpStatus> = {
      5: HttpStatus.NOT_FOUND,
      7: HttpStatus.FORBIDDEN,
      8: HttpStatus.BAD_REQUEST,
      12: HttpStatus.NOT_IMPLEMENTED,
      16: HttpStatus.UNAUTHORIZED,
    }
    return map[grpcCode] ?? HttpStatus.INTERNAL_SERVER_ERROR
  }
}