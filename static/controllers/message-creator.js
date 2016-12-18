angular.module('technodeApp').controller('MesssageCreatorCtrl',function($scope,socket){
	$scope.newMessage = '';
	
	$scope.createMessage=function(messages){
		if($scope.newMessage == ''){
			return;
		}
		socket.emit('createMessage',$scope.newMessage);
		$scope.newMessage = '';
	};
});