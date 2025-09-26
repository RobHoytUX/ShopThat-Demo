// src/publishers/publishers.controller.spec.ts
import {Test, TestingModule} from '@nestjs/testing';
import {PrismaService} from '../prisma/prisma.service';
import {PublishersService} from './publishers.service';
import {PublishersController} from './publishers.controller';

describe('PublishersController', () => {
    let controller: PublishersController;
    let service: PublishersService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PublishersService, PrismaService],
            controllers: [PublishersController],
        }).compile();

        controller = module.get<PublishersController>(PublishersController);
        service = module.get<PublishersService>(PublishersService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
});
