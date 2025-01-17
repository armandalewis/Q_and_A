
/*  Copyright (c) 2012 Sven "FuzzYspo0N" Bergström,
                  2013 Robert XD Hawkins

 written by : http://underscorediscovery.com
    written for : http://buildnewgames.com/real-time-multiplayer/

    substantially modified for collective behavior experiments on the web
    MIT Licensed.
*/

/*
  The main game class. This gets created on both server and
  client. Server creates one for each game that is hosted, and each
  client creates one for itself to play the game. When you set a
  variable, remember that it's only set in that instance.
*/

var has_require = typeof require !== 'undefined';

if( typeof _ === 'undefined' ) {
  if( has_require ) {
    _ = require('lodash');
    utils  = require(__base + 'sharedUtils/sharedUtils.js');
    assert = require('assert');
  }
  else throw 'mymodule requires underscore, see http://underscorejs.org';
}

var game_core = function(options){
  // Store a flag if we are the server instance
  this.server = options.server ;

  // Some config settings
  this.email = 'rxdh@stanford.edu';
  this.projectName = 'QA';
  this.experimentName = 'cards';
  this.iterationName = 'single_player_sample';
  this.anonymizeCSV = true;
  this.bonusAmt = 5; // in cents
  
  // save data to the following locations (allowed: 'csv', 'mongo')
  this.dataStore = ['csv', 'mongo'];

  // How many players in the game?
  this.players_threshold = 1;
  this.playerRoleNames = {
    role1 : 'seeker',
    role2 : 'helper'
  };

  //Dimensions of world in pixels and numberof cells to be divided into;
  this.numHorizontalCells = 4;
  this.numVerticalCells = 4;
  this.cellDimensions = {height : 300, width : 300}; // in pixels
  this.cellPadding = 0;
  this.world = {
    height: 600 * 2,
    width: 600 * 2
  };
  
  // Which round are we on (initialize at -1 so that first round is 0-indexed)
  this.roundNum = -1;

  // How many rounds do we want people to complete?
  this.numRounds = 6;
  this.feedbackDelay = 300;
  this.revealedCards = [];
  
  // This will be populated with the objectst
  this.trialInfo = {};

  if(this.server) {
    this.id = options.id; 
    this.expName = options.expName;
    this.active = false;
    this.firstRole = _.sample(['seeker', 'helper']);
    this.player_count = options.player_count;
    this.objects = require('./images/objects.json');
    this.trialList = this.makeTrialList();
    this.data = {
      id : this.id,
      subject_information : {
	score: 0,
        gameID: this.id
      }
    };
    this.players = [{
      id: options.player_instances[0].id,
      instance: options.player_instances[0].player,
      player: new game_player(this,options.player_instances[0].player)
    }];
    this.streams = {};
  } else {
    // If we're initializing a player's local game copy, create the player object
    this.confetti = new Confetti(300);
    this.players = [{
      id: null,
      instance: null,
      player: new game_player(this)
    }];
  }
};

var game_player = function( game_instance, player_instance) {
  this.instance = player_instance;
  this.game = game_instance;
  this.role = '';
  this.message = '';
  this.id = '';
};

// server side we set some classes to global types, so that
// we can use them in other files (specifically, game.server.js)
if('undefined' != typeof global) {
  module.exports = {game_core, game_player};
}

// HELPER FUNCTIONS

// Method to easily look up player
game_core.prototype.get_player = function(id) {
  var result = _.find(this.players, function(e){ return e.id == id; });
  return result.player;
};

// Method to get list of players that aren't the given id
game_core.prototype.get_others = function(id) {
  var otherPlayersList = _.filter(this.players, function(e){ return e.id != id; });
  var noEmptiesList = _.map(otherPlayersList, function(p){return p.player ? p : null;});
  return _.without(noEmptiesList, null);
};

// Returns all players
game_core.prototype.get_active_players = function() {
  var noEmptiesList = _.map(this.players, function(p){return p.player ? p : null;});
  return _.without(noEmptiesList, null);
};

game_core.prototype.newRound = function(delay) {
  var players = this.get_active_players();
  if(this.roundNum == this.numRounds - 1) {
    this.active = false;
    try {
      setTimeout(function() {   
	_.forEach(players, p => p.player.instance.send('s.end'));
      }, delay);
    } catch(err) {
      console.log('player did not exist to disconnect');
    }
  } else {
    // Otherwise, get the preset list of tangrams for the new round
    this.roundNum += 1;

    this.trialInfo = {
      currStim: this.trialList[this.roundNum],
      currGoalType: this.contextTypeList[this.roundNum]
    };

    var state = this.makeSnapshot();
    setTimeout(function() {
      _.forEach(players, p => p.player.instance.emit( 'newRoundUpdate', state));
    }, delay);
  }
};

