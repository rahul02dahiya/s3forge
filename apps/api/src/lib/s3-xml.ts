import type { BucketRecord } from '../repositories/bucket.repository.js';
import type { S3Error } from './s3-errors.js';

export interface S3ObjectListItem {
  key: string;
  lastModified?: Date | null;
  etag?: string;
  size: number;
}

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function isoDate(value?: Date | string | null): string {
  if (!value) return new Date(0).toISOString();
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

export function listBucketsXml(buckets: BucketRecord[]): string {
  const bucketNodes = buckets
    .map((bucket) => [
      '<Bucket>',
      `<Name>${xmlEscape(bucket.name)}</Name>`,
      `<CreationDate>${isoDate(bucket.createdAt)}</CreationDate>`,
      '</Bucket>',
    ].join(''))
    .join('');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ListAllMyBucketsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">',
    '<Owner><ID>s3forge</ID><DisplayName>S3Forge</DisplayName></Owner>',
    `<Buckets>${bucketNodes}</Buckets>`,
    '</ListAllMyBucketsResult>',
  ].join('');
}

export function listObjectsV2Xml(params: {
  bucketName: string;
  prefix: string;
  maxKeys: number;
  isTruncated: boolean;
  objects: S3ObjectListItem[];
}): string {
  const contents = params.objects
    .map((object) => [
      '<Contents>',
      `<Key>${xmlEscape(object.key)}</Key>`,
      `<LastModified>${isoDate(object.lastModified)}</LastModified>`,
      `<ETag>${xmlEscape(object.etag ? `"${object.etag.replace(/"/g, '')}"` : '""')}</ETag>`,
      `<Size>${object.size}</Size>`,
      '<StorageClass>STANDARD</StorageClass>',
      '</Contents>',
    ].join(''))
    .join('');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">',
    `<Name>${xmlEscape(params.bucketName)}</Name>`,
    `<Prefix>${xmlEscape(params.prefix)}</Prefix>`,
    `<KeyCount>${params.objects.length}</KeyCount>`,
    `<MaxKeys>${params.maxKeys}</MaxKeys>`,
    `<IsTruncated>${params.isTruncated}</IsTruncated>`,
    contents,
    '</ListBucketResult>',
  ].join('');
}

export function s3ErrorXml(error: S3Error, requestId?: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<Error>',
    `<Code>${xmlEscape(error.code)}</Code>`,
    `<Message>${xmlEscape(error.message)}</Message>`,
    requestId ? `<RequestId>${xmlEscape(requestId)}</RequestId>` : '',
    '</Error>',
  ].join('');
}
