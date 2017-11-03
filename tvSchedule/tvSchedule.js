var moment = require('moment');
var msg; 
var debug;

require('colors');


exports.init = function(){
	
	// init global variables
	msg = require('./lang/' + Config.modules.tvSchedule.locale);
	debug = Config.modules.tvSchedule.debug;
	
}


// Cron
exports.cron = function(data){
	
	var Avatar_client; 
	if (Avatar.currentRoom) {
		info('tvSchedule cron:', 'current room by sensor:', Avatar.currentRoom.yellow);
		Avatar_client = Avatar.currentRoom;
	}
	// 2: default
	if (!Avatar_client) {
		info('tvSchedule cron:', 'current room by default client:', Config.default.client.yellow);
		Avatar_client = Config.default.client;
	}
	
	// Client présent ?
	if (!Avatar.Socket.getClientSocket(Avatar_client))
		return info('tvSchedule Cron:', 'Le client n\'est pas connecté'.yellow);

	var tvSchedule = require('./tvScheduledb')({
		lang: Config.modules.tvSchedule.locale,
		client: Avatar_client,
		fifo: 'false',
		autoDestroy: 'true',
		debug: debug
	});
		
	var tblbouquet = Config.modules.tvSchedule.bouquet.split(','),
		TVprogs = [],
		period = getTimePeriod(moment().format("HH:mm"));	
	
	TVBouquet(Avatar_client, period, Config.modules.tvSchedule.jour, tblbouquet, 0, tblbouquet.length, TVprogs, TVBouquet, function (TVProgs) {
		tvSchedule.Tvcron(TVProgs);
	});		
	
}



exports.action = function(data, callback){
  
	var tblCommand = {
		// What // actuellement, soiree, soiree2, jour 
		tvProgram: function() { var tblbouquet = Config.modules.tvSchedule.bouquet.split(','),
								TVprogs = [],
								period = ((!data.action.period) ? Config.modules.tvSchedule.period : data.action.period),
								day = ((!data.action.day) ? Config.modules.tvSchedule.jour : data.action.day); 
								
								if (data.action.weekday && period.indexOf('-') == -1) {
									Avatar.speak(msg.err_localized('errornoperiod'), data.client, function() {
										Avatar.Speech.end(data.client);
									}); 
								} else {
									var tts = msg.localized('programs') + " ";
									if (data.action.day) { tts += data.action.day + " " };
									if (period.indexOf('-') != -1) { tts += msg.ttsSearch(-period)}
									else if (period == 'actuellement') { tts +=  msg.ttsSearch(13)}
									else if (period == 'soiree') { tts += msg.ttsSearch(14)}
									else if (period == 'soiree2') { tts +=  msg.ttsSearch(15)}
									tts += msg.ttsSearch(0);
									Avatar.speak(tts, data.client, function(){
										TVBouquet(data.client, period, day, tblbouquet, 0, tblbouquet.length, TVprogs, TVBouquet, function (TVProgs) { 
											askTVType (data.client, TVProgs, msg.localized('askTVType'), day);
										});
									}); 
								}
								},
		tvExec: function() { TVExec(data.client, data.action.title, data.action.hour, data.action.duration, data.action.channelID, data.action.channelName)},
		recorded: function() {recordedProgram(data.client)},
		remove: function() {removeRemembers(data.client)}
	};
	
	info("tvSchedule command:", data.action.command.yellow, "From:", (data.client) ? data.client.yellow : 'unknow'.yellow);
	tblCommand[data.action.command]();
  
	callback();
  
}


var removeRemembers = function(client) {
										
	var tvCron = require('./tvScheduledb')({
		lang: Config.modules.tvSchedule.locale,
		client: client,
		fifo: 'false',
		autoDestroy: 'true',
		debug: debug});
	tvCron.removeRemembers();
}


var recordedProgram = function(client) {
		
	var tvCron = require('./tvScheduledb')({
		lang: Config.modules.tvSchedule.locale,
		client: client,
		fifo: 'false',
		autoDestroy: 'true',
		debug: debug});
	tvCron.isRecords();
}


