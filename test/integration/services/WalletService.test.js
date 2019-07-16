const util = require('util');
const assert = require('assert');
const to = require('await-to-js').default;
const BigDecimal = require('bigdecimal').BigDecimal;
const supertest = require('supertest');
const TransactionType = require('../../../api/enums/TransactionType');
const SENT_AMOUNT = 10;

let firstAddress;
let secondAddress;
let generatedAddress;
let webSocketService;
let agent;
let recentTransactionHash;

describe('WalletService.test', function() {

  this.timeout(665000);

  before(async () => {
    agent = supertest.agent(sails.hooks.http.app);
  });

  it('Verifies monitoring is initialized', async () => {
    await WalletService.waitForMonitoringInitialization();

    sails.log.info('Verified monitoring is running');

    webSocketService = require('coti-encryption-library').webSocketService;

  });

  it('Generates a new address', async () => {

    await ToolsService.delay(2000);
    sails.log.info(`Generating a new address`);
    
    const resp = await WalletService.generateNewAddress();
    const { status, index } = resp;

    generatedAddress = await Addresses.findOne({addressHex:resp.addressHex});
    sails.log.info(`generatedAddress:`, generatedAddress);

    await ToolsService.delay(500);

    assert.equal(status,'Success');
  });

  it('Check subscriptions', async () => {

    await ToolsService.delay(2000);
    const walletValidation = await WalletValidator.validateSubscriptions(webSocketService);
    assert(walletValidation);
  });

  it('Finds a balance in the first address (required for the next tests)', async () => {
    firstAddress = await Addresses.findOne({idx:0});
    const firstAddressBalance = parseFloat(firstAddress.balance);
    sails.log.info(`Found balance of:${firstAddressBalance}`);
    assert(firstAddressBalance > 10);

  });

  it('Gets the first address balance from state and verifies it matches db', async () => {
    const { balance } = await WalletService.getAddressBalance(firstAddress.addressHex);
    assert(balance === firstAddress.balance);
  });

  it('Send a transaction', async () => {

    sails.log.info(`Sending a transaction`);

    secondAddress = await Addresses.findOne({idx:1});

    const transaction = { 
      sourceAddresses:[{ addressHex: firstAddress.addressHex, amount: SENT_AMOUNT }],
      feeAddressHex: firstAddress.addressHex,
      destinationAddressHex: secondAddress.addressHex,
      description:'dev'};

    await sendTransaction(transaction);

  });

  it('verifies the balance and prebalance were updated', async () => {

    await ToolsService.delay(5000);

    await comparePreBalance(firstAddress, secondAddress);

  });

  it('Sends another transaction to the newly generated address', async () => {

    // Pull the first address again (refresh from db)
    firstAddress = await Addresses.findOne({idx:0});

    const transaction = {
      sourceAddresses:[{ addressHex: firstAddress.addressHex, amount: SENT_AMOUNT }],
      feeAddressHex: firstAddress.addressHex,
      destinationAddressHex: generatedAddress.addressHex,
      description:'dev'};

    await sendTransaction(transaction);

    await ToolsService.delay(5000);
    await comparePreBalance(firstAddress, generatedAddress);
  });

  it('Gets the recent transactions and verifies the recently sent transaction is reflected correctly', async () => {
    const transactions = await WalletService.getTransactions(1120);
    assert(transactions.length);
  });

  it('Issues a call to the controller and checks an address is valid ', done => {

    const exchangeAppApiKey = process.env.API_KEY;

    const address = { address:firstAddress.addressHex};
    agent.post('/address/valid')
        .send(address)
        .set({ 'x-api-key': exchangeAppApiKey, Accept: 'application/json' })
        .expect(200)
        .end((err, res) => {
          if(err) sails.log.error(err);
          assert(!err);
          sails.log.info(res.body);
          const isValid = res.body.isValid;
          assert(isValid);
          done();
        });

  });

  afterEach(() => {
    logSeperator();
  });

  after(async () => {    
    webSocketService.closeSocketConnection();

  });
});

async function comparePreBalance(sender, receiver) {
  const senderAddressPreBalance = sender.prebalance;
  const receiverAddressPreBalance = receiver.prebalance;

  const { prebalance: newPreBalanceSender } = await WalletService.getAddressBalance(sender.addressHex);
  const { prebalance: newPreBalanceReceiver } = await WalletService.getAddressBalance(receiver.addressHex);


  sails.log.info(`senderAddressPreBalance:${senderAddressPreBalance} newPreBalanceSender:${newPreBalanceSender}`);
  sails.log.info(`receiverAddressPreBalance:${receiverAddressPreBalance} newPreBalanceReceiver:${newPreBalanceReceiver}`);

  const previousWithSent = new BigDecimal(receiverAddressPreBalance).add(new BigDecimal(SENT_AMOUNT));
  assert(previousWithSent.compareTo(new BigDecimal(newPreBalanceReceiver)) === 0);

  const txs = await Address_transactions.find({hash:recentTransactionHash, type: TransactionType.Sent});
  const tx = txs[0];
  
  //assert(new BigDecimal(senderAddressPreBalance).add(new BigDecimal(tx.amount)).compareTo(new BigDecimal(newPreBalanceSender)) === 0);
};

async function sendTransaction(transaction) {

  const [err,resp] = await to(WalletService.sendTransaction(transaction));
  if(err) {
    sails.log.error(err);
    assert(false);
  }

  console.log(resp);
  recentTransactionHash = resp.transactionHash;
};

function logSeperator() {
  sails.log.info(`-------------------------------------------------------------------------\n`);
};
