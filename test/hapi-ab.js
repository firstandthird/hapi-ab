const Hapi = require('hapi');
const tap = require('tap');
const plugin = require('../');

tap.test('dont do anything if not set in route config');

tap.test('skip if no tests empty array');

tap.test('sets the right headers and sets abTests on the request', async t => {
  const server = new Hapi.Server({
    state: {
      isSecure: false,
      isHttpOnly: false,
      isSameSite: false
    }
  });

  server.route({
    path: '/',
    method: 'get',
    config: {
      plugins: {
        'hapi-ab': {
          tests: ['buttonColor']
        }
      }
    },
    handler(request, h) {
      return request.abTests;
    }
  });

  await server.register({
    plugin,
    options: {
      tests: {
        buttonColor: ['green', 'blue']
      }
    }
  });
  await server.start();
  const res = await server.inject({ url: '/' });
  await server.stop();
  const cookies = res.headers['set-cookie'];
  t.includes(cookies[0], 'ab-session-id=');
  t.includes(cookies[1], 'ab-test-buttonColor=');
  t.includes(cookies[0], 'Path=/');
  t.includes(cookies[1], 'Path=/');
  const payload = JSON.parse(res.payload);
  t.equals(typeof payload.tests.buttonColor, 'string');
  t.end();
});

