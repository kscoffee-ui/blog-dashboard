export default async function handler(req, res) {
  const { type, title, keyword } = req.body;

  const prompt =
    type === "title"
      ? `SEOに強くクリックされやすいタイトルを作って:
タイトル: ${title}
キーワード: ${keyword}`
      : `SEOに強くクリックされやすいメタディスクリプションを120文字で作って:
タイトル: ${title}`;

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

// 🔥 ここが重要（両対応）
const text =
  data.output_text ||
  data.output?.[0]?.content?.[0]?.text ||
  "生成できませんでした";

res.status(200).json({ text });

  } catch (e) {
    console.error("API ERROR:", e);
    res.status(500).json({ error: "AI生成失敗" });
  }
}