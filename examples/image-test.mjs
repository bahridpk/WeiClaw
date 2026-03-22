/**
 * 图片发送测试 — HD 原图质量，自动生成缩略图
 *
 * 支持三种输入：
 *   - URL:       https://example.com/photo.jpg
 *   - 本地路径:   /path/to/photo.jpg
 *   - data URI:  data:image/jpeg;base64,...
 *
 * 用法:  node examples/image-test.mjs [图片URL或路径]
 */
import { readFileSync } from "fs";
import { homedir } from "os";

const creds = JSON.parse(readFileSync(homedir() + "/.wechat-to-anything/credentials.json", "utf-8"));

// 命令行参数 或 默认测试图片
const imageUrl = process.argv[2] || "https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png";

const { sendImageByUrl, getUpdates } = await import("../cli/weixin.mjs");
const msgs = await getUpdates(creds.token);
const contextToken = msgs?.context_token || "";

console.log("发送图片 (HD):", imageUrl.slice(0, 60) + (imageUrl.length > 60 ? "..." : ""));
await sendImageByUrl(creds.token, creds.userId, contextToken, imageUrl);
console.log("✅ 图片已发送（含缩略图，原图质量）");
