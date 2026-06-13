import { randomUUID } from 'crypto'
import { Inject, Injectable } from '@nestjs/common'
import { REQUEST } from '@nestjs/core'
import { adminBucket, adminBucketName, adminDb } from '../firebase'
import { CreateSlipDto } from './dto/create-slip.dto'
import { extractSlipFromImage } from './slip-qr.util'
import { ParsedFile } from './multipart.util'

@Injectable()
export class SlipsService {
  private readonly col = adminDb.collection('slips')

  constructor(@Inject(REQUEST) private readonly req: { user: any }) {}

  /**
   * Upload a slip image to Firebase Storage under /slip/{yyyy}/{mm}/ and return
   * a tokenized download URL.
   */
  async uploadImage(file: ParsedFile) {
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const ext = (file.originalname?.split('.').pop() || 'jpg')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
    const objectPath = `slip/${yyyy}/${mm}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`

    const token = randomUUID()
    await adminBucket.file(objectPath).save(file.buffer, {
      resumable: false,
      metadata: {
        contentType: file.mimetype,
        metadata: { firebaseStorageDownloadTokens: token },
      },
    })

    const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${adminBucketName}/o/${encodeURIComponent(
      objectPath,
    )}?alt=media&token=${token}`

    return { imageUrl, path: objectPath }
  }

  /**
   * Create a slip log entry. `total_amount` is supplied manually (Thai slip QRs
   * do not carry the amount). The image's QR is still scanned best-effort to
   * capture the sending bank + transaction reference for reconciliation.
   */
  async create(dto: CreateSlipDto) {
    const { uid } = this.req.user

    const qr = await this.scanImage(dto.imageUrl)

    const data = {
      imageUrl: dto.imageUrl,
      uid,
      description: dto.description,
      uploadDate: dto.uploadDate,
      totalAmount: dto.totalAmount,
      sendingBank: qr.sendingBank,
      transRef: qr.transRef,
      createdAt: new Date().toISOString(),
    }
    const doc = await this.col.add(data)
    return { id: doc.id, ...data }
  }

  /** List slip upload logs, newest upload first. */
  async findAll() {
    const snap = await this.col.get()
    return snap.docs
      .map((d) => {
        const x = d.data() as Record<string, any>
        return {
          id: d.id,
          imageUrl: x.imageUrl ?? null,
          uid: x.uid ?? null,
          description: x.description ?? '',
          totalAmount: x.totalAmount ?? null,
          uploadDate: x.uploadDate ?? null,
          sendingBank: x.sendingBank ?? null,
          transRef: x.transRef ?? null,
        }
      })
      .sort((a, b) => ((b.uploadDate ?? '') > (a.uploadDate ?? '') ? 1 : -1))
  }

  private async scanImage(imageUrl: string) {
    try {
      const res = await fetch(imageUrl)
      if (!res.ok)
        return { totalAmount: null, sendingBank: null, transRef: null }
      const buffer = Buffer.from(await res.arrayBuffer())
      return await extractSlipFromImage(buffer)
    } catch {
      return { totalAmount: null, sendingBank: null, transRef: null }
    }
  }
}
