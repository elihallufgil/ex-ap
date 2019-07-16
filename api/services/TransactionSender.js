const axios = require('axios');
const util = require('util');
const FULL_NODE_URL = process.env.FULL_NODE_URL;
const bigdecimal = require('bigdecimal');
const {walletEncryption, walletUtils, BaseTransaction, Transaction, addresses } = require('coti-encryption-library');

module.exports = {

  send: async (wallet, transaction) => {

    const userHash = wallet.generateUserPublicHash();

    try {

      const { feeAddressHex, destinationAddressHex, description } = transaction; //TODO: Handle edge case when no addresses exist in the wallet
      const feeAddress = feeAddressHex ? wallet.walletAddressesList.get(feeAddressHex) : wallet.walletAddressesList.values().next().value;

      if(!feeAddress) {
        return ErrorHandler.client(`Error sending transaction - cannot find fee address in wallet ${feeAddress}`);
      }

      const sourceAddresses = [];
      for(const addr of transaction.sourceAddresses) {
        const address = wallet.walletAddressesList.get(addr.addressHex);
        if(!address) return ErrorHandler.client(`Error sending transaction - Invalid source address ${addr.addressHex}`);
        sourceAddresses.push({address: address, amount: new bigdecimal.BigDecimal(addr.amount.toString()) });
      }

      let baseTransactions = [];
      let totalAmount = new bigdecimal.BigDecimal('0');
      for(let sourceAddress of sourceAddresses) {
        var { address, amount } = sourceAddress;
        if(amount.scale() > 0 ) {
          amount = amount.stripTrailingZeros();
        }
        let addressAmount = address.getPreBalance().compareTo(address.getBalance()) < 0 ? address.getPreBalance() : address.getBalance();
        if(addressAmount.compareTo(amount) < 0) {
          return ErrorHandler.client(`Error sending transaction -  Not enough balance in address: ${address.getAddressHex()}`);
        }

        let spendFromAddress = amount.multiply(new bigdecimal.BigDecimal('-1'));
        totalAmount = totalAmount.add(amount);
        const bxTransaction = new BaseTransaction(address, spendFromAddress.toPlainString() ,'IBT');
        baseTransactions.push(bxTransaction);
      }

      if(totalAmount.scale() > 0 ) {
        totalAmount = totalAmount.stripTrailingZeros();
      }

      const fullNodeFee = await walletUtils.getFullNodeFees(wallet, totalAmount.toPlainString());
      const networkFee = await walletUtils.getNetworkFees(fullNodeFee, userHash);

      // Add fees to base transactions
      const transactionToAddFees = baseTransactions.find(t => t.addressHash === feeAddressHex);
      const fees = new bigdecimal.BigDecimal(fullNodeFee.amount.toString()).add(new bigdecimal.BigDecimal(networkFee.amount.toString())).multiply(new bigdecimal.BigDecimal('-1'));
      if(transactionToAddFees) {
        const index = baseTransactions.indexOf(transactionToAddFees);
        baseTransactions.splice(index, 1);
        baseTransactions.push(new BaseTransaction(wallet.walletAddressesList.get(transactionToAddFees.addressHash), new bigdecimal.BigDecimal(transactionToAddFees.amount.toString()).add(fees).toPlainString(), 'IBT'));
      } else {
        baseTransactions.push(new BaseTransaction(feeAddress, fees.toPlainString(), 'IBT'));
      }

      const { fullNodeFee: fullNodeFeeData, networkFee: networkFeeData } = await walletUtils.createMiniConsensus({userHash, fullNodeFee, networkFee });
      //const amountRBB = totalAmount.subtract(new bigdecimal.BigDecimal(fullNodeFeeData.amount)).subtract(new bigdecimal.BigDecimal(networkFeeData.amount)).toString();
      const amountRBT = totalAmount.toPlainString();

      const RBT = new BaseTransaction(new addresses.BaseAddress(destinationAddressHex), amountRBT, 'RBT', null, null, amountRBT);
      const fullNodeTransactionFee = BaseTransaction.getBaseTransactionFromFeeObject(fullNodeFeeData);
      const transactionNetworkFee = BaseTransaction.getBaseTransactionFromFeeObject(networkFeeData);

      baseTransactions.push(fullNodeTransactionFee);
      baseTransactions.push(transactionNetworkFee);
      baseTransactions.push(RBT);

      let transactionToSend =  new Transaction(baseTransactions, description, userHash);

      const transactionTrustScoreData = await walletUtils.getTrustScoreFromTsNode({Wallet: wallet, userHash, transaction:transactionToSend});
      transactionToSend.addTrustScoreMessageToTransaction(transactionTrustScoreData);
      transactionToSend.signTransaction(wallet);

      console.log(`Sending transaction: ${util.inspect(transactionToSend, {breakLength: Infinity})}...`);

      const options = {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json','cache-control': 'no-cache' },
        data: JSON.stringify(transactionToSend),
        url: `${FULL_NODE_URL}/transaction`,
      };

      const { data} = await axios(options);
      sails.log.info(`Successfully sent transaction with hash:${transactionToSend.hash}`);

      return {status: data.status, transactionHash: transactionToSend.hash };
    } catch (error) {
      console.log('Error sending transaction - ', error);
      return Promise.reject(error);
    }
  },
};
