var utils = require(__base + 'sharedUtils/sharedUtils.js');

global.window = global.document = global;

class ReferenceGameServer {
  constructor(expName) {
    this.expName = expName;
    this.core = require([__base, expName, 'game.core.js'].join('/')).game_core;
    this.player = require([__base, expName, 'game.core.js'].join('/')).game_player;
    this.customServer = require([__base, expName, 'game.server.js'].join('/'));
    this.setCustomEvents = this.customServer.setCustomEvents;
    
    // Track ongoing games
    this.games = {};
    this.game_count = 0;
  }

  // if game relies on asynchronous stim logic, need to wait until everything
  // is fetched before starting game (otherwise race conditions)
  startGame(game) {
    game.active = true;
    game.newRound();
  }
  /*
    Writes data specified by experiment instance to csv and/or mongodb
  */
  writeData (client, eventType, message_parts) {
    var output = this.customServer.dataOutput;
    var game = client.game;
    if(_.has(output, eventType)) {
      var dataPoint = _.extend(output[eventType](client, message_parts), {eventType});
      if(_.includes(game.dataStore, 'csv'))
	utils.writeDataToCSV(game, dataPoint);
      if(_.includes(game.dataStore, 'mongo'))
	utils.writeDataToMongo(game, dataPoint); 
    }
  }

  onMessage (client, message) {
    var message_parts = message.split('.');
    this.customServer.onMessage(client, message);
    if(!_.isEmpty(client.game.dataStore)) {
      this.writeData(client, message_parts[0], message_parts);
    }
  }

  findGame (player) {
    this.log('looking for a game. We have : ' + this.game_count);
    var joined_a_game = false;
    var game;
    for (var gameid in this.games) {
      game = this.games[gameid];
      if(game.player_count < game.players_threshold) {
	// End search
	joined_a_game = true;

	// Add player to game
	game.player_count++;
	game.players.push({
	  id: player.userid,
	  instance: player,
	  player: new this.player(game, player)
	});

	// Add game to player
	player.game = game;
	player.role = game.playerRoleNames.role2;
	player.send('s.join.' + game.players.length + '.' + player.role);

	// notify existing players that someone new is joining
	_.map(game.get_others(player.userid), function(p){
	  p.player.instance.send( 's.add_player.' + player.userid);
	});
      }
    }
    
    // If you couldn't find a game to join, create a new one
    if(!joined_a_game) {
      game = this.createGame(player);
    }

    // Start game
    if(game.players_threshold == game.player_count) {
      this.startGame(game);
    }
  };

  // Will run when first player connects
  createGame (player) {
    //Create a new game instance
    var options = {
      expName: this.expName,
      server: true,
      id : utils.UUID(),
      player_instances: [{id: player.userid, player: player}],
      player_count: 1
    };
    
    var game = new this.core(options);
    
    // assign role
    player.game = game;
    player.role = game.playerRoleNames.role1;
    player.send('s.join.' + game.players.length + '.' + player.role);
    this.log('player ' + player.userid + ' created a game with id ' + player.game.id);

    // add to game collection
    this.games[game.id] = game;
    this.game_count++;

    return game;
  }; 

  // we are requesting to kill a game in progress.
  // This gets called if someone disconnects
  endGame (gameid, userid) {
    var thegame = this.games[gameid];
    if(thegame) {
      // Remove the person who dropped out
      var i = _.indexOf(thegame.players, _.find(thegame.players, {id: userid}));
      thegame.players[i].player = null;

      // If game is ongoing and someone drops out, tell other players and end game
      // If game is over, remove game when last player drops out
      console.log("active: " + thegame.active);
      if(thegame.active || thegame.get_active_players().length < 1) {
	_.map(thegame.get_others(userid),function(p) {
	  p.player.instance.send('s.end');
	});
	delete this.games[gameid];
	this.game_count--;
	this.log('game removed. there are now ' + this.game_count + ' games' );
      } 
    } else {
      this.log('that game was not found!');
    }   
  }; 
  
  // A simple wrapper for logging so we can toggle it, and augment it for clarity.
  log () {
    console.log.apply(this,arguments);
  };
};

module.exports = ReferenceGameServer;

