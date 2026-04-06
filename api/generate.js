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

    res.status(200).json({
      text: data.output[0].content[0].text
    });

  } catch (e) {
    res.status(500).json({ error: "AI生成失敗" });
  }
}

