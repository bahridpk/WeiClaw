/**
 * 视频发送 v18 — 完全匹配微信原始 video_item 格式
 *
 * 从微信收到的真实 video_item:
 *   - aes_key: 44 chars (hex→UTF-8→base64)
 *   - 没有 encrypt_type
 *   - 有 video_md5
 *   - thumb 和 video 共享 aes_key
 *   - 有 play_length, thumb_media 完整字段
 */
import { readFileSync, unlinkSync } from "fs";
import { readFile } from "fs/promises";
import { homedir, tmpdir } from "os";
import { join } from "path";
import { execSync } from "child_process";
import { createHash, randomBytes } from "crypto";
import crypto from "crypto";

const creds = JSON.parse(readFileSync(homedir() + "/.wechat-to-anything/credentials.json", "utf-8"));
const videoPath = process.argv[2] || "/Users/zxw/Downloads/wechat-voice-demo.mp4";

const { encryptAesEcb, aesEcbPaddedSize, CDN_BASE_URL } = await import("../cli/cdn.mjs");
const { getUpdates, buildHeaders, BASE_URL } = await import("../cli/weixin.mjs");

// 获取 fresh context_token
const msgs = await getUpdates(creds.token);
const contextToken = msgs?.context_token || "";

// 视频
const plaintext = await readFile(videoPath);
const rawsize = plaintext.length;
const rawfilemd5 = createHash("md5").update(plaintext).digest("hex");
const filesize = aesEcbPaddedSize(rawsize);
const filekey = randomBytes(16).toString("hex");
const aeskey = randomBytes(16);

let playLength = 10;
try {
  const dur = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${videoPath}"`, { encoding: "utf-8" }).trim();
  playLength = Math.round(parseFloat(dur));
} catch {}

// 缩略图
const thumbPath = join(tmpdir(), `wx-thumb-${Date.now()}.jpg`);
execSync(`ffmpeg -y -i "${videoPath}" -vframes 1 -vf "scale=224:-1" -q:v 5 "${thumbPath}" 2>/dev/null`);
const thumb = await readFile(thumbPath);
let thumbWidth = 224, thumbHeight = 486;
try {
  const s = execSync(`sips -g pixelWidth -g pixelHeight "${thumbPath}"`).toString();
  const w = s.match(/pixelWidth:\s*(\d+)/); const h = s.match(/pixelHeight:\s*(\d+)/);
  if (w) thumbWidth = parseInt(w[1]); if (h) thumbHeight = parseInt(h[1]);
} catch {}

console.log("视频:", rawsize, "→", filesize, "bytes | md5:", rawfilemd5);
console.log("时长:", playLength, "s | 缩略图:", thumb.length, "bytes", thumbWidth, "x", thumbHeight);

// aes_key 编码: hex string → UTF-8 bytes → base64 = 44 chars（和微信原始格式一致）
const aesKeyHex = aeskey.toString("hex");
const aesKey44 = Buffer.from(aesKeyHex).toString("base64");
console.log("aes_key:", aesKey44, "(", aesKey44.length, "chars)");

// getUploadUrl (bundled thumb, no_need_thumb=false)
const uploadBody = JSON.stringify({
  filekey,
  media_type: 2,
  to_user_id: creds.userId,
  rawsize,
  rawfilemd5,
  filesize,
  thumb_rawsize: thumb.length,
  thumb_rawfilemd5: createHash("md5").update(thumb).digest("hex"),
  thumb_filesize: aesEcbPaddedSize(thumb.length),
  no_need_thumb: false,
  aeskey: aesKeyHex,
  base_info: {},
});

const uploadRes = await fetch(`${BASE_URL}/ilink/bot/getuploadurl`, {
  method: "POST",
  headers: buildHeaders(creds.token, uploadBody),
  body: uploadBody,
});
const uploadJson = await uploadRes.json();
console.log("\ngetUploadUrl:", uploadJson.upload_param ? "✅" : "❌", "thumb:", uploadJson.thumb_upload_param ? "✅" : "❌");

// 上传视频
const videoCipher = encryptAesEcb(plaintext, aeskey);
const videoUrl = `${CDN_BASE_URL}/upload?encrypted_query_param=${encodeURIComponent(uploadJson.upload_param)}&filekey=${encodeURIComponent(filekey)}`;
const videoRes = await fetch(videoUrl, {
  method: "POST",
  headers: { "Content-Type": "application/octet-stream" },
  body: new Uint8Array(videoCipher),
});
const videoDP = videoRes.headers.get("x-encrypted-query-param") || videoRes.headers.get("x-encrypted-param");
console.log("视频 CDN:", videoRes.status, "(400=probe error, 可忽略) dp:", videoDP ? "✅" : "❌");

// 上传缩略图
let thumbDP = null;
if (uploadJson.thumb_upload_param) {
  const thumbCipher = encryptAesEcb(thumb, aeskey);
  const thumbUrl = `${CDN_BASE_URL}/upload?encrypted_query_param=${encodeURIComponent(uploadJson.thumb_upload_param)}&filekey=${encodeURIComponent(filekey)}`;
  const thumbRes = await fetch(thumbUrl, {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: new Uint8Array(thumbCipher),
  });
  thumbDP = thumbRes.headers.get("x-encrypted-query-param") || thumbRes.headers.get("x-encrypted-param");
  console.log("缩略图 CDN:", thumbRes.status, "dp:", thumbDP ? "✅" : "❌");
}
try { unlinkSync(thumbPath); } catch {}

if (!videoDP) { console.error("❌ 无 videoDP"); process.exit(1); }

// ═══ 构造消息 — 完全匹配微信原始格式 ═══
const videoItem = {
  type: 5,
  video_item: {
    media: {
      encrypt_query_param: videoDP,
      aes_key: aesKey44,
      // 没有 encrypt_type — 微信原始格式没有
    },
    video_size: filesize,
    play_length: playLength,
    video_md5: rawfilemd5,          // ← 之前一直少这个！
    ...(thumbDP ? {
      thumb_media: {
        encrypt_query_param: thumbDP,
        aes_key: aesKey44,            // 共享 key
        // 没有 encrypt_type
      },
      thumb_size: aesEcbPaddedSize(thumb.length),
      thumb_height: thumbHeight,
      thumb_width: thumbWidth,
    } : {}),
  },
};

console.log("\nvideo_item:", JSON.stringify(videoItem, null, 2));

// 重新获取 fresh context_token
const freshMsgs = await getUpdates(creds.token);
const freshCT = freshMsgs?.context_token || contextToken;

const body = JSON.stringify({
  msg: {
    from_user_id: "",
    to_user_id: creds.userId,
    client_id: crypto.randomUUID(),
    message_type: 2,
    message_state: 2,
    item_list: [videoItem],
    context_token: freshCT,
  },
  base_info: {},
});

const resp = await fetch(`${BASE_URL}/ilink/bot/sendmessage`, {
  method: "POST",
  headers: buildHeaders(creds.token, body),
  body,
});
const text = await resp.text();
console.log("\nsendmessage:", resp.status, text || "(empty)");
if (text === "{}" || text === "") console.log("✅ 请检查微信！");
else console.log("ret:", JSON.parse(text).ret);
