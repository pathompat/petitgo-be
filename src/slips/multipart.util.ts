import type { Request } from 'express'
import Busboy = require('busboy')

export interface ParsedFile {
  buffer: Buffer
  originalname: string
  mimetype: string
}

/**
 * Parse a single uploaded file from a multipart/form-data request.
 *
 * On Firebase Cloud Functions v2 (Cloud Run) the runtime reads the body into
 * `req.rawBody` before the handler runs, draining the request stream — so
 * multer/busboy reading from `req` directly fails with "Unexpected end of
 * form". We therefore feed `req.rawBody` to busboy when present, and fall back
 * to piping the live stream for the local NestJS HTTP server.
 */
export function parseMultipartFile(
  req: Request,
  fieldName = 'image',
  maxBytes = 10 * 1024 * 1024,
): Promise<ParsedFile | null> {
  return new Promise((resolve, reject) => {
    let busboy: ReturnType<typeof Busboy>
    try {
      busboy = Busboy({
        headers: req.headers,
        limits: { files: 1, fileSize: maxBytes },
      })
    } catch (err) {
      reject(err)
      return
    }

    let file: ParsedFile | null = null
    let truncated = false

    busboy.on('file', (name, stream, info) => {
      if (name !== fieldName) {
        stream.resume()
        return
      }
      const chunks: Buffer[] = []
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('limit', () => {
        truncated = true
      })
      stream.on('end', () => {
        file = {
          buffer: Buffer.concat(chunks),
          originalname: info.filename,
          mimetype: info.mimeType,
        }
      })
    })

    busboy.on('error', reject)
    busboy.on('finish', () => {
      if (truncated) {
        reject(new Error(`file exceeds the ${maxBytes}-byte limit`))
        return
      }
      resolve(file)
    })

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody
    if (rawBody && rawBody.length) {
      busboy.end(rawBody)
    } else {
      req.pipe(busboy)
    }
  })
}
