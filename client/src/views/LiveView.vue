<!-- CosMac 客户端 ↔ Synapse 连接测试页（纵切片验证）。
     访问 /#/live：真登录 → 看真实频道 → 收发真实消息 → 渲染 cosmac.card 富卡。
     验证通过后，再把这套真实数据接进驾驶舱 UI。 -->
<script setup lang="ts">
import { ref } from 'vue'
import {
  login,
  onUpdate,
  listRooms,
  listMessages,
  sendText,
  type LiveRoom,
  type LiveMsg,
} from '@/matrix/client'

// 线上后端（本地开发也连它；后端已开 CORS，本地可直连）
const HS = 'https://hs.cosmac.cc'

const user = ref('admin')
const password = ref('')
const loggedIn = ref(false)
const me = ref('')
const error = ref('')
const loading = ref(false)

const rooms = ref<LiveRoom[]>([])
const currentRoom = ref('')
const msgs = ref<LiveMsg[]>([])
const draft = ref('')

function refresh() {
  rooms.value = listRooms()
  if (currentRoom.value) msgs.value = listMessages(currentRoom.value)
}

async function doLogin() {
  error.value = ''
  loading.value = true
  try {
    me.value = await login(HS, user.value.trim(), password.value)
    loggedIn.value = true
    onUpdate(refresh)
    refresh()
  } catch (e: any) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

function openRoom(id: string) {
  currentRoom.value = id
  msgs.value = listMessages(id)
}

async function send() {
  const t = draft.value.trim()
  if (!t || !currentRoom.value) return
  draft.value = ''
  await sendText(currentRoom.value, t)
  setTimeout(refresh, 400)
}
</script>

<template>
  <div class="live">
    <!-- 登录 -->
    <div v-if="!loggedIn" class="login">
      <h2>CosMac · 连接测试</h2>
      <input v-model="user" placeholder="用户名（如 admin）" />
      <input v-model="password" type="password" placeholder="密码" @keyup.enter="doLogin" />
      <button :disabled="loading" @click="doLogin">{{ loading ? '登录中…' : '登录' }}</button>
      <p class="err" v-if="error">登录失败：{{ error }}</p>
      <p class="hint">连接后端：{{ HS }}</p>
    </div>

    <!-- 主体 -->
    <div v-else class="app">
      <aside class="rooms">
        <div class="me">{{ me }}</div>
        <div
          v-for="r in rooms"
          :key="r.id"
          class="room"
          :class="{ active: r.id === currentRoom }"
          @click="openRoom(r.id)"
        >{{ r.name }}</div>
        <p v-if="!rooms.length" class="hint">还没有房间。去 app.cosmac.cc 建个群、邀请自己。</p>
      </aside>

      <main class="chat">
        <div class="stream">
          <div v-for="m in msgs" :key="m.id" class="msg">
            <div class="who">{{ m.sender }}</div>
            <div class="body">{{ m.body }}</div>
            <!-- cosmac.card 富卡（Element 看不到，这里能渲染）-->
            <div v-if="m.card" class="card">
              <div class="card-title">🗂 {{ m.card.title }}</div>
              <div class="card-sub">{{ m.card.subtitle }}</div>
              <div v-for="(row, i) in (m.card.rows || [])" :key="i" class="card-row">
                <span>{{ row.task }}</span>
                <span :class="row.type">{{ row.owner }}</span>
              </div>
            </div>
          </div>
          <p v-if="currentRoom && !msgs.length" class="hint">这个房间还没有消息。</p>
          <p v-if="!currentRoom" class="hint">← 选一个房间</p>
        </div>
        <div class="composer" v-if="currentRoom">
          <input
            v-model="draft"
            placeholder="说点什么；或试：CosMac 建专班 测试专班"
            @keyup.enter="send"
          />
          <button @click="send">发送</button>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.live { height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #15120f; }
.login { max-width: 320px; margin: 14vh auto; display: flex; flex-direction: column; gap: 10px; }
.login h2 { margin-bottom: 6px; }
.login input, .login button { padding: 10px 12px; border-radius: 8px; border: 1px solid #ddd; font-size: 14px; }
.login button { background: #15120f; color: #fff; cursor: pointer; border: 0; }
.err { color: #d94f5c; font-size: 13px; }
.hint { color: #999; font-size: 12px; }
.app { display: grid; grid-template-columns: 260px 1fr; height: 100vh; }
.rooms { border-right: 1px solid #eee; overflow: auto; padding: 12px; }
.me { font-size: 12px; color: #888; margin-bottom: 12px; word-break: break-all; }
.room { padding: 8px 10px; border-radius: 8px; cursor: pointer; font-size: 14px; }
.room.active, .room:hover { background: #f2eee8; }
.chat { display: flex; flex-direction: column; height: 100vh; }
.stream { flex: 1; overflow: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.msg .who { font-size: 12px; color: #888; }
.msg .body { white-space: pre-wrap; }
.card { margin-top: 6px; border: 1px solid #e7e0d6; border-radius: 12px; padding: 14px; background: #fffdf8; max-width: 440px; }
.card-title { font-weight: 700; }
.card-sub { font-size: 12px; color: #888; margin-bottom: 10px; }
.card-row { display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px dashed #eee; }
.card-row .ai { color: #5879ff; font-weight: 600; }
.card-row .human { color: #c2761f; font-weight: 600; }
.composer { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #eee; }
.composer input { flex: 1; padding: 10px 12px; border-radius: 8px; border: 1px solid #ddd; font-size: 14px; }
.composer button { padding: 10px 18px; border-radius: 8px; border: 0; background: #15120f; color: #fff; cursor: pointer; }
</style>
