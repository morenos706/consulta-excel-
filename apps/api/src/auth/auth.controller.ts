import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('Autenticación')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('dev-login')
  devLogin(@Body() dto: LoginDto) {
    return this.authService.devLogin(dto);
  }
}
