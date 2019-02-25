/**
 * This script is supposed to be run from the root of Puppeteer
 * repository.
 */

const {TestRunner} = require('./utils/testrunner/');
const testRunner = new TestRunner();
const FAILS_FFOX_COMMENT = Symbol('fails_ffox');
testRunner.addTestDSL('it_fails_ffox', 'skip', FAILS_FFOX_COMMENT);
testRunner.addSuiteDSL('describe_fails_ffox', 'skip', FAILS_FFOX_COMMENT);
require('./test/puppeteer.spec.js').addTests({
  product: 'Firefox',
  puppeteerPath: './experimental/puppeteer-firefox',
  testRunner,
});


const allTests = testRunner.tests();
const disabledTestSuites = new Set();
const ffoxTests = allTests.filter(test => {
  let status = true;
  if (test.comment === FAILS_FFOX_COMMENT)
    status = false;
  for (let suite = test.suite; status && suite; suite = suite.parentSuite) {
    if (suite.comment === FAILS_FFOX_COMMENT)
      status = false;
  }
  if (!status) {
    disabledTestSuites.add(test.suite);
    test.suite._all_tests = test.suite._all_tests || new Set();
    test.suite._all_tests.add(test);
  }
  return status;
});

const disabledSuites = Array.from(disabledTestSuites.values());
disabledSuites.sort((a, b) => b._all_tests.size - a._all_tests.size);

const api = require('./lib/api');
const ffoxAPI = require('./experimental/puppeteer-firefox/lib/api');
const events = require('./lib/Events').Events;
const ffoxEvents = require('./experimental/puppeteer-firefox/lib/Events').Events;

const apiDiff = {};
for (const [className, chromeClass] of Object.entries(api)) {
  apiDiff[className] = {
    events: {},
    methods: {},
  };
  const ffoxClass = ffoxAPI[className];
  const chromeMethods = publicMethodNames(chromeClass);
  const ffoxMethods = new Set(ffoxAPI[className] ? publicMethodNames(ffoxAPI[className]) : []);
  for (const methodName of chromeMethods)
    apiDiff[className].methods[methodName] = ffoxMethods.has(methodName);

  const chromeEvents = publicEventNames(events, className);
  const fEvents = new Set(publicEventNames(ffoxEvents, className));
  for (const eventName of chromeEvents)
    apiDiff[className].events[eventName] = fEvents.has(eventName);
}

function publicMethodNames(classType) {
  return Reflect.ownKeys(classType.prototype).filter(methodName => {
    const method = Reflect.get(classType.prototype, methodName);
    return methodName !== 'constructor' && typeof methodName === 'string' && !methodName.startsWith('_') && typeof method === 'function';
  });
}

function publicEventNames(events, className) {
  return Object.entries(events[className] || {}).filter(([name, value]) => typeof value === 'string').map(([name, value]) => value);
}

console.log(JSON.stringify({
  allTests: allTests.length,
  firefoxTests: ffoxTests.length,
  apiDiff,
  topDisabledSuites: disabledSuites.map(suite => {
    return {
      name: suite.fullName,
      size: suite._all_tests.size
    }
  }),
}));
