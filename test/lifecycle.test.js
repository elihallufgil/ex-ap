var sails = require('sails');
var rc = require('sails/accessible/rc');

// Before running any tests...
before(function(done) {

  // Increase the Mocha timeout so that Sails has enough time to lift, even if you have a bunch of assets.
  this.timeout(60000);

  sails.on('lower', () => { console.log('lowered sails');});
  sails.lift(rc('sails'), (err, sails) => {
    if (err) { return done(err); }

    sails.app = sails;
    // here you can load fixtures, etc.
    // (for example, you might want to create some records in the database)

    return done();
  });
});

// After all tests have finished...
after(function(done) {

  // here you can clear fixtures, etc.
  // (e.g. you might want to destroy the records you created above)

  sails.lower(done);

});