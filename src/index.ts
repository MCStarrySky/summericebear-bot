import { Context, Schema } from 'koishi'
import { PrismaClient } from '@prisma/client'

export const name = 'cdkey'

export interface Config { }

export const Config: Schema<Config> = Schema.object({})

const PREFIX = "---== 狗熊系统 ==---\n"

const prisma = new PrismaClient()

export function apply(ctx: Context) {
  const logger = ctx.logger('cdkey')

  ctx.command('keys', "授权码管理", { authority: 0 })

  ctx.command('keys.me', "显示与自己相关的信息", { authority: 0 }).action(async ({ session }) => {
    if (!session.isDirect) {
      return `${PREFIX}私聊发，你发群里是想让大家都看到你授权码是吗？`
    }
    try {
      logger.info(`User ${session.userId} queryed cdkey`)
      const res = await prisma.cdkeys.findMany({
        where: {
          owner: session.userId
        }
      })
      if (res.length > 0) {
        let msg = `${PREFIX}你的产品：\n\n `
        res.forEach((res, index) => {
          msg += `${index + 1} - ${res.plugin}\n`
          msg += `\t序列码: ${res.cdkey}\n`
          msg += `\t对应ip/域名: ${res.ip}\n`
          if (res.ports === '-1') msg += `\t对应端口: 全端口\n\n `
          else msg += `\t对应端口: ${res.ports}\n\n `
        })
        return msg
      } else return `${PREFIX}你没买你查什么查？`
    } catch (e) {
      error(logger, e)
    }
  })

  ctx.command('keys.ip <cdkey:string> <newdata:string>', "编辑绑定 IP", { authority: 0 })
    .example('keys ip 114514aaaa1919810bbbb 114.514.1919.810\n    将你名下的授权码绑定ip改为114.514.1919.810')
    .action(async ({ session }, cdkey, newdata) => {
      if (!session.isDirect) {
        await session.bot.deleteMessage(session.channelId, session.messageId)
        return `${PREFIX}私聊发，你发群里是想让大家都看到你授权码是吗？`
      }
      if (!cdkey) return `${PREFIX}你不给我序列码我哪知道要帮你改哪个？`
      if (!newdata) return `${PREFIX}你不给我IP我帮你改毛。。`
      cdkey = cdkey.replace(/\s/g, '')
      newdata = newdata.replace(/\s/g, '')
      try {
        const originalData = await prisma.cdkeys.findFirst({
          where: {
            cdkey: cdkey
          }
        })
        if (!originalData) return `${PREFIX}你没有这个序列码`
        if (originalData.owner !== session.userId) return `${PREFIX}这个授权码不属于你，你改牛魔`
        if (originalData.ip === newdata) return `${PREFIX}有病啊，给一个跟之前一模一样的玩我？`
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
        return `${PREFIX}行了行了行了，给你把${cdkey}(${originalData.plugin}) 的绑定 IP 从 ${originalData.ip} 改成 ${newdata}了`
      } catch (e) {
        error(logger, e)
      }
    })

  ctx.command('keys.ports', "端口管理", { authority: 0 })
  .example('keys.ports.add 114514aaaa1919810bbbb 1919\n  为你名下的授权码增加绑定端口1919\n    keys.ports.remove 114514aaaa1919810bbbb 1919\n  为你名下的授权码删除绑定端口1919')

  ctx.command('keys.ports.add <cdkey> <newdata>', "增加绑定端口", { authority: 0 })
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
            cdkey: cdkey
          }
        })
        if (!originalData) return '没有找到对应产品'
        if (originalData.owner !== session.userId) return '${PREFIX}这个授权码不属于你，你改牛魔'
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
        error(logger, e)
      }

    })

  ctx.command('keys.ports.remove <cdkey> <data>', "删除绑定端口", { authority: 0 })
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
            cdkey: cdkey
          }
        })
        if (!originalData) return '没有找到对应产品'
        if (originalData.owner !== session.userId) return '${PREFIX}这个授权码不属于你，你改牛魔'
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
        error(logger, e)
    }
    })
}

async function error(logger, e) {
  logger.error(e)
  return `${PREFIX}给你查询的时候出错了，把这条发给Mical让他看看为什么查不了: ` + e
}