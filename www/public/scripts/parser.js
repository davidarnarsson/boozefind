
var tc_ID = 'ID'
, tc_OR = 'OR'
, tc_AND = 'AND'
, tc_HOMELAND = 'HOMELAND'
, tc_IS = 'IS'
, tc_EOF = 'EOF'
, tc_SEMICOMMA = 'SEMICOMMA'
, tc_ORDER = 'ORDER'
, tc_DESC = 'DESC'
, tc_BY = 'BY'
, tc_CATEGORY = 'CATEGORY'
, tc_DBLQUOTE = 'DBLQUOTE'
, tc_GOES = 'GOES'
, tc_WITH = 'WITH';

Object.values = function(obj) {
  var arr = [];

  if(obj && obj.length) {
    for(var key in obj) {
      arr.push(obj[key]);
    }  
  }
  return arr;
}

var Lexer = (function() { 

  function Token(code, value) {
    this.code = code;
    this.value = value;
  };

  function Lexer(inputStr) {
    var ID = /^[a-ö,]+/i
    ,   OR = /^eða/i
    ,   AND = /^og/i
    ,   HOMELAND = /^heimalandið/i
    ,   IS = /^er/i
    ,   WHITESPACE = /^[\s]+/im
    ,   SEMICOMMA = /^;/i
    ,   CATEGORY = /^tegundin/i
    ,   ORDER = /^raðað/i
    ,   DESC = /^öfugt/i
    ,   BY = /^eftir/i
    ,   DBLQUOTE = /^"/
    ,   GOES = /^hentar/i
    ,   WITH = /^með/i;
    
    var tokens = []
      , reserved = ['eða', 'og', 'er',';', 'heimalandið', 'raðað', 'eftir', 'öfugt', '"', 'tegundin', 'hentar', 'með']
      , consumed = 0
      , funcs = [idToken, whiteSpace, orToken, andToken, homelandToken, isToken, commaToken, orderToken, descToken, byToken, dblQuoteToken, goesToken, withToken, categoryToken]; 

    var lex = function() {
      try {
        while (inputStr.length) {
          var matched = false;
          for(var i = 0; i < funcs.length; ++i) {
            if((matched = funcs[i]()) === true) break;
          }

          if(!matched) {
            throw ('Unmatched character at position ' + consumed + ': "' + inputStr[0]  + '" (' + inputStr.charCodeAt(0) + ')');
          }
        }
      } catch (err) {
        console.log(err);
      }
      
      tokens.push(new Token(tc_EOF,null));
      return tokens;
    };

    function idToken() {
      var token = ID.exec(inputStr);

      if(token && token.length) {
        token = token[0];

        for(var i = 0; i < reserved.length; ++i) {
          if(reserved[i].match(token.toLowerCase())) {
            return false;
          }
        }
        
        consume(token.length);

        tokens.push(new Token(tc_ID, token));
        return true;
      }

      return false;
    };

    function consume(count) {
      consumed += count;
      inputStr = inputStr.substring(count);
    };  

    function whiteSpace() {
      var matches = WHITESPACE.exec(inputStr);

      if(matches && matches.length) {
        consume(matches[0].length);
        return true;
      }

      return false;
    }

    function valueless(regex, tokenCode) {
      var token = regex.exec(inputStr);

      if(token && token.length) {
        token = token[0];
        consume(token.length);

        tokens.push(new Token(tokenCode, null));

        return true;
      }

      return false;
    }

    function orToken() {
      return valueless(OR, tc_OR);
    };

    function andToken() {
      return valueless(AND, tc_AND);
    };

    function homelandToken() {
      return valueless(HOMELAND, tc_HOMELAND);
    }

    function descToken() {
      return valueless(DESC, tc_DESC);
    }

    function isToken() {
      return valueless(IS, tc_IS);
    }

    function commaToken() {
      return valueless(SEMICOMMA, tc_SEMICOMMA);
    }

    function orderToken() {
      return valueless(ORDER, tc_ORDER);
    }

    function byToken() {
      return valueless(BY, tc_BY);
    }

    function dblQuoteToken() {
      return valueless(DBLQUOTE, tc_DBLQUOTE);
    }

    function categoryToken() {
      return valueless(CATEGORY, tc_CATEGORY);
    }

    function goesToken() {
      return valueless(GOES, tc_GOES);
    }

    function withToken() {
      return valueless(WITH, tc_WITH);
    }

    return {
      lex: lex
    };
  }

  return Lexer;
})();

