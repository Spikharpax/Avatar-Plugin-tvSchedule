/*
	Author: Stéphane Bascher
	Date: March-17-2015 - Version: 1.0 - Creation of the module
*/

var _ = require('underscore');
var moment = require('moment');
moment.locale('fr');

// Init js
var neTVClient = module.exports = function (opts) {
	
	if (!(this instanceof neTVClient)) {
		return new neTVClient(opts);
	}
	
	opts = opts || {};
	this.lang = this.lang || opts.lang;
	this.msg = this.msg || require('./lang/' + this.lang);
	this.avatar_client = this.avatar_client || opts.client;
	this.tvdb = this.tvdb || this.dbinit();
	this.debug = this.debug || opts.debug;
	this.fifo = this.fifo || opts.fifo;
	this.autoDestroy = this.autoDestroy || opts.autoDestroy;
	
	// Check program
	this.Tvcron = function (TVProgs) {this.dbTVCron(this.tvdb,0,TVProgs,this,this.dbTVCron)};
	// Save program
	this.TvSave = function (title,channelId,channelName) {this.dbTVSave(title,channelId,channelName)};
	
	this.RememberRecord = function (title, date, hour, duration,channelID,channelName) {this.dbRememberRecord(title, date, hour, duration,channelID,channelName) };
	
	this.isRecords = function () { this.isRecordedProgram()};
	
	this.removeRemembers = function () { this.removeRememberPrograms()};
}


// Init nedb database
neTVClient.prototype.dbinit = function () {
	var dbstore = require('nedb'),
	    dbfile = __dirname + '/db/tvSchedule.db',
	    db = new dbstore({ filename: dbfile});
	db.loadDatabase();
	return db; 
}


neTVClient.prototype.removeRememberPrograms = function () {
	
	var client = this;
	client.tvdb.find({Recorded: false}, function (err, docs) {
		if (err){
			info("Enable to retrieve recorded programs to removing, error:", err);
			return;
		}

		if (docs.length > 0) {			
			Avatar.speak(client.msg.localized('remembertoRemove').replace('%d',docs.length), client.avatar_client, function() {
				client.removeProgs(docs,0,client,client.removeProgs);
			});
		} else {
			Avatar.speak(client.msg.localized('noRemembertoRemove'), client.avatar_client, function() {
				Avatar.Speech.end(client.avatar_client);
			});
		}
	});
}


neTVClient.prototype.removeProgs = function (docs,pos,client,callback) {
	
	if (!callback || pos == docs.length) {
		Avatar.speak(client.msg.localized('askend'), client.avatar_client, function() {
				Avatar.Speech.end(client.avatar_client);
		});
		return;
	}
	
	Avatar.askme(client.msg.localized('askRemoveProgram').replace('%s',docs[pos].Title), client.avatar_client , 
	Config.modules.tvSchedule.askRemoveProgs,
	0, function(answer, end){	
		switch (answer) {
			case 'yes':
				client.tvdb.remove({ _id: docs[pos]._id }, function (err, numRemoved) {
					if (numRemoved > 0)
						var tts = client.msg.localized('removedProg').replace('%s',docs[pos].Title);
					else
						var tts = client.msg.localized('no_removedProg').replace('%s',docs[pos].Title);
					
					Avatar.speak(client.msg.localized('removedProg').replace('%s',docs[pos].Title), client.avatar_client, function() {
						setTimeout(function(){
							callback(docs,++pos,client,callback);
						}, 1000);
						if ((pos + 1) == docs.length) {
							end(client.avatar_client,true);
						} else {
							end(client.avatar_client);	
						}
					});
				});
				break;
			case 'no':		
				Avatar.speak(client.msg.localized('backtoType'), client.avatar_client, function() {
					setTimeout(function(){
						callback(docs,++pos,client,callback);
					}, 1000);
					if ((pos + 1) == docs.length) {
						end(client.avatar_client,true);
					} else
						end(client.avatar_client);				
				});
				break;
			case 'cancel':	
				Avatar.speak(client.msg.localized('terminateAsk'), client.avatar_client, function() {
					end(client.avatar_client,true);		
				});
				break;
		}
	});

}


neTVClient.prototype.dbTVCron = function (db,pos,TVProgs,client,callback) {
	if (!callback || pos == TVProgs.length) {
		return;
	}
	// current date & hour
	var date = moment().format("YYYY-MM-DD"),
	    currentDate = moment().format("YYYY-MM-DDTHH:mm");
	
	db.findOne({Recorded: false, Title: TVProgs[pos].title}, function (err, doc) {
		if (err){
				return error('Enable to retrieve db scheduled programs', err.red);
		}
		
		if (doc) {
			var hourStart = TVProgs[pos].hourStart.replace('H',':').replace('h',':');
			var isTime = istvtime(date+'T'+hourStart,currentDate);
			if (client.debug) info('Show time for', TVProgs[pos].title);	
			if (isTime == true) {
				Avatar.call('scenariz', {command: 'saveCron', 
										program: client.msg.localized('rememberProgram').replace('%s',TVProgs[pos].title).replace('%d',hourStart),
										name: client.msg.localized('rememberProgram').replace('%s',TVProgs[pos].title).replace('%d',hourStart),
										exec: 'true',
										order: '1',
										plug: 'tvSchedule',
										start: hourStart+'-1111111',
										key: 'command=tvExec~title='+TVProgs[pos].title+'~hour='+hourStart+'~duration='+TVProgs[pos].duration+'~channelID='+TVProgs[pos].channelId.toString()+'~channelName='+TVProgs[pos].channelName+'~client=currentRoom',
										autodestroy: client.autoDestroy,
										mute: 'true',	
										client: 'Salon',
										cronClient : 'currentRoom',
										fifo: client.fifo
										}, function(cb){ 
											setTimeout(function(){
												callback (db,++pos,TVProgs,client,callback);
											}, 1000);
									});	
			} else if (isTime == 'now') {			
				Avatar.call('tvSchedule', {command: 'tvExec', 
										  client: client.avatar_client,
										  title: TVProgs[pos].title,
										  hour: hourStart,
										  duration: TVProgs[pos].duration,
										  channelID: TVProgs[pos].channelId,
										  channelName: TVProgs[pos].channelName
										}, function(cb){ 
											setTimeout(function(){
												callback (db,++pos,TVProgs,client,callback);
											}, 20000);
									});			
			} else
				callback (db,++pos,TVProgs,client,callback);
		} else
			callback (db,++pos,TVProgs,client,callback);
	});
}




