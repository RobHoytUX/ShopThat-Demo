// src/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ description: 'The username of the user', example: 'testuser' })
    username: string;

    @ApiProperty({ description: 'The password of the user', example: 'testpassword' })
    password: string;
}
