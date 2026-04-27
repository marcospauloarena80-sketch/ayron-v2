import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, from, switchMap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RlsInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const clinicId: string | undefined = request.user?.clinic_id;

    if (!clinicId) {
      return next.handle();
    }

    return from(this.prisma.setClinicContext(clinicId)).pipe(
      switchMap(() => next.handle()),
    );
  }
}