var TVExec = function (client, title, hour, duration, channelID, channelName) {
	
	if (debug) info('TV program on', client.yellow);
		
	isPlayerOn ( function (state) {
		switch (state) {
			case true: 
			    var tts = msg.localized('TVProgramFound');
				tts = tts.split('|')[Math.floor(Math.random() * tts.split('|').length)].replace('%s',title).replace('%c',channelName);
				Avatar.askme(tts , client, 
				Config.modules.tvSchedule.askSetProgramTV
				, 0, function(answer, end){
					switch (answer) {
					case 'sommaire':
						end(client);
						Avatar.speak(msg.localized('tvFoundSommaire'), client, function(){
							setTimeout(function(){
								TVExec(client, title, hour, duration, channelID, channelName);
							}, 3000);
						}); 
						break;
					case 'yes':
						Avatar.speak(msg.localized('setTVProgram').replace('%s',title), client, function(){
							end(client,true);
							Avatar.call('freebox', {command: 'setChannel', key: channelID.toString(), client: client});
						}); 
						break; 
					case 'record':
						Avatar.speak(msg.localized('askRecordProgram'), client, function(){
							end(client,true);
							Avatar.call('freebox', {command: 'recordProgram', hour: hour, duration: duration, ID: channelID.toString(), afterRecord: true, client: client});
						}); 
						break; 
					case 'cancel':
					default:
						Avatar.speak(msg.localized('backtoType'), client, function(){	
							end(client,true);
						}); 
						break;			
					}					
				});
				break;
			case false:	
				Avatar.call('freebox', {command: 'recordProgram', hour: hour, duration: duration, ID: channelID.toString(), client: client}, function(cb){
					setTimeout(function(){			
						var tvCron = require('./tvScheduledb')({
							lang: Config.modules.tvSchedule.locale,
							client: client,
							fifo: 'false',
							autoDestroy: 'true',
							debug: debug});
						tvCron.RememberRecord(title,
											  moment().format("YYYY-MM-DD"),
											  hour,
											  duration,
											  channelID,
											  channelName);
					}, 20000);
				});
				break;
			default:
				info(msg.err_localized('errorFreebox').replace('%s',title));
				break;
		}
	});
}




var askTVType = function (client, TVProgs, tts, day) {
	
	Avatar.askme(tts, client,
	Config.modules.tvSchedule.askTVType
	, 0, function(answer, end){
		
		if (debug) info("TVType answer:", answer);
		
		if (answer != 'cancel' && answer != 'sommaire' && answer != false && answer.toLowerCase() != 'sarahcancel') {
			
			var count = 0;
			var tblTVType=[];
			
			for (var i=0; i < TVProgs.length; i++) {
				if (TVProgs[i].type == answer){
					TVProgs[i].hourStart = TVProgs[i].hourStart.replace('H',':').replace('h',':');
					var date = moment().format("YYYY-MM-DD"),	
						currentHour = moment().format("YYYY-MM-DDTHH:mm"),
						progHour = moment(date+'T'+ TVProgs[i].hourStart);
					if (moment(progHour).isBefore(currentHour) == true && TVProgs[i].duration) {
						var hour = TVProgs[i].duration.split(':').shift(),
						    mn = ((hour != '00') 
								? (parseInt(hour) * 60) + parseInt(TVProgs[i].duration.split(':').pop())
								: parseInt(TVProgs[i].duration.split(':').pop())),
						    endprog = moment(progHour).add(mn, 'minutes').format("YYYY-MM-DDTHH:mm");
		
						if (moment(endprog).isAfter(currentHour) == true) {
							tblTVType.push(TVProgs[i]);
							++count;
						}
					} else {
						tblTVType.push(TVProgs[i]);
						++count;
					}
				} 
			}
			if (count == 0) {
				var noProg = ((answer == 'otherType') ? msg.localized('unclassed') : answer);
				answer = 'noprog';
			}
		}
		
		switch (answer) {
			case 'noprog':
				end(client);
				Avatar.speak(msg.localized('noProg').replace('%s',noProg), client, function(){
					askTVType(client, TVProgs, msg.localized('askTVTypeNext'), day);
				}); 
				break;
			case 'sommaire':
				end(client);
				Avatar.speak(msg.localized('Sommaire'), client, function(){				
						askTVType(client, TVProgs, msg.localized('askTVType'), day);
				}); 
				break;
			case 'Documentaire':
			case 'Jeunesse':
			case 'Sport':
			case 'Téléfilm':
			case 'Film':
			case 'Information':
			case 'Culture':
			case 'Divertissement':
			case 'otherType':
			case 'Série':
				end(client);
				var tts;
				if (answer == 'Jeunesse' || answer == 'Sport' || answer == 'Information' || answer == 'Culture'|| answer == 'Divertissement') {
					if (answer == 'Jeunesse' || answer == 'Sport' || answer == 'Culture' || answer == 'Divertissement') {
						tts = msg.localized('nbprogs1').replace('%d',count).replace('%s',answer);
					} else {
						tts = msg.localized('nbprogs2').replace('%d',count).replace('%s',answer);		
					}
				} else if (answer == 'otherType') {
					tts = msg.localized('nbprogs3').replace('%d',count);
				} else
					tts = msg.localized('nbprogs').replace('%d',count).replace('%s',answer);
				
				Avatar.speak(tts, client, function() {
					speechTVProgs(client, true, TVProgs, tblTVType,0,tblTVType.length,day,speechTVProgs);
				});	
				break;
			case 'SARAHcancel':
			case 'Sarahcancel':
				Avatar.speak(msg.random_localized('terminateSarahAsk'), client, function() { 
					end(client, true);
				});	
				break;
			case 'cancel':
			default:
				Avatar.speak(msg.localized('terminateAsk'), client, function() { 
					end(client, true);
				});	
				break;
		}
	});
}



