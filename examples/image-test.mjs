/**
 * 图片发送测试 — HD 原图质量，自动生成缩略图
 *
 * 支持三种输入：
 *   - URL:       https://example.com/photo.jpg
 *   - 本地路径:   /path/to/photo.jpg
 *   - data URI:  data:image/jpeg;base64,...
 *
 * 用法:  node examples/image-test.mjs [图片URL或路径]
 *
 * ── 关键参数说明 ──
 *
 * CDN 上传阶段 (getUploadUrl):
 *   no_need_thumb: false    — 必须为 false，否则微信只显示模糊压缩图
 *   thumb_rawsize           — 缩略图明文大小
 *   thumb_rawfilemd5        — 缩略图明文 MD5
 *   thumb_filesize          — 缩略图密文大小 (AES-128-ECB padding 后)
 *
 * 发送消息阶段 (sendmessage image_item):
 *   media.encrypt_query_param  — 原图 CDN 下载参数
 *   media.aes_key              — base64(hex_aeskey) 解密用
 *   thumb_media                — 缩略图 CDN 引用（没有则显示模糊/不显示）
 *   mid_size                   — 原图密文大小，微信用于预加载
 *   thumb_size                 — 缩略图密文大小
 *   thumb_width                — 缩略图宽度 px，用于聊天列表预留正确尺寸
 *   thumb_height               — 缩略图高度 px，同上
 *
 *   ⚠️  hd_size     — 设置后"查看原图"下载卡 0%，不要用
 *   ⚠️  encrypt_type — 设置为 1 会导致图片不显示，不要用
 */
import { readFileSync } from "fs";
import { homedir } from "os";

const creds = JSON.parse(readFileSync(homedir() + "/.weiclaw/credentials.json", "utf-8"));

// 命令行参数 或 默认测试图片
const imageUrl = process.argv[2] || "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png";

const { sendImageByUrl, getUpdates } = await import("../cli/weixin.mjs");
const msgs = await getUpdates(creds.token);
const contextToken = msgs?.context_token || "";

console.log("发送图片 (HD):", imageUrl.slice(0, 60) + (imageUrl.length > 60 ? "..." : ""));
await sendImageByUrl(creds.token, creds.userId, contextToken, imageUrl);
console.log("✅ 图片已发送（含缩略图，原图质量）");
