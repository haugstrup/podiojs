var util = require('util');
var events = require('events');

function Podio() {
  this.https = require('https');
  this.stringify = require('querystring').stringify;

  this.client = {client_id: null, client_secret: null};
  this.oauth = {access_token: null, refresh_token: null};

}

util.inherits(Podio, events.EventEmitter);

Podio.prototype.authenticate = function(grant_type, attributes, callback) {
  var self = this;

  attributes['grant_type'] = grant_type;
  attributes['client_id'] = self.client.client_id;
  attributes['client_secret'] = self.client.client_secret;

  var req = self.request('POST', '/oauth/token', attributes, {isOauth: true}, function(response, body){
    self.oauth.access_token = body.access_token;
    self.oauth.refresh_token = body.refresh_token;
    if(!callback) return;
    callback(response, body);
  });
};

Podio.prototype.request = function(method, url, attributes, options, callback) {
  method = method.toUpperCase();
  callback = (typeof options == 'function') ? options : callback;
  options = options || {};
  var self = this;
  var originalUrl = url; // Used when retrying requests
  var http_body;
  var headers = {
    'User-Agent': 'Podio node.js Client/1.0',
    'Accept': 'application/json, application/x-www-form-urlencoded',
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': '0'
  };
  if (options.isOauth !== true) {
    headers['Authorization'] = 'OAuth2 '+self.oauth.access_token;
  }

  if (method === 'GET' || method === 'DELETE') {
    url = url + self.stringify(attributes);
  }
  else if (method === 'POST' || method === 'PUT') {
    if (options.isOauth === true) {
      http_body = self.stringify(attributes);
    }
    else {
      headers['Content-Type'] = 'application/json';
      http_body = JSON.stringify(attributes);
    }
    headers['Content-Length'] = http_body.length;
  }

  var http_options = {
    hostname: 'api.podio.com',
    post: 443,
    method: method,
    path: url,
    headers: headers
  };

  if(process.env.DEBUG) {
    console.log('Making request: ', http_options);
    if (options.isOauth !== true && http_body) {
      console.log('HTTP body: ', http_body);
    }
  }

  var apiRequest = self.https.request(http_options, function(response){
    var body = '';
    response.setEncoding('utf8');
    response.on('data', function(chunk){
      body += chunk;
    });

    response.on('end', function(){
      if (response.headers['content-type'].split(';')[0] === 'application/json') {
        body = JSON.parse(body);
      }

      switch(response.statusCode) {
        case 200:
        case 201:
        case 204:
          if(!callback) return;
          callback(response, body);
          break;
        case 401:
          // Attempt to refresh tokens
          if (body.error_description.indexOf('expired_token') !== -1 || body.error.indexOf('invalid_token') !== -1) {
            if (self.oauth.refresh_token) {
              self.authenticate('refresh_token', {'refresh_token': self.oauth.refresh_token}, function(response, body){
                self.request(method, originalUrl, attributes, options, callback);
              });
              return;
            }
          }
          self.emit('error', apiRequest, response, body);
          break;
        case 420:
          self.emit('rateLimitError', apiRequest, response, body);
          break;
        case 400:
        case 403:
        case 404:
        case 409:
        case 410:
        case 500:
        case 502:
        case 503:
        case 504:
          self.emit('error', apiRequest, response, body);
          break;
        default:
          self.emit('error', apiRequest, response, body);
          break;
      }
    });

  });

  apiRequest.on('error', function(err) {
    if(process.env.DEBUG) {
      console.log('Error on request: ' + err.toString());
    }
    self.emit('error', err);
  });

  if(http_body) {
    apiRequest.write(http_body, 'utf8');
  }
  apiRequest.end();
};

Podio.prototype.get = function(url, attributes, options, callback) {
  this.request('GET', url, attributes, options, callback);
};
Podio.prototype.post = function(url, attributes, options, callback) {
  this.request('POST', url, attributes, options, callback);
};
Podio.prototype.put = function(url, attributes, options, callback) {
  this.request('PUT', url, attributes, options, callback);
};

module.exports = new Podio();
