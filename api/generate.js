export default async function handler(req, res) {
  const { type, title, keyword } = req.body;

  const prompt =
  type === "title"
    ? `以下の条件でSEOに強くクリックされやすいタイトルを1つだけ出力してください。

条件:
・日本語
・50〜60文字
・そのまま使える完成形
・余計な説明や前置きは禁止
・キーワードを自然に含める

タイトル: ${title}
キーワード: ${keyword}

出力はタイトル1行のみ`
    : `以下の条件でSEOに強いメタディスクリプションを1つ作ってください。

条件:
・120文字前後
・クリックしたくなる文章
・そのまま使える
・余計な説明禁止

タイトル: ${title}

出力は説明文のみ`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        input: prompt
      })
    });

const data = await response.json();

console.log("OpenAI raw:", data);

// 🔥 正しい取り方
const text =
  data.output?.find(o => o.type === "message")
    ?.content?.[0]?.text ||
  data.output_text ||
  "生成できませんでした";

res.status(200).json({ text });

  } catch (e) {
    console.error("API ERROR:", e);
    res.status(500).json({ error: "AI生成失敗" });
  }
}