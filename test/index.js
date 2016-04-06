var should = require('should');
var fs = require('fs');
var UpstartSimpleApi = require('../index.js');

describe('systemd-simple-api', function() {
  it('lists services', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.list({}, function (err, list) {
      Object.keys(list).length.should.eql(105);
      list['network-interface-container'].should.eql({
        id: 'network-interface-container',
        instance: null,
        user: false,
        goal: 'stop',
        status: 'waiting',
        pid: null,
        subs: []
      });
      done();
    })
  });

  it('describes a service from a description field', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.describe('udev-fallback-graphics', {}, function (err, info) {
      info.should.eql({
        author: null,
        description: 'load fallback graphics devices',
        version: null
      })
      done();
    })
  });

  it('describes a service using its comments', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.describe('mountnfs-bootclean.sh', {}, function (err, info) {
      info.should.eql({
        author: null,
        description: 'compatibility job for sysvinit dependencies',
        version: null
      })
      done();
    })
  });

  it('describes a service with an author field', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.describe('failsafe', {}, function (err, info) {
      info.should.eql({
        author: "Clint Byrum <clint@ubuntu.com>",
        description: 'Failsafe Boot Delay',
        version: null
      })
      done();
    })
  });


  it('starts a well known service', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.start('puppet', {}, function (err) {
      (err===null).should.be.true;
      done();
    })
  });

  it('restarts a well known service', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.restart('puppet', {}, function (err) {
      (err===null).should.be.true;
      done();
    })
  });

  it('reloads a well known service', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.reload('puppet', {}, function (err) {
      (err===null).should.be.true;
      done();
    })
  });

  it('force-reloads a well known service', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.reload('puppet', {force: true}, function (err) {
      (err===null).should.be.true;
      done();
    })
  });

  it('stops a well known service', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.stop('puppet', {}, function (err) {
      (err===null).should.be.true;
      done();
    })
  });

  it('fails to start an unknown service', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.stop('bs', {}, function (err) {
      (err===null).should.be.false;
      done();
    })
  });

  it('installs a service file', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.install({id: 'bs', user: true}, function (err) {
      (err===null).should.be.true;
      fs.access(process.env['HOME'] + '/.init/bs.conf', fs.R_OK, function (err) {
        (err===null).should.be.true;
        done();
      });
    })
  });

  it('uninstalls a service file', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.uninstall({id: 'bs', user: true}, function (err) {
      (err===null).should.be.true;
      fs.access(process.env['HOME'] + '/.init/bs.conf', fs.R_OK, function (err) {
        (err===null).should.be.false;
        done();
      });
    })
  });

});
