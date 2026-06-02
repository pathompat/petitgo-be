import { ForbiddenException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import axios from 'axios'
import { adminAuth, adminDb } from '../firebase'

@Injectable()
export class AuthService {
  private readonly apiKeys: string[]

  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
  ) {
    this.apiKeys = [this.config.get<string>('API_KEY')].filter(Boolean)
  }

  validateApiKey(apiKey: string): boolean {
    return this.apiKeys.includes(apiKey)
  }

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
      name: string
    }

    // 3. Issue our own JWT so future API calls don't re-hit Firebase
    const payload = {
      uid: userData.uid,
      username: userData.username,
      role: userData.role,
      name: userData.name ?? '',
    }

    return {
      accessToken: this.jwtService.sign(payload),
      user: payload,
    }
  }

  async loginWithLiff(lineAccessToken: string) {
    // 1. Verify LINE access token by calling LINE's profile API
    let lineUserId: string
    try {
      const { data } = await axios.get('https://api.line.me/v2/profile', {
        headers: { Authorization: `Bearer ${lineAccessToken}` },
      })
      lineUserId = data.userId
    } catch {
      throw new ForbiddenException('Invalid or expired LINE access token')
    }

    // 2. Query users collection where lineUserId field matches
    const querySnap = await adminDb
      .collection('users')
      .where('lineUserId', '==', lineUserId)
      .get()

    if (querySnap.empty) {
      throw new ForbiddenException('LINE user is not registered in the system')
    }

    const userData = querySnap.docs[0].data() as {
      uid: string
      username: string
      role: string
      name: string
    }

    // 3. Issue our own JWT
    const payload = {
      uid: userData.uid,
      username: userData.username,
      role: userData.role,
      name: userData.name ?? '',
    }

    return {
      accessToken: this.jwtService.sign(payload),
      user: payload,
    }
  }
}
