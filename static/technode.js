angular.module('technodeApp',['ngRoute']).run(function($window,$rootScope,$http,$location){
	$http({
		url:'/api/validate',
		method:'GET'
	}).then(function successCallback(user){
		$rootScope.me = user;
		$location.path('/');
		console.log('validate')
	},function errorCallback(data){
		$location.path('/login');
	});
	$rootScope.logout = function(){
		$http({
			url:'/api/logout',
			method:'GET'
		}).then(function successCallback(){
			$rootScope.me = null;
			$location.path('/login');
		},function errorCallback(){
		});
	}
	$rootScope.$on('login',function(evt,me){
		console.log('login')
		$rootScope.me = me;
	});
});