var speechTVProgs = function(client, flagtts, TVProgs, tblTVType, pos, count, day, callback) {
	
	if (!callback) return;
	if (pos == count) { 
		askTVType(client, TVProgs, msg.localized('askTVTypeNext'),day);
		return;
	}
	
	if (debug) {
		info("Channel:", tblTVType[pos].channelName);
	    info("Title:", tblTVType[pos].title);
	    info('hourStart:', tblTVType[pos].hourStart);
	}
	
	tblTVType[pos].hourStart = tblTVType[pos].hourStart.replace('H',':').replace('h',':');
	var flagStarted = false;
	if (day == msg.localized('today')) {
		var date = moment().format("YYYY-MM-DD"),	
			currentHour = moment().format("YYYY-MM-DDTHH:mm"),
			progHour = moment(date+'T'+ tblTVType[pos].hourStart);
		
		var diffMn = parseInt(progHour.diff(currentHour,"minutes"));
		if (debug == 'true') console.log("Difference of minutes: " + diffMn);	
		
		if (diffMn == 0) {
			flagStarted = true;
			var ttsHour = msg.localized('now') + ' ' + tblTVType[pos].hourStart;
		} else if (diffMn < 0) {
			flagStarted = true;
			diffMn = diffMn * -1;
			var hour = Math.floor(diffMn/60),
				Minutes = diffMn%60,
				ttsHour =  msg.localized('a') + ' ' + tblTVType[pos].hourStart + ' ' + msg.localized('startedBefore').replace('%d', ((hour > 0) ? hour + ' ' + msg.localized('hour') : '') + ((Minutes > 0) ? ' ' + Minutes + ' ' +  msg.localized('minute') : ''));
		} else if (diffMn > 0) {
			var ttsHour = msg.localized('a') + ' ' + tblTVType[pos].hourStart;
		}
	} else 
		var ttsHour = msg.localized('a') + ' ' + tblTVType[pos].hourStart;

	var tts;
	if (flagtts == true)
		tts = msg.localized('sur') + ' ' + tblTVType[pos].channelName + ' ' + ttsHour + ' ' + tblTVType[pos].title + ((tblTVType[pos].subtitle) ? ' ' + tblTVType[pos].subtitle : '');
	else
		tts = msg.localized('nextThing');
	
	Avatar.askme(tts, client,
	Config.modules.tvSchedule.askTVProgs
	, 0, function(answer, end){
		switch (answer) {
			case 'sommaire':
				end(client);
				Avatar.speak(msg.localized('speechTVProgsSommaire'), client,function(){
					callback (client, true, TVProgs, tblTVType, pos, count, day, callback);
				}); 
				break;	
			case 'recorder':
				end(client);
				TvCron(client, tblTVType[pos], function () {
					callback (client, false, TVProgs, tblTVType, pos, count, day, callback);
				});
				break;	
			case 'record':
				end(client);
				Avatar.speak(msg.localized('askRecordProgram'), client, function(){
					Avatar.call('freebox', {command: 'recordProgram', hour: tblTVType[pos].hourStart, duration: tblTVType[pos].duration, ID: tblTVType[pos].channelId.toString(), afterRecord: true, client: client}, function() {
						callback (client, false, TVProgs, tblTVType, pos, count, day, callback);
					});
				}); 
				break; 
			case 'setIt':
				end(client);
				if (day == msg.localized('today')) {
					Avatar.speak(msg.localized('setProgram').replace('%s',tblTVType[pos].title), client, function(){
						Avatar.call('freebox', {command: 'setChannel', client: client, key:tblTVType[pos].channelId.toString()}, function(cb){ 
							callback (client, false, TVProgs, tblTVType, pos, count, day, callback);
						});
					}); 
				} else {
					Avatar.speak(msg.localized('notimeSetProgram').replace('%s',tblTVType[pos].title), client, function(){
						callback (client, false, TVProgs, tblTVType, pos, count, day, callback);
					});
				}
				break; 
			case 'programme':
				end(client);
				if (!flagStarted) {
					recordProgram (client, tblTVType[pos].title, tblTVType[pos].channelId, tblTVType[pos].hourStart, day, function () {
						callback (client, false, TVProgs, tblTVType, pos, count, day, callback);
					});
				} else {
					Avatar.askme(msg.localized('alreadyStarted'), client, 
					Config.modules.tvSchedule.recordAlreadyStarted
					, 0, function(answerNext, end){
						end(client);
						switch (answerNext) {
						case 'yes':
							Avatar.call('freebox', {command: 'setChannel', client: client, key:tblTVType[pos].channelId.toString()}, function(cb){ 
								callback (client, false, TVProgs, tblTVType, pos, count, day, callback);
							});
							break; 
						case 'cancel':
						default:
							callback (client, false, TVProgs, tblTVType, pos, count, day, callback);
							break;			
						}					
					});
				}
				break;
			case 'again':
				end(client);
				callback (client, true, TVProgs, tblTVType, pos, count, day, callback);
				break;
			case 'hour':
				end(client);
				Avatar.speak((ttsHour), client, function(){
					callback (client, false, TVProgs, tblTVType, pos, count, day, callback);
				}); 
				break;
			case 'resume':
				end(client);
				Avatar.speak(((tblTVType[pos].resume) ? tblTVType[pos].resume : msg.localized('noresume')), client, function(){
					callback (client, false, TVProgs, tblTVType, pos, count, day, callback);
				}); 
				break;
			case 'done':
				end(client);
				Avatar.speak(msg.localized('backtoType'), client, function() { 
					callback (client, true, TVProgs, tblTVType, count, count, day, callback);
				});	
				break;
			case 'previous':
				end(client);
				if (pos == 0)
					Avatar.speak(msg.localized('minpos'), client, function() { 
						callback (client, true, TVProgs, tblTVType, pos, count, day,callback);
					});
				else {
					callback (client, true, TVProgs, tblTVType, --pos, count, day, callback);
				}
				break;
			case 'next':
				end(client);
				if (pos + 1 == tblTVType.length) {
					var type = ((tblTVType[pos].type == 'otherType') ? msg.localized('unclassed') : tblTVType[pos].type);
					Avatar.speak(msg.localized('endList').replace('%s',type) , client, function(){
						callback (client, true, TVProgs, tblTVType, ++pos, count, day, callback);	
					});
				} else {
					callback (client, true, TVProgs, tblTVType, ++pos, count, day, callback);
				}
				break;	
			case 'SARAHcancel':
			case 'Sarahcancel':
				Avatar.speak(msg.random_localized('terminateSarahAsk'), client, function() { 
					callback();
					end(client, true);
				});	
				break;
			case 'cancel':
			default:
				Avatar.speak(msg.random_localized('terminateAsk'), client, function() { 
					callback();
					end(client, true);
				});	
				break;
		}
	});
	
}



