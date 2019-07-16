module.exports = {
  Pending: 0,
  Confirmed: 1,

  ofTransaction: t => t.transactionConsensusUpdateTime ? 1 : 0
};
