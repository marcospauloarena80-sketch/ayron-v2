import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('MINIO_BUCKET', 'ayron-docs');
    this.client = new S3Client({
      endpoint: this.config.get<string>('MINIO_ENDPOINT', 'http://localhost:9000'),
      region: this.config.get<string>('MINIO_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: this.config.get<string>('MINIO_ACCESS_KEY', 'ayron_minio'),
        secretAccessKey: this.config.get<string>('MINIO_SECRET_KEY', 'ayron_minio_password'),
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    const endpoint = this.config.get<string>('MINIO_ENDPOINT', 'http://localhost:9000');
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`[MinIO] Connected to ${endpoint} — bucket "${this.bucket}" OK`);
    } catch (headErr: any) {
      if (headErr?.name === 'NoSuchBucket' || headErr?.$metadata?.httpStatusCode === 404) {
        try {
          await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
          this.logger.log(`[MinIO] Bucket "${this.bucket}" created at ${endpoint}`);
        } catch (createErr) {
          this.logger.warn(`[MinIO] Could not create bucket "${this.bucket}": ${(createErr as Error).message}`);
        }
      } else {
        this.logger.warn(
          `[MinIO] OFFLINE or unreachable at ${endpoint} — uploads will use local fallback. Error: ${(headErr as Error).message}`,
        );
      }
    }
  }

  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );
  }

  async getPresignedDownloadUrl(key: string, expiresInSeconds = 120): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, cmd, { expiresIn: expiresInSeconds });
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async download(urlOrKey: string): Promise<Buffer> {
    // Extract key from full URL or use as-is
    const key =
      urlOrKey.startsWith('http') ? new URL(urlOrKey).pathname.slice(1) : urlOrKey;
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const res = await this.client.send(cmd);
    const stream = res.Body as NodeJS.ReadableStream;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any));
    }
    return Buffer.concat(chunks);
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch {
      return false;
    }
  }
}
