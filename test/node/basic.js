var EventEmitter = require('events').EventEmitter;
var assert = require('better-assert');
var url = require('url');

var request = require('../../');

describe('[node] request', function(){

  describe('with an object', function(){
    it('should format the url', function(done){
      request
      .get(url.parse('http://localhost:5000/login'))
      .end(function(err, res){
        assert(res.ok);
        done();
      })
    })
  })

  describe('without a schema', function(){
    it('should default to http', function(done){
      request
      .get('localhost:5000/login')
      .end(function(err, res){
        assert(res.status == 200);
        done();
      })
    })
  })

  describe('req.toJSON()', function(){
    it('should describe the request', function(done){
      request
      .post(':5000/echo')
      .send({ foo: 'baz' })
      .end(function(err, res){
        var obj = res.request.toJSON();
        assert('POST' == obj.method);
        assert(':5000/echo' == obj.url);
        assert('baz' == obj.data.foo);
        done();
      });
    })
  })

  describe('req.parsed_url()', function(){
    it('should include path and query', function(done){
      request
      .get('http://localhost:5000/mypath?value1=1&value2=2')
      .query({value3: 3})
      .end(function(err, res){
        var parsed_url = res.request.parsed_url();
        // call twice to test idempotency
        parsed_url = res.request.parsed_url();
        assert(parsed_url['query'].indexOf('value1=1') > -1);
        assert(parsed_url['query'].indexOf('value2=2') > -1);
        assert(parsed_url['query'].indexOf('value3=3') > -1);
        assert(parsed_url['pathname'] == '/mypath');
        assert(parsed_url['host'] == 'localhost:5000');
        assert(parsed_url['hostname'] == 'localhost');
        assert(parsed_url['protocol'] == 'http:');
        assert(parsed_url['port'] == '5000');
        done();
      });
    })
  })

  describe('should allow the send shorthand', function() {
    it('with callback in the method call', function(done) {
      request
      .get('http://localhost:5000/login', function(err, res) {
          assert(res.status == 200);
          done();
      });
    })

    it('with data in the method call', function(done) {
      request
      .post('http://localhost:5000/echo', { foo: 'bar' })
      .end(function(err, res) {
        assert('{"foo":"bar"}' == res.text);
        done();
      });
    })

    it('with callback and data in the method call', function(done) {
      request
      .post('http://localhost:5000/echo', { foo: 'bar' }, function(err, res) {
        assert('{"foo":"bar"}' == res.text);
        done();
      });
    })
  })

  describe('res.toJSON()', function(){
    it('should describe the response', function(done){
      request
      .post('http://localhost:5000/echo')
      .send({ foo: 'baz' })
      .end(function(err, res){
        var obj = res.toJSON();
        assert('object' == typeof obj.header);
        assert('object' == typeof obj.req);
        assert(200 == obj.status);
        assert('{"foo":"baz"}' == obj.text);
        done();
      });
    });
  })

  describe('res.links', function(){
    it('should default to an empty object', function(done){
      request
      .get('http://localhost:5000/login')
      .end(function(err, res){
        res.links.should.eql({});
        done();
      })
    })

    it('should parse the Link header field', function(done){
      request
      .get('http://localhost:5000/links')
      .end(function(err, res){
        res.links.next.should.equal('https://api.github.com/repos/visionmedia/mocha/issues?page=2');
        done();
      })
    })
  })

  describe('req.unset(field)', function(){
    it('should remove the header field', function(done){
      request
      .post('http://localhost:5000/echo')
      .unset('User-Agent')
      .end(function(err, res){
        assert(void 0 == res.header['user-agent']);
        done();
      })
    })
  })

  describe('req.write(str)', function(){
    it('should write the given data', function(done){
      var req = request.post('http://localhost:5000/echo');
      req.set('Content-Type', 'application/json');
      req.write('{"name"').should.be.a.boolean;
      req.write(':"tobi"}').should.be.a.boolean;
      req.end(function(err, res){
        res.text.should.equal('{"name":"tobi"}');
        done();
      });
    })
  })

  describe('req.pipe(stream)', function(){
    it('should pipe the response to the given stream', function(done){
      var stream = new EventEmitter;

      stream.buf = '';
      stream.writable = true;

      stream.write = function(chunk){
        this.buf += chunk;
      };

      stream.end = function(){
        this.buf.should.equal('{"name":"tobi"}');
        done();
      };

      request
      .post('http://localhost:5000/echo')
      .send('{"name":"tobi"}')
      .pipe(stream);
    })
  })

  describe('.buffer()', function(){
    it('should enable buffering', function(done){
      request
      .get('http://localhost:5000/custom')
      .buffer()
      .end(function(err, res){
        assert(null == err);
        assert('custom stuff' == res.text);
        assert(res.buffered);
        done();
      });
    })
  })

  describe('.buffer(false)', function(){
    it('should disable buffering', function(done){
      request
      .post('http://localhost:5000/echo')
      .type('application/x-dog')
      .send('hello this is dog')
      .buffer(false)
      .end(function(err, res){
        assert(null == err);
        assert(null == res.text);
        res.body.should.eql({});
        var buf = '';
        res.setEncoding('utf8');
        res.on('data', function(chunk){ buf += chunk });
        res.on('end', function(){
          buf.should.equal('hello this is dog');
          done();
        });
      });
    })
  })

  describe('.agent()', function(){
    it('should return the defaut agent', function(done){
      var req = request.post('http://localhost:5000/echo');
      req.agent().should.equal(false);
      done();
    })
  })

  describe('.agent(undefined)', function(){
    it('should set an agent to undefined and ensure it is chainable', function(done){
      var req = request.get();
      var ret = req.agent(undefined);
      ret.should.equal(req);
      assert(req.agent() === undefined);
      done();
    })
  })

  describe('.agent(new http.Agent())', function(){
    it('should set passed agent', function(done){
      var http = require('http');
      var req = request.get();
      var agent = new http.Agent();
      var ret = req.agent(agent);
      ret.should.equal(req);
      req.agent().should.equal(agent)
      done();
    })
  })

  describe('with a content type other than application/json or text/*', function(){
    it('should disable buffering', function(done){
      request
      .post('http://localhost:5000/echo')
      .type('application/x-dog')
      .send('hello this is dog')
      .end(function(err, res){
        assert(null == err);
        assert(null == res.text);
        res.body.should.eql({});
        var buf = '';
        res.setEncoding('utf8');
        res.buffered.should.be.false;
        res.on('data', function(chunk){ buf += chunk });
        res.on('end', function(){
          buf.should.equal('hello this is dog');
          done();
        });
      });
    })
  })
});
