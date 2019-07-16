/**
 * Bootstrap
 * (sails.config.bootstrap)
 *
 * An asynchronous bootstrap function that runs just before your Sails app gets lifted.
 * > Need more flexibility?  You can also do this by creating a hook.
 *
 * For more information on bootstrapping your app, check out:
 * https://sailsjs.com/config/bootstrap
 */


const fs = require('fs');
if (!fs.existsSync('./db/wallet.db')) {
  throw new Error('*** Cannot find db file, please run setup first (`npm run setup`) ***');
}
// Load .env.json file
loadEnvJson();
validateRequiredEnv();

module.exports.bootstrap = async function(done) {

  await WalletService.init();
  return done();
};

function loadEnvJson() {
  try{
    const path = require('path');
    const fs = require('fs');
    const jsonFile = '.env.json';
    const filePath = path.resolve(process.cwd(), jsonFile);
    if (fs.existsSync(filePath)) {
      const jsonString = fs.readFileSync(filePath, { encoding: 'utf8' } );
      const envConfig = JSON.parse(jsonString);

      for (const key in envConfig) {
        process.env[key] = typeof envConfig[key] === 'string' ? envConfig[key] : JSON.stringify(envConfig[key]);
      }
    }
  } catch (e) {
    console.log('Env Json Error:',e);
    return;
  }
}

function validateRequiredEnv() {
  const { API_KEY, SEED, FULL_NODE_URL, TRUSTSCORE_URL } = process.env;
  if(!API_KEY) throw new Error('*** Missing api key env variable ***');
  if(!SEED) throw new Error('*** Missing seed env variable ***');
  if(!FULL_NODE_URL) throw new Error('*** Missing full node url env variable ***');
  if(!TRUSTSCORE_URL) throw new Error('*** Missing trust score url env variable ***');

}