var recordProgram = function (client, title, channelId, hourStart, day, callback) {
	
	hourStart = hourStart.replace('H',':').replace('h',':');
	
	if (Avatar.exists('scenariz')) {
		
		var days = setPosDay(day);
		var ExecTask = {command:'saveCron', 
						client: client, 
						cronClient : 'currentRoom',
						program: msg.localized('recordProgram').replace('%s',title).replace('%d',hourStart),
						name: msg.localized('recordProgram').replace('%s',title).replace('%d',hourStart),
						exec : 'true',
						start: hourStart + days,
						ttsCron: msg.localized('speechProgram').replace('%s',title).replace('%d',hourStart),
						autodestroy : 'true',
						plug: 'freebox',
						key: 'command=setChannel~client=Salon~key=' + channelId.toString()
						};
		Avatar.call('scenariz', ExecTask, function(cb){ 
			setTimeout(function(){
				callback();
			}, 500);
		});
			
	} else {
		
		Avatar.speak(msg.err_localized('errorRecordProgram').replace('%s',title), client, function() {
			callback();
		});	
		
	}

}



var TvCron = function (client, program, callback) {

	if (program.title) {
		var tvCron = require('./tvScheduledb')({
					lang: Config.modules.tvSchedule.locale,
					client: client,
					fifo: 'false',
					autoDestroy: 'true',
					debug: debug});
		tvCron.TvSave(program.title,
					program.channelId,
					program.channelName);
		setTimeout(function(){
			callback();
		}, 3000);	
	} else {
		info(msg.err_localized('errorcron'));
		callback();	
	}
}


