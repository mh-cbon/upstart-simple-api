var through2  = require('through2')
/*
`innitctl list` has a quiet complicated format to parse, here is a stream parser.

job start/post-start, process 1234          # main process information
                  post-start process 1357   # possible sub processes
job (name) start/post-start, process 1234   # main process information with an instance name
                  post-start process 1357   # possible sub processes
*/
var listStreamParser = function () {
  var current;
  var found;
  var fnTransform = function (chunk, enc, cb) {
    chunk = chunk.toString();

    if (chunk.match(/^[^\s]+/)) { // it s main process
      // lets parse this
      // job (name) start/post-start, process 1234
      var name = chunk.match(/^([^\s]+)\s+/);
      if (name) {
        name = name[1]
        chunk = chunk.replace(/^[^\s]+\s+/, '')
      }
      var instance = chunk.match(/^\(([^\s]+)\)\s+/);
      if (instance) {
        instance = instance[1]
        chunk = chunk.replace(/^(\([^\s]+\)\s+)/, '')
      }
      var status = chunk.match(/^([^\s]+)/);
      if (status) {
        status = status[1].replace(/,$/, '')
        chunk = chunk.replace(/^[^\s]+/, '')
      }
      var pid = chunk.match(/^\s*process\s+([^\s]+)/);
      if (pid) {
        pid = pid[1]
      }

      if (current) {
        found = current;
        current = null;
      }

      current = {
        id:       name,
        instance: instance,
        goal:     status.match(/^([^/]+)/)[1],
        status:   status.match(/([^/]+)$/)[1],
        pid:      pid,
        subs:     []
      }

    } else if (chunk.match(/^[\s]+/)) { // it s a sub process
      if (!current) {
        this.emit('error', 'invalid parsing at \n' + chunk)
      } else {
        // lets parse this
        //                   post-start process 1357
        var sub = chunk.match(/\s+([^\s]+)\s+process\s+([^\s]+)/)
        if (!sub) {
          this.emit('error', 'invalid parsing at \n' + chunk)
        } else {
          current.subs.push({
            goal: sub[1],
            pid: sub[2]
          })
        }
      }
    } else if(chunk) {
      this.emit('error', 'invalid parsing at \n' + chunk)
    }

    cb(null, found);
    found = null;
  }
  var fnflush = function (cb) {
    if (current) this.push(current)
    cb();
  }
  return through2.obj(fnTransform, fnflush)
}

module.exports = listStreamParser;