/**

  expr := statement statementMore orderBy
  statement := country | category | goesWith
  statementMore := 'og' expr | 'eða' expr | epsilon
  country := 'Kemur frá' idListStart
  idListStart = ID idList
  idList := ',' ID idList idListLast | epsilon
  idListLast := 'eða' ID 
  category := 'tegundin' 'er' idListStart
  goesWith := 'goes' 'with' idListStart
  orderBy: 'raðað' DESC 'eftir' ID | epsilon
  desc := 'öfugt' | epsilon
  ID := /[a-ö,]/i ID | epsilon 
*/

var Parser = (function () {
  function Parser(options) {

    var completions = ((options && options.completions) || {
      categories: ['Vín', 'Bjór', 'Snafs'],
      countries: ['Ísland', 'Bretland']
    });

    /* inflection : property name */ 
    var fields = {
      'verði' : 'price',
      'nafni' : 'title',
      'heimalandi' : 'country',
      'árgangi' : 'year',
      'styrkleika' : 'volume'
    }

    , goesWith = {
      'nauti' : 'naut',
      'lambi' : 'lamb',
      'grillmat' : 'grill',
      'léttari villibráð' : 'lettariVillibrad',
      'svínakjöti' : 'gris',
      'fiski' : 'fiskur',
      'skelfiski' : 'skelfiskur',
      'osti' : 'ostur',
      'villibráð' : 'villibrad',
      'alifuglum' : 'alifuglar',
      'pasta': 'pasta',
      'grænmeti' : 'graenmeti',
      'eftirréttum' : 'eftirrettir'
    }
    , outObj = {}
    , tokens = []
    , currentCompletion = []
    , idListStack = []
    , sortObj = {};

    var log = function() {
      if (options && options.log === 'verbose') {
        console.log(Array.prototype.slice.call(arguments,0));
      }
    }

    var parse = function(str) {

      tokens = new Lexer(str).lex();
      outObj = {};
      sortObj = {};
      currentCompletion = [];

      var error;
      try {
        parseExpression();  
      } 
      catch (err) {
        error = err;
      }

      return { parsed: outObj, sort: sortObj, completionContext: currentCompletion, error: error };
    };

    function getToken() {
      return tokens.shift();
    }

    function lookahead() {
      return tokens[0];
    }

    function parseExpression() {
      parseStatement();
      parseStatementMore();
      parseOrderBy();
    }

    function parseIdStart(completions, compareFunc, valueName, codeGenFunc) {
      idListStack = [];
      var token = parseId();

      var value = parseIdCompletion(token, completions, compareFunc);

      idListStack.push(value);

      parseIdList(completions, compareFunc, valueName, codeGenFunc);
    }

    function parseIdList(completions, compareFunc, valueName, codeGenFunc) {
      var token = lookahead();
      //currentCompletion = [';', 'og', 'eða'];
      if(token.code === tc_SEMICOMMA) {
        getToken();
        
        var str = parseId();

        var value = parseIdCompletion(str, completions, compareFunc);

        idListStack.push(value);

        parseIdList(completions, compareFunc, valueName, codeGenFunc);
        
      } else {
        parseIdListLast(completions, compareFunc, valueName, codeGenFunc);
      }
    }

    function parseIdListLast(completions, compareFunc, valueName, codeGenFunc) {

      var token = lookahead(), predicate = '$or';

      if(token.code === tc_OR || token.code === tc_AND) {
        getToken();
        var id = parseId();
        var value = parseIdCompletion(id, completions, compareFunc);
        idListStack.push(value);

        if(token.code === tc_AND) {
          predicate = '$and';
        }
      }

      outObj[predicate] = outObj[predicate] || [];

      if(!codeGenFunc) {
        idListStack.map(function(val) {
          var n = {};
          n[valueName] = val;
          outObj[predicate].push(n);
        });  
      } else {
        codeGenFunc(idListStack, outObj[predicate]);
      }
    }

    function parseId() {

      var token = lookahead(), str = [];

      if(token.code !== tc_ID) {
        throw 'Hér bjóst ég við einhverju gildi!';
      }

      while(token.code === tc_ID) {
        str.push(token.value);
        getToken();

        token = lookahead();
      }

      return str.join(' ');
    }

    function parseIdCompletion(token, completions, compareFunc) {
      var completion = null; 

      

      if((completion = getCompletion(token, completions, compareFunc)) != null) {
        return completion;
      } else {
        currentCompletion = completions;
        throw 'Hér vil ég sjá gilt gildi! ' + (token ? token : 'Tómt gildi') + ' er ekki gilt!';
      }
    }

    function parseStatement() {

      var next = lookahead();
      
      if(next.code === tc_HOMELAND) {
        parseCountry();
      } else if (next.code === tc_CATEGORY) {
        parseCategory();
      } else if (next.code === tc_GOES) {
        parseGoesWith();
      } else {
        currentCompletion = ['heimalandið', 'tegundin', 'hentar'];
        throw "Hér vil ég sjá annað hvort 'heimalandið er', 'tegundin er', eða 'hentar með'!";
      }
    }


    function parseStatementMore() {

      var token = lookahead();
      
      if(token.code === tc_AND || token.code === tc_OR) {
        getToken();

        var newObj = {};
        newObj[(token.code === tc_AND ? '$and' : '$or')] = [outObj];
        outObj = newObj;

        parseExpression();
      } else if (token.code !== tc_EOF) {
        currentCompletion = ['og', 'eða'];
        throw "Hér þarf annaðhvort að vera 'og', 'eða', eða ekki neitt!";
      }
    }

    function parseCountry() {
      var token = getToken();
      if (token.code !== tc_HOMELAND) 
        throw ("Þetta á ekki að vera hægt?");
      
      token = getToken();
      if (token.code !== tc_IS) {
        currentCompletion = ['er'];
        throw ("hér vantar 'er'!");
      }
        
      var compare = function(completion, str) {  return completion.toLowerCase() === str.replace(/(i|u)$/, '').toLowerCase() };
      
      parseIdStart(completions.countries, compare, 'country');
    }

    function parseCategory() {
      getToken();

      var token = getToken();

      if(token.code !== tc_IS) {
        currentCompletion = ['er'];
        throw 'Til þess að leita eftir tegund þarf að skrifa "tegundin ER [nafn á tegund]".';
      }

      parseIdStart(completions.categories, null, 'category');
    }


    function parseGoesWith() {
      getToken();
      
      //currentCompletion = ;
      var token = getToken();

      if(token.code !== tc_WITH) {
        currentCompletion = ['með'];
        throw 'Hér vantar "með"!';
      }

      parseIdStart(Object.keys(goesWith), null, null, function(idArr, outObj) {
        idArr.forEach(function(val) {
          var obj = {};
          obj[goesWith[val]] = true;
          outObj.push(obj);
        });
      });
    }


    function parseOrderBy() {
      var token = lookahead();

      if(token.code === tc_ORDER) {
        getToken();
        token = getToken(); 

        currentCompletion = Object.values(fields).concat(['öfugt']);
        var order = 1;
        if(token.code === tc_DESC) {
          order = -1;
          token = getToken();
        }

        if(token.code !== tc_BY) {
          currentCompletion = ['eftir'];
          throw "Hér vantar orðið 'eftir'!";
        }

        token = getToken();

        if(token.code !== tc_ID) {
          currentCompletion = Object.values(fields)
          throw "Hér vantar eitthvað gildi, t.d. 'nafni', eða 'verði'";
        }

        var sortExpression = fields[token.value.toLowerCase()];

        if(!sortExpression) {
          currentCompletion = Object.values(fields)
          throw "Ég kannast ekki við röðunargilið " + token.value + "!";
        }

        sortObj[sortExpression] = order;
      } else if (token.code === tc_EOF) {
        return;
      } else {
        currentCompletion = ['raðað'];
        throw "Hér vil ég sjá 'raðað eftir' eða ekki neitt!";
      }
    }

    function getCompletion(str, completions, compareFunc) {

      if(!compareFunc) {
        compareFunc = function(completion, str) {
          if (typeof completion === "Object") {
            return !!completion[str];
          } else {
            return completion.toLowerCase() === str.toLowerCase()   
          }
          
       };
      }

      var completion = completions[0], i = 0; 
      
      for( ; i < completions.length; ++i, completion = completions[i]) {
        if (compareFunc(completion, str)) {
          return completion;
        }
      }
      
      return null;
    }

    return {
      parse: parse
    };
  };
  return Parser;
})();


if(typeof module !== "undefined" && module.exports) {
  module.exports = Parser;
}