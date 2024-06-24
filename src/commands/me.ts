import { Context } from 'koishi'
import { Prisma, PrismaClient } from '@prisma/client'

const prisma = new PrismaClient();

export async function me(ctx: Context) {
  ctx.command('cdkey.me', "显示与自己相关的信息", { authority: 0 }).action(async ({ session }) => {
    if (!session.isDirect) {
      await session.bot.deleteMessage(session.channelId, session.messageId)
      return '请私聊我使用此命令'
    }
    const res = await prisma.testtable.findMany({
      where: {
        owner: session.userId
      }
    })
    if (res.length > 0) {
      let msg = `用户 ${session.userId} 的产品：\n`
      res.forEach((res, index) => {
        msg += `${index + 1} - ${res.plugin}\n`
        msg += `\tcdkey: ${res.cdkey}\n`
        msg += `\t对应ip/域名: ${res.ip}\n`
        if (res.ports === '-1') msg += `\t对应端口: 全端口\n`
        else msg += `\t对应端口: ${res.ports}\n`
      })
      return msg
    } else return `没有找到与 用户${session.userId} 相关的信息`
  })
}