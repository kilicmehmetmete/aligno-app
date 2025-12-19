const fs = require("fs");

// JIRA bilgilerin (ENV'DEN GELİYOR)
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_DOMAIN = process.env.JIRA_DOMAIN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY;

if (!JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_DOMAIN || !JIRA_PROJECT_KEY) {
  console.error("❌ Missing required environment variables.");
  process.exit(1);
}

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString("base64");

// CSV kolonları: Issue Type, Summary, Description, Labels, Priority, Epic Link
function readCSV(path) {
  const text = fs.readFileSync(path, "utf8");
  const lines = text.trim().split("\n");
  const issues = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(",");

    const issueType   = (parts[0] || "").trim();
    const summary     = (parts[1] || "").trim();
    const description = (parts[2] || "").trim();

    if (!summary) continue;

    issues.push({ summary, description, issueType });
  }

  return issues;
}

// Jira description için Atlassian Document Format (ADF)
function makeDescriptionADF(text) {
  if (!text) {
    return {
      type: "doc",
      version: 1,
      content: [],
    };
  }

  return {
    type: "doc",
    version: 1,
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: text,
          },
        ],
      },
    ],
  };
}

async function createIssue(issue) {
  const body = {
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      summary: issue.summary,
      description: makeDescriptionADF(issue.description),
      issuetype: { name: "Task" },
    },
  };

  const res = await fetch(
    `https://${JIRA_DOMAIN}.atlassian.net/rest/api/3/issue`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    const txt = await res.text();
    console.error("Jira error:", res.status, txt);
    return;
  }

  const data = await res.json();
  console.log("Created:", data.key);
}

async function main() {
  const issues = readCSV("import.csv");
  console.log("Issue count:", issues.length);

  for (const issue of issues) {
    console.log("Creating:", issue.summary);
    await createIssue(issue);
  }

  console.log("Done.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
});
