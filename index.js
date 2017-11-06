const Joi = require('joi');
const uuid = require('uuid');

exports.register = function(server, options, next) {
  const schema = {
    testCookieNamePrefix: Joi.string().default('ab-test-'),
    sessionCookieName: Joi.string().default('ab-session-id'),
    cookieTTL: Joi.number().default(1000 * 60 * 60 * 24 * 30), //30 days
    tests: Joi.object(),
    addToRequest: Joi.boolean().default(true),
    addToViewContext: Joi.boolean().default(false),
    globalTests: Joi.array().default([])
  };
  const valid = Joi.validate(options, schema);
  if (valid.error) {
    return next(valid.error);
  }
  const config = valid.value;

  const diceRoll = function(opts) {
    const c = opts.length;
    const rnd = Math.floor(Math.random() * c);
    return opts[rnd];
  };

  server.ext('onPreHandler', (request, reply) => {
    if (!request.route.settings.plugins['hapi-ab'] && config.globalTests.length === 0) {
      return reply.continue();
    }
    const pluginConfig = request.route.settings.plugins['hapi-ab'] || {};
    const routeTests = pluginConfig.tests || [];
    const routeFunnels = pluginConfig.funnels || [];
    if (config.globalTests.length === 0 && routeTests.length === 0 && routeFunnels.length === 0) {
      return reply.continue();
    }

    const abTests = {
      sessionId: request.state[config.sessionCookieName],
      tests: {}
    };

    if (!abTests.sessionId) {
      abTests.sessionId = uuid.v4();
      reply.state(config.sessionCookieName, abTests.sessionId, { ttl: config.cookieTTL });
    }

    const getCookieKey = (t) => `${config.testCookieNamePrefix}${t}`;

    const invalidTests = [];
    const overrides = {};
    if (request.query.abtest) {
      const ots = request.query.abtest.split(',');
      ots.forEach(o => {
        const [key, value] = o.split(':');
        overrides[key] = value;
      });
    }

    const checkTest = t => {
      const testOptions = config.tests[t];
      if (!testOptions) {
        invalidTests.push(t);
      }
      const cookieKey = getCookieKey(t);
      let testValue = request.state[cookieKey];
      if (overrides[t]) {
        testValue = overrides[t];
      }
      if (!testValue) {
        //not already part of test
        testValue = diceRoll(config.tests[t]);
        reply.state(cookieKey, testValue, { ttl: config.cookieTTL });
      }
      abTests.tests[t] = testValue;
    };

    config.globalTests.forEach(t => checkTest(t));
    routeTests.forEach(t => checkTest(t));

    routeFunnels.forEach(f => {
      const cookieKey = getCookieKey(f);
      const testValue = request.state[cookieKey];
      if (!testValue) {
        return;
      }
      abTests.tests[f] = testValue;
    });

    if (invalidTests.length !== 0) {
      return reply(new Error(`Invalid Tests: ${invalidTests.join(',')}`));
    }

    request.abTests = abTests;

    reply.continue();
  });
  if (config.addToViewContext) {
    server.ext('onPostHandler', (request, reply) => {
      const response = request.response;
      if (response.variety === 'view') {
        if (!response.source.context) {
          response.source.context = {};
        }
        response.source.context.abTests = request.abTests;
      }
      reply.continue();
    });
  }

  next();
};

exports.register.attributes = {
  pkg: require('./package.json')
};