var isPlayerOn = function (callback) {
	
	if (!Avatar.exists('freebox'))
		callback(-1);
		
	var token = require('../freebox/node_modules/token/token')();
	token.PlayerOn(Config.modules.freebox.app_token, Config.modules.freebox.app_id, Config.modules.freebox.app_version, function(state) {  
		if (state == -1) {
			error('il n\'y a pas de jeton pour la freebox');
			return callback(-1);
		}
		callback(state);
	});
	
}



var TVBouquet = function (client, period, day, tblbouquet, pos, count, TVprogs, callback, callbacknext) {
	
	if (!callback) return;
	if (pos == count) return callbacknext(TVprogs);
	if (debug) info('period',period);
	var url = 'http://www.programme.tv/'
	
	moment.locale('fr');
	moment().weekday(1);
	var flagDay = false;
	if (day == 'aujourd\'hui') {
		if (period ==  Config.modules.tvSchedule.period) 
			url += period + '/' + tblbouquet[pos]; 
		else if (period == 'soiree')
			url += tblbouquet[pos];
		else if (period == 'soiree2') {
			var currentday = msg.dayOfWeek(parseInt(moment().weekday()));
			url += tblbouquet[pos] + '/'  + period + '/' + currentday + '.php';
		} else  {	
			var currentday = msg.dayOfWeek(parseInt(moment().weekday()));
			flagDay = true;
			url += tblbouquet[pos] + '/jour/'  + currentday + period + '.php';
		}
	} else {
		if (period == 'soiree' || period == 'soiree2') {
			url += tblbouquet[pos] + '/' + period +  '/' + day + '.php';
		} else {
			flagDay = true;
			url += tblbouquet[pos] + '/jour/'  + day + period + '.php';
		}
	}

	if (debug) info('url', url);
	
	getTVProg (url, function (body) { 
		if (!body) {
			Avatar.speak(msg.err_localized('errorgetProg'), client, function() { 
				Avatar.Speech.end(client);
			});
			callback();
		} else {
			if (!flagDay)
				scrap (body, tblbouquet[pos], TVprogs, function (TVprogs) { 
					callback(client, period, day, tblbouquet, ++pos, count, TVprogs, callback, callbacknext);			
				});
			else
				scrapDay (body, tblbouquet[pos], TVprogs, function (TVprogs) { 
					callback(client, period, day, tblbouquet, ++pos, count, TVprogs, callback, callbacknext);			
				});
		}
	}); 
}



var getTVProg = function (url,callback) {
	
	var request = require('request');
	request({ 'uri' : url }, function (err, response, body) {
		//var fs = require('fs');
		//fs.writeFileSync(__dirname + '/body.json', JSON.stringify(body), 'utf8');
		if (err || response.statusCode != 200) {
		  info('tvProg error',err.red);
		  return callback();
		} else 
			callback(body);
	});
}



