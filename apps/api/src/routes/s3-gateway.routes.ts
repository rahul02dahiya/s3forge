import { Router, type NextFunction, type Request, type Response } from 'express';
import { authenticateS3 } from '../middleware/authenticate-s3.js';
import { s3GatewayController } from '../controllers/s3-gateway.controller.js';
import { S3Error, s3Errors } from '../lib/s3-errors.js';
import { s3ErrorXml } from '../lib/s3-xml.js';
import { logger } from '../lib/logger.js';

const router = Router();

function asyncRoute(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res).catch(next);
  };
}

function s3ErrorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const error = err instanceof S3Error ? err : s3Errors.internalError();
  if (!(err instanceof S3Error)) {
    logger.error({ err, requestId: req.id }, 'Unhandled S3 gateway error');
  }

  res.status(error.statusCode).type('application/xml').send(s3ErrorXml(error, String(req.id)));
}

router.get(
  '/',
  authenticateS3(),
  asyncRoute((req, res) => s3GatewayController.listBuckets(req, res)),
);

router.head(
  '/:bucket',
  authenticateS3(),
  asyncRoute((req, res) => s3GatewayController.headBucket(req, res)),
);

router.get(
  '/:bucket',
  authenticateS3(),
  asyncRoute((req, res) => s3GatewayController.listObjects(req, res)),
);

router.put(
  /^\/([^/]+)\/(.+)$/,
  authenticateS3(),
  asyncRoute((req, res) => s3GatewayController.putObject(req, res)),
);

router.head(
  /^\/([^/]+)\/(.+)$/,
  authenticateS3(),
  asyncRoute((req, res) => s3GatewayController.headObject(req, res)),
);

router.get(
  /^\/([^/]+)\/(.+)$/,
  authenticateS3(),
  asyncRoute((req, res) => s3GatewayController.getObject(req, res)),
);

router.delete(
  /^\/([^/]+)\/(.+)$/,
  authenticateS3(),
  asyncRoute((req, res) => s3GatewayController.deleteObject(req, res)),
);

router.use(s3ErrorHandler);

export default router;
