angular.module('technodeApp').controller('RoomCtrl',function($scope,socket){
	$scope.messages = [];
	socket.emit('getRoom');
	socket.on('roomData',function(room){
		$scope.room = room;
	});
	socket.on('messageAdded',function(message){
		$scope.messages.push(message);
	});
	
});