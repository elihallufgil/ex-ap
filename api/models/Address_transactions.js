const { BaseTransaction, addresses } = require('coti-encryption-library');
const TransactionStatus = require('../enums/TransactionStatus');
const TransactionType = require('../enums/TransactionType');
const NotificationState = require('../enums/NotificationState');
const bigdecimal = require('bigdecimal');

const to = require('await-to-js').default;
const util = require('util');

module.exports = {

  primaryKey:'id',
  attributes: {
    id: {
      type: 'number',
      autoIncrement: true
    },
    addressHex: {
      type: 'string',
      required: true
    },
    hash: {
      type: 'string',
      required: true
    },
    amount: {
      type: 'string',
      required: true,
    },
    type: {
      type: 'number',
      required: true
    },
    status: {
      type: 'number',
      required: true
    },
    notificationState: {
      type: 'number',
      required: true
    }
  },
  getAllTransactions: async function() {
    const persistedTxs = await this.find({});
    const txs = persistedTxs.map(tx => new BaseTransaction(new addresses.BaseAddress(tx.addressHex), tx.amount, tx.name));

    return txs;
  },
  syncTransactions: async function(transactions) {

    const updatedTransactions = [];
    for(const transaction of transactions) {
      const { hash } = transaction;
      const txStatus = TransactionStatus.ofTransaction(transaction);
      // Check if transaction is already known
      const existingTransactions = await this.find({hash:hash});
      if(! existingTransactions.length) {

        let txByHash = transaction.baseTransactions;
        const addressHexes = txByHash.map(t => t.addressHash);
        const walletAddresses = await Addresses.find({addressHex: addressHexes});
        txByHash = txByHash.filter( tx => walletAddresses.map(a => a.addressHex).includes(tx.addressHash));
        
        let txByAddress = new Map();
        for(const tx of txByHash) {
          const existingTx = txByAddress.get(tx.addressHash);
          if(existingTx) {
            existingTx.amount = new bigdecimal.BigDecimal(existingTx.amount).add(new bigdecimal.BigDecimal(tx.amount)).toPlainString();
          } else {
            txByAddress.set(tx.addressHash, tx);
          }
        }
        
        const txToPersist = [...txByAddress.values()].map(t => this.toPersistedTransaction(t, hash, txStatus));
        if(!txToPersist.length) continue;

        const [errCreate] = await to(this.createEach(txToPersist));
        if(errCreate) {
          sails.log.error(`Error persisting transactions:${util.inspect(txToPersist)} - ${util.inspect(errCreate)}`);
          continue;
        }

        sails.log.info(`Inserted new transactions:${util.inspect(txToPersist, {breakLength: Infinity})}`);
        updatedTransactions.push(transaction);
        continue;
      }

      //Check if transaction transaction status was updated
      for(const existingTx of existingTransactions) {
        if(txStatus !== existingTx.status) {
          await this.update({hash:transaction.hash},{status:txStatus, notificationState: NotificationState.Pending});
          sails.log.info(`Updated transaction status for transaction ${transaction.hash} to:${TransactionStatus.ofTransaction(transaction)}`);
          updatedTransactions.push(transaction);
        }
      }

    }

    return updatedTransactions;
  },
  toPersistedTransaction: function(transaction, hash, status) {
    const { amount, addressHash: addressHex } = transaction;
    const transactionData = {
      addressHex,
      hash,
      amount: ToolsService.toMaxDecimals(amount),
      type: amount > 0 ? TransactionType.Received : TransactionType.Sent,
      status: status,
      notificationState: NotificationState.Pending
    };

    return transactionData;
  }

};



