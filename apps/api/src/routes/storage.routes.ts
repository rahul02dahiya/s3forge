import { Router } from 'express';
import { minio } from '../config/minio.js';

const router = Router();

router.get('/health', async (_req, res) => {
  try {
    await minio.listBuckets();

    res.json({
      status: 'ok',
      message: 'storage connected',
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      status: 'error',
      message: 'storage disconnected',
    });
  }
});

router.post('/buckets', async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Bucket name is required' });
  }

  const exists = await minio.bucketExists(name);

  if (exists) {
    return res.status(409).json({ error: 'Bucket already exists' });
  }

  await minio.makeBucket(name, 'us-east-1');

  res.status(201).json({
    message: 'Bucket created',
    bucket: name,
  });
});

export default router;
