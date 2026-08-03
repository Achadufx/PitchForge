// Tolerant JSON extraction for LLM output.
//
// Handles, in order: clean JSON, ```json fences anywhere in the string,
// JSON embedded in explanatory prose, trailing commas, and smart quotes.
// Returns null on failure — never throws.

function stripFences(input) {
  var out = String(input);
  // Remove every fence marker wherever it appears, not just at the ends.
  out = out.replace(/```[a-zA-Z]*\s*/g, '');
  out = out.replace(/```/g, '');
  return out.trim();
}

function repairCommon(input) {
  var out = String(input);
  out = out.replace(/,\s*}/g, '}');
  out = out.replace(/,\s*]/g, ']');
  // Smart quotes that models sometimes emit around keys/values.
  out = out.replace(/[“”]/g, '"');
  out = out.replace(/[‘’]/g, "'");
  return out;
}

// Scans for the first brace-balanced object, respecting strings and escapes.
// Beats indexOf('{') + lastIndexOf('}') when the model appends prose containing braces.
function firstBalancedObject(input) {
  var text = String(input);
  var start = text.indexOf('{');
  if (start === -1) return null;

  var depth = 0;
  var inString = false;
  var escaped = false;

  for (var i = start; i < text.length; i++) {
    var ch = text[i];

    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

export function extractJson(raw) {
  if (raw == null) return null;
  var text = String(raw).trim();
  if (!text) return null;

  var attempts = [];

  attempts.push(text);

  var unfenced = stripFences(text);
  if (unfenced !== text) attempts.push(unfenced);

  var balanced = firstBalancedObject(unfenced);
  if (balanced) attempts.push(balanced);

  // Widest span, for objects the balanced scanner rejects due to a stray quote.
  var start = unfenced.indexOf('{');
  var end = unfenced.lastIndexOf('}');
  if (start !== -1 && end > start) attempts.push(unfenced.slice(start, end + 1));

  for (var i = 0; i < attempts.length; i++) {
    var candidate = attempts[i];
    try {
      var parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (e) {
      try {
        var repaired = JSON.parse(repairCommon(candidate));
        if (repaired && typeof repaired === 'object') return repaired;
      } catch (e2) {
        // try the next strategy
      }
    }
  }

  console.error('extractJson: could not parse JSON from model output. First 300 chars: ' +
    text.substring(0, 300));
  return null;
}

export default extractJson;
