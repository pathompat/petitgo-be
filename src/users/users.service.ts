import { Injectable, NotFoundException } from '@nestjs/common'
import { adminDb } from '../firebase'

@Injectable()
export class UsersService {
  async getByUid(uid: string) {
    const snap = await adminDb.collection('users').where('uid', '==', uid).get()
    if (snap.empty) throw new NotFoundException('User not found')
    return snap.docs[0].data()
  }
}
