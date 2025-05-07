import { PartialType } from '@nestjs/mapped-types';
import { CreateComapaingDto } from './create-comapaings.dto';

export class UpdateComapaingDto extends PartialType(CreateComapaingDto) {}
