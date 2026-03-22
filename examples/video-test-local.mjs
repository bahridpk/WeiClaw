/**
 * 视频发送测试脚本
 *
 * 用法: node examples/video-test-local.mjs [视频文件路径]
 *
 * 该脚本直接通过 CDN 上传视频文件，发送到自己的微信（用于测试）。
 * 需要先扫码登录获取 credentials。
 */
import { readFileSync } from "fs";
import { homedir } from "os";

const creds = JSON.parse(readFileSync(homedir() + "/.wechat-to-anything/credentials.json", "utf-8"));
const videoPath = process.argv[2];
if (!videoPath) {
  console.error("用法: node examples/video-test-local.mjs <视频文件路径>");
  process.exit(1);
}

const { uploadVideoWithThumb } = await import("../cli/cdn.mjs");
const { getUpdates, buildHeaders, BASE_URL } = await import("../cli/weixin.mjs");
import crypto from "crypto";

// 获取 context_token
const msgs = await getUpdates(creds.token);
const contextToken = msgs?.context_token || "";

console.log("上传视频...");
const cdn = await uploadVideoWithThumb(videoPath, creds.userId, creds.token);
console.log("✅ 上传完成 | 时长:", cdn.playLength, "s | 大小:", cdn.fileSizeCiphertext, "bytes");

// aes_key: hex→UTF8→base64 = 44 chars（微信格式）
const aesKeyB64 = Buffer.from(cdn.aeskey).toString("base64");

const videoItem = {
  media: {
    encrypt_query_param: cdn.downloadParam,
    aes_key: aesKeyB64,
  },
  video_size: cdn.fileSizeCiphertext,
  play_length: cdn.playLength,
  video_md5: cdn.videoMd5,
};

if (cdn.thumbDownloadParam) {
  videoItem.thumb_media = {
    encrypt_query_param: cdn.thumbDownloadParam,
    aes_key: aesKeyB64,
  };
  videoItem.thumb_size = cdn.thumbSizeCiphertext;
  videoItem.thumb_width = cdn.thumbWidth;
  videoItem.thumb_height = cdn.thumbHeight;
}

const body = JSON.stringify({
  msg: {
    from_user_id: "",
    to_user_id: creds.userId,
    client_id: crypto.randomUUID(),
    message_type: 2,
    message_state: 2,
    item_list: [{ type: 5, video_item: videoItem }],
    context_token: contextToken,
  },
  base_info: {},
});

const resp = await fetch(`${BASE_URL}/ilink/bot/sendmessage`, {
  method: "POST",
  headers: buildHeaders(creds.token, body),
  body,
});
const text = await resp.text();
if (text === "{}" || text === "") {
  console.log("✅ 发送成功！请检查微信");
} else {
  console.log("❌ 发送失败:", text);
}
