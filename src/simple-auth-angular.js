'use strict';

angular.module('simpleAuth', ['LocalStorageModule', 'base64'])
  .provider('simpleAuth', function() {

    angular.module('LocalStorageModule').value('prefix', 'auth-module');

    var sessionExpiration = 60;
    var redirectAfterLogout = '/';
    var authorizationName = 'SimpleAuth';

    this.sessionExpiration = function(value) {
      sessionExpiration = value;
      return this;
    };

    this.redirectAfterLogout = function(value) {
      redirectAfterLogout = value;
      return this;
    };

    this.authorizationName = function(value) {
      authorizationName = value;
      return this;
    };

    this.$get = ['localStorageService', 'Base64', '$location',function(ls, Base64, $location) {

      var currentLocation = null;

      var isLoggedIn = function() {
        var lastLogin = ls.get('last-login');
        return lastLogin !== null && Date.now() - lastLogin <= sessionExpiration * 1000;
      };

      var login = function(username, password) {
        ls.set('auth-token', Base64.encode(username + ':' + password));
        if(currentLocation !== null) {
          $location.path(currentLocation);
        } else {
          $location.path('/');
        }
        currentLocation = null;
      };

      var logout = function() {
        ls.clearAll();
        $location.path(redirectAfterLogout);
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

      var getToken = function() {
        return ls.get('auth-token');
      };

      var getAuthorizationName = function() {
        return authorizationName;
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
        'getToken': getToken,
        'getAuthorizationName' : getAuthorizationName,
        'isLoggedIn': isLoggedIn
      };
    }];
  })
  .factory('simpleAuthHttpInterceptor', ['simpleAuth', function(simpleAuth) {
    var isAuthenticatedRequest = false;

    return {
      'request': function(config) {
        var token = simpleAuth.getToken();
        isAuthenticatedRequest = token !== null;
        if(isAuthenticatedRequest) {
          config.headers.Authorization = simpleAuth.getAuthorizationName() + ' ' + token;
        }
        return config;
      },
      'response': function(response) {
        if(isAuthenticatedRequest) {
          simpleAuth.setLastLogin();
        }
        simpleAuth.checkSessionValidity();
        return response;
      },
      'responseError': function(response) {
        if(response.status === 401) {
          simpleAuth.requestLogin();
        }
        return response;
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
