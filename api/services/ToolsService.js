const MAX_DECIMALS = sails.config.globals.maxDecimals;

module.exports = {
  dateDiffInHours: function (date1, date2){
    var hours = Math.abs(date1 - date2) / 36e5;
    return hours;
  },
  groupBy: function(obj, key) {
    return obj.reduce((grouped, x) => {
      (grouped[x[key]] = grouped[x[key]] || []).push(x);
      return grouped;
    }, {});
  },
  removeZerosFromEndOfNumber(number)
  {
    if(number.includes('.')){
      while (number.charAt(number.length -1) === '0')
      {
        number = number.substring(0,number.length -1);
      }

      if (number.charAt(number.length -1) === '.')
        number = number.substring(0,number.length -1);
    }
    return number;
  },
  delay: function(ms) {
    return new Promise(res => setTimeout(res, ms));
  },
  isHex: function(str) {
    const regexp = /^[0-9a-fA-F]+$/;
    return (regexp.test(str));
  },
  countDecimals: function (value) {
    if(value.toString().indexOf('.') === -1) {
      return 0;
    }

    return value.toString().split('.')[1].length || 0;
  },
  toMaxDecimals: function(value) {
    var re = new RegExp('^-?\\d+(?:\.\\d{0,' + (MAX_DECIMALS || -1) + '})?');
    return value.toString().match(re)[0];

  }
};