tap.test('keeps the same values on subsequet requests', async t => {
  const server = new Hapi.Server({
    state: {
      isSecure: false,
      isHttpOnly: false,
      isSameSite: false
    }
  });

  server.route({
    path: '/',
    method: 'get',
    config: {
      plugins: {
        'hapi-ab': {
          tests: ['buttonColor']
        }
      }
    },
    handler(request, h) {
      return request.abTests;
    }
  });

  await server.register({
    plugin,
    options: {
      tests: {
        buttonColor: ['green']
      }
    }
  });
  await server.start();
  const res = await server.inject({ url: '/' });
  const cookies = res.headers['set-cookie'];
  /* eslint-disable */
  const cookieHeaders = cookies.map(c => c.match(/(?:[^\x00-\x20\(\)<>@\,;\:\\"\/\[\]\?\=\{\}\x7F]+)\s*=\s*(?:([^\x00-\x20\"\,\;\\\x7F]*))/)[0]);
  /* eslint-enable */
  const res2 = await server.inject({
    url: '/',
    headers: {
      cookie: cookieHeaders.join(';')
    }
  });
  await server.stop();
  t.equals(res2.headers['set-cookie'], undefined);
  const payload = JSON.parse(res.payload);
  const payload2 = JSON.parse(res2.payload);
  t.deepEquals(payload, payload2);
  t.end();
});

tap.test('set test with query param', async t => {
  const server = new Hapi.Server({
    state: {
      isSecure: false,
      isHttpOnly: false,
      isSameSite: false
    }
  });

  server.route({
    path: '/',
    method: 'get',
    config: {
      plugins: {
        'hapi-ab': {
          tests: ['text', 'buttonColor']
        }
      }
    },
    handler(request, h) {
      return request.abTests;
    }
  });

  await server.register({
    plugin,
    options: {
      tests: {
        text: ['a', 'b'],
        buttonColor: ['green', 'blue', 'yellow', 'orange'],
        placement: ['top', 'bottom']
      }
    }
  });
  await server.start();
  const res = await server.inject({ url: '/?abtest=buttonColor:blue,text:b' });
  await server.stop();
  const payload = JSON.parse(res.payload);
  t.equal(payload.tests.buttonColor, 'blue');
  t.equal(payload.tests.text, 'b');
  t.end();
});

tap.test('error if not valid test');

tap.test('set session id in cookie');

tap.test('same option value if set in cookie');

tap.test('same session id if set in cookie');

tap.test('set test on request object');

tap.test('randomize test value');

tap.test('cookie path');

tap.test('ttl');

tap.test('globalTests', async t => {
  const server = new Hapi.Server({
    state: {
      isSecure: false,
      isHttpOnly: false,
      isSameSite: false
    }
  });

  server.route({
    path: '/',
    method: 'get',
    handler(request, h) {
      return request.abTests;
    }
  });

  await server.register({
    plugin,
    options: {
      tests: {
        buttonColor: ['green', 'blue']
      },
      globalTests: ['buttonColor']
    }
  });
  await server.start();
  const res = await server.inject({ url: '/' });
  await server.stop();
  const cookies = res.headers['set-cookie'];
  t.includes(cookies[0], 'ab-session-id=');
  t.includes(cookies[1], 'ab-test-buttonColor=');
  const payload = JSON.parse(res.payload);
  t.equals(typeof payload.tests.buttonColor, 'string');
  t.end();
});

tap.test('globalTests - disable', async t => {
  const server = new Hapi.Server({
    state: {
      isSecure: false,
      isHttpOnly: false,
      isSameSite: false
    }
  });

  server.route({
    path: '/ui/test',
    method: 'get',
    config: {
      plugins: {
        'hapi-ab': {
          global: false
        }
      }
    },
    handler(request, h) {
      return { abTests: request.abTests };
    }
  });

  await server.register({
    plugin,
    options: {
      tests: {
        buttonColor: ['green', 'blue']
      },
      globalTests: ['buttonColor']
    }
  });
  await server.start();
  const res = await server.inject({ url: '/ui/test' });
  await server.stop();
  const cookies = res.headers['set-cookie'];
  t.equal(cookies, undefined);
  const payload = JSON.parse(res.payload);
  t.deepEqual(payload, {});
  t.end();
});

tap.test('globalTests - local enabled, global disabled', async t => {
  const server = new Hapi.Server({
    state: {
      isSecure: false,
      isHttpOnly: false,
      isSameSite: false
    }
  });

  server.route({
    path: '/',
    method: 'get',
    config: {
      plugins: {
        'hapi-ab': {
          tests: ['text'],
          global: false
        }
      }
    },
    handler(request, h) {
      return request.abTests;
    }
  });

  await server.register({
    plugin,
    options: {
      tests: {
        buttonColor: ['green', 'blue'],
        text: ['a', 'b']
      },
      globalTests: ['buttonColor']
    }
  });
  await server.start();
  const res = await server.inject({ url: '/' });
  server.stop();
  const cookies = res.headers['set-cookie'];
  t.includes(cookies[0], 'ab-session-id=');
  t.includes(cookies[1], 'ab-test-text=');
  t.equals(cookies.length, 2);
  const payload = JSON.parse(res.payload);
  t.equals(typeof payload.tests.text, 'string');
  t.equals(typeof payload.tests.buttonColor, 'undefined');
  t.end();
});

tap.test('if funnels, dont include if not already there', async t => {
  const server = new Hapi.Server({
    state: {
      isSecure: false,
      isHttpOnly: false,
      isSameSite: false
    }
  });

  server.route({
    path: '/',
    method: 'get',
    config: {
      plugins: {
        'hapi-ab': {
          tests: ['text'],
          funnels: ['buttonColor']
        }
      }
    },
    handler(request, h) {
      return request.abTests;
    }
  });

  await server.register({
    plugin,
    options: {
      tests: {
        buttonColor: ['green'],
        text: ['a', 'b']
      }
    }
  });
  await server.start();
  const res = await server.inject({ url: '/' });
  const payload = JSON.parse(res.payload);
  t.equals(payload.tests.buttonColor, undefined);
  await server.stop();
  t.end();
});

tap.test('if funnels, include ', async t => {
  const server = new Hapi.Server({
    state: {
      isSecure: false,
      isHttpOnly: false,
      isSameSite: false
    }
  });

  server.route({
    path: '/',
    method: 'get',
    config: {
      plugins: {
        'hapi-ab': {
          tests: ['text'],
          funnels: ['buttonColor']
        }
      }
    },
    handler(request, h) {
      return request.abTests;
    }
  });

  await server.register({
    plugin,
    options: {
      tests: {
        buttonColor: ['green', 'blue'],
        text: ['a', 'b']
      }
    }
  });
  await server.start();
  const res = await server.inject({
    url: '/',
    headers: {
      cookie: 'ab-session-id=123;ab-test-buttonColor=blue'
    }
  });
  const payload = JSON.parse(res.payload);
  t.equals(payload.tests.buttonColor, 'blue');
  await server.stop();
  t.end();
});
