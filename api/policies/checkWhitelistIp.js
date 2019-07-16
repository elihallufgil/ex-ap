
const openIps = process.env.OPEN_IPS;

module.exports = async function(req, res, next){

  if(!openIps) {
    return next();
  }

  try {
    var ip = req.header('x-forwarded-for') || req.ip;
    var ipv4 = ip.split(':').pop();
    ipv4 = ipv4.split(',')[0];

    const openIp = await openIps.split(',').find(ip => ip === ipv4);
    if(!openIp) {
      sails.log.error(`Unauthorized ip attempting to access this private API:${ip},ipv4:${ipv4}`);
      return ErrorHandler.clientNotAuthorized();
    }
    return next();
  } catch(e) {
    return ErrorHandler.server(`Error in ip check:${e}`);
  }
};
