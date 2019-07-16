const to = require('await-to-js').default;
const bigdecimal = require('bigdecimal');
const {walletUtils } = require('coti-encryption-library');

module.exports = {
  generateAddress: async function(wallet, nonce) {
    let idx = 0;

    if(nonce) {
      const addressExists = await Addresses.findOne({nonce:nonce});
      if(addressExists) return {addressHex: addressExists.addressHex, index:idx, status:'Success'};
    }

    const addresses = wallet.getWalletAddresses();
    if(addresses.size) {
      const addressIndxes = Array.from(addresses, ([hex, addr]) => addr.index);
      idx = addressIndxes.reduce((a,b) => Math.max(a,b)) + 1;
    }

    const address = wallet.generateAddressByIndex(idx);
    if(!wallet.getWalletAddresses().get(address.getAddressHex())) {
      wallet.setAddressWithBalance(address, new bigdecimal.BigDecimal('0'), new bigdecimal.BigDecimal('0'));
    }

    const [err,resp] = await to(walletUtils.sendAddressToNode(address));
    if(err) return ErrorHandler.server(`Error sending address to full node`, err);
    sails.log.info(`New address was generated with index ${idx}`);

    const balances = await walletUtils.checkBalances([resp.address]);
    const { addressBalance, addressPreBalance } = balances[address.getAddressHex()];
    wallet.setAddressWithBalance(address, new bigdecimal.BigDecimal(addressBalance.toString()), new bigdecimal.BigDecimal(addressPreBalance.toString()));

    return {addressHex: resp.address, index:idx, status:resp.status};
  }
};
