require("dotenv").config();

const express = require("express");
const { App, ExpressReceiver } = require("@slack/bolt");
const OpenAI = require("openai");

// ① SlackのEventsを受け取る入口を /slack/events に固定
const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  endpoints: "/slack/events",
});

// ② Slack Bolt App
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

// ③ OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ④ Renderのヘルスチェック用（/ にアクセスが来るので200を返す）
receiver.app.get("/", (req, res) => {
  res.status(200).send("OK");
});

// ⑤ 例：メンションされたら返す（最低限）
app.event("app_mention", async ({ event, say }) => {
  try {
    const text = event.text || "";
    const res = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "あなたはSlack上で返答するアシスタントです。簡潔に答えてください。" },
        { role: "user", content: text },
      ],
    });

    await say(res.choices?.[0]?.message?.content ?? "（返答の生成に失敗しました）");
  } catch (e) {
    console.error(e);
    await say("エラーが発生しました。ログを確認してください。");
  }
});

// ⑥ Renderは PORT 環境変数を使う
(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log("Hanbei bot running on port", port);
})();
