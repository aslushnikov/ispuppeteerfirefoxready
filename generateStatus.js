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
  puppeteer: require('./experimental/puppeteer-firefox'),
  Errors: require('./Errors'),
  DeviceDescriptors: require('./DeviceDescriptors'),
  defaultBrowserOptions: {handleSIGINT: false},
  testRunner,
});

const allTests = testRunner.tests();
const ffoxTests = allTests.filter(test => {
  if (test.comment === FAILS_FFOX_COMMENT)
    return false;
  for (let suite = test.suite; suite; suite = suite.parentSuite) {
    if (suite.comment === FAILS_FFOX_COMMENT)
      return false;
  }
  return true;
});

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
  apiDiff
}));
