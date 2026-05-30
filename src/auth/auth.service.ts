import { ForbiddenException, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { adminAuth, adminDb } from '../firebase'

@Injectable()
export class AuthService {
  constructor(private jwtService: JwtService) {}

  async loginWithFirebaseToken(idToken: string) {
    // 1. Verify the Firebase ID token (proves the user authenticated via Google)
    let decoded: any
    try {
      decoded = await adminAuth.verifyIdToken(idToken)
    } catch {
      throw new ForbiddenException('Invalid or expired Firebase token')
    }

    // 2. Query users collection where uid field == decoded.uid
    const querySnap = await adminDb
      .collection('users')
      .where('uid', '==', decoded.uid)
      .get()

    if (querySnap.empty) {
      throw new ForbiddenException('User is not registered in the system')
    }

    const userData = querySnap.docs[0].data() as {
      uid: string
      username: string
      role: string
    }

    // 3. Issue our own JWT so future API calls don't re-hit Firebase
    const payload = {
      uid: userData.uid,
      username: userData.username,
      role: userData.role,
    }

    return {
      accessToken: this.jwtService.sign(payload),
      user: payload,
    }
  }
}
