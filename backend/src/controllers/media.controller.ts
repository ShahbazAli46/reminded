import type { FastifyRequest, FastifyReply } from 'fastify';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { pipeline } from 'stream/promises';

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export class MediaController {
  /**
   * POST /api/v1/media/upload
   * Handles single file upload and returns the static access URL
   */
  static async uploadMedia(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    try {
      const data = await request.file();
      if (!data) {
        reply.code(400).send({ success: false, error: 'No file uploaded' });
        return;
      }

      // Generate a unique filename with original extension
      const ext = path.extname(data.filename) || '.m4a';
      const randomName = `${crypto.randomUUID()}${ext}`;
      const savePath = path.join(uploadDir, randomName);

      // Stream the file directly to disk
      await pipeline(data.file, fs.createWriteStream(savePath));
      const stats = await fs.promises.stat(savePath);

      // Public URL path
      const fileUrl = `/uploads/${randomName}`;

      reply.code(201).send({
        success: true,
        message: 'File uploaded successfully',
        data: {
          url: fileUrl,
          mimetype: data.mimetype,
          size: stats.size,
        },
      });
    } catch (err: any) {
      reply.code(500).send({ success: false, error: err.message || 'File upload failed' });
    }
  }
}
