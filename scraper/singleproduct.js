

var   
  products = require('./products.json')
, $ = require('jquery')
, q = require('q')
, http = require('http')
, fs = require('fs');


function processProduct(product) {
  var data = ''
  , deferred = q.defer()
  , promise = deferred.promise;

  http.get(product.link, function(res) {
    res.on('data', function(chunk) {
      data += chunk;
    });

    res.on('end',  function processData() {
      var $dom = $(data);
      
      console.log('Processing product: ' + product.title);

      product.id = product.id.substring(1,product.id.length-1);
      
      if(typeof product.price === "String") {
        product.price = parseInt(product.price.replace(/[\. kr]/gi, ''),10);  
      }
      
      product.year = $dom.find("#ctl00_ctl00_Label_ProductYear").text();
      product.category = $dom.find("#ctl00_ctl00_Label_ProductSubCategory").text();
      product.wholeseller = $dom.find("#ctl00_ctl00_Label_ProductSeller").text();
      product.country = $dom.find("#ctl00_ctl00_Label_ProductCountryOfOrigin").text();
      product.reserve = $dom.find("#ctl00_ctl00_Image_SpecialReserve").length > 0;

      var stores = $dom.find("#ctl00_ctl00_Label_ProductAvailableInWhichStores").attr('title');

      if(stores && stores.length) {
        product.stores = stores.split(',');  
      } else {
        product.stores = [];
      }

      deferred.resolve();
    });
  });

  return promise;
}

var promises = [];
for(var i = 0; i < products.length; ++i) {

  promises.push(processProduct(products[i]));
}

q.all(promises).then(function() {
  fs.writeFile('processed.json', JSON.stringify(products));
});



