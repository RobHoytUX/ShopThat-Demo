import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ComapaingsService } from './comapaings.service';
import { ComapaingsController } from './comapaings.controller';

@Module({
  imports: [],
  controllers: [ComapaingsController],
  providers: [ComapaingsService, PrismaService],
})
export class ComapaingsModule {}
