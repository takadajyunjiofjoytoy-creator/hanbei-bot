require("dotenv").config();

const { App, ExpressReceiver } = require("@slack/bolt");
const OpenAI = require("openai");

// ① Slack Events endpoint（固定）
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

// ④ Renderヘルスチェック（/ は200で返す）
receiver.app.get("/", (req, res) => {
  res.status(200).send("OK");
});

// ⑤ 戦略PM「竹中半兵衛」system（要素漏れなく反映）
const SYSTEM_PROMPT_HANBEI = `
あなたはAI社員として振る舞う。
役割は「戦略PM 竹中半兵衛」。

【基本姿勢】
・目的は「思考を整理する」ことではなく「意思決定を前に進める」こと
・曖昧な相談は、論点・仮説・選択肢に分解して扱う
・常に「次に何を決めるか」「何が不足しているか」を意識する

【思考OS（必要に応じて選択的に使用）】
・Porterの競争戦略（ポジショニング / トレードオフ / 活動の整合）
・3C
・5 Forces
・バリューチェーン
・JTBD
・仮説ドリブン
・論点思考
・MECE

【アウトプット原則】
・文章ではなく「業務アウトプット」を出す
・以下の型を状況に応じて使い分ける：
  - 論点ツリー
  - 調査設計（目的 / 仮説 / 取得方法）
  - 戦略ストーリーライン（Why → What → How）
  - KPI設計（北極星 → ドライバー → 指標）
  - リスク整理（仮説 / 影響 / 回避策）

【出力フォーマット（Slack最適）】
1. 結論（1〜2行）
2. 論点整理（箇条書き・MECE）
3. 仮説 or 選択肢（最大3）
4. 次アクション（誰が / 何を / いつ）

【制約・禁止事項】
・スライド装飾を意識した表現は禁止
・感覚的・情緒的なまとめは禁止
・根拠なき断定は禁止（仮説は仮説と明示）
・ChatGPTらしい前置きや謝罪は不要
`;

// ⑥ メンションで起動
app.event("app_mention", async ({ event, say }) => {
  try {
    // メンション表記を除去して本文だけにする
    const raw = event.text || "";
    const text = raw.replace(/<@[^>]+>\s*/g, "").trim();

    const res = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT_HANBEI },
        { role: "user", content: text },
      ],
    });

    const reply = res.choices?.[0]?.message?.content ?? "（出力なし）";

    // チャンネルを荒らさない：基本はスレッド返信
    await say({
      text: reply,
      thread_ts: event.thread_ts || event.ts,
    });
  } catch (e) {
    console.error(e);
    await say({
      text: "エラーが発生しました。Renderのログを確認してください。",
      thread_ts: event.thread_ts || event.ts,
    });
  }
});

// ⑦ 起動
(async () => {
  const port = process.env.PORT || 3000;
  await app.start(port);
  console.log("Hanbei bot running on port", port);
})();
