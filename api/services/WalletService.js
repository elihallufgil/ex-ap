const to = require('await-to-js').default;
const util = require('util');
const {walletEncryption, webSocketService, walletUtils  } = require('coti-encryption-library');
const { SEED } = process.env;

let Wallet;
let isMonitoringInitialized = false;

module.exports = {
  init: async function() {

    Wallet = new walletEncryption({ seed:SEED });

    await WalletValidator.validate(Wallet);
    await this.loadWallet(); // Populate Wallet with data from db
    await this.monitorWallet();
  },
  loadWallet: async function() {
    try {
      const persistedAddresses = await Addresses.getAllAddresses(Wallet);

      Wallet.loadAddresses(persistedAddresses);
      sails.log.info(`Loaded ${persistedAddresses.length} Addresses...`);

      const persistedTransactions = await Address_transactions.getAllTransactions();
      Wallet.loadTransactionHistory(persistedTransactions);
      sails.log.info(`Loaded ${persistedTransactions.length} Transactions...`);
    } catch(error) {
      sails.log.error(error.message);
      WalletValidator.shutDown();
    }

  },
  monitorWallet: async function() {
    
    Wallet.enableEventPublishing();

    Wallet.onGenerateAddress = data => {
      console.log('onGenerateAddress: ', data);
    };

    Wallet.onReceivedTransaction = async transaction => {
      console.log('onReceivedTransaction: ', transaction.hash);

      const updatedTransactions = await Address_transactions.syncTransactions([transaction], Wallet);
      if(updatedTransactions.length) {
        await NotificationService.notifyTransactions(updatedTransactions);
      }
    };

    Wallet.onBalanceChange = async address => {
      console.log('onBalanceChange: ', address.getAddressHex());

      const updatedBalances = await Addresses.syncAddresses([address], Wallet);
      if(updatedBalances.length) {
        await NotificationService.notifyBalanceUpdates(updatedBalances);
      }
    };

    Wallet.onInitDone = async wallet => {
      console.log('onInitDone: ', wallet);
    };

    try {
      await Wallet.autoDiscoverAddressesForSeed();
      if (Wallet.getWalletAddresses().size != 0) {
          await Wallet.getTransactionHistoryForWallet();
      }
      webSocketService.initSocketConnection(Wallet, this.onMonitoringInitialized);
    } catch(error) {
      sails.log.error(error.message);
      WalletValidator.shutDown();
    }
  },
  onMonitoringInitialized: function() {
    sails.log.info(`Wallet monitoring is initialized`);
    isMonitoringInitialized = true;
  },
  getAddresses: async function() {
    const addresses = Wallet.getWalletAddresses();
    return {addresses: [...addresses.keys()]};
  },
  getTotalBalance: async function() {
    try {
      const totalBalance = Wallet.getTotalBalance();
      return formattedBalance(totalBalance);
    } catch(err) {
      return ErrorHandler.server(`Error getting total balance:${util.inspect(err)}`);
    }
  },
  generateNewAddress: async function(nonce) {
    return AddressGenerator.generateAddress(Wallet, nonce);
  },
  sendTransaction: async function(transaction) {
    const [err,resp] = await to(TransactionSender.send(Wallet, transaction));
    if(err) return ErrorHandler.server(`Error occured during sending transaction: ${util.inspect(err)}}`);

    return { ...resp, transactionStatus: 'Pending' };

  },
  getTransactionStatus: async function(transactionHash) {
    const [err,txs] = await to(Address_transactions.find({hash:transactionHash}));
    if(!txs.length) return ErrorHandler.client(`Invalid transactionHash:${transactionHash}`);
    if(err) return ErrorHandler.server(`Error occured getting transaction status: ${util.inspect(err)}}`);

    const tx = txs[0];
    return { transactionHash: tx.hash, transactionStatus: tx.status ? 'Confirmed' : 'Pending' };
  },
  getAddressBalance: async function(addressHex) {
    const address = Wallet.getWalletAddresses().get(addressHex);
    if(!address) {
      return ErrorHandler.client(`Invalid addressHex:${addressHex}`);
    }
    if(!address.getBalance() || !address.getPreBalance()) {
      sails.log.error(`Error - Address with undefined balance:${address.getAddressHex()}`);
      return { balance: '0', prebalance: '0'};
    }

    return formattedBalance({balance: address.getBalance(), prebalance: address.getPreBalance()});
  },
  getAddressTransactions: async function(addressHex) {
    const [err,txs] = await to(Address_transactions.find({addressHex:addressHex}));
    if(err) return ErrorHandler.server(`Error getting address transaction:${util.inspect(err)}`);

    const transactions = txs.map(toTransactionData);

    return { addressHex: addressHex, transactions: transactions };
  },
  getTransactions: async function(filter) {
    const filterConditions = {};
    if(!filter) filter = {};
    const { updatedRecentSeconds } = filter;

    if(updatedRecentSeconds) {
      const now = new Date();
      const lastUpdatedAt = new Date(now - updatedRecentSeconds*1000);
      filterConditions.updatedAt = {'>=': lastUpdatedAt};
    }

    const transactions = await Address_transactions.find(filterConditions);
    const transactionsResp = transactions.map(toTransactionData);

    return transactionsResp;
  },
  checkAddressesExists: async function(addressHexes) {
    const [err,resp] = await to(walletUtils.checkAddressExists(addressHexes));
    if(err) return Promise.reject(err);
    return resp;
  },
  waitForMonitoringInitialization() {
    return new Promise(((resolve, reject) => {
      (function waitForMonitoring(){
        if (isMonitoringInitialized) return resolve();
        setTimeout(waitForMonitoring, 3);
      })();
    }));
  }
};

function toTransactionData(tx) {
  return {
    addressHex: tx.addressHex,
    hash:tx.hash,
    amount:tx.amount.replace('-',''),
    type: tx.amount < 0 ? 'Sent' : 'Received',
    transactionStatus: tx.status ? 'Confirmed' : 'Pending'
  };
}

function formattedBalance({balance, prebalance}) {
  return {
    balance: ToolsService.removeZerosFromEndOfNumber(balance.toPlainString()),
    prebalance: ToolsService.removeZerosFromEndOfNumber(prebalance.toPlainString())
  };
}