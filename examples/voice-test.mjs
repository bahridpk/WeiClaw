import { readFileSync, statSync } from "fs";
import { homedir } from "os";
import { execSync } from "child_process";
import crypto from "crypto";

// 凭证
const creds = JSON.parse(readFileSync(homedir() + "/.weiclaw/credentials.json", "utf-8"));
const token = creds.token;
const to = creds.userId;

// 1. MP3 → PCM → SILK
console.log("1. 转码 MP3 → PCM → SILK");
execSync(`ffmpeg -y -i /tmp/wxta_test_voice.mp3 -ar 16000 -ac 1 -f s16le /tmp/wxta_test_voice.pcm 2>/dev/null`);
execSync(`python3 -c "import pilk; pilk.encode('/tmp/wxta_test_voice.pcm', '/tmp/wxta_test_voice.silk', pcm_rate=16000, tencent=True)"`);
const pcmSize = statSync("/tmp/wxta_test_voice.pcm").size;
const durationMs = Math.round((pcmSize / 32000) * 1000);
console.log(`   SILK ok, duration=${durationMs}ms`);

// 2. CDN 上传
console.log("2. CDN 上传");
const { uploadToCdn } = await import("../cli/cdn.mjs");
const cdn = await uploadToCdn("/tmp/wxta_test_voice.silk", to, token, 4);
const aesKeyB64 = Buffer.from(cdn.aeskey).toString("base64");
console.log(`   CDN ok, downloadParam=${cdn.downloadParam.slice(0, 30)}...`);

// 3. 获取 contextToken
const { getUpdates, buildHeaders, BASE_URL } = await import("../cli/weixin.mjs");
const msgs = await getUpdates(token);
const contextToken = msgs?.context_token || "";

// 4. 发送语音（与"语音测试"完全一致的格式）
console.log("3. 发送语音");
const body = JSON.stringify({
  msg: {
    from_user_id: "", to_user_id: to,
    client_id: crypto.randomUUID(),
    message_type: 2, message_state: 2,
    item_list: [{
      type: 3,
      voice_item: {
        media: {
          encrypt_query_param: cdn.downloadParam,
          aes_key: aesKeyB64,
        },
        encode_type: 4,
        bits_per_sample: 16,
        sample_rate: 16000,
        playtime: durationMs,
      },
    }],
    context_token: contextToken,
  },
  base_info: {},
});

const res = await fetch(`${BASE_URL}/ilink/bot/sendmessage`, {
  method: "POST",
  headers: buildHeaders(token, body),
  body,
});
const text = await res.text();
console.log(`   结果: ${res.status} ${text}`);
