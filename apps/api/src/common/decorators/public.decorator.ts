import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca un endpoint como accesible sin autenticación (p. ej. /auth/login, /health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
