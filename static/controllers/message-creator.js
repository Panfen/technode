angular.module('technodeApp').controller('MesssageCreatorCtrl',function($scope,socket){
	$scope.createMessage=function(messages){
		if($scope.newMessage == ''){
			return;
		}
		socket.emit('createMessage',{
			content:$scope.newMessage,
			creator:$scope.me.data,
			_roomId:$scope.room._id
		});
		$scope.newMessage = '';
	};
});