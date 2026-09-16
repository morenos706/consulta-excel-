import { Module } from '@nestjs/common';
import { BrigadeController } from './brigade.controller';
import { BrigadeService } from './brigade.service';

@Module({
  controllers: [BrigadeController],
  providers: [BrigadeService],
})
export class BrigadeModule {}
