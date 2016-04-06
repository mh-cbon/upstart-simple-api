var should    = require('should');
var fs        = require('fs');
var path      = require('path')
var through2  = require('through2')
var listStreamParser = require('../initctl-list-sp.js');

describe('initctl-list-sp', function() {
  it('can parse initclt list output', function(done) {
    var k = fs.createReadStream(path.join(__dirname, '../fixtures/initctl-list-1.txt'))

    var results = []
    k
    .pipe(require('split')())
    .pipe(listStreamParser())
    .pipe(through2.obj(function(chunk, enc, cb) {
      results.push(chunk)
      cb()
    }))

    k.on('close', function () {
      results[0].should.eql({ id: 'mountnfs-bootclean.sh',
        instance: null,
        goal: 'start',
        status: 'running',
        pid: null,
        subs: []
      })
      results[1].should.eql({ id: 'rsyslog',
        instance: null,
        goal: 'start',
        status: 'running',
        pid: '944',
        subs: []
      })
      results[6].should.eql({ id: 'network-interface-security',
        instance: 'network-interface/eth1',
        goal: 'start',
        status: 'running',
        pid: null,
        subs: []
      })
      results[12].should.eql({ id: 'procps',
        instance: null,
        goal: 'stop',
        status: 'waiting',
        pid: null,
        subs: [ {pid: "1357", goal: 'post-start'}, {pid: "1222", goal: 'post-start'} ]
      })
      results[17].should.eql({ id: 'network-interface-container',
        instance: null,
        goal: 'stop',
        status: 'waiting',
        pid: null,
        subs: [ {pid: "1357", goal: 'post-start'}, {pid: "1222", goal: 'post-start'} ]
      })
      results.length.should.eql(18)
      done();
    })

  });

});
