
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
          $scope.parseResult = parser.parse(val);

          if(!$scope.parseResult.error) {
            $scope.validQuery = $scope.parseResult.parsed;  
            $scope.sort = $scope.parseResult.sort;
          }

          $scope.parsedQuery = JSON.stringify($scope.parseResult.parsed);            
        }
      }, 1000);
    });
  });

 

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