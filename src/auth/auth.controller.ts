import { Body, Controller, Post } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { Public } from './public.decorator'

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'Exchange a Firebase ID token for an app JWT' })
  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.loginWithFirebaseToken(dto.idToken)
  }

  @ApiOperation({ summary: 'Exchange a LIFF ID token for an app JWT' })
  @Public()
  @Post('liff-login')
  liffLogin(@Body() dto: LoginDto) {
    return this.authService.loginWithLiffToken(dto.idToken)
  }
}
