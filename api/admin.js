export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const googleScriptUrl = process.env.GOOGLE_SCRIPT_URL;

    if (!googleScriptUrl) {
      return res.status(500).json({
        success: false,
        message: "GOOGLE_SCRIPT_URL is not configured"
      });
    }

    const response = await fetch(googleScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(req.body)
    });

    const text = await response.text();
    let payload;

    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }

    if (!response.ok) {
      return res.status(response.status).json(
        payload && typeof payload === "object"
          ? payload
          : {
              success: false,
              message: text || "Apps Script request failed"
            }
      );
    }

    if (payload && typeof payload === "object") {
      return res.status(200).json(payload);
    }

    return res.status(200).json({
      success: true,
      message: text
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Something went wrong"
    });
  }
}
