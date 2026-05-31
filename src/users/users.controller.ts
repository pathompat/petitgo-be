import { Controller, Get, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { UsersService } from './users.service'

@ApiTags('users')
@ApiBearerAuth()
@Controller('user')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get current authenticated user from Firestore' })
  @Get()
  getMe(@Request() req: any) {
    return this.usersService.getByUid(req.user.uid)
  }
}
