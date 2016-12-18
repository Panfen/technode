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
	if(_userId){
		Controllers.User.findUserById(_userId,function(err,user){
			if(err){
				/*
				res.json(401,{
					msg:err
				});
				*/
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

app.post('/api/logout',function(req,res){
	_userId = req.session._userId;
	Controllers.User.offline(_userId,function(err,user){
		if(err){
			res.json(500,{
				msg:err
			});
		}else{
			res.json(200);
			delete req.session._userId;
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

var messages = [];
io.sockets.on('connection',function(socket){
	socket.on('getRoom',function(){
		Controllers.User.getOnlineUsers(function(err,users){
			if(err){
				socket.emit('err',{
					msg:err
				});
			}else{
				socket.emit('roomData',{
					users: users,
					messages:messages
				});
			}
		});
	});
	socket.on('createMessage',function(message){
		messages.push(message);
		io.sockets.emit('messageAdded',message);
	});
});