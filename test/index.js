var should = require('should');
var fs = require('fs');
var UpstartSimpleApi = require('../index.js');

describe('upstart-simple-api', function() {
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

  it('stops a well known service', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.stop('cron', {}, function (err) {
      (err===null).should.eql(true);
      done();
    })
  });

  it('starts a well known service', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.start('cron', {}, function (err) {
      (err===null).should.eql(true);
      done();
    })
  });

  it('restarts a well known service', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.restart('cron', {}, function (err) {
      (err===null).should.eql(true);
      done();
    })
  });

  it('reloads a well known service', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.reload('cron', {}, function (err) {
      (err===null).should.eql(true);
      done();
    })
  });

  it('force-reloads a well known service', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.reload('cron', {force: true}, function (err) {
      (err===null).should.eql(true);
      done();
    })
  });

  it('fails to start an unknown service', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.stop('bs', {}, function (err) {
      (err===null).should.eql(false);
      done();
    })
  });

  it('installs a service file', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.install({id: 'bs', user: true}, function (err) {
      (err===null).should.eql(true);
      fs.access(process.env['HOME'] + '/.init/bs.conf', fs.R_OK, function (err) {
        (err===null).should.eql(true);
        done();
      });
    })
  });

  it('uninstalls a service file', function(done) {
    var usapi = new UpstartSimpleApi();
    usapi.uninstall({id: 'bs', user: true}, function (err) {
      (err===null).should.eql(true);
      fs.access(process.env['HOME'] + '/.init/bs.conf', fs.R_OK, function (err) {
        (err===null).should.eql(false);
        done();
      });
    })
  });

});
