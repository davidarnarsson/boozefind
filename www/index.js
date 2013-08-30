

var express = require('express')
, path = require('path')
, MongoClient = require('mongodb').MongoClient
,	app = express()
, q = require('q');

app.configure('development', function() {
  app.set('db', 'mongodb://localhost:27017/boozefind');
  app.set('port', 1234);
});

app.configure('production', function() {
  app.set('db', process.env.DBPATH);
});

app.configure(function() {
  app.use(express.logger('dev')); 
  app.use(express.bodyParser());
  app.use(express.methodOverride());  
  app.set('view engine', 'html');
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));

  app.use(function(err, req, res, next) {
    if(err) {
      console.err(err);
      res.send(500,{error: err});
    } else {
      next();
    }
  });

  app.use(function(req, res, next) {
    res.send(404);
  });
});

MongoClient.connect(app.get('db'), function(err, db) {
  if(err) {
    throw err;
  }

  var boozes = db.collection('booze');

  app.get('/', function(req, res) {
    res.sendfile('public/index.html');
  });

  app.get('/booze', function(req, res) {
    
    var baseQuery = JSON.parse(req.query.query ? req.query.query : "{}")
    ,   response = { paging: {}, distincts: {}}
    ,   errCb = function(err) { throw err; }
    ,   promises = [];
    
    promises.push(promise(boozes, 'count', baseQuery)(function(count) {
      response.paging.total = count;
      //response.paging.offset = parseInt(req.query.offset, 10) || 0;
      //response.paging.pageSize = 100;
    }));
    
    var cursor = boozes.find(baseQuery)/*.skip(parseInt(req.query.offset, 10) || 0).limit(100)*/.sort(JSON.parse(req.query.sort ? req.query.sort : '{"title": 1}'));  
    promises.push(promise(cursor, 'toArray')(function(values) {
      response.products = values;
    }));

    promises.push(promise(boozes, 'distinct', 'category', baseQuery)(function(distincts) {
      response.distincts.categories = distincts;
    }));

    promises.push(promise(boozes, 'distinct', 'stores', baseQuery)(function(distincts) {
      response.distincts.stores = distincts;
    }));

    promises.push(promise(boozes, 'distinct', 'country', baseQuery)(function(distincts) {      
      response.distincts.countries = distincts;
    }));

    q.all(promises).then(function() {
        res.send(200, response);
    }, function(err) {
      throw err;
    });
  });
  

  app.get('/booze/completions', function(req,res) {
    var promises = []
    , baseQuery = {}
    , response = {};

     promises.push(promise(boozes, 'distinct', 'category', baseQuery)(function(distincts) {
      response.categories = distincts;
    }));

    promises.push(promise(boozes, 'distinct', 'stores', baseQuery)(function(distincts) {
      response.stores = distincts;
    }));

    promises.push(promise(boozes, 'distinct', 'country', baseQuery)(function(distincts) {      
      response.countries = distincts;
    }));

    q.all(promises).then(function() {
      res.send(200, response);
    });
  });

  /* býr til promise hlut úr mongo kalli, sem er callback based. */ 
  var promise = function(cursor, action) {

    // tökum öll argument eftir cursor og aðgerð
    var args = Array.prototype.slice.call(arguments, 2)

    // og skilum falli sem að skilar promise
    return function(valueCb) {
      var 
        deferred = q.defer()
      , promise = deferred.promise
      , callback = function(err, values) {     
        if(err) {
          deferred.reject(err);
        } else {

          // lolwat ég er samt að nota callbacks
          valueCb(values);

          deferred.resolve(values);  
        }
      };

      args = args.concat([callback]);
      
      cursor[action].apply(cursor, args)
      
      return promise;
    }
  }
});

app.listen(app.get('port') || process.env.PORT, function() {
  console.log('listening in on ' + (app.get('port') || process.env.PORT));
});
