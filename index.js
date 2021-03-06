var spawn     = require('child_process').spawn;
var path      = require('path')
var fs        = require('fs-extra')
var sudoFs    = require('@mh-cbon/sudo-fs')
var yasudo    = require('@mh-cbon/c-yasudo')
var split     = require('split')
var pkg       = require('./package.json')
var debug     = require('debug')(pkg.name)
var through2  = require('through2')
var listSP    = require('./initctl-list-sp.js')
var spLSBish  = require('@mh-cbon/sp-lsbish')

function SimpleUpstartApi () {


  var elevationEnabled = false;
  var pwd = false;
  this.enableElevation = function (p) {
    if (p===false){
      elevationEnabled = false;
      pwd = false;
      return;
    }
    elevationEnabled = true;
    pwd = p;
  }

  var getFs = function () {
    return elevationEnabled ? sudoFs : fs;
  }

  var spawnAChild = function (bin, args, opts) {
    if (elevationEnabled) {
      debug('sudo %s %s', bin, args.join(' '))
      opts = opts || {};
      if (pwd) opts.password = pwd;
      return yasudo(bin, args, opts);
    }
    debug('%s %s', bin, args.join(' '))
    return spawn(bin, args, opts);
  }


  var confDir = '/etc/init/' // http://upstart.ubuntu.com/cookbook/#system-job
  this.setConfDir = function (d) {
    confDir = d
  }

  this.list = function (opts, then) {

    var results = {};

    var c = spawnAChild('initctl', ['list'])

    c.stdout
    .pipe(split())
    .pipe(listSP())
    .pipe(through2.obj(function (chunk, enc, cb) {
      var id = chunk.instance ? chunk.id + '@' + chunk.instance : chunk.id;
      results[id] = chunk;
      (getFs().access || getFs().exists)(path.join(confDir, chunk.id + '.conf'), function (err) {
        chunk.user = !!err;
        cb(null, chunk);
      })
    }, function (cb) {
      then && then(null, results);
      then = null;
      cb();
    }).resume())

    c.on('error', function (err) {
      err && debug('err %s', err)
      then && then(err);
      then = null;
    })
  }


  this.describe = function (service, opts, then) {
    if (service.match(/@/)) service = service.match(/^([^@]+)/)[1]; // not related to scoped pkg,
    // rather than to multiple isntance of same servce

    var fPath = path.join(confDir, service + '.conf')
    if (opts.user) fPath = path.join(process.env['HOME'], '.init', service + '.conf')

    getFs().readFile(fPath, function (err, content) {
      if (err) return then(err);

      content = content.toString();

      var description = content.match(/\s+description\s+"([^\n]+)"/)
      if (description) description = description[1]

      var author = content.match(/\s+author\s+"([^\n]+)"/)
      if (author) author = author[1]

      var version = content.match(/\s+version\s+"([^\n]+)"/)
      if (version) version = version[1]

      if (!description) {
        // got to parse front file comments..
        description = content.split(/\n/)[0].split(/\s-\s/)[1]; // hope there is no shebang...:x
      }

      then(null, {
        author: author,
        description: description,
        version: version
      })
    })
  }



  var runSystemControls = function (child, then) {
    var stdout = '';
    var stderr = '';
    child.stdout.on('data', function (d){stdout+=d.toString()})
    child.stderr.on('data', function (d){stderr+=d.toString()})
    child.on('close', function (code) {
      code!==0 && debug('code %s', code);
      stdout && debug('stdout %s', stdout);
      stderr && debug('stderr %s', stderr);
      then && then(code!==0 ? (stderr||stdout) : null);
    })
    then && child.on('error', then);
    return child;
  }
  this.start = function (serviceId, opts, then) {
    var c;
    if (opts.user) c = spawn('initctl', ['start', serviceId], {stdio: 'pipe'})
    else c = spawnAChild('initctl', ['start', serviceId], {stdio: 'pipe'})
    return runSystemControls(c, then)
  }
  this.stop = function (serviceId, opts, then) {
    var c;
    if (opts.user) c = spawn('initctl', ['stop', serviceId], {stdio: 'pipe'})
    else c = spawnAChild('initctl', ['stop', serviceId], {stdio: 'pipe'})
    return runSystemControls(c, then)
  }
  this.restart = function (serviceId, opts, then) {
    var c;
    if (opts.user) c = spawn('initctl', ['restart', serviceId], {stdio: 'pipe'})
    else c = spawnAChild('initctl', ['restart', serviceId], {stdio: 'pipe'})
    return runSystemControls(c, then)
  }
  this.reload = function (serviceId, opts, then) {
    var c;
    if (opts.user) c = spawn('initctl', ['reload', serviceId], {stdio: 'pipe'})
    else c = spawnAChild('initctl', ['reload', serviceId], {stdio: 'pipe'})
    return runSystemControls(c, then)
  }
  this.reloadConfiguration = function (opts, then) {
    return runSystemControls(
      spawnAChild('initctl', ['reload-configuration'], {stdio: 'pipe'}),
      then
    )
  }

  var generateScriptContent = function (stanzas, comments) {
    var content = '';

    stanzas.forEach(function (stanza) {
      if (stanza.name.match(/script|pre-start|post-start|pre-stop|post-stop/)) {
        if (stanza.name!=="script") content += stanza.name + " "
        content += "script\n"
        content += stanza.value + "\n"
        content += "end script\n"
      } else if (stanza.name.match(/description|author|version/)) {
        content += stanza.name + " \"" + stanza.value.replace(/"/g, "\"") + "\"\n"
      } else {
        content += stanza.name + " " + stanza.value + "\n"
      }
    })

    if (comments) {
      comments.split(/\n/).reverse().forEach(function(c) {
        content = "# " + c + "\n" + content;
      })
    }

    return content;
  }

  this.setupLogFile = function (logFile, username, groupname, then) {
    getFs().touch(logFile, function (err) {
      if (err) return then(err);
      getFs().chown(logFile, username, groupname, function (err) {
        if (err) return then(err);
        getFs().chmod(logFile, 0640, then)
      })
    })
  }

  this.install = function (opts, then) {
    var content = generateScriptContent(opts.stanzas || [], opts.comments || opts.id + " - no description provided")

    var dir = confDir;
    if (opts.user) dir = path.join(process.env['HOME'], '.init');

    debug('dir %s', dir);
    (getFs().mkdirs || getFs().mkdir)(dir, function (err) {
      if (err) return then(err)
      var fPath = path.join(dir, opts.id + '.conf');
      debug('fPath %s', fPath);
      getFs().writeFile(fPath, content, then)
    })
  }

  this.uninstall = function (opts, then) {
    var fPath = path.join(confDir, opts.id + '.conf');
    if (opts.user) fPath = path.join(process.env['HOME'], '.init', opts.id + '.conf');
    debug('fPath %s', fPath);
    getFs().unlink(fPath, then)
  }

  this.isDisabled = function (serviceId, opts, then) {
    if (serviceId.match(/@/)) serviceId = serviceId.match(/^([^@]+)/)[1]

    var fPath = path.join(confDir, serviceId + '.conf')
    if (opts.user) fPath = path.join(process.env['HOME'], '.init', serviceId + '.conf')

    getFs().exists(fPath, function (ex) {
      if(!ex) return then(new Error('file does not exists'));
      var isDisabled = false;
      getFs().createReadStream(fPath)
      .on('error', function (err) {
        then && then(err);
        then = null;
      })
      .pipe(split())
      .on('data', function (d) {
        if (d.toString().match(/^manual$/)) {
          isDisabled = true;
        }
      })
      .on('end', function () {
        then && then(null, isDisabled);
        then = null;
      })
    });
  }

  this.disable = function (serviceId, opts, then) {
    this.isDisabled(serviceId, opts, function (err, isDisabled) {
      if (err) return then(err);
      if (isDisabled) return then(null);

      if (serviceId.match(/@/)) serviceId = serviceId.match(/^([^@]+)/)[1]

      var fPath = path.join(confDir, serviceId + '.conf')
      if (opts.user) fPath = path.join(process.env['HOME'], '.init', serviceId + '.conf')

      var data = '';
      getFs().readFile(fPath, function (err, content) {
        if (err) return then(err);
        content += '\nmanual\n';
        getFs().createWriteStream(fPath)
        .on('error', function (err) {
          then && then(err);
          then = null;
        })
        .on('close', function () {
          then && then();
          then = null;
        })
        .end(content + '\nmanual\n');
      })
    })
  }

  this.enable = function (serviceId, opts, then) {
    this.isDisabled(serviceId, opts, function (err, isDisabled) {
      if (err) return then(err);
      if (!isDisabled) return then(null);

      if (serviceId.match(/@/)) serviceId = serviceId.match(/^([^@]+)/)[1]

      var fPath = path.join(confDir, serviceId + '.conf')
      if (opts.user) fPath = path.join(process.env['HOME'], '.init', serviceId + '.conf')

      var data = '';
      getFs().createReadStream(fPath)
      .pipe(split())
      .pipe(through2(function (chunk, enc, cb) {
        if (chunk.toString().match(/^manual$/)) {
          return cb()
        }
        data += chunk.toString() + '\n';
        cb(null, chunk + '\n')
      }))
      .on('end', function () {
        getFs().createWriteStream(fPath)
        .on('error', function (err) {
          then && then(err);
          then = null;
        })
        .on('close', function () {
          then && then();
          then = null;
        })
        .end(data);
      })
    })
  }
}

module.exports = SimpleUpstartApi;
