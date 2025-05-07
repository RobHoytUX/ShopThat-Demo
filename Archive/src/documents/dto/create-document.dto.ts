import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  url: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  external?: boolean;
}
