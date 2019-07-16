const to = require('await-to-js').default;
const util = require('util');
const HookType = require('../enums/HookType');
const axios = require('axios');
const balanceUpdateUrl = `${process.env.WEBHOOK_BALANCE_UPDATES}`;
const addressTransactionsUpdateUrl = `${process.env.WEBHOOK_TRANSACTIONS_UPDATES}`;
const notificationsEnabled = process.env.WEBHOOK_NOTIFICATIONS_ENABLED === 'true';
const MAX_RETRY_HOURS = process.env.MAX_RETRY_HOURS ? process.env.MAX_RETRY_HOURS : 48;


const sendWebhooks = async (hooks, url, isFirstAttempt = true) => {
  for(const hook of hooks) {
    const [err] = await to(axios.post(url, hook));
    if(err) {
      sails.log.error(`Invalid response when sending hook ${util.inspect(hook)} failed. Error:${err}`);
      if(isFirstAttempt) {
        const [errCreate] = await to(Pending_webhooks.create(hook));
        if(errCreate) sails.log.error(`Error creating webhook for hook:${hook} - ${util.inspect(errCreate)}`);
      }
      continue;
    }

    if(!isFirstAttempt) {
      const [errUpdateSucessful] = await to(Pending_webhooks.update({id:hook.id},{successful:true}));
      if(errUpdateSucessful) sails.log.error(`Error updating success for hook:${util.inspect(hook)} - ${util.inspect(errUpdateSucessful)}`);
    }

  }
};

const sendTransactionHooks = async (hooks, isFirstAttempt) => {
  if(!notificationsEnabled) return;
  sails.log.info(`sendTransactionHooks`);
  await sendWebhooks(hooks, addressTransactionsUpdateUrl, isFirstAttempt);
};
const sendBalanceUpdateHooks = async (hooks, isFirstAttempt) => {
  if(!notificationsEnabled) return;
  sails.log.info(`sendBalanceUpdateHooks`);
  await sendWebhooks(hooks, balanceUpdateUrl, isFirstAttempt);
};

const createTransactionHook = tx => {

  const { addressHex, hash, createTime, amount, status } = tx;
  const data = { addressHex: addressHex, transactions: [ {
    hash: hash, createTime: createTime, amount: amount, transactionStatus: status ? 'Confirmed' : 'Pending'
  }]};
  return { data:  JSON.stringify(data), hookType: HookType.TransactionUpdate };
};

const createBalanceUpdateHook = addr => {
  const data = {addressHex: addr.getAddressHex(), balance: addr.getBalance().toPlainString(), preBalance: addr.getPreBalance().toPlainString()};
  return { data: JSON.stringify(data), hookType: HookType.BalanceUpdate };
};

module.exports = {
  notifyTransactions: async function(transactions) {
    if(!notificationsEnabled) return;

    const hooks = transactions.map(tx => createTransactionHook(tx));
    sendTransactionHooks(hooks);
  },
  notifyBalanceUpdates: async function(addresses) {
    if(!notificationsEnabled) return;

    const hooks = addresses.map(addr => createBalanceUpdateHook(addr));
    sendBalanceUpdateHooks(hooks);
  },
  dispatchPendingWebhooks: async function() {
    sails.log.info(`Dispatching pending webhooks...`);

    const txWebhooks = await Pending_webhooks.find({successful:false, hookType: HookType.TransactionUpdate });
    if(txWebhooks.length) {
      sails.log.info(`Found ${txWebhooks.length} pending transaction hooks. Attempting to re-send...`);
      sendTransactionHooks(txWebhooks, false);
    }

    let balancesWebhooks = await Pending_webhooks.find({successful:false, hookType: HookType.BalanceUpdate });
    const now = new Date();
    try {
      balancesWebhooks = balancesWebhooks.filter(h => ToolsService.dateDiffInHours(now,new Date(h.createdAt)) < MAX_RETRY_HOURS);
    } catch (err) {
      sails.log.eror(err);
    }

    if(balancesWebhooks.length) {
      sails.log.info(`Found ${balancesWebhooks.length} pending balance update hooks. Attempting to re-send...`);
      sendBalanceUpdateHooks(balancesWebhooks.map(b => {return JSON.parse(b.data);}), false);
    }
  },
};
