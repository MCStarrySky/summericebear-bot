import {Context, Schema} from 'koishi'
import {PrismaClient} from '@prisma/client'

export const name = 'cdkey'

// MCStarrySky start -- Recode plugins which are on sale
const plugins = [
  'NereusOpusCore',
  'NereusOpus',
  'EnchantmentIntensifier',
  'EnchantIntensifier',
  'EnchantSeparator',
  'ExpPump',
  'DamageSystemEX',
  'AskExecutions'
];
// MCStarrySky end

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
      logger.info(`User ${session.userId} queried cdkey`)
      const res = await prisma.cdkeys.findMany({
        where: {
          owner: session.userId
        }
      })
      if (res.length > 0) {
        let msg = `${PREFIX}你的产品：\n\n`
        res.forEach((res, index) => {
          msg += `${index + 1} - ${res.plugin}\n`
          msg += `\t序列码: ${res.cdkey}\n`
          msg += `\t对应ip/域名: ${res.ip}\n`
          // MCStarrySky start -- Optimize the message
          msg += res.ports === '-1' ? `\t对应端口: 全端口\n\n` : `\t对应端口: ${res.ports.length == 0 ? "目前未绑定任何端口" : res.ports}\n\n`
          // MCStarrySky end
        })
        callback()
        return msg
      } else {
        callback()
        return `${PREFIX}你没买你查什么查？`
      }
    } catch (e) {
      error(logger, e)
    }
  })

  ctx.command('keys.ip <cdkey:string> <newdata:string>', "编辑绑定 IP", { authority: 0 })
    .example('keys ip 114514aaaa1919810bbbb 114.514.1919.810\n    将你名下的授权码绑定ip改为114.514.1919.810')
    .action(handleIpUpdate)

  // MCStarrySky start -- Optimize the message
  ctx.command('keys.ports', "端口管理", { authority: 0 })
    .example('/keys ports add 114514aaaa1919810bbbb 1919\n   为你名下的授权码增加绑定端口1919\n    /keys ports remove 114514aaaa1919810bbbb 1919\n   为你名下的授权码删除绑定端口1919')
  // MCStarrySky end

  ctx.command('keys.ports.add <cdkey> <newdata>', "增加绑定端口", { authority: 0 })
    .action(handlePortAdd)

  ctx.command('keys.ports.remove <cdkey> <data>', "删除绑定端口", { authority: 0 })
    .action(handlePortRemove)

  // MCStarrySky start -- Command of generating new cd-key
  ctx.command('keys.generate <user> <plugin> <ports>', "增加新用户", { authority: 2 })
    .example('/keys generate <用户> <插件名> <端口(不填为全端口)>')
    .action(handleAdminGenerate)

  async function handleAdminGenerate({ session }, user, plugin, ports) {
    if (!session.isDirect) {
      await session.bot.deleteMessage(session.channelId, session.messageId)
      return `${PREFIX}私聊发，你发群里是想让大家都看到你授权码是吗？`
    }

    if (!user) return `${PREFIX}你不给我用户我哪知道你要给哪个孙子加？`
    if (!plugin) return `${PREFIX}你要给用户加哪个插件啊，钱不要了是吗？`
    if (!plugins.includes(plugin)) return `${PREFIX}滚，没这插件`

    if (!ports || ports.trim() == '' || ports.trim == ",") ports = '25565' // MCStarrySky -- Defaults to unlimited ports
    if (!isValidFormat(ports) && ports != '25565') return `${PREFIX}你端口发的什么sb玩意？`
    if (ports.split(',').length > 5) return `${PREFIX}最多就五个端口，你想给几个？`

    const cdkey = generateRandomString(32)

    try {
      await prisma.cdkeys.create({
        data: {
          cdkey: cdkey,
          owner: user,
          plugin: plugin,
          ip: '127.0.0.1',
          ports: ports
        }
      })
      callback()

      const message = `
${PREFIX}
感谢您购买 ${plugin}，
并支持夏日冰熊开发组！

=== 以下是您的购买信息 ===
>  插件序列码：${cdkey}
>  绑定 IP：127.0.0.1
>  绑定端口: ${ports == '-1' ? "全端口" : ports}
=== 以上是您的购买信息 ===

如需更改绑定 IP 和端口，
请联系群内机器人「夏日狗熊」输入「/keys」命令查看命令帮助信息。
${new Date().toLocaleDateString()}
      `;

      try {
        await session.bot.sendPrivateMessage(user, message);
      } catch (_) {
      }

      return message;
    } catch (e) {
      error(logger, e)
    }
  }
  // MCStarrySky end

  async function handleIpUpdate({ session }, cdkey, newdata) {
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
      if (!originalData) {
        callback()
        return `${PREFIX}你没有这个序列码`
      }
      if (originalData.owner !== session.userId) {
        callback()
        return `${PREFIX}这个授权码不属于你，你改牛魔`
      }
      if (originalData.ip === newdata) {
        callback()
        return `${PREFIX}有病啊，给一个跟之前一模一样的玩我？`
      }
      logger.info(`User ${session.userId} updated cdkey ${cdkey}(${originalData.plugin}) ip from ${originalData.ip} to ${newdata}`)
      await prisma.cdkeys.updateMany({
        where: {
          owner: session.userId,
          cdkey: cdkey
        },
        data: {
          ip: newdata
        }
      })
      callback()
      return `${PREFIX}行了行了行了，给你把${cdkey}(${originalData.plugin}) 的绑定 IP 从 ${originalData.ip} 改成 ${newdata}了`
    } catch (e) {
      error(logger, e)
    }
  }

  async function handlePortAdd({ session }, cdkey, newdata) {
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
      if (!originalData) {
        callback()
        return '没有找到对应产品'
      }
      if (originalData.owner !== session.userId) {
        callback()
        return `${PREFIX}这个授权码不属于你，你改牛魔`
      }
      if (originalData.ports === '-1') {
        callback()
        return '全端口产品不支持修改端口'
      }
      // MCStarrySky start -- Make ports to be not const and check the length 
      //                      in order to prevent the situation that the 'originalData.ports' is empty but ports contains 1 element
      let portsStr = originalData.ports
      if (portsStr.startsWith(',')) {
        portsStr = portsStr.substring(1)
      }
      let ports = portsStr.split(',')
      if (portsStr.trim().length == 0) {
        ports = []
      }
      // MCStarrySky end
      if (ports.length === 5) return '端口已达上限'
      if (ports.includes(newdata)) return `端口已存在: ${originalData.ports}`
      ports.push(newdata)
      logger.info(`User ${session.userId} added port ${newdata} to cdkey ${cdkey}`)
      await prisma.cdkeys.updateMany({
        where: {
          owner: session.userId,
          cdkey: cdkey
        },
        data: {
          ports: ports.join(',')
        }
      })
      callback()
      return `已为 ${cdkey}(${originalData.plugin}) 添加 绑定端口 ${newdata}\n目前可用端口: ${originalData.ports + ',' + newdata}`
    } catch (e) {
      error(logger, e)
    }
  }

  async function handlePortRemove({ session }, cdkey, data) {
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
      if (!originalData) {
        callback()
        return '没有找到对应产品'
      }
      if (originalData.owner !== session.userId) {
        callback()
        return `${PREFIX}这个授权码不属于你，你改牛魔`
      }
      if (originalData.ports === '-1') {
        callback()
        return '全端口产品不支持修改端口'
      }
      // MCStarrySky start -- Make ports to be not const and check the length 
      //                      in order to prevent the situation that the 'originalData.ports' is empty but ports contains 1 element
      let portsStr = originalData.ports
      if (portsStr.startsWith(',')) {
        portsStr = portsStr.substring(1)
      }
      let ports = portsStr.split(',')
      if (portsStr.trim().length == 0) {
        ports = []
      }
      // MCStarrySky end
      if (!ports.includes(data)) {
        callback()
        return `端口不存在: ${originalData.ports}`
      }
      const newPorts = ports.filter(port => port !== data)
      logger.info(`User ${session.userId} removed port ${data} from cdkey ${cdkey}`)
      await prisma.cdkeys.updateMany({
        where: {
          owner: session.userId,
          cdkey: cdkey
        },
        data: {
          ports: newPorts.join(',')
        }
      })
      // MCStarrySky start -- Optimize the message
      let current = newPorts.join(',')
      if (current.length == 0) {
        current = "目前未绑定任何端口"
      }
      // MCStarrySky end
      callback()
      return `已为 ${cdkey}(${originalData.plugin}) 删除 绑定端口 ${data}\n目前可用端口: ${current}` // MCStarrySky -- Optimize the message
    } catch (e) {
      error(logger, e)
    }
  }

  async function error(logger, e) {
    logger.error(e)
    return `${PREFIX}给你查询的时候出错了，把这条发给Mical让他看看为什么查不了: ` + e
  }

  async function callback() {
    await prisma.$disconnect()
  }

  // MCStarrySky start -- Generating random String
  function generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
  // MCStarrySky end

  // MCStarrySky start -- check the number is valid or not
  function isValidFormat(input: string): boolean {
    const regex = /^\d+(,\d+)*$/;
    return regex.test(input.trim());
  }
  // MCStarrySky end
}
