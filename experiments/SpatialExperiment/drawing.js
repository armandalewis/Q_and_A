var Confetti = require('./src/confetti.js');
var confetti = new Confetti(300);

// This gets called when someone selects something in the menu during the 
// exit survey... collects data from drop-down menus and submits using mmturkey
function dropdownTip(data){
  var commands = data.split('::');
  switch(commands[0]) {
  case 'human' :
    $('#humanResult').show();
    globalGame.data = _.extend(globalGame.data, 
			       {'thinksHuman' : commands[1]}); break;
  case 'language' :
    globalGame.data = _.extend(globalGame.data, 
			       {'nativeEnglish' : commands[1]}); break;
  case 'partner' :
    globalGame.data = _.extend(globalGame.data,
			       {'ratePartner' : commands[1]}); break;
  case 'confused' :
    globalGame.data = _.extend(globalGame.data,
			       {'confused' : commands[1]}); break;
  case 'submit' :
    globalGame.data = _.extend(globalGame.data, 
			       {'comments' : $('#comments').val(),
				'strategy' : $('#strategy').val(),
				'role' : globalGame.my_role,
				'totalLength' : Date.now() - globalGame.startTime});
    globalGame.submitted = true;
    console.log("data is...");
    console.log(globalGame.data);
    if(_.size(globalGame.urlParams) >= 4) {
      globalGame.socket.send("exitSurvey." + JSON.stringify(globalGame.data));
      window.opener.turk.submit(globalGame.data, true);
      window.close(); 
    } else {
      console.log("would have submitted the following :")
      console.log(globalGame.data);
    }
    break;
  }
}

var advanceRound = function(event) {
  var game = event.data.game;
  var timeElapsed = Date.now() - game.messageReceivedTime;
  game.revealedCells = game.revealedCells.concat(game.selections);  
  game.socket.send("reveal.human." + timeElapsed + '.' +
		   game.selections.join('.'));
  game.messageSent = false;
  game.selections = [];
};

function setupLeaderHandlers(game) {
  $('img.pressable').click(function(event) {
    // Log as revealed
    var buttonName = $(this).attr('id').split('-')[1];
    game.revealedCells.push(buttonName);
    game.checkGrid();
    // replace button with underlying state
    $(this).siblings().show().css({'opacity' : 1});
    $(this).remove();
  });
}

function initGrid(game) {
  // Add objects to grid
  _.forEach(['A','B','C','D'], (rowName, i) => {
    _.forEach(_.range(1,5), (colName, j) => {
      var underlying = game.fullMap[rowName + colName];
      var initialize = _.includes(game.initRevealed, rowName + colName);
      var div = $('<div/>').css({position: 'relative'});
      var underlyingState = $('<img/>')
	  .addClass('underlying_' + underlying)
	  .attr({'id' : 'underlying-state-' + rowName + colName})
	  .css({'grid-row': i, 'grid-column': j,
		'z-index': 1, position: 'absolute', left:'0px'});
      div.append(underlyingState);

      if(game.my_role == game.playerRoleNames.role1 && !initialize) {
	//underlyingState.css({display: 'none'});
	div.append($('<img/>')
		   .addClass('pressable')
		   .attr({'id' : 'button-'+rowName+colName})
		   .css({'z-index' : 2, position: 'absolute'}));
      }
      // } else if(game.my_role == game.playerRoleNames.role2 && initialize) {
      // 	underlyingState.css({'opacity' : .25, 'pointer-events' : 'none'});
      // }
      $("#context").append(div);
    });
  });
  $("#context").fadeIn();
  // Unbind old click listeners if they exist
  $('#context img')
    .off('click');

  // Allow listener to click on things
  game.selections = [];
  if (game.my_role === game.playerRoleNames.role1) {
    setupLeaderHandlers(game);
  }
}

function fadeInSelections(cells){
  _.forEach(cells, loc => {
    // Move state to front
    $('#underlying-state-' + loc)
      .css({'z-index': 3});
    // Fade in
    $('#underlying-state-' + loc)
      .css({opacity: 0, 'pointer-events' : 'none'})
      .show()
      .css({opacity: 0.25, 'transition': 'opacity 1s linear'});
  });
}

function fadeOutSelections(cells) {
  _.forEach(cells, (name) => {
    var cellElement = $('#underlying-state-' + name);
    cellElement.css({'transition' : 'opacity 1s', opacity: 0.2});
  });
}

function drawScreen (game) {
  var player = game.getPlayer(game.my_id);
  if (player.message) {
    $('#waiting').html(this.player.message);
  } else {
    $('#waiting').html('');
    confetti.reset();
    initGrid(game);
  }
};

function reset (game, data) {
  $('#chatbutton').removeAttr('disabled');
  $('#scoreupdate').html(" ");
  if(game.roundNum + 1 > game.numRounds) {
    $('#roundnumber').empty();
    $('#instructs').empty()
      .append("Round\n" + (game.roundNum + 1) + "/" + game.numRounds);
  } else {
    $('#feedback').empty();
    $('#roundnumber').empty()
      .append("Round\n" + (game.roundNum + 1) + "/" + game.numRounds);
  }

  $('#main').show();

  // reset labels
  // Update w/ role (can only move stuff if agent)
  $('#roleLabel').empty().append("You are the " + game.my_role + '.');
  $('#instructs').empty();
  if(game.my_role === game.playerRoleNames.role1) {
    $('#chatarea').show();      
    $('#instructs')
      .append("<p>Fill in the question so your partner</p> " +
	      "<p>can help you complete the highlighted combo!</p>");
  } else if(game.my_role === game.playerRoleNames.role2) {
    $('#chatarea').hide();
    $('#instructs')
      .append("<p>After your partner types their question, </p>" 
	      + "<p>select up to <b>two</b> cards to complete their combo!</p>");
  }
  drawScreen(game);
}

module.exports = {
  confetti,
  drawScreen,
  fadeOutSelections,
  fadeInSelections,
  reset
};
