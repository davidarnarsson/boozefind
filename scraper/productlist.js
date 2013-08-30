
var products = [];
var count = 0, currentPage;
var URL = 'http://www.vinbudin.is/DesktopDefault.aspx/tabid-64?searchString=';

var casper = require('casper').create();

casper.start(URL, function(status) {
  
});

casper.then(check);

function doFindProducts() {
  var rows = document.querySelectorAll('.product-table tr.upper');
  
  var p = [];

  for(var i = 0 ; i < rows.length; ++i) {
    var row = rows[i]
      , sibling = row.nextSibling;

    var product = {
      img: row.querySelector('.img img').src,
      link: row.querySelector('.title a').href,
      id: row.querySelector('.title span').innerText,
      title: row.querySelector('.title a').innerText,
      weight: row.querySelector('.weight').innerText,
      volume: row.querySelector('.volume').innerText,
      price: row.querySelector('.price').innerText,
      description: sibling.querySelector('.description').innerText,
      naut: !!sibling.querySelector('.food-icon img[src="Addons/Origo/Module/Img/Naut.gif"]'),
      lamb: !!sibling.querySelector('.food-icon img[src="Addons/Origo/Module/Img/Lamb.gif"]'),
      grill: !!sibling.querySelector('.food-icon img[src="Addons/Origo/Module/Img/Grill.gif"]'),
      lettariVillibrad: !!sibling.querySelector('.food-icon img[src="Addons/Origo/Module/Img/LettariVillibrad.gif"]'),
      tilbuidAdDrekka:  !!sibling.querySelector('.food-icon img[src="Addons/Origo/Module/Img/TilbuidAdDrekka.gif"]'),
      gris:  !!sibling.querySelector('.food-icon img[src="Addons/Origo/Module/Img/Gris.gif"]'),
      fiskur:  !!sibling.querySelector('.food-icon img[src="Addons/Origo/Module/Img/Fiskur.gif"]'),
      skelfiskur:  !!sibling.querySelector('.food-icon img[src="Addons/Origo/Module/Img/Skelfiskur.gif"]'),
      ostur:  !!sibling.querySelector('.food-icon img[src="Addons/Origo/Module/Img/Ostur.gif"]'),
      villibrad:  !!sibling.querySelector('.food-icon img[src="Addons/Origo/Module/Img/Villibrad.gif"]'),
      alifuglar:  !!sibling.querySelector('.food-icon img[src="Addons/Origo/Module/Img/Alifuglar.gif"]'),
      pasta:  !!sibling.querySelector('.food-icon img[src="Addons/Origo/Module/Img/Pasta.gif"]'),
      graenmeti:  !!sibling.querySelector('.food-icon img[src="Addons/Origo/Module/Img/Graenmetisrettir.gif"]'),
      eftirrettir:  !!sibling.querySelector('.food-icon img[src="Addons/Origo/Module/Img/Eftirrettir.gif"]'),
      reserve:  !!sibling.querySelector('.food-icon img[src="Addons/Origo/Module/Img/SpecialReserve.gif"]')
    };
    
    p.push(product);
  }  

  return JSON.stringify({products: p});
}

function check() {
  count++;
  this.then(findProducts);

  this.thenClick('a.paging_button_next', function() {

  });

  this.then(function() {
    if(count > 1000) {
      require('utils').dump(products);
      this.exit();
    }
  });
  this.waitForSelectorTextChange('tr.lower', function then() {
    this.then(check);  
  }, function onTimeout() {
    require('utils').dump(products);
    this.exit();
  });
}

function findProducts() {
  var str = this.evaluate(doFindProducts);
  
  products = products.concat(JSON.parse(str).products);
}

casper.run();