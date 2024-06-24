import { Context } from "koishi";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function ports(ctx: Context) {
  ctx.command('cdkey.ports', "端口管理", { authority: 0 })

  ctx.command('cdkey.ports.add <product> <newdata>', "增加绑定端口", { authority: 0 })
    .action(async ({ session }, product, newdata) => {
      if (!session.isDirect) {
        await session.bot.deleteMessage(session.channelId, session.messageId)
        return '请私聊我使用此命令'
      }
      if (!product) return '请提供产品名'
      if (!newdata) return '请提供端口'
      const originalData = await prisma.cdkey.findFirst({
        where: {
          owner: session.userId,
          plugin: product
        }
      })
      if (!originalData) return '没有找到对应产品'
      if (originalData.ports === '-1') return '全端口产品不支持修改端口'
      const ports = originalData.ports.split(',')
      if (ports.length === 5) return '端口已达上限'
      if (ports.includes(newdata)) return `端口已存在: ${originalData.ports}`
      ports.push(newdata)
      const res = await prisma.cdkey.updateMany({
        where: {
          owner: session.userId,
          plugin: product
        },
        data: {
          ports: ports.join(',')
        }
      })
      return `已为 ${product} 添加 绑定端口 ${newdata}\n目前可用端口: ${originalData.ports + ',' + newdata}`
    })

  ctx.command('cdkey.ports.remove <product> <data>', "删除绑定端口", { authority: 0 })
    .action(async ({ session }, product, data) => {
      if (!session.isDirect) {
        await session.bot.deleteMessage(session.channelId, session.messageId)
        return '请私聊我使用此命令'
      }
      if (!product) return '请提供产品名'
      if (!data) return '请提供端口'
      const originalData = await prisma.cdkey.findFirst({
        where: {
          owner: session.userId,
          plugin: product
        }
      })
      if (!originalData) return '没有找到对应产品'
      if (originalData.ports === '-1') return '全端口产品不支持修改端口'
      const ports = originalData.ports.split(',')
      if (!ports.includes(data)) return `端口不存在: ${originalData.ports}`
      const newPorts = ports.filter(port => port !== data)
      const res = await prisma.cdkey.updateMany({
        where: {
          owner: session.userId,
          plugin: product
        },
        data: {
          ports: newPorts.join(',')
        }
      })
      return `已为 ${product} 删除 绑定端口 ${data}\n目前可用端口: ${newPorts.join(',')}`
    })
}