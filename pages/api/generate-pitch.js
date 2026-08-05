import { generatePitch } from '../../lib/generatePitch';
import { groqConfigError, callGroq } from '../../lib/groqClient';

/**
 * Writes a follow-up to a pitch that got no reply.
 *
 * A follow-up is not a second cold pitch, and generating one with the normal
 * pitch prompt produces exactly that — a fresh introduction to someone who
 * already has the first email in their inbox, which reads as a mail merge. So
 * the follow-up path has its own prompt: shorter, aware that a previous message
 * exists, and carrying one new reason to reply rather than restating the pitch.
 *
 * Returns null on any failure so the caller can fall back or surface an error;
 * this never throws.
 */
async function generateFollowup(args) {
  var daysLine = args.daysSince
    ? 'It has been ' + args.daysSince + ' days with no reply.'
    : 'There has been no reply yet.';

  var escalation = args.followupCount >= 2
    ? 'This is at least the third message. Acknowledge that this is the last ' +
      'nudge and give them an easy, no-guilt way to say no.'
    : args.followupCount === 1
      ? 'One follow-up has already been sent. Do not repeat its angle — lead ' +
        'with something new.'
      : 'This is the first follow-up.';

  var prompt = [
    'You are writing a short follow-up email from a startup founder to an investor',
    'who did not reply to an earlier pitch.',
    '',
    'INVESTOR: ' + (args.investorName || args.firm || 'the investor'),
    args.firm ? 'FIRM: ' + args.firm : '',
    'STARTUP: ' + args.startupName,
    'WHAT THEY DO: ' + args.description,
    args.ask ? 'THE ASK: ' + args.ask : '',
    args.previousSubject ? 'PREVIOUS SUBJECT LINE: ' + args.previousSubject : '',
    daysLine,
    escalation,
    '',
    'RULES',
    '- Under 110 words. A follow-up that is longer than the original is not a follow-up.',
    '- Open by referring to the earlier email in half a sentence, then move on.',
    '- Give ONE concrete new thing: traction, a milestone, a customer, a deadline.',
    '  If you have no new fact to offer, make the email shorter, not vaguer.',
    '- No guilt, no "just circling back", no "bumping this to the top of your inbox".',
    '- End with a single, low-friction question they can answer in one line.',
    '- Plain text. No markdown, no placeholders, no [brackets].',
    '',
    'Reply with JSON only: {"subject": "...", "body": "..."}',
    args.previousSubject
      ? 'Prefer "Re: ' + args.previousSubject + '" as the subject so it threads.'
      : ''
  ].filter(Boolean).join('\n');

  var result = await callGroq({
    label: 'generate-followup',
    prompt: prompt,
    jsonMode: true,
    temperature: 0.7,
    maxTokens: 700
  });

  if (!result || !result.ok || !result.text) {
    console.error('generate-pitch: follow-up generation failed: ' +
      ((result && result.error) || 'no text returned'));
    return null;
  }

  try {
    var parsed = JSON.parse(result.text);
    if (!parsed || !parsed.subject || !parsed.body) {
      console.error('generate-pitch: follow-up JSON was missing subject or body');
      return null;
    }
    return { subject: String(parsed.subject), body: String(parsed.body) };
  } catch (err) {
    console.error('generate-pitch: follow-up JSON did not parse: ' +
      (err && err.message ? err.message : String(err)));
    return null;
  }
}

// Thin wrapper over lib/generatePitch so this endpoint and /api/research-and-pitch
// can never drift apart. Pitch generation runs on Groq since the provider split;
// only investor research still uses Gemini.
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  var body = req.body || {};
  var investorName = body.investorName;
  var firm = body.firm;
  var startupName = body.startupName;
  var description = body.description;
  var ask = body.ask;
  var investorResearch = body.investorResearch;
  // Set by the CRM follow-up queue. Everything else about the request is the
  // same, which is why this is a flag rather than a second endpoint.
  var isFollowup = body.followUp === true || body.isFollowup === true;

  if (!investorName || !startupName || !description) {
    return res.status(400).json({ error: 'investorName, startupName, and description are required' });
  }

  var configError = groqConfigError();
  if (configError) {
    console.error('generate-pitch: ' + configError);
    return res.status(500).json({ error: configError });
  }

  try {
    var pitch = isFollowup
      ? await generateFollowup({
          investorName: investorName,
          firm: firm,
          startupName: startupName,
          description: description,
          ask: ask,
          previousSubject: body.previousSubject || null,
          daysSince: body.daysSince || null,
          followupCount: Number(body.followupCount) || 0
        })
      : await generatePitch(investorName, firm, startupName, description, ask, investorResearch);

    if (!pitch) {
      return res.status(502).json({
        error: isFollowup
          ? 'Follow-up generation failed. Check server logs for the [generate-followup] error line.'
          : 'Pitch generation failed. Check server logs for the [generatePitch] error line.'
      });
    }

    return res.status(200).json({ subject: pitch.subject, body: pitch.body, followUp: isFollowup });

  } catch (err) {
    console.error('generate-pitch error: ' + (err && err.message ? err.message : String(err)));
    return res.status(500).json({
      error: 'Pitch generation failed',
      details: err && err.message ? err.message : String(err)
    });
  }
}
