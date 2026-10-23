'use strict';

/**
 * Collect PitchBook company profile URLs from the API request body.
 *
 * @param {object} body Request JSON. Accepts `companyUrls`, `companyUrl`,
 *   `urls`, or `url`.
 * @returns {string[]} Deduped, trimmed URLs in first-seen order.
 */
function collectCompanyUrls(body) {
  if (!body || typeof body !== 'object') {
    return [];
  }

  const raw = [];
  if (Array.isArray(body.companyUrls)) {
    raw.push.apply(raw, body.companyUrls);
  }
  if (typeof body.companyUrl === 'string') {
    raw.push(body.companyUrl);
  }
  if (Array.isArray(body.urls)) {
    raw.push.apply(raw, body.urls);
  }
  if (typeof body.url === 'string') {
    raw.push(body.url);
  }

  const out = [];
  const seen = {};
  for (let i = 0; i < raw.length; i++) {
    const url = String(raw[i] || '').trim();
    if (!url) continue;
    const key = url.toLowerCase();
    if (seen[key]) continue;
    seen[key] = true;
    out.push(url);
  }
  return out;
}

/**
 * Flatten company dataset rows into the route's `{ name, company, companyUrl }`
 * investor objects. Keeps the response key `investors`.
 *
 * @param {object[]} companies Actor dataset items.
 * @returns {{name: string, company: string, companyUrl: string}[]}
 */
function companiesToInvestors(companies) {
  const items = Array.isArray(companies) ? companies : [];
  const investors = [];
  const seen = {};

  for (let i = 0; i < items.length; i++) {
    const company = items[i];
    if (!company || typeof company !== 'object') continue;
    const companyName = company.name ? String(company.name) : '';
    const companyUrl = company.companyUrl ? String(company.companyUrl) : '';
    const names = Array.isArray(company.investors) ? company.investors : [];
    for (let j = 0; j < names.length; j++) {
      const name = String(names[j] || '').trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen[key]) continue;
      seen[key] = true;
      investors.push({
        name: name,
        company: companyName,
        companyUrl: companyUrl,
      });
    }
  }

  return investors;
}

module.exports = {
  collectCompanyUrls,
  companiesToInvestors,
};
