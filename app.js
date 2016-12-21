var express = require('express');
var async = require('async');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var app = express();
var path = require('path');
var port = process.env.PORT || 3000;
var Controllers = require('./controllers'); 
var signedCookieParser = cookieParser('technode');
var MongoStore = require('connect-mongo')(session);
var ObjectId = require('mongoose').Schema.ObjectId;
var sessionStore = new MongoStore({
	url:'mongodb://localhost/technode'
});

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
	extend:true
}))
app.use(cookieParser())
app.use(session({
	secret:'technode',
	resave:true,
	saveUninitialized:false,
	cookie:{
		maxAge:60*1000*60
	},
	store:sessionStore
}))

app.use(express.static(path.join(__dirname,'/static')));

app.get('/api/validate',function(req,res){
	var _userId = req.session._userId;
	console.log('_userId:'+_userId)
	if(_userId){
		Controllers.User.findUserById(_userId,function(err,user){
			if(err){
				res.json(401,{
					msg:err
				});
			}else{
				res.json(user);
			}
		})
	}else{
		res.json(401,null);
	}
})

app.post('/api/login',function(req,res){
	var email = req.body.email;
	if(email){
		Controllers.User.findUserByEmailOrCreate(email,function(err,user){
			if(err){
				res.json(500,{
					msg:err
				})
			}else{
				req.session._userId = user._id;
				Controllers.User.online(user._id,function(err,user){
					if (err) {
						res.json(500,{msg:err});
					}else{
						res.json(user);
					}
				});
			}
		});
	}else{
		res.json(403)
	}
})

app.get('/api/logout',function(req,res){
	_userId = req.session._userId;
	Controllers.User.offline(_userId,function(err,user){
		if(err){
			res.json(500,{
				msg:err
			});
		}else{
			res.json(200);
			delete req.session._userId;
			req.session._userId = null;
		}
	});
})

app.use(function(req,res){
	res.sendFile(path.join(__dirname,'./static/index.html'));
})

var server = app.listen(port,function(){
	console.log('technode is on port '+ port +'!');
});

var io = require('socket.io').listen(server);

io.set('authorization',function(handshakeData,accept){
	signedCookieParser(handshakeData,{},function(err){
		if(err){
			accept(err,false);
		}else{
			sessionStore.get(handshakeData.signedCookies['connect.sid'],function(err,session){
				if(err){
					accept(err.message,false);
				}else{
					handshakeData.session = session;
					if(session._userId){
						accept(null,true);
					}else{
						accept('No Login');
					}
				}
			});
		}
	});
});

var SYSTEM = {
  name: 'SYSTEM',
  avatarUrl: 'http://upload.wikimedia.org/wikipedia/commons/thumb/0/05/Robot_icon.svg/220px-Robot_icon.svg.png'
}

io.sockets.on('connection',function(socket){
	var _userId = socket.request.session._userId;
	Controllers.User.online(_userId,function(err,user){
		if(err){
			socket.emit('err',{
				msg:err
			});
		}else{
			socket.broadcast.emit('online',user);
		}
	});

	//断网，刷新页面，关闭网页，即socket断开
	socket.on('disconnect',function(){
		Controllers.User.offline(_userId,function(err,user){
			if(err){
				socket.emit('err',{
					msg:err
				});
			}else{
				if(user._roomId){
					socket.in(user._roomId).broadcast.emit('leaveRoom',user);
					socket.in(user._roomId).broadcast.emit('messageAdded',{
						content:user.name + ' leaves this room.',
						creator:SYSTEM,
						createAt:new Date(),
						_id:ObjectId()
					});
					Controllers.User.leaveRoom2({
						user:user
					},function(){});
				}
			}
		});
	});

	socket.on('getRoom',function(){
		async.parallel([
			function(done){
				Controllers.User.getOnlineUsers(done);
			},
			function(done){
				Controllers.Message.read(done);
			}
		],
		function(err,results){
			if(err){
				socket.emit('err',{
					msg:err
				});
			}else{
				socket.emit('roomData',{
					users: results[0],
					messages:results[1]
				});
			}
		});
	});

	socket.on('createMessage',function(message){
		Controllers.Message.create(message,function(err,message){
			if(err){
				socket.emit('err',{
					msg:err
				});
			}else{
				socket.in(message._roomId).broadcast.emit('messageAdded',message);
				io.sockets.emit('messageAdded',message);
			}
		});
	});

	socket.on('createRoom',function(room){
		Controllers.Room.create(room,function(err,room){
			if(err){
				socket.emit('err',{
					msg:err
				});
			}else{
				io.sockets.emit('roomAdded',room);
			}
		});
	});

	socket.on('getAllRooms',function(data){
		if(data && data._roomId){
			Controllers.Room.getById(data._roomId,function(err,room){
				if(err){
					socket.emit('err',{
						msg:err
					});
				}else{
					socket.emit('roomData.' + data._roomId,room);
				}
			});
		}else{
			Controllers.Room.read(function(err,rooms){
				if(err){
					socket.emit('err',{
						msg:err
					});
				}else{
					socket.emit('roomsData',rooms);
				}
			});
		}
	});

	socket.on('joinRoom',function(join){
		Controllers.User.joinRoom(join,function(err){
			if(err){
				socket.emit('err',{
					msg:err
				});
			}else{
				socket.join(join.room._id);
				socket.emit('joinRoom.'+join.user._id,join);
				socket.in(join.room._id).broadcast.emit('messageAdded',{
					content:join.user.data.name + ' enters this room.',
					creator:SYSTEM,
					createAt:new Date(),
					_id:ObjectId()
				});
				socket.in(join.room._id).broadcast.emit('joinRoom',join);
			}
		});
	});

	//通过改变页面地质变化改变
	socket.on('leaveRoom',function(leave){
		console.log('leave：'+JSON.stringify(leave))
		Controllers.User.leaveRoom(leave,function(err){
			if(err){
				socket.emit('err',{
					msg:err
				});
			}else{
				socket.in(leave.room._id).broadcast.emit('messageAdded',{
					content:leave.user.data.name + ' leaves this room.',
					creator:SYSTEM,
					createAt:new Date(),
					_id:ObjectId()
				});
				socket.leave(leave.room._id);
				io.sockets.emit('leaveRoom',leave);
			}
		});
	});
});