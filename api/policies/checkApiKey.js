const exchangeAppApiKey = process.env.API_KEY;
const httpConstants = sails.config.httpconstants;

module.exports = async function(req, res, next){
  const apiKey = req.headers['x-api-key'];
  if(apiKey !== exchangeAppApiKey){
    sails.log.error(`Unauthorized api key attempting to access this private API. ${!apiKey && 'No API Key'}`);
    return res.json(httpConstants.CODE_UNAUTHORIZED, { status: httpConstants.STATUS_ERROR, type: httpConstants.API_AUTHORIZATION_ERROR, errorMessage: httpConstants.ERROR_NOT_AUTHORIZED});
  }
  return next();
};
