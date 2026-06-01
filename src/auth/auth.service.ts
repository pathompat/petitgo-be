import { ForbiddenException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
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

  async loginWithLiffToken(idToken: string) {
    const channelId = this.config.get<string>('LINE_CHANNEL_ID')
    if (!channelId) throw new ForbiddenException('LIFF not configured')

    let lineUser: { sub: string; email?: string; name?: string }
    try {
      const resp = await fetch('https://api.line.me/oauth2/v2.1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ id_token: idToken, client_id: channelId }).toString(),
      })
      if (!resp.ok) throw new Error('LINE verification failed')
      lineUser = await resp.json() as { sub: string; email?: string; name?: string }
    } catch {
      throw new ForbiddenException('Invalid or expired LIFF token')
    }

    // Look up user by lineUserId first, then fall back to email
    let querySnap = await adminDb.collection('users').where('lineUserId', '==', lineUser.sub).get()
    if (querySnap.empty && lineUser.email) {
      querySnap = await adminDb.collection('users').where('email', '==', lineUser.email).get()
    }
    if (querySnap.empty) throw new ForbiddenException('User is not registered in the system')

    const userData = querySnap.docs[0].data() as { uid: string; username: string; role: string; name: string }
    const payload = { uid: userData.uid, username: userData.username, role: userData.role, name: userData.name ?? '' }
    return { accessToken: this.jwtService.sign(payload), user: payload }
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
}