var scrapDay = function(body, bouquet, TVprogs, callback) {
	
	var tvChannels = require('./tvChannels');
	var cherio = require('cheerio')
	var $ = cherio.load(body, { xmlMode: true, ignoreWhitespace: false, lowerCaseTags: false });
	
	$('div[class=progchaine]').each(function(index) {
		var channelName = $(this).find('.chaine a').attr('title').replace('Programme ', '');
		var flagfound = false;
	
		if (Config.modules.tvSchedule.MyChannelId.indexOf(channelName) != -1) {
			for (var i = 0; i< TVprogs.length; i++) {
				if (TVprogs[i].channelName == channelName) {
					flagfound = true;
					break;
				}
			}
			if (!flagfound) {
				
				var $1 = cherio.load($(this), { xmlMode: true, ignoreWhitespace: false, lowerCaseTags: false });
				$1('li').each(function(i, elem) {
					var hourStart = $(this).find('.heure').text();
					var title = trim($1(this).find('.titre').text());
					if (title && title != '') {
						var type = trim($1(this).find('.type-tag').text());
						if (type)
							var duration = trim($1(this).find('.details p').text());
						else {
							type = 'otherType';
							var duration = $(this).find('.duree').text();
						}
						if (duration && duration != '') {
							duration = duration.replace(type + ' - ', '');
							if (duration.indexOf('min') != -1) 
								duration = '00:' + duration.replace(' min','');
							duration = duration.replace('h', ':').replace('H', ':');
							duration = ((duration.indexOf (':') == 1) ? '0'+ duration : duration);
						} else {
							if (type == 'Film') {
								duration = Config.modules.tvSchedule.default_FilmDuration;
							} else {
								duration = Config.modules.tvSchedule.default_Duration;
							}
						}

						var channelId = tvChannels.ChannelId(channelName);		
						TVprogs.push({"bouquet" : bouquet, "type": type, "channelId" : channelId, "channelName" : channelName, "hourStart" : hourStart, "title" : title, "duration" : duration});
					}
				});
			}
		}
	});
	
	callback(TVprogs);
}


var scrap = function(body, bouquet, TVprogs, callback) {
	
  var tvChannels = require('./tvChannels');	
  
  var $ = require('cheerio').load(body, { xmlMode: true, ignoreWhitespace: false, lowerCaseTags: false });
 
  $('#programs li:not(.pub)').each(function(index) {
    var channelName = $(this).find('.bheader a').attr('title').replace('Programme ', '');
    var flagfound = false;
	if (Config.modules.tvSchedule.MyChannelId.indexOf(channelName) != -1) {
		for (var i = 0; i< TVprogs.length; i++) {
			if (TVprogs[i].channelName == channelName) {
				flagfound = true;
				break;
			}
		}
		if (!flagfound) {
			var hourStart = $(this).find('.hour').text();
			var title = $(this).find('.bcontent a').attr('title');
			if (title == '' || title == undefined) 
				title = $(this).find('.bcontent h3').text(); 
			var subtitle = $(this).find('.bcontent .subtitle a').attr('title');
			if (subtitle == '' || subtitle == undefined)  
				subtitle = trim($(this).find('.bcontent .subtitle').text()); 
			subtitle = subtitle.replace(title, '');
			var type = $(this).find('.type').text();
			if(!type) type = 'otherType';
			var	resume = trim($(this).find('.bcontent .resume').text()); 
			
			var channelId = tvChannels.ChannelId(channelName);	
			TVprogs.push({"bouquet" : bouquet, "type": type, "channelId" : channelId, "channelName" : channelName, "hourStart" : hourStart, "title" : title, "subtitle" : subtitle, "resume" : resume});
		}
	} 
  });

  callback(TVprogs);
 
}



function trim(sString) {
    while (sString.substring(0,1) == ' ' || sString.substring(0,1) == '\t' || 
      sString.substring(0,1) == '\r' || sString.substring(0,1) == '\n')
    {
        sString = sString.substring(1, sString.length);
    }
    while (sString.substring(sString.length-1, sString.length) == ' ' || 
      sString.substring(sString.length-1, sString.length) == '\t' || 
      sString.substring(sString.length-1, sString.length) == '\r' || 
      sString.substring(sString.length-1, sString.length) == '\n')
    {
        sString = sString.substring(0,sString.length-1);
    }
    return sString;
}


