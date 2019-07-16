// Error handling service - return a promise object that is reject

const httpConstants = sails.config.httpconstants;

module.exports = {
  server: async function(message, err) {

    sails.log.error(err ? err : message);

    let exception = {
      status: httpConstants.STATUS_ERROR,
      type: httpConstants.API_SERVER_ERROR,
      code: httpConstants.CODE_INTERNAL_ERROR,
      errorMessage: message
    };

    if(err) {
      exception.code = err.code;
    }

    return Promise.reject(exception);
  },
  client: async function(message, code = httpConstants.CODE_BAD_REQUEST) {

    let exception = {
      status: httpConstants.STATUS_ERROR,
      type: httpConstants.API_CLIENT_ERROR,
      code: code,
      errorMessage: message
    };

    return Promise.reject(exception);
  },
  clientNotAuthorized: async function() {
    return this.client(httpConstants.API_AUTHORIZATION_ERROR, httpConstants.CODE_UNAUTHORIZED);
  },
  clientForbidden: async function() {
    return this.client(`You are not permitted to perform this action`, httpConstants.CODE_FORBIDDEN);
  }
};
