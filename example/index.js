const Hapi = require('hapi');
const plugin = require('../');

const server = new Hapi.Server();
server.connection({
  port: 8080,
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
        tests: ['buttonColor', 'heroCopy']
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
      buttonColor: ['green', 'blue'],
      heroCopy: ['option1', 'option2', 'option3']
    },
    addToViewContext: true
  }
}, (pluginErr) => {
  if (pluginErr) {
    throw pluginErr;
  }
  server.start((serverErr) => {
    if (serverErr) {
      throw serverErr;
    }
  });
});
