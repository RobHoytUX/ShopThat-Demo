// src/dashboard/dashboard.controller.ts
import {
    Controller,
    Get,
    Patch,
    Param,
    Body,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@Controller('api/dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @Get('keywords')
    @ApiOperation({ summary: 'Get all keywords' })
    @ApiResponse({
        status: 200,
        description: 'The list of keywords',
        schema: {
            type: 'array',
            items: {
                properties: {
                    id: { type: 'string' },
                    keyWord: { type: 'string'},
                    active: { type: 'boolean'},
                },
            },
        },
    })
    async findAllKeywords() {
        return this.dashboardService.findAllKeywords();
    }

    @Get('keywords-by-compaign-id/:id')
    @ApiOperation({ summary: 'Get keywords by campagn ID' })
    @ApiResponse({
        status: 200,
        description: 'The list of keywords',
        schema: {
            type: 'array',
            items: {
                properties: {
                    id: { type: 'string' },
                    keyWord: { type: 'string'},
                    related: { type: 'array'},
                    active: { type: 'boolean'},
                },
            },
        },
    })
    async findKeywordsByCampaignId(@Param('id') id: string) {
        return this.dashboardService.findKeywordsByCampaignId(id);
    }


    @Patch('keywords/toggle/:id')
    @ApiOperation({ summary: 'Toggle keyword active status' })
    @ApiResponse({
        status: 200,
    })
    async toggleKeywordActive(@Param('id') id: string) {
        const keyword = this.dashboardService.findKeywordById(id);
        keyword.then((kw) => {
            const active = kw?.active ?? true
            return this.dashboardService.toggleKeywordActiveById(id, !active);
        }).catch(() => {
            const related = this.dashboardService.findRelatedKeywordById(id);
            related.then((kw) => {
                console.log(related)
                const active = kw?.active ?? true
                return this.dashboardService.toggleRelatedKeywordActiveById(id, !active);
            }).catch(() => {
                return 200;
            })
        })
    }

    @Get('widgets')
    @ApiOperation({ summary: 'Get the full list of widgets' })
    @ApiResponse({
        status: 200,
        description: 'The list of widgets',
        schema: {
            type: 'array',
            items: {
                properties: {
                    id: { type: 'string' },
                    title: { type: 'string', nullable: true },
                    description: { type: 'string', nullable: true },
                    type: { type: 'string' },
                    sortOrder: { type: 'number' },
                    data: { type: 'object' },
                },
            },
        },
    })
    async getWidgets() {
        return this.dashboardService.getWidgets();
    }

    @Patch('widgets/:id/sort-order')
    @ApiOperation({ summary: 'Update the sortOrder of a specific widget' })
    @ApiResponse({
        status: 200,
        description: 'The updated widget',
        schema: {
            properties: {
                id: { type: 'string' },
                title: { type: 'string', nullable: true },
                description: { type: 'string', nullable: true },
                type: { type: 'string' },
                sortOrder: { type: 'number' },
                data: { type: 'object' },
            },
        },
    })
    async updateWidgetSortOrder(
        @Param('id') id: string,
        @Body('sortOrder') sortOrder: number,
    ) {
        return this.dashboardService.updateWidgetSortOrder(id, sortOrder);
    }

    // New endpoint: Get a single dashboard by ID
    @Get(':id')
    @ApiOperation({ summary: 'Get a single dashboard by ID' })
    @ApiResponse({
        status: 200,
        description: 'The requested dashboard, including its widgets',
        schema: {
            properties: {
                id: { type: 'string' },
                widgets: {
                    type: 'array',
                    items: {
                        properties: {
                            id: { type: 'string' },
                            title: { type: 'string', nullable: true },
                            description: { type: 'string', nullable: true },
                            type: { type: 'string' },
                            sortOrder: { type: 'number' },
                            data: { type: 'object' },
                        },
                    },
                },
            },
        },
    })
    async getDashboardById(@Param('id') id: string) {
        return this.dashboardService.getDashboardById(id);
    }
}