var setPosDay = function (day) {

	if (day == msg.localized('today')) day = msg.dayOfWeek(parseInt(moment().weekday()))
	switch (day) {
	case msg.dayOfWeek(0): return "-1000000";
	case msg.dayOfWeek(1): return "-0100000";
	case msg.dayOfWeek(2): return "-0010000";
	case msg.dayOfWeek(3): return "-0001000";
	case msg.dayOfWeek(4): return "-0000100";
	case msg.dayOfWeek(5): return "-0000010";
	case msg.dayOfWeek(6): return "-0000001";
	default:  			   return "-1111111";
	}
}


var getTimePeriod = function (hour) {
	
	var date = moment().format("YYYY-MM-DD"),
		TvProgHour = date+ 'T' + hour,
	    zero = moment().hour(0).minute(0).format("YYYY-MM-DDTHH:mm"),
		deux = moment().hour(2).minute(0).format("YYYY-MM-DDTHH:mm"),
		quatre = moment().hour(4).minute(0).format("YYYY-MM-DDTHH:mm"),
		six = moment().hour(6).minute(0).format("YYYY-MM-DDTHH:mm"),
		huit = moment().hour(8).minute(0).format("YYYY-MM-DDTHH:mm"),
		dix = moment().hour(10).minute(0).format("YYYY-MM-DDTHH:mm"),
		douze = moment().hour(12).minute(0).format("YYYY-MM-DDTHH:mm"),
		quatorze = moment().hour(14).minute(0).format("YYYY-MM-DDTHH:mm"),
		seize = moment().hour(16).minute(0).format("YYYY-MM-DDTHH:mm"),
		dixhuit = moment().hour(18).minute(0).format("YYYY-MM-DDTHH:mm"),
		vingt = moment().hour(20).minute(0).format("YYYY-MM-DDTHH:mm"),
		vingtdeux = moment().hour(22).minute(0).format("YYYY-MM-DDTHH:mm"),
		minuit = moment(vingtdeux).add(2, 'hours').format("YYYY-MM-DDTHH:mm");
		
	if ((moment(TvProgHour).isAfter(zero) == true && moment(TvProgHour).isBefore(deux) == true) || moment(TvProgHour).isSame(zero)== true )
		return '-1';
	if ((moment(TvProgHour).isAfter(deux) == true && moment(TvProgHour).isBefore(quatre) == true) || moment(TvProgHour).isSame(deux)== true ) 
		return '-2';
	if ((moment(TvProgHour).isAfter(quatre) == true && moment(TvProgHour).isBefore(six) == true) || moment(TvProgHour).isSame(quatre)== true ) 
		return '-3';
	if ((moment(TvProgHour).isAfter(six) == true && moment(TvProgHour).isBefore(huit) == true) || moment(TvProgHour).isSame(six)== true ) 
		return '-4';
	if ((moment(TvProgHour).isAfter(huit) == true && moment(TvProgHour).isBefore(dix) == true) || moment(TvProgHour).isSame(huit)== true ) 
		return '-5';
	if ((moment(TvProgHour).isAfter(dix) == true && moment(TvProgHour).isBefore(douze) == true) || moment(TvProgHour).isSame(dix)== true )
		return '-6';
	if ((moment(TvProgHour).isAfter(douze) == true && moment(TvProgHour).isBefore(quatorze) == true) || moment(TvProgHour).isSame(douze)== true ) 
		return '-7';
	if ((moment(TvProgHour).isAfter(quatorze) == true && moment(TvProgHour).isBefore(seize) == true) || moment(TvProgHour).isSame(quatorze)== true )
		return '-8';
	if ((moment(TvProgHour).isAfter(seize) == true && moment(TvProgHour).isBefore(dixhuit) == true) || moment(TvProgHour).isSame(seize)== true )
		return '-9';
	if ((moment(TvProgHour).isAfter(dixhuit) == true && moment(TvProgHour).isBefore(vingt) == true) || moment(TvProgHour).isSame(dixhuit)== true )
		return '-10';
	if ((moment(TvProgHour).isAfter(vingt) == true && moment(TvProgHour).isBefore(vingtdeux) == true) || moment(TvProgHour).isSame(vingt)== true ) 
		return '-11';
	if ((moment(TvProgHour).isAfter(vingtdeux) == true && moment(TvProgHour).isBefore(minuit) == true) || moment(TvProgHour).isSame(vingtdeux)== true )
		return '-12';
}
