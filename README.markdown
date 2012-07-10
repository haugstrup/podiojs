# Podio API Client Library for nodejs
This is a thin wrapper around the [Podio API](https://developers.podio.com/) for nodejs. It handles authentication and maintains access/refresh tokens for you. It is also my first nodejs project so comments and pull requests are welcome.

# Usage

    // Initialize and specify client id and secret
    var podio = new Podio();
    podio.client.client_id = 'CLIENT_ID';
    podio.client.client_secret = 'CLIENT_SECRET';

    podio.on('error', function(request, response, body) {
      console.log('There was a problem with a request to ' + request.path+'. Error was "'+body.error_description+'" ('+body.error+')');
    });

    podio.on('rateLimitError', function(request, response, body) {
      console.log('You hit the rate limit');
    });

    podio.authenticate('password', {'username': 'USERNAME', 'password': 'PASSWORD'}, function(response, body){
      podio.get('/user/status', {}, function(response, body){
        console.log(body);
      });
    });

# Install

  	npm install git://github.com/haugstrup/podiojs.git#v0.1.0

# Methods

  	podio.authenticate(grant_type, attributes, [callback])
  	podio.request(method, url, attributes, [options], [callback])
  	podio.get(url, attributes, [options], [callback])
  	podio.post(url, attributes, [options], [callback])
  	podio.put(url, attributes, [options], [callback])

Callback receives two arguments: `response` (ClientResponse object) and `body` (JSON object of the HTTP body)

# TODO

* Handle gzip/deflate
