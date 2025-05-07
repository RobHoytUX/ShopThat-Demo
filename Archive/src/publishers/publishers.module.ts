import { Module } from '@nestjs/common';
import { PublishersController } from './publishers.controller';
import { PublishersService } from './publishers.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
    controllers: [PublishersController], // Ensure controller is listed
    providers: [PublishersService, PrismaService],
})
export class PublishersModule {}
