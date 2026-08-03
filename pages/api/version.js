import { geminiModel } from '../../lib/geminiClient';
import { groqModel } from '../../lib/groqClient';

// Reports which build is actually running, so a stale deployment can be
// identified without guessing. Vercel injects VERCEL_GIT_COMMIT_SHA at build
// time — if it does not match the tip of main, production is serving old code.
//
// Usage: GET /api/version
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  var sha = process.env.VERCEL_GIT_COMMIT_SHA || null;

  return res.status(200).json({
    commit: sha,
    commitShort: sha ? sha.substring(0, 7) : null,
    branch: process.env.VERCEL_GIT_COMMIT_REF || null,
    deployedAt: process.env.VERCEL_DEPLOYMENT_ID || null,
    env: process.env.VERCEL_ENV || 'local',
    // Pitch pipeline (research + generation) runs entirely on Groq.
    groqModel: groqModel(),
    groqKeyConfigured: !!process.env.GROQ_API_KEY,

    // Document analysis only — not used by the pitch pipeline.
    geminiModel: geminiModel(),
    geminiKeyConfigured: !!process.env.GEMINI_API_KEY,

    // If the running build is current, this reads exactly "throws-no-fallback".
    // Any other value means the deployment predates commit 69a3643 and is still
    // serving the removed generic-template fallback.
    pitchFailureBehavior: 'throws-no-fallback'
  });
}
