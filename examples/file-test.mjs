/**
 * 文件发送测试脚本
 *
 * 用法: node examples/file-test.mjs [文件路径]
 *
 * 通过 CDN 上传文件，发送到自己的微信（用于测试）。
 * 需要先扫码登录获取 credentials。
 */
import { readFileSync } from "fs";
import { homedir, tmpdir } from "os";
import { join, basename } from "path";

const creds = JSON.parse(readFileSync(homedir() + "/.wechat-to-anything/credentials.json", "utf-8"));

// 测试文件：命令行指定或自动生成
let filePath = process.argv[2];
let fileName;
if (filePath) {
  fileName = basename(filePath);
} else {
  const { writeFileSync } = await import("fs");
  filePath = join(tmpdir(), "wxta-test-file.txt");
  writeFileSync(filePath, `Hello from wechat-to-anything!\n测试文件 ${new Date().toISOString()}\n`);
  fileName = "wxta-test-file.txt";
  console.log("未指定文件，已生成测试文件:", filePath);
}

const { uploadToCdn } = await import("../cli/cdn.mjs");
const { getUpdates, sendFileMessage } = await import("../cli/weixin.mjs");

const msgs = await getUpdates(creds.token);
const ct = msgs?.context_token || "";

console.log("上传文件:", fileName);
const uploaded = await uploadToCdn(filePath, creds.userId, creds.token, 3);
console.log("✅ CDN 上传完成 | 大小:", uploaded.fileSize, "bytes | md5:", uploaded.rawMd5);

await sendFileMessage(creds.token, creds.userId, ct, uploaded, fileName);
console.log("✅ 发送成功！请检查微信");
