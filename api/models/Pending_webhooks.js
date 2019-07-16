module.exports = {

  primaryKey:'id',
  attributes: {
    id: {
      type: 'number',
      autoIncrement: true
    },
    data: {
      type: 'string',
      required: true
    },
    hookType: {
      type: 'number'
    },
    successful: {
      type: 'boolean'
    }
  }
};
