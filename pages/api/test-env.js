export default function handler(req, res) {
  res.json({
    token: process.env.APIFY_API_TOKEN ? "EXISTS ✅" : "MISSING ❌",
    tokenLength: process.env.APIFY_API_TOKEN ? process.env.APIFY_API_TOKEN.length : 0
  });
}
