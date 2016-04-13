var spawn     = require('child_process').spawn;
var path      = require('path')
var fs        = require('fs-extra')
var split     = require('split')
var through2  = require('through2')
var listSP    = require('./initctl-list-sp.js')
var spLSBish  = require('@mh-cbon/sp-lsbish')

function SimpleUpstartApi () {

  var confDir = '/etc/init/' // http://upstart.ubuntu.com/cookbook/#system-job
  this.setConfDir = function (d) {
    confDir = d
  }

  this.list = function (opts, then) {

    var results = {};

    var c = spawn('initctl', ['list'])

    c.stdout
    .pipe(split())
    .pipe(listSP())
    .pipe(through2.obj(function (chunk, enc, cb) {
      var id = chunk.instance ? chunk.id + '@' + chunk.instance : chunk.id;
      results[id] = chunk;
      fs.access(path.join(confDir, chunk.id + '.conf'), function (err) {
        chunk.user = !!err;
        cb(null, chunk);
      })
    }, function (cb) {
      if (then) then(null, results)
    }).resume())

    c.on('error', function (err) {
      then(err);
      then = null;
    })
  }


  this.describe = function (service, opts, then) {
    if (service.match(/@/)) service = service.match(/^([^@]+)/)[1]

    var fPath = path.join(confDir, service + '.conf')
    if (opts.user) fPath = path.join(process.env['HOME'], '.init', service + '.conf')

    fs.readFile(fPath, function (err, content) {
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
      then(code>0 ? (stderr||stdout) : null)
    })
    child.on('error', then)
  }
  this.start = function (serviceId, opts, then) {
    var c;
    if (opts.user) c = spawn('initctl', ['start', serviceId])
    else c = spawn('service', [serviceId, 'start'])
    return runSystemControls(c, then)
  }
  this.stop = function (serviceId, opts, then) {
    var c;
    if (opts.user) c = spawn('initctl', ['stop', serviceId])
    else c = spawn('service', [serviceId, 'stop'])
    return runSystemControls(c, then)
  }
  this.restart = function (serviceId, opts, then) {
    var c;
    if (opts.user) c = spawn('initctl', ['restart', serviceId])
    else c = spawn('service', [serviceId, 'restart'])
    return runSystemControls(c, then)
  }
  this.reload = function (serviceId, opts, then) {
    var verb = opts.force ? 'force-reload' : 'reload';
    var c;
    if (opts.user) c = spawn('initctl', [verb, serviceId])
    else c = spawn('service', [serviceId, verb])
    return runSystemControls(c, then)
  }
  this.reloadConfiguration = function (opts, then) {
    return runSystemControls(
      spawn('initctl', ['reload-configuration']),
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

  this.install = function (opts, then) {
    var content = generateScriptContent(opts.stanzas || [], opts.comments || opts.id + " - no description provided")

    var dir = confDir;
    if (opts.user) dir = path.join(process.env['HOME'], '.init');

    fs.mkdirs(dir, function (err) {
      if (err) return then(err)
      var fPath = path.join(dir, opts.id + '.conf')
    fs.writeFile(fPath, content, then)
    })
  }

  this.uninstall = function (opts, then) {
    var fPath = path.join(confDir, opts.id + '.conf')
    if (opts.user) fPath = path.join(process.env['HOME'], '.init', opts.id + '.conf');

    fs.unlink(fPath, then)
  }


}

module.exports = SimpleUpstartApi;
