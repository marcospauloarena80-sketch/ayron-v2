import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto, UpdateDocumentDto } from './dto/document.dto';
import { CurrentUser, RequestUser } from '../common/decorators/current-user.decorator';
import { DocumentStatus, DocumentType } from '@prisma/client';

@UseGuards(AuthGuard('jwt'))
@Controller('documents')
export class DocumentsController {
  constructor(private readonly svc: DocumentsService) {}

  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateDocumentDto) {
    return this.svc.create(dto, user);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.svc.update(id, dto, user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.findOne(id, user);
  }

  @Post(':id/sign')
  sign(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.sign(id, user);
  }

  @Post(':id/retry-pdf-upload')
  retryPdfUpload(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.retryPdfUpload(id, user);
  }

  @Post(':id/upload-validated')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadValidated(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Arquivo PDF não enviado');
    return this.svc.uploadValidated(id, file, user);
  }

  @Get(':id/download')
  async download(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Query('variant') variant: 'original' | 'validated' = 'original',
    @Res() res: Response,
  ) {
    const result = await this.svc.download(id, variant, user);
    if (result.fallback && result.localPath) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="document-${id}.pdf"`);
      return res.sendFile(result.localPath);
    }
    return res.json({ url: result.url, expiresIn: 120 });
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.svc.cancel(id, user);
  }
}

@UseGuards(AuthGuard('jwt'))
@Controller('patients/:patientId/documents')
export class PatientDocumentsController {
  constructor(private readonly svc: DocumentsService) {}

  @Get()
  findByPatient(
    @CurrentUser() user: RequestUser,
    @Param('patientId') patientId: string,
    @Query('type') type?: DocumentType,
    @Query('status') status?: DocumentStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findByPatient(patientId, user, {
      type,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }
}
