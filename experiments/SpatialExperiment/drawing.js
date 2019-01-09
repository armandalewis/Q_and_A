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
  console.log(event.data);
  var game = event.data.game;

  // Stop letting people click stuff
  $('#advance_button').show().attr('disabled', 'disabled');
  disableCards(game.selections);
  game.revealedCards = game.revealedCards.concat(game.selections);
  var timeElapsed = Date.now() - game.messageReceivedTime;
  game.socket.send("reveal.human." + timeElapsed + '.' +
		   game.selections.join('.'));
  game.messageSent = false;
  game.selections = [];
};

function handleButton(game) {
  // Disable or enable button to fit logic
  if(game.selections.length > 0) {
    $('#advance_button').removeAttr('disabled');
  } else {
    $('#advance_button').attr('disabled', 'disabled');
  }
}

function handleHighlighting(game, imgSelector, name) {
  var alreadyClicked = _.includes(game.selections, name);
  var cellSelector = imgSelector.parent();
  if(alreadyClicked) {
    _.remove(game.selections, obj => obj == name);    
    cellSelector.css({'border-color' : 'white', 'border-width' : '1px'});
  } else if (game.selections.length < 2) {
    game.selections.push(name);
    cellSelector.css({'border-color' : '#32CD32', 'border-width' : '5px'});
  }
  $('#feedback').empty().append(game.selections.length +
				'/2 possible cards selected');
}

function setupHandlers(game) {
  $('#context img').click(function(event) {
    var name = $(this).attr('data-name');
    if(game.messageSent) {
      handleHighlighting(game, $( this ), name);
      handleButton(game);
    }
  });
}

function initGrid(game) {
  // Add objects to grid
  _.forEach(_.range(1, 5), x => {
    _.forEach(_.range(1, 5), y => {
      var div = $('<div/>')
	  .attr({style: `border: solid 1px #FFFFFF; \
                         background-color: black; grid-column: ${x}; grid-row: ${y}`});
      var obj = _.find(game.objects, {'gridX' : x, 'gridY' : y});
      // Put image in grid if it exists
      if(!_.isUndefined(obj)){
	var visible = (game.my_role == game.playerRoleNames.role1 ?
		       'display: none' : '');
	div.append($('<img/>').attr({
	  height: '100%', width: '65%', src: obj.url, 'data-name' : obj.name,
	  style : `margin-left: auto; margin-right: auto; \
                   vertical-align: middle; ${visible}`
	}));
      }
      // Put haze in questioner's grid
      if(game.my_role == game.playerRoleNames.role1) {
	div.append($('<img/>').attr({
	  height: '100%', width: '100%', src: 'images/haze.jpg',
	  id: 'haze-' + x + y,
	  style : `margin-left: auto; margin-right: auto; \
                   vertical-align: middle;`
	}));
      } 
      $("#context").append(div);
    });
  });
  $("#context").fadeIn();
  // Unbind old click listeners if they exist
  $('#context img')
    .off('click');

  // Allow listener to click on things
  if (game.my_role === game.playerRoleNames.role2) {
    game.selections = [];
    setupHandlers(game); 
  }
}

function fadeInSelections(cards){
    _.forEach(cards, name => {
      var col = $(`img[data-name="${name}"]`).parent().css('grid-column')[0];
      var row = $(`img[data-name="${name}"]`).parent().css('grid-row')[0];
      $('#haze-' + col + row).hide();
      $(`img[data-name="${name}"]`)
	.css({opacity: 0.0})
	.show()
	.css({opacity: 1, 'transition': 'opacity 2s linear'});
    });
  }

function disableCards(cards) {
    _.forEach(cards, (name) => {
      // Disable card
      console.log('disabling' + cards);
      var cardElement = $(`img[data-name="${name}"]`);
      cardElement.css({'transition' : 'opacity 1s', opacity: 0.2});
      cardElement.off('click');
      cardElement.parent().css({'border-color' : 'white', 'border-width': '1px'});
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
    $('#feedback').append('0/2 possible cards selected');
    $('#advance_button').show()
      .attr('disabled', 'disabled')
      .click({game: game}, advanceRound);
    $('#instructs')
      .append("<p>After your partner types their question, </p>" 
	      + "<p>select up to <b>two</b> cards to complete their combo!</p>");
  }
  drawScreen(game);
}

module.exports = {
  confetti,
  drawScreen,
  disableCards,
  fadeInSelections,
  reset
};
