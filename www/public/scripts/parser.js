
var tc_ID = 'ID'
, tc_OR = 'OR'
, tc_AND = 'AND'
, tc_HOMELAND = 'HOMELAND'
, tc_IS = 'IS'
, tc_EOF = 'EOF'
, tc_COMMA = 'COMMA'
, tc_ORDER = 'ORDER'
, tc_DESC = 'DESC'
, tc_BY = 'BY';


var Lexer = (function() { 

  function Token(code, value) {
    this.code = code;
    this.value = value;
  };

  function Lexer(inputStr) {
    var ID = /^[a-ö]+/i
    ,   OR = /^eða/i
    ,   AND = /^og/i
    ,   HOMELAND = /^heimalandið/i
    ,   IS = /^er/i
    ,   WHITESPACE = /^[\s]+/im
    ,   COMMA = /^,/i
    ,   ORDER = /^raðað/i
    ,   DESC = /^öfugt/i
    ,   BY = /^eftir/i;
    
    var tokens = []
      , reserved = ['eða', 'og', 'er', 'heimalandið', 'raðað', 'eftir', 'öfugt']
      , consumed = 0
      , funcs = [idToken, whiteSpace, orToken, andToken, homelandToken, isToken, commaToken, orderToken, descToken, byToken]; 

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
      return valueless(COMMA, tc_COMMA);
    }

    function orderToken() {
      return valueless(ORDER, tc_ORDER);
    }

    function byToken() {
      return valueless(BY, tc_BY);
    }

    return {
      lex: lex
    };
  }

  return Lexer;
})();

/**

  expr := statement statementMore orderBy
  statement := country | category 
  statementMore := 'og' expr | 'eða' expr | epsilon
  country := 'Kemur frá' idStart
  idStart = ID idList
  idList := ',' ID idList idListLast | epsilon
  idListLast := 'eða' ID 
  category := 'Er' idStart
  orderBy: 'raðað' DESC 'eftir' ID | epsilon
  desc := 'öfugt' | epsilon
  ID := /[a-ö]/i
*/

var Parser = (function () {
  function Parser(options) {

    var completions = ((options && options.completions) || {
      categories: ['Vín', 'Bjór', 'Snafs'],
      countries: ['Ísland', 'Bretland']
    });

    var fields = {
      'verði' : 'price',
      'nafni' : 'title',
      'heimalandi' : 'country',
      'árgangi' : 'year',
      'styrkleika' : 'volume'
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

    function parseIdStart(completions, compareFunc, valueName) {
      idListStack = [];
      var token = getToken();

      var value = parseIdCompletion(token, completions, compareFunc);

      idListStack.push(value);

      parseIdList(completions, compareFunc, valueName);
    }

    function parseIdList(completion, compareFunc, valueName) {
      var token = lookahead();

      if(token.code === tc_COMMA) {
        getToken();
        token = getToken();

        var value = parseIdCompletion(token, completion, compareFunc);

        idListStack.push(value);

        parseIdList(completion, compareFunc, valueName);
        
      } else {
        parseIdListLast(completion, compareFunc, valueName);
      }
    }

    function parseIdListLast(completion, compareFunc, valueName) {

      var token = lookahead();

      if(token.code === tc_OR) {
        getToken();
        token = getToken();
        var value = parseIdCompletion(token, completion, compareFunc);
        idListStack.push(value);
      }

      outObj['$or'] = outObj['$or'] || [];

      idListStack.map(function(val) {
        var n = {};
        n[valueName] = val;
        outObj['$or'].push(n);
      });
    }

    function parseIdCompletion(token, completions, compareFunc) {
      var completion = null; 

      currentCompletion = completions;

      if(token.code === tc_ID && (completion = getCompletion(token.value, completions, compareFunc)) != null) {
        return completion;
      } else {
        throw 'Hér vil ég sjá gilt gildi! ' + (token.value ? token.value : 'Tómt gildi') + ' er ekki gilt!';
      }
    }

    function parseStatement() {

      var next = lookahead();
      
      if(next.code === tc_HOMELAND) {
        parseCountry();
      } else if (next.code === tc_IS) {
        parseCategory();
      } else {
        throw "Hér vil ég sjá annað hvort 'heimalandið' eða 'er'!";
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

      }
    }

    function parseCountry() {
      var token = getToken();
      if (token.code !== tc_HOMELAND) 
        throw ("Þetta á ekki að vera hægt?");
      
      token = getToken();
      if (token.code !== tc_IS) 
        throw ("hér vantar 'er'!");
      var compare = function(completion, str) {  return completion.toLowerCase() === str.replace(/(i|u)$/, '').toLowerCase() };
      
      parseIdStart(completions.countries, compare, 'country');
    }

    function parseCategory() {
      getToken();

      parseIdStart(completions.categories, null, 'category');
    }

    function parseOrderBy() {
      var token = lookahead();

      if(token.code === tc_ORDER) {
        getToken();
        token = getToken(); 

        var order = 1;
        if(token.code === tc_DESC) {
          order = -1;
          token = getToken();
        }

        if(token.code !== tc_BY) {
          console.log(token);
          throw "Hér vantar orðið 'eftir'!";
        }

        token = getToken();

        if(token.code !== tc_ID) {
          throw "Hér vantar eitthvað gildi, t.d. 'nafni', eða 'verði'";
        }

        var sortExpression = fields[token.value.toLowerCase()];

        if(!sortExpression) {
          throw "Ég kannast ekki við röðunargilið " + token.value + "!";
        }

        sortObj[sortExpression] = order;
      } else if (token.code === tc_EOF) {
        return;
      } else {
        throw "Hér vil ég sjá 'raðað eftir' eða ekki neitt!";
      }
    }

    function getCompletion(str, completions, compareFunc) {

      if(!compareFunc) {
        compareFunc = function(completion, str) { return completion.toLowerCase() === str.toLowerCase() };
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