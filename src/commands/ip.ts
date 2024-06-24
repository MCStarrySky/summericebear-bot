import { Context } from "koishi";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function ip(ctx: Context) {
  ctx.command('cdkey.ip <product:string> <newdata:string>', "编辑绑定IP", { authority: 0 })
    .action(async ({ session }, product, newdata) => {
      if (!session.isDirect) {
        await session.bot.deleteMessage(session.channelId, session.messageId)
        return '请私聊我使用此命令'
      }
      if (!product) return '请提供产品名'
      if (!newdata) return '请提供ip'
      const originalData = await prisma.testtable.findFirst({
        where: {
          owner: session.userId,
          plugin: product
        }
      })
      if (!originalData) return '没有找到对应产品'
      const res = await prisma.testtable.updateMany({
        where: {
          owner: session.userId,
          plugin: product
        },
        data: {
          ip: newdata
        }
      })
      return `已将 ${product} 的 绑定IP 从 ${originalData.ip} 修改为 ${newdata}`
    })
}