neTVClient.prototype.isRecordedProgram = function () {
	
	var client = this;
	client.tvdb.find({Recorded: true}, function (err, docs) {
		if (err){
			info("Enable to retrieve db recorded programs, error:", err);
			return;
		}
		
		if (docs.length > 0) {
			// Buble sort
			for (var i=0;i<docs.length;i++) {
				for (var a=0;a<docs.length;a++) {
					var tempdoc = {};
					if ( moment(docs[a].Date+'T'+docs[a].Hour).isAfter(docs[i].Date+'T'+docs[i].Hour) == true) {
						tempdoc = docs[i];
						docs[i] = docs[a];
						docs[a] = tempdoc;
					} 
				}
				if (i+1 == docs.length) {
					Avatar.speak(client.msg.localized('recordedProgram').replace('%d',docs.length), client.avatar_client, function() {
						setTimeout(function(){
							client.sayRecordedProg(docs,0,client,client.sayRecordedProg);
						}, 1000);
					});
				}
			}
		} else {
			Avatar.speak(client.msg.localized('noRecordedProgram'), client.avatar_client, function() {
				Avatar.Speech.end(client.avatar_client);
			});
		}
	});
}


neTVClient.prototype.sayRecordedProg = function (docs,pos,client,callback) {
	
	if (!callback || pos == docs.length) {
		Avatar.Speech.end(client.avatar_client);
		return;
	}
	
	var currentDate = moment().format("YYYY-MM-DD"),
		diffDays = moment(currentDate+'T'+docs[pos].Hour).diff(docs[pos].Date+'T'+docs[pos].Hour,"days");
	
	switch (diffDays) {
		case 0: // aujourd'hui
				var msg = client.msg.localized('TodayRecordedProgram').replace('%d',docs[pos].Hour);
				break;
		case 1: // hier
				var msg = client.msg.localized('YesterdayRecordedProgram').replace('%d',docs[pos].Hour);
				break;
		case 2: // avant-hier
				var msg = client.msg.localized('BeforeYesterdayRecordedProgram').replace('%d',docs[pos].Hour);
				break;
		default: // Direct le nombre de jours
				var msg = client.msg.localized('BeforeRecordedProgram').replace('%r',diffDays).replace('%d',docs[pos].Hour);
				break;
	}
		
	Avatar.speak(msg + client.msg.localized('sayRecordedProgram').replace('%s',docs[pos].Title).replace('%i',docs[pos].ChannelName), client.avatar_client, function() {
			client.tvdb.remove({ _id: docs[pos]._id }, function (err, numRemoved) {
				setTimeout(function(){
					callback(docs,++pos,client,callback);
				}, 1000);
			});
	});
}



neTVClient.prototype.dbTVSave = function (title,channelId,channelName) {
	
	var client = this;
	client.tvdb.findOne({Recorded:false, Title:title, ChannelId: channelId, ChannelName: channelName}, function (err, docfound) {
			if (err){
				error("Enable to retrieve Schedule Cron, error:", err.red);
				return;
			}
			
			if (!docfound) {
				client.tvdb.insert({
							Recorded: false,
							Title: title,
							ChannelId: channelId,
							ChannelName: channelName
					}, function(err, newDoc){
						if (!newDoc) 
							Avatar.speak(client.msg.err_localized('cron_not_saved').replace('%s',title), client.avatar_client);
						else 
							Avatar.speak(client.msg.localized('cron_saved').replace('%s',title), client.avatar_client);
					});		
			} else {
				Avatar.speak(client.msg.err_localized('tvProgExist').replace('%s',title), client.avatar_client);	
			}
	});		
}



neTVClient.prototype.dbRememberRecord = function (title, date, hour, duration,channelId,channelName) {
	var client = this;
	client.tvdb.findOne({Recorded: true, Title:title, Date:date, Hour:hour, Duration: duration, ChannelId: channelId, ChannelName: channelName}, function (err, docfound) {
			if (err){
				return error("Enable to retrieve recorded program, error:", err.red);
			}
			
			if (!docfound) {
				client.tvdb.insert({
							Recorded: true,
							Title: title,
							Date: date,
							Hour: hour,
							Duration: duration,
							ChannelId: channelId,
							ChannelName: channelName
					}, function(err, newDoc){
						if (!newDoc) 
							if (client.debug) info(client.msg.err_localized('recorded_cron_not_saved').replace('%s',title));
						else 
							if (client.debug) info(client.msg.localized('cron_saved').replace('%s',title));
				});		
			} 
			// else
				// client.SARAH.speak(client.msg.err_localized('recorded_cron_exist').replace('%s',title));			
	});	
}



// is it a good time ?
var istvtime = function (docDate, currentDate) {

	var addedDate = moment(currentDate).add(5, 'minutes').format("YYYY-MM-DDTHH:mm");
	if (moment(docDate).isAfter(addedDate) == true || moment(docDate).isSame(addedDate) == true)
		return true;
	else if (moment(docDate).isSame(currentDate)== true)
		return 'now';
	else
		return -1;

}