const { walletUtils  } = require('coti-encryption-library');
const to = require('await-to-js').default;
const subscriptionsLookAhead = 10;

module.exports = {
  validate: async function(wallet) {
    const validationPassed = await validateWallet(wallet);
    if(! validationPassed) {
       self.shutDown(); 
    }
  },
  validateSubscriptions: async function(socketSubscriber) {
    const walletAddresses = (await WalletService.getAddresses()).addresses;
    const subscriptions = socketSubscriber.getSubscriptions();
    const { balanceSubscriptions, transactionsSubscriptions, propagationSubscriptions } = subscriptions;

    for(const addressHex of walletAddresses) {
      if(!balanceSubscriptions.get(addressHex)) {
        sails.log.error('Could not find a balance subscription for addressHex:', addressHex);
        sails.log.error('walletAddresses:', walletAddresses.length, ' balanceSubscriptions:',balanceSubscriptions.size);
        return false;
      }

      if(!transactionsSubscriptions.get(addressHex)) {
        sails.log.error('Could not find transactions subscription for addressHex:', addressHex);
        sails.log.error('walletAddresses:', walletAddresses.length, ' balanceSubscriptions:',transactionsSubscriptions.size);
        return false;
      }
    }

    if(propagationSubscriptions.size !== subscriptionsLookAhead) { 
      sails.log.error('Subscriptions lookahead is:',propagationSubscriptions.size, ' but expected:', subscriptionsLookAhead);
      return false; //TODO: Check propgation sbuscrtipiosn are for the next 10 indexes
    }

    return true;
  },
  shutDown: async function() {
    sails.log.error("Exchange app is shutting down");
    process.exit(1);
  }
};

async function validateWallet(wallet) {

  const [err,trustScore] = await to(wallet.getUserTrustScore());
  if(err) {
    sails.log.error(err.message);
    return false;
  }

  sails.log.info(`Exchange wallet trust score: ${trustScore}`);

  const addresses = await Addresses.find({});
  if(!addresses.length) return true;
  const addressWithIndexZero = addresses.find(a => a.idx === '0');
  if(!addressWithIndexZero) {
    sails.log.error(`Error in wallet validation - Cannot find address with index 0`);
    return false;
  }

  const expectedAddress = wallet.generateAddressByIndex(0).getAddressHex();
  if(addressWithIndexZero.addressHex !== expectedAddress) {
    sails.log.error(`Error in wallet validation - Expected address in idx zero of:${expectedAddress} but found ${addressWithIndexZero.addressHex}`);
    sails.log.error(`Wallet validation failed. In case the seed was replaced please delete the wallet db file and rerun 'npm run setup'`);
    return false;
  }

  return true;
}
