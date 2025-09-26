import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UploadedFile,
  UseInterceptors,
  Res,
  NotFoundException,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags
} from "@nestjs/swagger";
import { MediaService } from './media.service';
import { UpdateMediaDto } from './dto/update-media.dto';
import { CreateMediaDto } from './dto/create-media.dto';

@ApiTags('Media')
@Controller('api/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a media file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<CreateMediaDto> {
    return this.mediaService.create(file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all media files' })
  @ApiResponse({ status: 200, description: 'List of media files' })
  findAll() {
    return this.mediaService.findAll();
  }

  @Get('file')
  @ApiOperation({ summary: 'Get file from server' })
  async getFile(@Query('url') url: string, @Res() res: Response) {
    if (!url) {
      throw new BadRequestException('Path is required');
    }

    try {
      const fileBuffer = await this.mediaService.getMediaFile(url);
      const extension = url.split('.').pop();
      res.contentType(`image/${extension}`);
      res.send(fileBuffer);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get media by ID' })
  @ApiResponse({ status: 200, description: 'Media found' })
  findOne(@Param('id') id: string) {
    return this.mediaService.findOne(Number(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update media record' })
  update(@Param('id') id: string, @Body() updateMediaDto: UpdateMediaDto) {
    return this.mediaService.update(Number(id), updateMediaDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete media record' })
  remove(@Param('id') id: string) {
    return this.mediaService.remove(Number(id));
  }
}
