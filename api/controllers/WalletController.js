const httpConstants = sails.config.httpconstants;
const to = require('await-to-js').default;
const MAX_DECIMALS = sails.config.globals.maxDecimals;

module.exports = {
  getAddresses: async function(req,res) {
    const [err,resp] = await to(WalletService.getAddresses());
    if(err) return res.status(httpConstants.CODE_INTERNAL_ERROR).json(err.message);

    return res.ok({status:httpConstants.STATUS_SUCCESS, addresses: resp.addresses});
  },
  getTotalBalance: async function(req,res) {
    const [err,balance] = await to(WalletService.getTotalBalance());
    if(err) return res.status(httpConstants.CODE_INTERNAL_ERROR).json(err);

    return res.ok({status:httpConstants.STATUS_SUCCESS, ...balance});
  },
  generateNewAddress: async function(req,res) {
    const body = req.body ? req.body : {};
    const { nonce } = body;
    const [err,resp] = await to(WalletService.generateNewAddress(nonce));
    if(err) return res.status(httpConstants.CODE_INTERNAL_ERROR).json(err);
    return res.ok(resp);
  },
  sendTransaction: async function(req,res) {
    const { sourceAddresses, feeAddressHex, destinationAddressHex, description } = req.body;
    if(!sourceAddresses || !destinationAddressHex || !description) {
      return res.status(httpConstants.CODE_BAD_REQUEST).json({status:httpConstants.STATUS_ERROR,type:httpConstants.API_CLIENT_ERROR, errorMessage: httpConstants.ERROR_MISSING_PARAMETERS});
    }

    if(!Array.isArray(sourceAddresses)) {
      return res.status(httpConstants.CODE_BAD_REQUEST).json({status:httpConstants.STATUS_ERROR,type:httpConstants.API_CLIENT_ERROR, errorMessage: httpConstants.ERROR_INVALID_PARAMETERS});
    }

    //TODO: Validate address format
    const isWrongFormatSourceAddresses = sourceAddresses
      .filter(a => !a.addressHex || !a.amount || !ToolsService.isHex(a.addressHex) || ToolsService.countDecimals(a.amount) > MAX_DECIMALS).length;
    if(isWrongFormatSourceAddresses) {
      return res.status(httpConstants.CODE_BAD_REQUEST).json({status:httpConstants.STATUS_ERROR,type:httpConstants.API_CLIENT_ERROR, errorMessage: httpConstants.ERROR_INVALID_SOURCE_ADDRESS_INPUT_FORMAT});
    }

    const isWrongDestinationAddress = !ToolsService.isHex(destinationAddressHex);
    if(isWrongDestinationAddress) {
      return res.status(httpConstants.CODE_BAD_REQUEST).json({status:httpConstants.STATUS_ERROR,type:httpConstants.API_CLIENT_ERROR, errorMessage: httpConstants.ERROR_INVALID_DESTINATION_ADDRESS_INPUT_FORMAT});
    }

    const isWrongFeeAddress = !ToolsService.isHex(feeAddressHex);
    if(isWrongFeeAddress) {
      return res.status(httpConstants.CODE_BAD_REQUEST).json({status:httpConstants.STATUS_ERROR,type:httpConstants.API_CLIENT_ERROR, errorMessage: httpConstants.ERROR_INVALID_FEE_ADDRESS_INPUT_FORMAT});
    }

    const transaction = { sourceAddresses, feeAddressHex, destinationAddressHex, description };

    const [err,result] = await to(WalletService.sendTransaction(transaction));
    if(err) return res.status(err.code).json(err);

    return res.ok({status:httpConstants.STATUS_SUCCESS,...result});
  },
  getTransactionStatus: async function(req,res) {
    const { transactionHash } = req.body;
    const [err,status] = await to(WalletService.getTransactionStatus(transactionHash));
    if(err) return res.status(err.code).json(err);

    return res.ok({status:httpConstants.STATUS_SUCCESS, ...status});
  },
  getAddressBalance: async function(req,res) {
    const { addressHex } = req.body;
    const [err,balance] = await to(WalletService.getAddressBalance(addressHex));
    if(err) return res.status(err.code).json(err);

    return res.ok({status:httpConstants.STATUS_SUCCESS, balance: balance});
  },
  getAddressTransactions: async function(req,res) {
    const { addressHex } = req.body;
    if(!addressHex) {
      return res.status(httpConstants.CODE_BAD_REQUEST).json({status:httpConstants.STATUS_ERROR,type:httpConstants.API_CLIENT_ERROR, errorMessage: httpConstants.ERROR_MISSING_PARAMETERS});
    }
    const [err,transactions] = await to(WalletService.getAddressTransactions(addressHex));
    if(err) return res.status(httpConstants.CODE_INTERNAL_ERROR).json(err);

    return res.ok({status:httpConstants.STATUS_SUCCESS, ...transactions });
  },
  getTransactions: async function(req, res) {
    let { filter } = req.body;
    const [err,transactions] = await to(WalletService.getTransactions(filter));
    if(err) return res.status(httpConstants.CODE_INTERNAL_ERROR).json(err);

    return res.ok({status:httpConstants.STATUS_SUCCESS, transactions: transactions });
  },
  isAddressValid: async function(req, res) {
    let { address } = req.body;
    if(!address) {
      return res.status(httpConstants.CODE_BAD_REQUEST).json({status:httpConstants.STATUS_ERROR,type:httpConstants.API_CLIENT_ERROR, errorMessage: httpConstants.ERROR_MISSING_PARAMETERS});
    }

    if(address.length !== 136) {
      return res.ok({status:httpConstants.STATUS_SUCCESS, isValid: false, validationDetails: 'Invalid address: wrong format' });
    }

    const [err,resp] = await to(WalletService.checkAddressesExists([address]));
    if(err) return res.ok({status:httpConstants.STATUS_SUCCESS, isValid: false, validationDetails: 'Invalid address: rejected by full node' });

    const isValid = resp[address];
    return res.ok({status:httpConstants.STATUS_SUCCESS, isValid: resp[address], validationDetails: isValid ? 'Address found' : 'Invalid address: not found'});
  }
};
