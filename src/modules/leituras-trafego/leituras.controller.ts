import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Ingest } from '../../common/auth';
import { ReadingDto, ReadingsQuery } from '../../common/dto';
import { LeiturasService } from './leituras.service';

@ApiTags('leituras')
@Controller('leituras')
export class LeiturasController {
  constructor(private service: LeiturasService) {}
  @ApiBearerAuth()
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  @Get()
  list(@Query() query: ReadingsQuery) {
    return this.service.list(query);
  }
  @Ingest()
  @ApiHeader({ name: 'x-ingestion-key' })
  @Throttle({ default: { limit: 300, ttl: 60_000 } })
  @Post()
  create(@Body() dto: ReadingDto) {
    return this.service.create(dto);
  }
}
