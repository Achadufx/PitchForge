'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  collectCompanyUrls,
  companiesToInvestors,
} = require('../lib/pitchbookInvestors');

test('collectCompanyUrls reads companyUrls and drops blanks', () => {
  assert.deepEqual(
    collectCompanyUrls({
      companyUrls: [
        'https://pitchbook.com/profiles/company/10874-98',
        '  ',
        'https://pitchbook.com/profiles/company/521432-65',
      ],
    }),
    [
      'https://pitchbook.com/profiles/company/10874-98',
      'https://pitchbook.com/profiles/company/521432-65',
    ],
  );
});

test('collectCompanyUrls accepts companyUrl and url aliases', () => {
  assert.deepEqual(
    collectCompanyUrls({
      companyUrl: 'https://pitchbook.com/profiles/company/10874-98',
      url: 'https://pitchbook.com/profiles/company/10874-98',
    }),
    ['https://pitchbook.com/profiles/company/10874-98'],
  );
});

test('collectCompanyUrls is empty for sector-only bodies', () => {
  assert.deepEqual(collectCompanyUrls({ sector: 'venture capital', maxItems: 20 }), []);
});

test('companiesToInvestors flattens investor names onto the route shape', () => {
  const investors = companiesToInvestors([
    {
      name: 'Acme',
      companyUrl: 'https://pitchbook.com/profiles/company/10874-98',
      investors: ['Sequoia Capital', 'a16z', 'Sequoia Capital'],
    },
    {
      name: 'Other Co',
      companyUrl: 'https://pitchbook.com/profiles/company/521432-65',
      investors: ['Index Ventures'],
    },
  ]);
  assert.deepEqual(investors, [
    {
      name: 'Sequoia Capital',
      company: 'Acme',
      companyUrl: 'https://pitchbook.com/profiles/company/10874-98',
    },
    {
      name: 'a16z',
      company: 'Acme',
      companyUrl: 'https://pitchbook.com/profiles/company/10874-98',
    },
    {
      name: 'Index Ventures',
      company: 'Other Co',
      companyUrl: 'https://pitchbook.com/profiles/company/521432-65',
    },
  ]);
});

test('companiesToInvestors skips empty investor lists', () => {
  assert.deepEqual(
    companiesToInvestors([{ name: 'Solo', investors: [] }]),
    [],
  );
});
