# upstart-simple-api

Simple and limited api to interface with upstart.

# install

```sh
npm i @mh-cbon/upstart-simple-api --save
```

# usage

Beware,

- user jobs are not well tested because they cannot be initialized easily with a vagrant ubuntu box.
- `describe` method is quiet limited in regard of upstart script language, it is intended.


```js
var UpstartSimpleApi = require('@mh-cbon/upstart-simple-api');
var usapi = new UpstartSimpleApi(/* version */);

// initctl list
usapi.list(opts={}, function (err, items) {
  console.log(items);
})

// initctl show-config serviceId
sds.describe('serviceId', opts={}, function (err, info) {
  console.log(info);
})

// initctl start serviceId
sds.start('serviceId', opts={}, function (err) {
  console.log(err);
})

// initctl stop serviceId
sds.stop('serviceId', opts={}, function (err) {
  console.log(err);
})

// systemctl reload serviceId --user
sds.reload(opts={user: true}, function (err) {
  console.log(err);
})

// systemctl reload-configuration
sds.reloadconfiguration(opts={}, function (err) {
  console.log(err);
})
```

## Install a Service

```js
// per user
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
      value: '/bin/sh ...'
    }
  ]
}
usapi.install(service, done)

// system wide
var service = {
  user: !true,
  id: 'fake',
  stanzas: [
    {
      name: 'author',
      value: 'whatever'
    },
    {
      name: 'exec',
      value: '/bin/sh ...'
    }
  ]
}
usapi.install(service, done)


// later...
usapi.uninstall(service, done)
```


# read more

- http://askubuntu.com/questions/637305/how-do-i-control-an-upstart-session-job-over-ssh
- http://upstart.ubuntu.com/cookbook/#joining-a-session
- http://upstart.ubuntu.com/cookbook/#session-init
- http://upstart.ubuntu.com/wiki/Stanzas
- http://dev.deluge-torrent.org/wiki/UserGuide/Service/Upstart
- http://minecraft.gamepedia.com/Tutorials/Ubuntu_startup_script
- https://www.nginx.com/resources/wiki/start/topics/examples/ubuntuupstart/#
- https://www.exratione.com/2013/02/nodejs-and-forever-as-a-service-simple-upstart-and-init-scripts-for-ubuntu/
