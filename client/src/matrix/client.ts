// CosMac 客户端的 Matrix 适配层：用 matrix-js-sdk 连 Synapse 后端。
// 第一步只做最小闭环：登录 → 同步 → 列房间 → 读消息 → 发消息 → 识别 cosmac.card 富卡。
// 之后再把这些数据接进驾驶舱 UI、加 @// 菜单等。

// matrix-js-sdk 里有些代码引用了 node 风格的 global，浏览器里先补一个垫片。
;(globalThis as any).global ||= globalThis

import { createClient, type MatrixClient } from 'matrix-js-sdk'

/** 给 UI 用的精简房间结构 */
export interface LiveRoom {
  id: string
  name: string
}

/** 给 UI 用的精简消息结构；card 为 cosmac.card 自定义富卡（可能没有） */
export interface LiveMsg {
  id: string
  sender: string
  body: string
  ts: number
  card?: any
}

// 单例：整个前端共用一个登录后的 Matrix client
let mx: MatrixClient | null = null

export function getClient(): MatrixClient | null {
  return mx
}

/**
 * 用用户名+密码登录 Synapse，并启动同步。
 * @returns 登录用户的完整 id（如 @admin:cosmac.cc）
 */
export async function login(
  baseUrl: string,
  user: string,
  password: string,
): Promise<string> {
  // 先用一个临时 client 走登录拿 token
  const tmp = createClient({ baseUrl })
  const res: any = await tmp.login('m.login.password', {
    identifier: { type: 'm.id.user', user },
    password,
    initial_device_display_name: 'CosMac Web',
  })
  // 再用 token 建正式 client 并开始同步
  mx = createClient({
    baseUrl,
    accessToken: res.access_token,
    userId: res.user_id,
    deviceId: res.device_id,
  })
  await mx.startClient({ initialSyncLimit: 30 })
  return res.user_id as string
}

/** 注册"有更新就回调"——同步完成或来新消息时触发，UI 据此刷新。 */
export function onUpdate(cb: () => void): void {
  if (!mx) return
  ;(mx as any).on('sync', (state: string) => {
    if (state === 'PREPARED' || state === 'SYNCING') cb()
  })
  ;(mx as any).on('Room.timeline', () => cb())
}

/** 列出我加入的房间。 */
export function listRooms(): LiveRoom[] {
  if (!mx) return []
  return mx
    .getRooms()
    .map((r) => ({ id: r.roomId, name: r.name || r.roomId }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** 读某个房间当前时间线里的消息（含 cosmac.card 富卡字段）。 */
export function listMessages(roomId: string): LiveMsg[] {
  const room = mx?.getRoom(roomId)
  if (!room) return []
  return room
    .getLiveTimeline()
    .getEvents()
    .filter((e) => e.getType() === 'm.room.message')
    .map((e) => {
      const c: any = e.getContent()
      return {
        id: e.getId() || '',
        sender: e.getSender() || '',
        body: c.body || '',
        ts: e.getTs(),
        card: c['cosmac.card'],
      }
    })
}

/** 往房间发一条纯文本消息（真发到 Synapse）。 */
export async function sendText(roomId: string, body: string): Promise<void> {
  if (!mx) return
  await mx.sendTextMessage(roomId, body)
}
