import { Context, Schema } from 'koishi'
import { Prisma, PrismaClient } from '@prisma/client'

import { me } from './commands/me'
import { ip } from './commands/ip'
import { ports } from './commands/ports'

export const name = 'aiyatsbus'
const prisma = new PrismaClient();

export interface Config { }

export const Config: Schema<Config> = Schema.object({})

export function apply(ctx: Context) {
  ctx.command('cdkey', "授权码管理", { authority: 0 })
  me(ctx)
  ip(ctx)
  ports(ctx)
}
