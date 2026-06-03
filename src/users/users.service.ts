import { Injectable, NotFoundException } from '@nestjs/common'
import { adminDb } from '../firebase'
import { UpdateUserDto } from './dto/update-user.dto'

@Injectable()
export class UsersService {
  async getByUid(uid: string) {
    const snap = await adminDb.collection('users').where('uid', '==', uid).get()
    if (snap.empty) throw new NotFoundException('User not found')
    return this.serializeDoc(snap.docs[0])
  }

  async getAll() {
    const snap = await adminDb.collection('users').get()
    return snap.docs.map(d => this.serializeDoc(d))
  }

  async updateById(docId: string, dto: UpdateUserDto) {
    const ref = adminDb.collection('users').doc(docId)
    const snap = await ref.get()
    if (!snap.exists) throw new NotFoundException('User not found')

    const payload: Record<string, any> = { ...dto, updatedAt: new Date() }
    // Remove undefined fields so we don't overwrite with null
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k])

    await ref.update(payload)
    return this.serializeDoc(await ref.get())
  }

  private serializeDoc(doc: FirebaseFirestore.DocumentSnapshot) {
    const data = doc.data() ?? {}
    return {
      documentId: doc.id,
      ...data,
      createdAt: (data['createdAt'] as any)?.toDate?.()?.toISOString() ?? null,
      updatedAt: (data['updatedAt'] as any)?.toDate?.()?.toISOString() ?? null,
    }
  }
}
