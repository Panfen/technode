angular.module('technodeApp').controller('MesssageCreatorCtrl',function($scope,socket){
	$scope.newMessage = '';
	
	$scope.createMessage=function(messages){
		if($scope.newMessage == ''){
			return;
		}
		socket.emit('createMessage',{
			message:$scope.newMessage,
			creator:$scope.me
		});
		$scope.newMessage = '';
	};
});