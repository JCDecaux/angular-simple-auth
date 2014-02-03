'use strict';

angular.module('simpleAuth', ['LocalStorageModule', 'base64'])
  .provider('simpleAuth', function() {

    angular.module('LocalStorageModule').value('prefix', 'auth-module');

    var self = this;

    var redirectAfterLogout = '/';
    var authorizationName = 'SimpleAuth';
    var getTokenFn = function (username, password, processToken) {
      angular.injector(['base64']).invoke(function(Base64) {
        processToken(Base64.encode(username + ':' + password));
      });
    };

    this.redirectAfterLogout = function(value) {
      redirectAfterLogout = value;
      return self;
    };

    this.authorizationName = function(value) {
      authorizationName = value;
      return self;
    };

    this.getToken = function(value) {
      getTokenFn = value;
      return self;
    };

    this.$get = ['localStorageService', '$location',function(ls, $location) {

      var currentLocation;

      var isLoggedIn = function() {
        var lastLogin = ls.get('last-login');
        return lastLogin !== null;
      };

      var login = function(username, password) {
        var finishLogin = function(token, optionalProps) {
          if(angular.isDefined(optionalProps)) {
            angular.forEach(optionalProps, function(value, key) {
              ls.set(key, value);
            });
          }
          ls.set('auth-token', token);
          if(angular.isDefined(currentLocation)) {
            $location.path(currentLocation);
          } else {
            $location.path('/');
          }
          currentLocation = undefined;
        };
        var error = function() {};
        getTokenFn(username, password, finishLogin, error);
      };

      var logout = function(options) {
        ls.clearAll();
        if(angular.isUndefined(options.redirect) || options.redirect === true) {
          $location.path(redirectAfterLogout);
        }
      };

      var setLastLogin = function() {
        if(ls.get('last-login') === null) {
          ls.set('last-login', Date.now());
        }
      };

      var checkSessionValidity = function() {
        if(!isLoggedIn()) {
          ls.clearAll();
        }
      };

      var requestLogin = function() {
        ls.clearAll();
        currentLocation = $location.path();
        $location.path('/login');
      };

      var getStoredToken = function() {
        return ls.get('auth-token');
      };

      var getAuthorizationName = function() {
        return authorizationName;
      };

      var putParam = function(key, value) {
        ls.set(key, value);
      };

      var getParam = function(key, defaultValue) {
        var res = ls.get(key);
        if(angular.isDefined(defaultValue) && res === null) {
          return defaultValue;
        }
        return res;
      };

      if(!isLoggedIn()) {
        ls.clearAll();
      }

      return {
        'login': login,
        'logout': logout,
        'setLastLogin': setLastLogin,
        'checkSessionValidity': checkSessionValidity,
        'requestLogin': requestLogin,
        'getStoredToken': getStoredToken,
        'getAuthorizationName' : getAuthorizationName,
        'isLoggedIn': isLoggedIn,
        'putParam': putParam,
        'getParam': getParam
      };
    }];
  })
  .factory('simpleAuthHttpInterceptor', ['$q', 'simpleAuth', function($q, simpleAuth) {
    var isAuthenticatedRequest = false;

    return {
      'request': function(config) {
        var token = simpleAuth.getStoredToken();
        isAuthenticatedRequest = token !== null;
        if(isAuthenticatedRequest) {
          config.headers.Authorization = simpleAuth.getAuthorizationName() + ' ' + token;
        }
        return config || $q.when(config);
      },
      'response': function(response) {
        if(isAuthenticatedRequest) {
          simpleAuth.setLastLogin();
        }
        simpleAuth.checkSessionValidity();
        return response || $q.when(response);
      },
      'responseError': function(rejection) {
        if(rejection.status === 401) {
          simpleAuth.requestLogin();
        }
        return $q.reject(rejection);
      }
    };
  }])
  .controller('SimpleAuthLoginCtrl', ['simpleAuth', '$scope', function(simpleAuth, $scope) {
    $scope.login = function() {
      simpleAuth.login($scope.username, $scope.password);
    };
  }])
  .controller('SimpleAuthLogoutCtrl', ['simpleAuth', function(simpleAuth) {
    simpleAuth.logout();
  }])
  .directive('showIfAuth', ['$animate', 'simpleAuth', function($animate, simpleAuth) {
    return function(scope, element) {
      scope.$watch(function() { return simpleAuth.isLoggedIn(); }, function (){
        $animate[simpleAuth.isLoggedIn() ? 'removeClass' : 'addClass'](element, 'ng-hide');
      });
    };
  }])
  .config(['$httpProvider', '$routeProvider', function($httpProvider, $routeProvider) {
    $httpProvider.interceptors.push('simpleAuthHttpInterceptor');
    $routeProvider
      .when('/login', {
        templateUrl: 'views/login.html',
        controller: 'SimpleAuthLoginCtrl'
      })
      .when('/logout', {
        template: 'Logging out...',
        controller: 'SimpleAuthLogoutCtrl'
      });
  }]);
