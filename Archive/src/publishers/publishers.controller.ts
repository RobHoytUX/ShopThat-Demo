// src/publishers/publishers.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PublishersService } from './publishers.service';

@ApiTags('Publishers')
@Controller('api/publishers')
export class PublishersController {
    constructor(private readonly publishersService: PublishersService) {}

    @Get('menu')
    @ApiOperation({ summary: 'Get top 10 most used Articles, Keywords, and Publishers' })
    @ApiResponse({
        status: 200,
        description: 'Top 10 entities',
        schema: {
            properties: {
                topArticles: {
                    type: 'array',
                    items: {
                        properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            usagesCount: { type: 'integer' },
                        },
                    },
                },
                topKeywords: {
                    type: 'array',
                    items: {
                        properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            usagesCount: { type: 'integer' },
                        },
                    },
                },
                topPublishers: {
                    type: 'array',
                    items: {
                        properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            usagesCount: { type: 'integer' },
                        },
                    },
                },
            },
        },
    })
    async getTopUsedEntities() {
        return this.publishersService.getTopUsedEntities();
    }

    @Get('')
    @ApiOperation({ summary: 'List all' })
    @ApiResponse({
        status: 200,
        description: 'List All',
        schema: {
            properties: {
                publishers: {
                    type: 'array',
                    items: {
                        properties: {
                            id: { type: 'string' },
                            title: { type: 'string' },
                            usagesCount: { type: 'integer' },
                        },
                    },
                },
            },
        },
    })
    async getAll() {
        return this.publishersService.getAll();
    }
}
