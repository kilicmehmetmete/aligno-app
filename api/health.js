module.exports = (req, res) => {
  res.status(200).json({
    ok: true,
    projectEnv: {
      JIRA_EMAIL: !!process.env.JIRA_EMAIL,
      JIRA_API_TOKEN: !!process.env.JIRA_API_TOKEN,
      JIRA_DOMAIN: !!process.env.JIRA_DOMAIN,
      JIRA_PROJECT_KEY: !!process.env.JIRA_PROJECT_KEY,
      IMPORT_SECRET: !!process.env.IMPORT_SECRET,
    },
  });
};
