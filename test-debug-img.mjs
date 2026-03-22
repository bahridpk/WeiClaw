import { loadCredentials, sendImageMessage } from "./cli/weixin.mjs";
import { uploadToCdn, downloadAndDecrypt } from "./cli/cdn.mjs";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";

const MEDIA_DIR = resolve(homedir(), ".wechat-to-anything", "media");
const creds = loadCredentials();
const toUser = creds.userId;

// 下载一张小图片
const res = await fetch("https://picsum.photos/100/100");
const imgBuf = Buffer.from(await res.arrayBuffer());
console.log(`原始图片: ${imgBuf.length} bytes, header: ${imgBuf.slice(0, 4).toString("hex")}`);

await mkdir(MEDIA_DIR, { recursive: true });
const tmpPath = resolve(MEDIA_DIR, `debug-${Date.now()}.jpg`);
await writeFile(tmpPath, imgBuf);

// 上传
console.log("上传到 CDN...");
const uploaded = await uploadToCdn(tmpPath, toUser, creds.token, 1);
console.log("上传结果:", JSON.stringify(uploaded, null, 2));

// 下载回来验证
console.log("下载回来验证...");
try {
  const aesKeyBase64 = Buffer.from(uploaded.aeskey, "hex").toString("base64");
  const downloaded = await downloadAndDecrypt(uploaded.downloadParam, aesKeyBase64);
  console.log(`下载图片: ${downloaded.length} bytes, header: ${downloaded.slice(0, 4).toString("hex")}`);
  console.log(`匹配: ${Buffer.compare(imgBuf, downloaded) === 0 ? "✅ 完全一致" : "❌ 不匹配"}`);

  // 保存下载回来的
  const verifyPath = resolve(MEDIA_DIR, `verify-${Date.now()}.jpg`);
  await writeFile(verifyPath, downloaded);
  console.log(`已保存: ${verifyPath}`);
} catch (err) {
  console.error(`下载验证失败: ${err.message}`);
}

// 发送
console.log("发送图片消息...");
try {
  await sendImageMessage(creds.token, toUser, "", uploaded);
  console.log("✅ 已发送");
} catch (err) {
  console.error(`❌ ${err.message}`);
}
