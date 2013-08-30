var fs = require('fs');
var products = require('./processed.json');

function process(product) {
  product.price = parseInt(product.price.replace('kr.', '').replace(/\./gi, ''));

  product.stores = product.stores.map(function(store) { return store.trim() });
}


for(var i = 0; i <products.length; ++i) {
  process(products[i]);
}

fs.writeFile('fixed.json', JSON.stringify(products));