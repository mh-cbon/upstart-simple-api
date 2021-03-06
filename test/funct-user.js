var should = require('should');
var fs = require('fs');
var UpstartSimpleApi = require('../index.js');

describe.skip('upstart-simple-api userland', function() {
  var usapi = new UpstartSimpleApi();

  it('should not list the fake service', function(done) {
    usapi.list({}, function (err, list) {
      ('fake' in list).should.eql(false);
      done();
    })
  });

  it('should install the fake service', function(done) {
    var service = {
      user: true,
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

  it('should start the fake service', function(done) {
    usapi.start('fake', {user: true}, function (err) {
      setTimeout(function(){
        done(err);
      }, 500); // this is needed for the system to load and start the program.
    })
  });

  it('should list the fake service', function(done) {
    usapi.list({}, function (err, list) {
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
    usapi.stop('fake', {user: true}, done)
  });

  it('should uninstall the fake service', function(done) {
    usapi.uninstall({id: 'fake', user: true}, done)
  });

});
