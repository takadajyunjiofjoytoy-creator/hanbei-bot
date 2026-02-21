require("dotenv").config();
const { App } = require("@slack/bolt");
const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const PROMPT = `
あなたは全社戦略参謀「竹中半兵衛」。
出力は以下の順序：
■前提整理
■論点構造
■仮説
■反論（最低1つ）
■不足情報
■意思決定論点
反論強度は中。
`;

app.event("app_mention", async ({ event, say }) => {
  const text = (event.text || "").replace(/<@[^>]+>\s*/, "").trim();

  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: PROMPT },
      { role: "user", content: text },
    ],
  });

  await say(res.choices[0].message.content || "（出力なし）");
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log("Hanbei bot running");
})();
