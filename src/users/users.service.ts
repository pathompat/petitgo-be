import { Injectable, NotFoundException } from '@nestjs/common'
import { adminDb } from '../firebase'

@Injectable()
export class UsersService {
  async getByUid(uid: string) {
    const snap = await adminDb.collection('users').where('uid', '==', uid).get()
    if (snap.empty) throw new NotFoundException('User not found')
    return this.serialize(snap.docs[0].data())
  }

  async getAll() {
    const snap = await adminDb.collection('users').get()
    return snap.docs.map(d => this.serialize(d.data()))
  }

  private serialize(data: FirebaseFirestore.DocumentData) {
    return {
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
    }
  }
}
