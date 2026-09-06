import type { Request, Response } from 'express';
import { s3GatewayService } from '../services/s3-gateway.service.js';
import { listBucketsXml, listObjectsV2Xml } from '../lib/s3-xml.js';
import { s3Errors } from '../lib/s3-errors.js';

function getOrgId(req: Request): number {
  if (!req.organizationId) {
    throw s3Errors.accessDenied();
  }
  return req.organizationId;
}

function sendXml(res: Response, statusCode: number, xml: string): void {
  res.status(statusCode).type('application/xml').send(xml);
}

function objectKeyParam(req: Request): string {
  const value = req.params[1] ?? req.params.key;
  if (!value || Array.isArray(value)) {
    throw s3Errors.invalidArgument('Object key is required');
  }
  return value;
}

function bucketParam(req: Request): string {
  const value = req.params.bucket ?? req.params[0];
  if (!value || Array.isArray(value)) {
    throw s3Errors.invalidArgument('Bucket name is required');
  }
  return value;
}

function setObjectHeaders(res: Response, stat: any): void {
  if (stat.size !== undefined) res.setHeader('Content-Length', String(stat.size));
  if (stat.etag) res.setHeader('ETag', `"${String(stat.etag).replace(/"/g, '')}"`);
  if (stat.lastModified) res.setHeader('Last-Modified', stat.lastModified.toUTCString());
  if (stat.metaData?.['content-type']) {
    res.setHeader('Content-Type', stat.metaData['content-type']);
  }
}

export class S3GatewayController {
  async listBuckets(req: Request, res: Response): Promise<void> {
    const buckets = await s3GatewayService.listBuckets(getOrgId(req));
    sendXml(res, 200, listBucketsXml(buckets));
  }

  async headBucket(req: Request, res: Response): Promise<void> {
    await s3GatewayService.getBucket(getOrgId(req), bucketParam(req));
    res.status(200).end();
  }

  async listObjects(req: Request, res: Response): Promise<void> {
    const maxKeys = req.query['max-keys'] ? Number(req.query['max-keys']) : undefined;
    const prefix = typeof req.query.prefix === 'string' ? req.query.prefix : '';
    const objects = await s3GatewayService.listObjects({
      organizationId: getOrgId(req),
      bucketName: bucketParam(req),
      prefix,
      maxKeys,
    });

    sendXml(res, 200, listObjectsV2Xml({
      bucketName: bucketParam(req),
      prefix,
      maxKeys: Math.max(1, maxKeys || 1000),
      isTruncated: false,
      objects,
    }));
  }

  async putObject(req: Request, res: Response): Promise<void> {
    const result = await s3GatewayService.putObject({
      organizationId: getOrgId(req),
      bucketName: bucketParam(req),
      objectKey: objectKeyParam(req),
      req,
    });

    if (result?.etag) {
      res.setHeader('ETag', `"${String(result.etag).replace(/"/g, '')}"`);
    }
    res.status(200).end();
  }

  async getObject(req: Request, res: Response): Promise<void> {
    const { stat, stream } = await s3GatewayService.getObject(
      getOrgId(req),
      bucketParam(req),
      objectKeyParam(req),
    );
    setObjectHeaders(res, stat);
    stream.pipe(res);
  }

  async headObject(req: Request, res: Response): Promise<void> {
    const stat = await s3GatewayService.headObject(
      getOrgId(req),
      bucketParam(req),
      objectKeyParam(req),
    );
    setObjectHeaders(res, stat);
    res.status(200).end();
  }

  async deleteObject(req: Request, res: Response): Promise<void> {
    await s3GatewayService.deleteObject(
      getOrgId(req),
      bucketParam(req),
      objectKeyParam(req),
    );
    res.status(204).end();
  }
}

export const s3GatewayController = new S3GatewayController();
