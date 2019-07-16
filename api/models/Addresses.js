const crypto = require('crypto');
const bigdecimal = require('bigdecimal');
const to = require('await-to-js').default;
const util = require('util');
const { addresses } = require('coti-encryption-library');
const NotificationState = require('../enums/NotificationState');

module.exports = {

  primaryKey:'idx',
  attributes: {
    idx: {
      type: 'string',
      required: true
    },
    addressHex: {
      type: 'string',
      required: true,
      unique: true
    },
    balance: {
      type: 'string'
    },
    prebalance: {
      type: 'string'
    },
    nonce: {
      type: 'string',
      unique: true
    },
    notificationState: {
      type: 'number'
    }
  },
  getAllAddresses: async function(wallet) {
    const addrs = [];
    const persistedAddresses = await this.find({});
    persistedAddresses.forEach(addr => {
      const address = this.mapToAddressObj(addr, wallet);
      addrs.push(address);
    });

    return addrs;
  },
  mapToAddressObj: function(addr, wallet) {
    const idx = parseInt(addr.idx);
    const keyPair = wallet.getKeyPairFromAddressIndex(idx);
    const address = new addresses.Address(keyPair, idx);
    address.setBalance(new bigdecimal.BigDecimal(`${addr.balance}`));
    address.setPreBalance(new bigdecimal.BigDecimal(`${addr.prebalance}`));
    return address;
  },
  syncAddresses: async function(addresses, wallet) {
    const updatedBalances = [];
    for(const address of addresses) {
      const addressHex = address.getAddressHex();
      const existingAddress = await this.findOne({addressHex:addressHex});
      if(!existingAddress) {
        const [errCreate] = await to(this.create({
          addressHex:addressHex,
          idx:address.index.toString(),
          balance: address.getBalance().toPlainString(),
          prebalance:address.getPreBalance().toPlainString(),
          nonce:crypto.randomBytes(12).toString('hex'),
          notificationState: NotificationState.Pending}));

        // if(errCreate) {
        //   sails.log.error(`Error persisting address:${addressHex} - ${util.inspect(errCreate)}`);
        //   continue;
        // }

        sails.log.info(`Inserted a new address:${addressHex}`);
        updatedBalances.push(address);
        continue;
      }

      const addressObj = this.mapToAddressObj(existingAddress, wallet);
      if(addressObj.getBalance().compareTo(address.getBalance()) !== 0 || addressObj.getPreBalance().compareTo(address.getPreBalance()) !== 0) {
        const [err] = await to(this.update({addressHex:addressHex},{balance: address.getBalance().toPlainString(), prebalance: address.getPreBalance().toPlainString()}));
        if(err) sails.log.error(err);

        sails.log.info(`Updated balances of address:${addressHex}`);
        updatedBalances.push(address);
      }
    }

    return updatedBalances;
  }
};



