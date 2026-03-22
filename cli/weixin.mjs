/**
 * ilinkai WeChat API — 直接调用腾讯 ilinkai 接口
 *
 * 完全独立，不依赖 OpenClaw。
 *
 * 三类 API：
 *   1. 登录：get_bot_qrcode + get_qrcode_status（获取 token）
 *   2. 收消息：getupdates（long-poll）
 *   3. 发消息：sendmessage
 */

import crypto from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";

const BASE_URL = "https://ilinkai.weixin.qq.com";
const LONG_POLL_TIMEOUT_MS = 35_000;
const API_TIMEOUT_MS = 15_000;
const BOT_TYPE = "3";

// ─── 凭证管理 ───────────────────────────────────────────────────────

const CRED_DIR = resolve(homedir(), ".wechat-to-anything");
const CRED_FILE = resolve(CRED_DIR, "credentials.json");

export function loadCredentials() {
  try {
    if (!existsSync(CRED_FILE)) return null;
    const data = JSON.parse(readFileSync(CRED_FILE, "utf-8"));
    if (!data.token) return null;
    return data;
  } catch {
    return null;
  }
}

function saveCredentials(data) {
  mkdirSync(CRED_DIR, { recursive: true });
  writeFileSync(CRED_FILE, JSON.stringify(data, null, 2) + "\n");
}

// ─── QR 扫码登录 ────────────────────────────────────────────────────

/**
 * 获取登录二维码
 * @returns {{ qrcode: string, qrcode_img_content: string }}
 */
export async function getQRCode() {
  const url = `${BASE_URL}/ilink/bot/get_bot_qrcode?bot_type=${BOT_TYPE}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`获取二维码失败: ${res.status}`);
  return res.json();
}

/**
 * 轮询二维码状态（long-poll）
 * @returns {{ status: 'wait'|'scaned'|'confirmed'|'expired', bot_token?, ilink_bot_id?, baseurl?, ilink_user_id? }}
 */
export async function pollQRStatus(qrcode) {
  const url = `${BASE_URL}/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LONG_POLL_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "iLink-App-ClientVersion": "1" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`轮询状态失败: ${res.status}`);
    return res.json();
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") return { status: "wait" };
    throw err;
  }
}

/**
 * 完整 QR 登录流程
 * @returns {{ token, accountId, baseUrl, userId }}
 */
export async function loginWithQR(onQrCode) {
  const qr = await getQRCode();
  await onQrCode(qr.qrcode_img_content);

  const deadline = Date.now() + 5 * 60_000; // 5 min
  while (Date.now() < deadline) {
    const status = await pollQRStatus(qr.qrcode);

    if (status.status === "scaned") {
      process.stdout.write("👀 已扫码，请在微信确认...\n");
    }

    if (status.status === "confirmed") {
      const creds = {
        token: status.bot_token,
        accountId: status.ilink_bot_id,
        baseUrl: status.baseurl || BASE_URL,
        userId: status.ilink_user_id,
        savedAt: new Date().toISOString(),
      };
      saveCredentials(creds);
      return creds;
    }

    if (status.status === "expired") {
      throw new Error("二维码已过期，请重试");
    }

    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("登录超时");
}

// ─── 消息 API ───────────────────────────────────────────────────────

function buildHeaders(token, bodyStr) {
  const uin = crypto.randomBytes(4).readUInt32BE(0);
  return {
    "Content-Type": "application/json",
    AuthorizationType: "ilink_bot_token",
    Authorization: `Bearer ${token}`,
    "Content-Length": String(Buffer.byteLength(bodyStr, "utf-8")),
    "X-WECHAT-UIN": Buffer.from(String(uin), "utf-8").toString("base64"),
  };
}

async function apiPost(endpoint, body, token, timeoutMs) {
  const url = `${BASE_URL}/${endpoint}`;
  const bodyStr = JSON.stringify(body);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: buildHeaders(token, bodyStr),
      body: bodyStr,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const text = await res.text();
    if (!res.ok) throw new Error(`${endpoint} ${res.status}: ${text}`);
    return JSON.parse(text);
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") return null;
    throw err;
  }
}

export async function getUpdates(token, getUpdatesBuf = "") {
  const resp = await apiPost(
    "ilink/bot/getupdates",
    { get_updates_buf: getUpdatesBuf, base_info: {} },
    token,
    LONG_POLL_TIMEOUT_MS
  );
  if (!resp) return { msgs: [], get_updates_buf: getUpdatesBuf };
  if (resp.ret !== 0 && resp.ret !== undefined) {
    throw new Error(`getUpdates: ret=${resp.ret} errcode=${resp.errcode} ${resp.errmsg || ""}`);
  }
  return {
    msgs: resp.msgs || [],
    get_updates_buf: resp.get_updates_buf || getUpdatesBuf,
  };
}

export async function sendMessage(token, to, text, contextToken) {
  await apiPost(
    "ilink/bot/sendmessage",
    {
      msg: {
        from_user_id: "",
        to_user_id: to,
        client_id: crypto.randomUUID(),
        message_type: 2,
        message_state: 2,
        item_list: [{ type: 1, text_item: { text } }],
        context_token: contextToken,
      },
      base_info: {},
    },
    token,
    API_TIMEOUT_MS
  );
}

export function extractText(msg) {
  const items = msg.item_list || [];
  for (const item of items) {
    if (item.type === 1 && item.text_item?.text) return item.text_item.text;
    if (item.type === 3 && item.voice_item?.text) return item.voice_item.text;
  }
  return "";
}
