import { Controller, Get, Put, Param, Body, Request } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { UsersService } from './users.service'
import { UpdateUserDto } from './dto/update-user.dto'

@ApiTags('users')
@ApiBearerAuth()
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Get current authenticated user from Firestore' })
  @Get('user/me')
  getMe(@Request() req: any) {
    return this.usersService.getByUid(req.user.uid)
  }

  @ApiOperation({ summary: 'Get all users from Firestore' })
  @Get('users')
  getAll() {
    return this.usersService.getAll()
  }

  @ApiOperation({ summary: 'Update user by Firestore document ID' })
  @Put('user/:id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.updateById(id, dto)
  }
}
