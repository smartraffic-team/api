import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const id = /^[1-9][0-9]*$/;
export class PageDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limite?: number;
}
export class PeriodDto extends PageDto {
  @IsOptional() @IsDateString() inicio?: string;
  @IsOptional() @IsDateString() fim?: string;
  @IsOptional() @IsIn(['asc', 'desc']) ordem?: 'asc' | 'desc';
}
export class UserDto {
  @IsString() @IsNotEmpty() @MaxLength(150) nome!: string;
  @IsEmail() @MaxLength(190) email!: string;
  @IsString() @MinLength(12) senha!: string;
  @IsIn(['ADMINISTRADOR', 'OPERADOR', 'VISUALIZADOR']) nivelAcesso!: string;
  @IsOptional() @IsString() @MaxLength(20) telefone?: string;
  @IsOptional() @IsString() @MaxLength(100) cargo?: string;
}
export class UserPatchDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150) nome?: string;
  @IsOptional() @IsEmail() @MaxLength(190) email?: string;
  @IsOptional() @IsString() @MinLength(12) senha?: string;
  @IsOptional()
  @IsIn(['ADMINISTRADOR', 'OPERADOR', 'VISUALIZADOR'])
  nivelAcesso?: string;
  @IsOptional() @IsString() @MaxLength(20) telefone?: string;
  @IsOptional() @IsString() @MaxLength(100) cargo?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}
export class DeviceDto {
  @IsString() @IsNotEmpty() @MaxLength(40) codigo!: string;
  @IsString() @IsNotEmpty() @MaxLength(120) nome!: string;
  @IsIn(['CAMERA', 'COMPUTADOR', 'ARDUINO', 'CONTROLADOR', 'GATEWAY'])
  tipo!: string;
  @IsOptional() @Matches(id) viaId?: string;
  @IsOptional() @IsString() @MaxLength(120) modelo?: string;
  @IsOptional() @IsString() @MaxLength(50) versaoSoftware?: string;
  @IsOptional() @IsString() @MaxLength(45) enderecoIp?: string;
}
export class DevicePatchDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(120) nome?: string;
  @IsOptional()
  @IsIn(['CAMERA', 'COMPUTADOR', 'ARDUINO', 'CONTROLADOR', 'GATEWAY'])
  tipo?: string;
  @IsOptional() @Matches(id) viaId?: string;
  @IsOptional() @IsString() @MaxLength(120) modelo?: string;
  @IsOptional() @IsString() @MaxLength(50) versaoSoftware?: string;
  @IsOptional() @IsString() @MaxLength(45) enderecoIp?: string;
  @IsOptional()
  @IsIn(['ONLINE', 'OFFLINE', 'ALERTA', 'DESCONHECIDO'])
  status?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}
export class ReadingDto {
  @IsUUID() identificadorEvento!: string;
  @Matches(id) dispositivoId!: string;
  @IsIn(['A', 'B']) via!: string;
  @IsDateString() registradoEm!: string;
  @IsIn(['QUADRO', 'AGREGADA']) tipoLeitura!: string;
  @IsOptional()
  @IsIn(['VISAO_COMPUTACIONAL', 'SIMULACAO', 'MANUAL'])
  origemLeitura?: string;
  @IsOptional() @IsDateString() periodoInicioEm?: string;
  @IsInt() @Min(0) carrosDetectados!: number;
  @IsInt() @Min(0) pedestresDetectados!: number;
  @IsOptional() @IsInt() @Min(0) veiculosEmEspera?: number;
  @IsOptional() @IsInt() @Min(0) veiculosUnicos?: number;
}
export class ReadingsQuery extends PeriodDto {
  @IsOptional() @IsIn(['A', 'B']) via?: string;
  @IsOptional() @IsIn(['QUADRO', 'AGREGADA']) tipoLeitura?: string;
  @IsOptional() @Matches(id) dispositivoId?: string;
}
export class PhaseDto {
  @Matches(id) semaforoId!: string;
  @IsIn(['VERMELHO', 'AMARELO', 'VERDE', 'DESCONHECIDA']) cor!: string;
  @IsDateString() inicioEm!: string;
  @IsOptional() @IsDateString() fimEm?: string;
  @IsIn(['ARDUINO', 'PYTHON', 'SIMULACAO', 'MANUAL', 'SISTEMA'])
  origemEstado!: string;
  @IsOptional()
  @IsIn(['ADAPTATIVO', 'FIXO', 'MANUAL', 'DESCONHECIDO'])
  modoOperacao?: string;
}
export class AlertDto {
  @IsOptional() @Matches(id) dispositivoId?: string;
  @IsString() @IsNotEmpty() @MaxLength(40) tipo!: string;
  @IsString() @IsNotEmpty() @MaxLength(150) titulo!: string;
  @IsIn(['INFO', 'AVISO', 'CRITICO']) gravidade!: string;
  @IsString() @IsNotEmpty() descricao!: string;
  @IsOptional() @IsDateString() ocorridoEm?: string;
}
export class AlertPatchDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(150) titulo?: string;
  @IsOptional() @IsString() @IsNotEmpty() descricao?: string;
  @IsOptional() @IsIn(['INFO', 'AVISO', 'CRITICO']) gravidade?: string;
}
export class TelemetryDto {
  @Matches(id) dispositivoId!: string;
  @IsDateString() registradoEm!: string;
  @IsIn(['ONLINE', 'OFFLINE', 'ALERTA', 'DESCONHECIDO']) status!: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100) cpuPercentual?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) memoriaPercentual?: number;
  @IsOptional() @IsNumber() @Min(-40) @Max(150) temperaturaC?: number;
  @IsOptional() @IsNumber() @Min(0) fps?: number;
  @IsOptional() @IsInt() @Min(0) latenciaMs?: number;
}
export class EventDto {
  @IsOptional() @Matches(id) dispositivoId?: string;
  @IsString() @IsNotEmpty() @MaxLength(40) categoria!: string;
  @IsIn(['INFO', 'AVISO', 'CRITICO']) gravidade!: string;
  @IsString() @IsNotEmpty() descricao!: string;
  @IsOptional() @IsDateString() ocorridoEm?: string;
}
