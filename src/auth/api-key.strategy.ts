import { HeaderAPIKeyStrategy } from 'passport-headerapikey'
import { PassportStrategy } from '@nestjs/passport'
import { Injectable } from '@nestjs/common'
import { AuthService } from './auth.service'

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy, 'api-key') {
  constructor(private authService: AuthService) {
    super({ header: 'X-CLIENT-API-KEY', prefix: '' }, true, (apikey, done) => {
      const valid = authService.validateApiKey(apikey)
      if (!valid) return done(false)
      return done(null, { apiKey: apikey })
    })
  }
}
