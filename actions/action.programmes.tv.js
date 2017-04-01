'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _helpers = require('../../node_modules/ava-ia/lib/helpers');


exports.default = function (state) {
	
	return new Promise(function (resolve, reject) {
		var period, day, weekday;
		
		for (var rule in Config.modules.tvSchedule.rules) {
			var match = (0, _helpers.syntax)(state.sentence, Config.modules.tvSchedule.rules[rule]); 
			if (match) break;
		}
		
		for (var rule_period in Config.modules.tvSchedule.periods) {
			for (var i=0; i < Config.modules.tvSchedule.periods[rule_period].length; i++) {
				if (state.rawSentence.toLowerCase().indexOf(Config.modules.tvSchedule.periods[rule_period][i].toLowerCase()) != -1) {
					period = rule_period;
					break;
				}
			}
		}
		
		var tbldays = (Config.modules.tvSchedule.jours).split(',');
		for (var i=0; i < tbldays.length; i++) {
			if (state.rawSentence.toLowerCase().indexOf(tbldays[i].toLowerCase()) != -1) {
				day = tbldays[i];
				if (tbldays[i].toLowerCase() != "aujourd'hui") weekday = "true";
				break;
			}
		}
		
		setTimeout(function(){ 
			if (state.debug) info('ActionTVSchedule'.bold.yellow);
			
			state.action = {
				module: 'tvSchedule',
				command: rule,
				period: period,
				day: day,
				weekday: weekday
			};
			resolve(state);
		}, 500);	
		
	});
};



