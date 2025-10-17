import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllCategories() {
    return this.prisma.categories.findMany({
      where: { parentCategoryId: null }, // top-level categories
      include: {
        children: {
          include: {
            children: true,
          },
        },
      },
    });
  }

  async getCategoryById(categoryId: string) {
    const category = await this.prisma.categories.findUnique({
      where: { id: categoryId },
      include: {
        children: {
          include: {
            products: true,
          },
        },
        products: true,
        comapaings: true,
      },
    });

    if (!category) {
      throw new NotFoundException(
        `Category with ID ${categoryId} was not found!`,
      );
    }

    return category;
  }
}
