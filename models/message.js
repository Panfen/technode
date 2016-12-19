var mongoose = require('mongoose');
var Schema = mongoose.Schema,
		ObjectId = Schema.ObjectId;

var Message = new Schema({
	content:String,
	creator:{
		_id:ObjectId,
		avatarUrl:String,
		email:String,
		name:String
	},
	createAt:{
		type:Date,
		default:Date.now
	}
});

module.exports = Message