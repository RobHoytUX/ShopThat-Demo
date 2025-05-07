import { IsOptional, IsString, IsArray, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateComapaingDto {
  @ApiProperty({ description: 'Title of the campaign' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Content of the campaign' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Main image URL of the campaign' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'List of image URLs' })
  @IsOptional()
  @IsArray()
  @IsString()
  images?: string[];

  @ApiPropertyOptional({
    description: 'List of event IDs associated with the campaign',
  })
  @IsOptional()
  @IsArray()
  @IsString()
  events?: string[];

  @ApiPropertyOptional({
    description: 'List of people IDs related to the campaign',
  })
  @IsOptional()
  @IsArray()
  @IsString()
  people?: string[];

  @ApiPropertyOptional({
    description: 'List of product IDs associated with the campaign',
  })
  @IsOptional()
  @IsArray()
  @IsString()
  products?: string[];
}
