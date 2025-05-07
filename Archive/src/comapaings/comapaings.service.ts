import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateComapaingDto } from './dto/create-comapaings.dto';
import { UpdateComapaingDto } from './dto/update-comapaings.dto';

@Injectable()
export class ComapaingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createComapaingsDto: CreateComapaingDto) {
    return this.prisma.comapaings.create({
      data: createComapaingsDto,
    });
  }

  async findAll() {
    return this.prisma.comapaings.findMany({
      include: {
        items: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.comapaings.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            documents: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateComapaingDto) {
    return this.prisma.comapaings.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    return this.prisma.comapaings.delete({ where: { id } });
  }

  async findItemsByCampaign(id: string) {
    return this.prisma.comapaingItems.findMany({
      where: {
        campaings: {
          some: { id },
        },
      },
      include: {
        campaings: true,
        documents: true,
      },
    });
  }

  async toggleActive(itemId: string, isActive: boolean) {
    return this.prisma.comapaingItems.update({
      where: { id: itemId },
      data: { active: isActive },
    });
  }
}
