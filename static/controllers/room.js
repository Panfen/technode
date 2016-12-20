angular.module('technodeApp').controller('RoomCtrl',function($scope,$routeParams,$scope,socket){
	$scope.messages = [];
	socket.emit('getAllRooms',{
		_roomId:$routeParams._roomId
	});
	socket.on('roomData.' + $routeParams._roomId, function(room){
		$scope.room = room;
	});
	socket.on('messageAdded',function(message){
		$scope.room.messages.push(message);
	});
	socket.on('online',function(user){
		$scope.room.users.push('user');
	});
	socket.on('offline',function(user){
		_userId = user._id;
		$scope.room.users = $scope.room.users.filter(function(user){
			return user._id != _userId;
		});
	});
	$scope.$on('$routeChangeStart',function(){
		socket.emit('leaveRoom',{
			user:$scope.my,
			room:$scope.room
		});
	});
	socket.on('leaveRoom',function(leave){
		_userId = leave.user._id;
		$scope.room.users = $scope.room.users.filter(function(user){
			return user._id != _userId;
		});
	});
});