import { IsBoolean, IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMediaDto {
  @ApiProperty({ example: 'example.png', description: 'Original file name' })
  @IsString()
  @IsNotEmpty()
  originalName: string;

  @ApiProperty({
    example: 'https://placehold.co/600x400/000000/FFFFFF/png',
    description: 'File URL',
  })
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ example: true, description: 'Is media active?' })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ example: false, description: 'Is media external?' })
  @IsBoolean()
  external: boolean;
}
