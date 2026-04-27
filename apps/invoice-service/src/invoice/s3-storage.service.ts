import { Injectable } from '@nestjs/common';
import { type ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3Config {
  endpoint: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  forcePathStyle: boolean;
}

@Injectable()
export class S3StorageService {
  private readonly client: S3Client;
  private readonly config: S3Config;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get('INVOICE_S3_ENDPOINT', 'http://localhost:9000');
    const accessKeyId = this.configService.get('INVOICE_S3_ACCESS_KEY', 'minio');
    const secretAccessKey = this.configService.get('INVOICE_S3_SECRET_KEY', 'minio123');
    const bucket = this.configService.get('INVOICE_PDF_BUCKET', 'invoices');

    this.config = {
      endpoint,
      region: 'us-east-1',
      accessKeyId,
      secretAccessKey,
      bucket,
      forcePathStyle: true,
    };

    this.client = new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      forcePathStyle: this.config.forcePathStyle,
    });
  }

  async upload(key: string, data: Buffer, contentType = 'application/pdf'): Promise<string> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: data,
        ContentType: contentType,
      }),
    );
    return this.getPublicUrl(key);
  }

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async getObject(key: string): Promise<Buffer | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
        }),
      );
      const chunks: Buffer[] = [];
      for await (const chunk of response.Body as AsyncIterable<Buffer>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error: any) {
      if (error.name === 'NoSuchKey') {
        return null;
      }
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.config.bucket }));
      return true;
    } catch {
      return false;
    }
  }

  private getPublicUrl(key: string): string {
    const endpoint = this.config.endpoint.replace(/\/$/, '');
    return `${endpoint}/${this.config.bucket}/${key}`;
  }

  generateKey(invoiceId: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `invoices/${year}/${month}/${invoiceId}.pdf`;
  }
}