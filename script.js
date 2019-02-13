import {html} from './zhtml.js';

const responsePromise = fetch('./status.json');
const dataPromise = responsePromise.then(response => response.json());
const $ = document.querySelector.bind(document);

window.addEventListener('DOMContentLoaded', async () => {
  const response = await responsePromise;
  const json = await dataPromise;
  const date = new Date(response.headers.get('last-modified'));
  const diff = Date.now() - date;
  let time = '';
  if (diff < 1000)
    time = 'Just Now';
  else if (1000 <= diff && diff <= 60 * 1000)
    time = `${Math.round(diff / 1000)} seconds ago`;
  else if (60 * 1000 <= diff && diff <= 60 * 60 * 1000)
    time = `${Math.round(diff / 60 / 1000)} minutes ago`;
  else if (60 * 60 * 1000 <= diff && diff <= 24 * 60 * 60 * 1000)
    time = `${Math.round(diff / 60 / 60 / 1000)} hours ago`;
  else if (24 * 60 * 60 * 1000 <= diff)
    time = `${Math.round(diff / 24 / 60 / 60 / 1000)} days ago`;

  const {apiDiff} = json;

  const excluded = new Map([
    ['Coverage', new Set([
      'startJSCoverage',
      'stopJSCoverage',
      'startCSSCoverage',
      'stopCSSCoverage',
    ])],
    ['CDPSession', new Set([
      'send',
      'detach',
    ])],
    ['Target', new Set([
      'createCDPSession',
    ])],
    ['Tracing', new Set([
      'start',
      'stop',
    ])],
  ]);

  let supportedAPI = 0;
  let totalAPI = 0;
  Object.entries(apiDiff).forEach(([className, coverage]) => {
    Object.entries(coverage.methods).forEach(([methodName, status]) => {
      if (excluded.has(className) && excluded.get(className).has(methodName))
        return;
      ++totalAPI;
      if (status)
        ++supportedAPI;
    });
    Object.values(coverage.events).forEach(status => {
      ++totalAPI;
      if (status)
        ++supportedAPI;
    });
  });
  const apiCoverage = Math.round(supportedAPI / totalAPI * 100);
  const testCoverage = Math.round(json.firefoxTests / json.allTests * 100);
  $('.apidiff').appendChild(html`
    <ul>
      <li>Tests Passing: <b>${testCoverage}%</b> (${json.firefoxTests}/${json.allTests})</li>
      <li>Supported API: <b>${apiCoverage}%</b> (${supportedAPI}/${totalAPI})</li>
      <li>Last updated: <b>${time}</b></li>
    </ul>
    <h4>Implemented API</h4>
    <ul>${Object.entries(apiDiff).map(([className, classCoverage]) => html`
      <li>class: ${className}</li>
      <ul>${Object.entries(classCoverage.events).map(([eventName, status]) => html`
        <li class=${status ? 'supported': 'missing'}>${lower(className)}.on('${eventName}')</li>
      `)}
      </ul>
      <ul>${Object.entries(classCoverage.methods).map(([methodName, status]) => {
        const isExcluded = excluded.has(className) && excluded.get(className).has(methodName);
        const title = isExcluded ? 'This API is chrome-specific and will not be implemented in Puppeteer-FireFox.' : '';
        const cls = isExcluded ? 'excluded' : (status ? 'supported' : 'missing');
        return html`
        <li class=${cls} title='${title}'>${lower(className)}.${methodName}()</li>
        `;
      })}
      </ul>
    `)}
    </ul>
  `);

  function lower(text) {
    if (text === 'CDPSession')
      return 'cdpSession';
    if (text === 'JSHandle')
      return 'jsHandle';
    return text.substring(0, 1).toLowerCase() + text.substring(1);
  }
}, false);
