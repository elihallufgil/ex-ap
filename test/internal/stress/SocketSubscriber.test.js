const assert = require('assert');
let generatedAddress;
let webSocketService;

describe('Stress.test', function() {

  this.timeout(665000);

  before(async () => {
    const FULL_NODE_URL = process.env.FULL_NODE_URL;
    sails.log.info('FULL_NODE_URL:', FULL_NODE_URL);
    if(! FULL_NODE_URL.includes('local') && ! FULL_NODE_URL.includes('staging')) {
      sails.log.info('Error - will only run this stress tests with a local full node or staging environment');
      process.exit(1);
    }
  });

  it('Verifies monitoring is initialized', async () => {
    await WalletService.waitForMonitoringInitialization();

    sails.log.info('Verified monitoring is running');

    webSocketService = require('coti-encryption-library').webSocketService;

  });

  it('Generates a lot of addresses', async () => {

    await ToolsService.delay(2000);

    let i = 0;
    const numToGenerate = 12;
    sails.log.info(`Generating new addresses`);
    while(i < numToGenerate) {

      //TOOD: check index increased
      const resp = await WalletService.generateNewAddress();
      const { status, index } = resp;

      sails.log.info(`Generated address with index`, index);
      generatedAddress = await Addresses.findOne({addressHex:resp.addressHex});
      sails.log.info(`generatedAddress:`, generatedAddress);
      i++;
    }
  });

  it('Check subscriptions', async () => {

    await ToolsService.delay(8000);
    
    const walletValidation = await WalletValidator.validateSubscriptions(webSocketService);
    assert(walletValidation);
  });

});

