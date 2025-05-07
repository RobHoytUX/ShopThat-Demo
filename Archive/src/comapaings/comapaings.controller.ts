import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ComapaingsService } from './comapaings.service';
import { CreateComapaingDto } from './dto/create-comapaings.dto';
import { UpdateComapaingDto } from './dto/update-comapaings.dto';

@ApiTags('Comapaings')
@Controller('api/campaings')
export class ComapaingsController {
  constructor(private readonly comapaingsService: ComapaingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Comapaing' })
  @ApiResponse({ status: 201, description: 'Comapaing created successfully' })
  create(@Body() createComapaingDto: CreateComapaingDto) {
    return this.comapaingsService.create(createComapaingDto);
  }
  @Get()
  @ApiOperation({ summary: 'Get all Comapaings with their ComapaingItems' })
  @ApiResponse({
    status: 200,
    description: 'Returns an array of Comapaings and their items',
  })
  async findAll() {
    return this.comapaingsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Comapaing by ID' })
  @ApiResponse({ status: 200, description: 'Returns a single Comapaing' })
  @ApiResponse({ status: 404, description: 'Comapaing not found' })
  findOne(@Param('id') id: string) {
    return this.comapaingsService.findOne(id);
  }

  @Get(':id/items')
  @ApiOperation({ summary: 'Get all ComapaingItems for a given Comapaing' })
  @ApiResponse({
    status: 200,
    description: 'Returns an array of ComapaingItems',
  })
  @ApiResponse({ status: 404, description: 'Comapaing not found' })
  findItems(@Param('id') id: string) {
    return this.comapaingsService.findItemsByCampaign(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a Comapaing' })
  @ApiResponse({ status: 200, description: 'Comapaing updated successfully' })
  @ApiResponse({ status: 404, description: 'Comapaing not found' })
  update(
    @Param('id') id: string,
    @Body() updateComapaingDto: UpdateComapaingDto,
  ) {
    return this.comapaingsService.update(id, updateComapaingDto);
  }

  @Patch('items/:itemId/toggle')
  @ApiOperation({ summary: 'Toggle active status of a ComapaingItem' })
  @ApiResponse({
    status: 200,
    description: 'ComapaingItem active status updated successfully',
  })
  @ApiResponse({ status: 404, description: 'ComapaingItem not found' })
  @ApiParam({
    name: 'itemId',
    description: 'ID of the ComapaingItem to update',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        active: {
          type: 'boolean',
          description: 'New active status of the CompaingItem (true/false)',
          example: true,
        },
      },
    },
  })
  toggleItemActive(
    @Param('itemId') itemId: string,
    @Body() body: { active: boolean },
  ) {
    return this.comapaingsService.toggleActive(itemId, body.active);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a Comapaing' })
  @ApiResponse({ status: 200, description: 'Comapaing deleted successfully' })
  @ApiResponse({ status: 404, description: 'Comapaing not found' })
  remove(@Param('id') id: string) {
    return this.comapaingsService.remove(id);
  }
}
