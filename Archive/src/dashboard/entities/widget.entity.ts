// src/dashboard/entities/widget.entity.ts
import { ApiProperty } from '@nestjs/swagger';

export class Widget {
    @ApiProperty({ description: 'Widget title', example: 'Weather Widget', nullable: true })
    title?: string;

    @ApiProperty({ description: 'Widget description', example: 'Shows the current weather', nullable: true })
    description?: string;

    @ApiProperty({ description: 'Type of the widget', example: 'weather' })
    type: string;

    @ApiProperty({ description: 'Sort order of the widget', example: 1 })
    sortOrder: number;

    @ApiProperty({
        description: 'Data associated with the widget',
        example: { location: 'New York', temperature: 22 },
    })
    data: Record<string, any>;
}
