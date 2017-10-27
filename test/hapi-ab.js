const Hapi = require('hapi');
const tap = require('tap');
const plugin = require('../');

tap.test('dont do anything if not set in route config');

tap.test('skip if no tests empty array');

tap.test('sets the right headers and sets abTests on the request', t => {
  const server = new Hapi.Server();
  server.connection({
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
    handler(request, reply) {
      reply(null, request.abTests);
    }
  });

  server.register({
    register: plugin,
    options: {
      tests: {
        buttonColor: ['green', 'blue']
      }
    }
  }, (pluginErr) => {
    t.equal(pluginErr, undefined);
    server.start((serverErr) => {
      t.equal(serverErr, undefined);
      server.inject({
        url: '/'
      }, (res) => {
        server.stop(() => {
          const cookies = res.headers['set-cookie'];
          t.includes(cookies[0], 'ab-session-id=');
          t.includes(cookies[1], 'ab-test-buttonColor=');
          const payload = JSON.parse(res.payload);
          t.equals(typeof payload.tests.buttonColor, 'string');
          t.end();
        });
      });
    });
  });
});

tap.test('keeps the same values on subsequet requests', t => {
  const server = new Hapi.Server();
  server.connection({
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
    handler(request, reply) {
      reply(null, request.abTests);
    }
  });

  server.register({
    register: plugin,
    options: {
      tests: {
        buttonColor: ['green']
      }
    }
  }, (pluginErr) => {
    t.equal(pluginErr, undefined);
    server.start((serverErr) => {
      t.equal(serverErr, undefined);
      server.inject({
        url: '/'
      }, (res) => {
        const cookies = res.headers['set-cookie'];
        const cookieHeaders = cookies.map(c => c.match(/(?:[^\x00-\x20\(\)<>@\,;\:\\"\/\[\]\?\=\{\}\x7F]+)\s*=\s*(?:([^\x00-\x20\"\,\;\\\x7F]*))/)[0]);
        server.inject({
          url: '/',
          headers: {
            cookie: cookieHeaders.join(';')
          }
        }, (res2) => {
          server.stop(() => {
            t.equals(res2.headers['set-cookie'], undefined);
            const payload = JSON.parse(res.payload);
            const payload2 = JSON.parse(res2.payload);
            t.deepEquals(payload, payload2);
            t.end();
          });
        });
      });
    });
  });
});

tap.test('error if not valid test');

tap.test('set session id in cookie');

tap.test('same option value if set in cookie');

tap.test('same session id if set in cookie');

tap.test('set test on request object');

tap.test('randomize test value');

tap.test('globalTests');
