import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { Response } from 'express';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('api/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a document' })
  @ApiConsumes('multipart/form-data') // Вказує, що запит містить файл
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
  @ApiResponse({
    status: 201,
    description: 'Document uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<CreateDocumentDto> {
    return this.documentsService.create(file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of documents',
  })
  findAll() {
    return this.documentsService.findAll();
  }

  @Get('file')
  @ApiOperation({ summary: 'Get document by file name' })
  @ApiResponse({
    status: 200,
    description: 'Returns the document file content',
  })
  async getDocument(@Query('fileName') fileName: string, @Res() res: Response) {
    if (!fileName) {
      throw new BadRequestException('fileName query parameter is required');
    }

    try {
      const { fileBuffer, contentType } =
        await this.documentsService.getDocumentFile(fileName);

      res.contentType(contentType);
      res.send(fileBuffer);
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns a single document',
  })
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a document' })
  @ApiResponse({
    status: 200,
    description: 'Document updated',
  })
  update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(+id, updateDocumentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document' })
  @ApiResponse({
    status: 200,
    description: 'Document deleted',
  })
  remove(@Param('id') id: string) {
    return this.documentsService.remove(+id);
  }
}