// Take condition as argument
// construct context list w/ statistics of condition
game_core.prototype.makeTrialList = function () {
  var that = this;
  var trialList = [];
  this.contextTypeList = [];
  this.repetitionList = [];
  
  // Keep sampling until we get a suitable sequence
  var sequence = this.sampleGoalSequence();

  // Construct trial list (in sets of complete rounds)
  for (var i = 0; i < this.numRounds; i++) {
    var trialInfo = sequence[i];
    this.contextTypeList.push(trialInfo['goalType']);

    var world = this.sampleTrial(trialInfo); 
    trialList.push(world);
  };
  return trialList;
};

var makeGoalObject = function(goals) {
  var goalNames = _.map(_.range(goals.length), v=>'g' + v);
  return _.zipObject(goalNames, goals);
};

game_core.prototype.sampleGoalSet = function(goalType, hiddenCards) {
  var numGoals = 2;
  if(goalType == 'catch') {
    return makeGoalObject(_.map(_.sampleSize(hiddenCards, numGoals), v => [v.name]));
  } else if(goalType == 'overlap') {
    var overlappingGoal = _.sampleSize(hiddenCards, 1)[0]['name'];
    var otherGoals = _.filter(hiddenCards, v => v.name != overlappingGoal);
    return makeGoalObject(_.map(_.sampleSize(otherGoals, 2),
				v => [v.name, overlappingGoal]));
  } else if(goalType == 'baseline') {
    var goal1 = _.map(_.sampleSize(hiddenCards, 2), 'name');
    var others = _.filter(hiddenCards, v => !_.includes(goal1, v.name));
    var goal2 = _.map(_.sampleSize(others, 2), 'name');
    return makeGoalObject([goal1, goal2]);
  } else if(goalType == 'practice') {
    return makeGoalObject([_.map(_.sampleSize(hiddenCards, 2), 'name')]);
  } else {
    console.error('goal type ' + goalType + ' not yet implemented');
  }
};

// 3 trials of each row, counterbalanced
game_core.prototype.sampleGoalSequence = function() {
  var types = ['overlap', 'catch', 'baseline'];
  var batch1 = _.map(_.shuffle(types), type => {
    return {goalType: type,
	    numCards: _.sample(_.range(5, 9)),
	    role: this.firstRole};
  });
  var batch2 = _.map(_.shuffle(types), type => {
    return {goalType: type,
	    numCards: _.sample(_.range(5, 9)),
	    role: this.firstRole == 'seeker' ? 'helper' : 'seeker'};
  });
  
  return _.concat(batch1, batch2);
};

game_core.prototype.sampleTrial = function(trialInfo) {
  // Sample set of hidden cards
  var hiddenCards = _.sampleSize(this.objects, trialInfo.numCards);

  // Sample the goal sets and pick one to be the target
  var goalSets = this.sampleGoalSet(trialInfo.goalType, hiddenCards);
  var target = _.sample(_.keys(goalSets));
  
  // Sample places to put cards
  var locs = this.sampleStimulusLocs(trialInfo.numCards);
  return _.extend({}, trialInfo, {
    goalSets,
    target,
    hiddenCards: _.map(hiddenCards, function(obj, index) {
      return _.extend({}, obj, {
	gridX: locs[index]['x'],
	gridY: locs[index]['y']
      });
    })
  });
};

function getAllLocs() {
  return _.flattenDeep(_.map(_.range(1,5), function(i) {
    return _.map(_.range(1,5), function(j) {
      return {x: i, y: j};
    });
  }));
};

game_core.prototype.sampleStimulusLocs = function(numObjects) {
  var locs = getAllLocs();
  return _.sampleSize(locs, numObjects);
};

game_core.prototype.makeSnapshot = function(){
  // Add info about all players
  var player_packet = _.map(this.players, function(p){
    return {id: p.id, player: null};
  });
  
  var state = {
    active : this.active,
    dataObj  : this.data,
    roundNum : this.roundNum,
    trialInfo: this.trialInfo,
    allObjects: this.objects
  };

  _.extend(state, {players: player_packet});
  _.extend(state, {instructions: this.instructions});

  return state;
};
