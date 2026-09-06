export class S3Error extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'S3Error';
  }
}

export const s3Errors = {
  accessDenied: () => new S3Error('AccessDenied', 'Access denied', 403),
  invalidAccessKeyId: () => new S3Error('InvalidAccessKeyId', 'The AWS access key ID you provided does not exist in our records.', 403),
  signatureDoesNotMatch: () => new S3Error('SignatureDoesNotMatch', 'The request signature we calculated does not match the signature you provided.', 403),
  noSuchBucket: () => new S3Error('NoSuchBucket', 'The specified bucket does not exist.', 404),
  noSuchKey: () => new S3Error('NoSuchKey', 'The specified key does not exist.', 404),
  invalidArgument: (message = 'Invalid argument') => new S3Error('InvalidArgument', message, 400),
  internalError: () => new S3Error('InternalError', 'We encountered an internal error. Please try again.', 500),
};
