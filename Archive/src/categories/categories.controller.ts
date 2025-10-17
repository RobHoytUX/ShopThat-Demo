import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';

@ApiTags('Categories')
@Controller('api/categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all Categories and their child categories' })
  @ApiResponse({
    status: 200,
    description: 'Returns an array of Categories and their nested children',
  })
  async getAllCategories() {
    return this.categoriesService.getAllCategories();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by id with all nested information' })
  @ApiResponse({
    status: 200,
    description: 'Returns category by id and their nested children',
  })
  getCategory(@Param('id') id: string) {
    return this.categoriesService.getCategoryById(id);
  }
}
