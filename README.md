## Simple Auth For Angular

This project provides an AngularJS module to manage authentication in a web application.

The philosophy of this project is that you code the web application and your REST endpoints without worrying about security. And when it works, you add a filter on the server side responsible for authentication, and this module on the client side to add authentication bits on your requests.

This module is based on HTTP. It requires that your server answers with a 401 status when authentication is needed. And it MUST use the Authorization header coming from the client to authenticate requests.

## Components

There are several components in this module, each is here to help you add authentication to your app:

* **HTTP interceptor** it is responsible for adding the Authorization header, and to detect when login should be shown to a user
* **simpleAuthProvider** Used for configuration, and internally by the other components, this component is responsible for session management
* **LoginCtrl** Controller for login, all is here, you just have to create the view
* **LogoutCtrl** Controller for logout. All is here
* **showIfAuth Directive** A directive that you can use. It works as ng-show for when a user is authenticated
* **Default routes** Two routes are registered automatically: `/login` and `/logout`

## Usage

How can you use this module? It's as easy as 4 steps: installation, configuration...

### Installation

This module is provided as a bower component. Installing it is as easy as:

```
bower install angular-simple-auth --save
```

If you use yeoman and its angular generator, the script tags should be generated automatically for you. If not, you have to include 3 files (this module and its dependencies):

```
<script src="bower_components/base64-angular/dist/base64-angular.min.js"></script>
<script src="bower_components/angular-local-storage/angular-local-storage.js"></script>
<script src="bower_components/angular-simple-auth/dist/angular-simple-auth.min.js"></script>
```

### Configuration

In your application configuration, there are two mandatory parameters:

```
angular.module('myApp', ['simpleAuth'])
  .config(['simpleAuthProvider', function(simpleAuthProvider) {
    simpleAuthProvider
      .authorizationName('Token')
      .getToken( function(username, password) {
        var $http = angular.injector(['ng']).get('$http');
        return $http
          .post('/api/sessions', {
            'username': username,
            'password': password
          })
          .then( function(response) {
            var data = response.data;
            return [data.token, { 'user-id': data.userId }];
          });
      })
      .redirectAfterLogin('/account')
      .redirectAfterLogout('/goodbye');
  });
``` 
* Mandatory:
  * **authorizationName**: The scheme of the authorization: 'Authorization: <authorizationName> <tokenValue>'
  * **getToken**: A function used to retrieve the token for authentication. It should return a promise that resolves to an array containing at least one element: the token. The second element can be an object that will indicates what other elements should be stored locally for the session duration.
* Optional:
  * **redirectAfterLogin**: the route to which redirect after a successful login
  * **redirectAfterLogout**: the route to which redirect after logout

### Login form

You must create the login view in the file `views/login.html`. The form should bind to two scope variables: username and password. Finally the login button must call the login() method.

## License

This project is givent to the public domain. You're free to do whatever you want with it.

## Contributing

When contributing code, you must specify that you give your work to the public domain without condition. We accept Pull Requests that are automatically mergeable and that respect the formatting of the project (there is a .editorconfig file that your IDE/text editor can use).
