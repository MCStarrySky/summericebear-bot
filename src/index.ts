import { Context, Schema } from 'koishi'
import { PrismaClient } from '@prisma/client'

export const name = 'cdkey'

export interface Config { }

export const Config: Schema<Config> = Schema.object({})

const prisma = new PrismaClient()

export function apply(ctx: Context) {
  const logger = ctx.logger('cdkey')

  ctx.command('cdkey', "授权码管理", { authority: 0 })

  ctx.command('cdkey.me', "显示与自己相关的信息", { authority: 0 }).action(async ({ session }) => {
    if (!session.isDirect) {
      await session.bot.deleteMessage(session.channelId, session.messageId)
      return '请私聊我使用此命令'
    }
    try {
      logger.info(`User ${session.userId} queryed cdkey`)
      const res = await prisma.cdkeys.findMany({
        where: {
          owner: session.userId
        }
      })
      if (res.length > 0) {
        let msg = `用户 ${session.userId} 的产品：\n\n `
        res.forEach((res, index) => {
          msg += `${index + 1} - ${res.plugin}\n`
          msg += `\tcdkey: ${res.cdkey}\n`
          msg += `\t对应ip/域名: ${res.ip}\n`
          if (res.ports === '-1') msg += `\t对应端口: 全端口\n\n `
          else msg += `\t对应端口: ${res.ports}\n\n `
        })
        return msg
      } else return `没有找到与 用户${session.userId} 相关的信息`
    } catch (e) {
      ctx.logger('cdkey').error(e)
      return '查询出现错误: ' + e
    }
  })

  ctx.command('cdkey.ip <cdkey:string> <newdata:string>', "编辑绑定 IP", { authority: 0 })
    .action(async ({ session }, cdkey, newdata) => {
      if (!session.isDirect) {
        await session.bot.deleteMessage(session.channelId, session.messageId)
        return '请私聊我使用此命令'
      }
      if (!cdkey) return '请提供产品密钥'
      if (!newdata) return '请提供ip'
      cdkey = cdkey.replace(/\s/g, '')
      newdata = newdata.replace(/\s/g, '')
      try {
        const originalData = await prisma.cdkeys.findFirst({
          where: {
            owner: session.userId,
            cdkey: cdkey
          }
        })
        if (!originalData) return '没有找到对应产品'
        if (originalData.ip === newdata) return `IP 未发生变化: ${originalData.ip}`
        logger.info(`User ${session.userId} updated cdkey ${cdkey}(${originalData.plugin}) ip from ${originalData.ip} to ${newdata}`)
        const res = await prisma.cdkeys.updateMany({
          where: {
            owner: session.userId,
            cdkey: cdkey
          },
          data: {
            ip: newdata
          }
        })
        return `已将 ${cdkey}(${originalData.plugin}) 的 绑定IP 从 ${originalData.ip} 修改为 ${newdata}`
      } catch (e) {
        ctx.logger('cdkey').error(e)
        return '查询出现错误: ' + e
      }
    })

  ctx.command('cdkey.ports', "端口管理", { authority: 0 })

  ctx.command('cdkey.ports.add <cdkey> <newdata>', "增加绑定端口", { authority: 0 })
    .action(async ({ session }, cdkey, newdata) => {
      if (!session.isDirect) {
        await session.bot.deleteMessage(session.channelId, session.messageId)
        return '请私聊我使用此命令'
      }
      if (!cdkey) return '请提供产品名'
      if (!newdata) return '请提供端口'
      cdkey = cdkey.replace(/\s/g, '')
      newdata = newdata.replace(/\s/g, '')
      try {
        const originalData = await prisma.cdkeys.findFirst({
          where: {
            owner: session.userId,
            cdkey: cdkey
          }
        })
        if (!originalData) return '没有找到对应产品'
        if (originalData.ports === '-1') return '全端口产品不支持修改端口'
        const ports = originalData.ports.split(',')
        if (ports.length === 5) return '端口已达上限'
        if (ports.includes(newdata)) return `端口已存在: ${originalData.ports}`
        ports.push(newdata)
        logger.info(`User ${session.userId} added port ${newdata} to cdkey ${cdkey}`)
        const res = await prisma.cdkeys.updateMany({
          where: {
            owner: session.userId,
            cdkey: cdkey
          },
          data: {
            ports: ports.join(',')
          }
        })
        return `已为 ${cdkey}(${originalData.plugin}) 添加 绑定端口 ${newdata}\n目前可用端口: ${originalData.ports + ',' + newdata}`
      } catch (e) {
        ctx.logger('cdkey').error(e)
        return '查询出现错误: ' + e
      }

    })

  ctx.command('cdkey.ports.remove <cdkey> <data>', "删除绑定端口", { authority: 0 })
    .action(async ({ session }, cdkey, data) => {
      if (!session.isDirect) {
        await session.bot.deleteMessage(session.channelId, session.messageId)
        return '请私聊我使用此命令'
      }
      if (!cdkey) return '请提供产品名'
      if (!data) return '请提供端口'
      cdkey = cdkey.replace(/\s/g, '')
      data = data.replace(/\s/g, '')
      try {
        const originalData = await prisma.cdkeys.findFirst({
          where: {
            owner: session.userId,
            cdkey: cdkey
          }
        })
        if (!originalData) return '没有找到对应产品'
        if (originalData.ports === '-1') return '全端口产品不支持修改端口'
        const ports = originalData.ports.split(',')
        if (!ports.includes(data)) return `端口不存在: ${originalData.ports}`
        const newPorts = ports.filter(port => port !== data)
        logger.info(`User ${session.userId} removed port ${data} from cdkey ${cdkey}`)
        const res = await prisma.cdkeys.updateMany({
          where: {
            owner: session.userId,
            cdkey: cdkey
          },
          data: {
            ports: newPorts.join(',')
          }
        })
        return `已为 ${cdkey}(${originalData.plugin}) 删除 绑定端口 ${data}\n目前可用端口: ${newPorts.join(',')}`
      } catch (e) {
        ctx.logger('cdkey').error(e)
        return '查询出现错误: ' + e
    }
    })
}
