import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';

@Controller('files')
export class FilesController {
  @Get('image')
  serveImage(@Res() res: Response) {
    const filePath = join(__dirname, '..', 'static', 'js', 'app.ca22837a.js');
    return res.sendFile(filePath);
  }
}
