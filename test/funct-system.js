var should = require('should');
var fs = require('fs');
var UpstartSimpleApi = require('../index.js');

describe('upstart-simple-api system', function() {
  var usapi = new UpstartSimpleApi();

  if('yasudo' in process.env) usapi.enableElevation('');

  this.timeout(10000);

  it('should not list the fake service', function(done) {
    usapi.list({}, function (err, list) {
      err && console.log(err);
      ('fake' in list).should.eql(false);
      done();
    })
  });

  it('should install the fake service', function(done) {
    var service = {
      id: 'fake',
      stanzas: [
        {
          name: 'author',
          value: 'whatever'
        },
        {
          name: 'exec',
          value: '/bin/sh -c "' + process.argv[0] + ' /vagrant/utils/fake-service.js"'
        }
      ]
    }
    usapi.install(service, done)
  });

  it('should reload the configuration', function(done) {
    usapi.reloadConfiguration({}, function (err) {
      setTimeout(function(){
        done(err);
      }, 500);
    })
  });

  it('should start the fake service', function(done) {
    usapi.start('fake', {}, function (err) {
      setTimeout(function(){
        done(err);
      }, 500); // this is needed for the system to load and start the program.
    })
  });

  it('should list the fake service', function(done) {
    usapi.list({}, function (err, list) {
      err && console.log(err);
      ('fake' in list).should.eql(true);
      list['fake'].id.should.eql('fake');
      done();
    })
  });

  it('should be able to consume the service', function(done) {
    var net = require('net');
    var client = net.connect({port: 8080});
    var d;
    client.on('data', (data) => {
      d = data.toString()
    });
    client.on('end', () => {
      d.should.match(/goodbye/)
      done();
    });
    client.on('error', done);
  });

  it('should stop the fake service', function(done) {
    usapi.stop('fake', {}, done)
  });

  it('should uninstall the fake service', function(done) {
    usapi.uninstall({id: 'fake'}, done)
  });

  it('should reload the configuration', function(done) {
    usapi.reloadConfiguration({}, done)
  });


});
