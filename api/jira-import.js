module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "Use POST" });
    }

    // Basit koruma (önerilir)
    const secret = process.env.IMPORT_SECRET;
    const headerSecret = req.headers["x-import-secret"];
    if (secret && headerSecret !== secret) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    // ENV
    const JIRA_EMAIL = process.env.JIRA_EMAIL;
    const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
    const JIRA_DOMAIN = process.env.JIRA_DOMAIN;
    const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY;

    if (!JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_DOMAIN || !JIRA_PROJECT_KEY) {
      return res.status(500).json({ ok: false, error: "Missing env vars" });
    }

    // Body parse (Vercel bazen object bazen string verebilir)
    let body = req.body;
    if (typeof body === "string") {
      body = JSON.parse(body);
    }
    const issues = body?.issues;
    if (!Array.isArray(issues) || issues.length === 0) {
      return res.status(400).json({ ok: false, error: "Send { issues: [...] }" });
    }

    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");

    const makeADF = (text) => ({
      type: "doc",
      version: 1,
      content: text
        ? [{ type: "paragraph", content: [{ type: "text", text: String(text) }] }]
        : [],
    });

    const created = [];

    for (const it of issues) {
      const summary = (it?.summary || "").trim();
      const description = (it?.description || "").trim();
      if (!summary) continue;

      const payload = {
        fields: {
          project: { key: JIRA_PROJECT_KEY },
          summary,
          description: makeADF(description),
          issuetype: { name: "Task" },
        },
      };

      const r = await fetch(`https://${JIRA_DOMAIN}.atlassian.net/rest/api/3/issue`, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const txt = await r.text();
        return res.status(502).json({ ok: false, error: `Jira error ${r.status}`, details: txt });
      }

      const data = await r.json();
      created.push(data.key);
    }

    return res.status(200).json({ ok: true, created });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Unexpected", details: String(e) });
  }
};
