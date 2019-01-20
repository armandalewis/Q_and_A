var _ = require('lodash');
var fs    = require('fs');
var assert = require('assert');
var utils  = require(__base + 'src/sharedUtils.js');
var config = require('./config.json');

function makeGoalObject (goals) {
  var goalNames = _.map(_.range(goals.length), v=>'g' + v);
  return _.zipObject(goalNames, goals);
};

function getAllLocs() {
  return _.flattenDeep(_.map(_.range(1,5), function(i) {
    return _.map(_.range(1,5), function(j) {
      return {x: i, y: j};
    });
  }));
};

function sampleStimulusLocs (numObjects) {
  var locs = getAllLocs();
  return _.sampleSize(locs, numObjects);
}

class RefGameExperiment {
  constructor() {
    this.trialList = [];
    this.numRounds = config.numRounds;
//    this.objects = require('./images/objects.json');
    this.firstRole = _.sample(['leader'])//, 'helper']);
  }
  
  customEvents (socket) {
    socket.on('allCardsFound', function(data) {
      var all = socket.game.activePlayers();
      setTimeout(function() {
	_.map(all, function(p){
	  p.player.instance.emit( 'updateScore', data);
	});
       }, 1000);
      socket.game.newRound(4000);
    });
  }

  // *
  // * TrialList creation
  // *

  // 3 trials of each row, counterbalanced
  sampleMapSequence () {
    var types = ['catch'];
    return _.map(types, type => {return {mapType: type, role: this.firstRole}});
  }

  constructMap (trialInfo) {
    console.log(trialInfo);
    if(trialInfo.mapType == 'catch') {
      return {full: {A1: 'g', A2: 'g', A3: 'g', A4: 'g',
		     B1: 'g', B2: 'g', B3: 'g', B4: 'g',
		     C1: 'r', C2: 'r', C3: 'r', C4: 'r',
		     D1: 'r', D2: 'r', D3: 'r', D4: 'r'},
	      initRevealed: ['A1', 'A2'],
	      role: trialInfo.role};
    } else {
      console.error('map type ' + trialInfo.mapType + ' not yet implemented');
    }
  }

  // Take condition as argument
  // construct context list w/ statistics of condition
  makeTrialList () {
    var trialSequence = this.sampleMapSequence();
    console.log(trialSequence);

    // Construct trial list (in sets of complete rounds)
    for (var i = 0; i < this.numRounds; i++) {
      var world = this.constructMap(trialSequence[i]); 
      this.trialList.push(world);
    };
    return this.trialList;
  };

  onMessage (client,message) {
    //Cut the message up into sub components
    var message_parts = message.split('.');

    //The first is always the type of message
    var message_type = message_parts[0];

    //Extract important variables
    var gc = client.game;
    var id = gc.id;
    var all = gc.activePlayers();
    var target = gc.getPlayer(client.userid);
    var others = gc.getOthers(client.userid);
    switch(message_type) {
    
    case 'chatMessage' :
      if(client.game.playerCount == gc.playersThreshold && !gc.paused) {
	var msg = message_parts[2].replace(/~~~/g,'.');
	_.map(all, function(p){
	  p.player.instance.emit( 'chatMessage', {
	    user: client.userid, msg: msg, code: message_parts[1]
	  });
	});
      }
      break;

    case 'reveal' :
      _.map(all, function(p){
	p.player.instance.emit('reveal', {selections: message_parts.slice(3)});
      });
      break;

    case 'exitSurvey' :
      console.log(message_parts.slice(1));
      break;
      
    case 'h' : // Receive message when browser focus shifts
      //target.visible = message_parts[1];
      break;
    }
  };

  /*
    Associates events in onMessage with callback returning json to be saved
    {
    <eventName>: (client, message_parts) => {<datajson>}
    }
    Note: If no function provided for an event, no data will be written
  */
  dataOutput () {
    function commonOutput (client, message_data) {
      //var target = client.game.currStim.target;
      //var distractor = target == 'g1' ? 'g0' : 'g1';
      console.log(client.game.currStim);
      return {
	iterationName: client.game.iterationName,
	gameid: client.game.id,
	time: Date.now(),
	workerId: client.workerid,
	assignmentId: client.assignmentid,
	trialNum: client.game.roundNum,
	trialType: client.game.currStim.currGoalType,
	// targetGoalSet: client.game.currStim.goalSets[target],
	// distractorGoalSet: client.game.currStim.goalSets[distractor],
	firstRole: client.game.firstRole
      };
    };
    
    var revealOutput = function(client, message_data) {
      var selections = message_data.slice(3);
      var allObjs = client.game.currStim.hiddenCards;
      return _.extend(
	commonOutput(client, message_data), {
	  sender: message_data[1],
	  timeFromMessage: message_data[2],
	  revealedObjs : selections,
	  numRevealed : selections.length,
	  fullContext: JSON.stringify(_.map(allObjs, v => {
	    return _.omit(v, ['rank', 'suit', 'url']);
	  }))
	});
    };
    

    var exitSurveyOutput = function(client, message_data) {
      var subjInfo = JSON.parse(message_data.slice(1));
      return _.extend(
	_.omit(commonOutput(client, message_data),
	       ['targetGoalSet', 'distractorGoalSet', 'trialType', 'trialNum']),
	subjInfo);
    };
    

    var messageOutput = function(client, message_data) {
      return _.extend(
	commonOutput(client, message_data), {
	  cardAskedAbout: message_data[1],
	  sender: message_data[4],
	  timeFromRoundStart: message_data[3]
	}
      );
    };

    return {
      'chatMessage' : messageOutput,
      'reveal' : revealOutput,
      'exitSurvey' : exitSurveyOutput
    };
  }
}

module.exports = new RefGameExperiment();
