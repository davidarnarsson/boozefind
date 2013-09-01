
(function() {

  var booze = angular.module('boozefind', []);

  booze.factory('$booze', function($http) {
    var search = function(offset, query, sortExpression) {
      return $http.get('/booze', {
        params: {
          query: JSON.stringify(query),
          sort: JSON.stringify(sortExpression),
          offset: offset
        }
      });
    };

    var completions = function() {
      return $http.get('/booze/completions').then(function(response) {
        return response.data;
      });
    }

    return {
      search: search,
      completions: completions
    };
  });

  booze.controller('QueryCtrl', function($scope, $booze, $location, $timeout) {
    var search = $location.search()
    , query = search.query
    , offset = search.offset
    , sort  = search.sort
    , timeoutId = null
    , parser = null;    

    $booze.completions().then(function(completions) {
      parser = new Parser({log: 'verbose', completions: completions});
    });

    $scope.$watch('query', function(val) {
      $timeout.cancel(timeoutId);

      timeoutId = $timeout(function() {
        if(val && val.length) {  
          $scope.results = parser.parse(val);

          $scope.$broadcast('newresults', {results: $scope.results});

          if(!$scope.results.error) {
            $scope.validQuery = $scope.results.parsed;
          }
        }
      }, 50);
    });
  });

  booze.directive('onKeyup', function() {
    return function(scope, elm, attrs) {
      var keyupFn = scope.$eval(attrs.onKeyup);
      elm.bind("keyup", function(evt) {
        scope.$apply(function() {
          keyupFn.call(this, evt);
        });
      });
    };
  });

  booze.directive('queryInput', function($booze) {
    return {
      restrict: 'E',

      templateUrl: 'query-input.tpl.html',

      scope: {
        query : '='
      },

      controller: function($scope, $element, $attrs) {
        var currentSuggestion = '';
        $scope.$watch('query', function(val) {
          if(!val) {
            $element.find('.suggestions').text('');
          }
        });

        $scope.keyUp = function(event) {
          if (event.which === 39 && currentSuggestion && currentSuggestion.length) {
            $scope.query = $scope.query + currentSuggestion;
            currentSuggestion = '';
          }
        }

        $scope.$on('newresults', function(event, args) {
          var words = $scope.query.split(' ')
          , compls = args.results.completionContext;

          if(words.length && compls && compls.length) {
            var lastWord = words[words.length - 1]
            , r = new RegExp('^' + lastWord, "i")
            , i = 0;
            for( ; i < compls.length; ++i) {
              if(r.test(compls[i])) {
                currentSuggestion = compls[i].substring(lastWord.length);
                $element.find('.suggestions').text($scope.query + currentSuggestion);    
                break;
              }
            }

            if(i === compls.length) {
              $element.find('.suggestions').text('');
            }
          }
        });
      }
    }
  });


/*  booze.directive('suggestionsList', function() {
    return {
      restrict: 'E',
      require: '^queryInputCtrl',

      templateUrl: 'suggestions-list.tpl.html',

      transclude: true,

      link: function(scope, element, attrs, queryInputCtrl) {

      }
    };
  });*/

  booze.directive('resultsTable', function($booze) {
    return {
      restrict: 'E',

      templateUrl: 'results-table.tpl.html',

      scope: {
        boozeQuery: '=query',
        sort: '='
      },
      controller : function($scope, $element, $attrs) {
        var init = true;
        $scope.$watch('boozeQuery', function(val) {
          if(init) {
            init = false;
          } else {
            $booze.search(0, val, ($scope.sort || {})).then(function(items) {
              console.log(items);
              $scope.booze = items.data;
            });
          }
        }) 
      }
    };
  });
})();