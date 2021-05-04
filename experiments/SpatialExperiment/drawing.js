var Confetti = require('./src/confetti.js');
var confetti = new Confetti(300);

// This gets called when someone selects something in the menu during the 
// exit survey... collects data from drop-down menus and submits using mmturkey
function dropdownTip(event){
  var game = event.data.game;
  var data = $(this).find('option:selected').val();
  console.log(data);
  var commands = data.split('::');
  switch(commands[0]) {
  case 'language' :
    game.data = _.extend(game.data, {'nativeEnglish' : commands[1]}); break;
  case 'partner' :
    game.data = _.extend(game.data, {'ratePartner' : commands[1]}); break;
  case 'didCorrectly' :
    game.data = _.extend(game.data, {'confused' : commands[1]}); break;
  }
}

function submit (event) {
  $('#button_error').show();
  var game = event.data.game;
  game.data = _.extend(game.data, {
    'comments' : $('#comments').val().trim(),
    'strategy' : $('#strategy').val().trim(),
    'role' : game.my_role,
    'totalLength' : Date.now() - game.startTime
  });
  game.submitted = true;
  console.log("data is...");
  console.log(game.data);
  console.log(game.socket);
  game.socket.send("exitSurvey." + JSON.stringify(game.data));
  if(_.size(game.urlParams) >= 4) {//AL I DONE THINK THIS SHOULD CHANGE
    window.opener.turk.submit(game.data, true);
    window.close(); 
  } else {
    console.log("would have submitted the following :")
    console.log(game.data);
  }
}

function initBombMap(game) {
  // Add objects to grid
  console.log(game.fullMap);
  _.forEach(['A','B','C','D'], (rowName, i) => {
    _.forEach(_.range(1,5), (colName, j) => {
      var underlying = game.fullMap[rowName + colName];
      var div = $('<div/>').css({position: 'relative'});
      if(underlying == 'x') {
	div.append($('<img/>')
		   .addClass('bomb')
		   .css({'grid-row': i, 'grid-column': j,
			 'z-index': 1, position: 'absolute', left:'0px'}));
      } else {
	div.append($('<div/>')
		   .css({'background' : 'url("../../images/checkmark.png") no-repeat',
			 'background-size' : 'cover',
			 'height' : '100%', 'width' : '100%',
			 'grid-row': i, 'grid-column': j,
			 'z-index': 1, position: 'absolute', left:'0px'}));
      }
      $("#bomb-map").append(div);
    });
  });
  $("#bomb-map").fadeIn();
  $("#map").append(
    $('<span/>')
      .text('Secret bomb map')
      .css({'position' : 'absolute', 'bottom' : '0vh',
	    'margin-left': '-15vh', 'width' : '30vh', 'text-align' : 'center',
	    'font-size' : '150%'})
  );
}

// Add objects to grid
function initGrid(game) {
  _.forEach(['A','B','C','D'], (rowName, i) => {
    _.forEach(_.range(1,5), (colName, j) => {
      var underlying = game.fullMap[rowName + colName];
      var initialize = _.includes(game.revealedCells, rowName + colName);
      var div = $('<div/>').css({position: 'relative'});

      // It's hard to draw lines in a CSS grid so this is a hack to do so
      if(game.my_role == game.playerRoleNames.role1) {
	var shadow = (game.goal == 'columns' ?
		      '0px -1vh 0px 0vh #000000, 0px 1vh 0px 0vh #000000, ' +
		      '-1vh 0px 0px 1vh #F24495, 1vh 0px 0px 1vh #F24495' :
		      '-1vh 0px 0px 0vh #000000, 1vh 0px 0px 0vh #000000, ' +
		      '0px -1vh 0px 1vh #3f95ff, 0px 1vh 0px 1vh #3f95ff');
	div.css({'box-shadow': shadow});
      }

      // Create the underlying tiles according to game map
      var underlyingState = $('<div/>')
	    .addClass('underlying_' + underlying)
	    .attr({'id' : 'underlying-state-' + rowName + colName})
	    .css({'grid-row': i, 'grid-column': j,
		  'z-index': 1, position: 'absolute', left:'0px'});
      div.append(underlyingState);

      // Cover up the ones that aren't designated for initial board
      if(!initialize) {
	underlyingState.hide();
	var button = $('<div/>')
	  .addClass('pressable')
	  .attr({
	    'id' : 'button-'+rowName+colName,
	    'style' : ('background: url("../../images/unpressedCell-' +
		       rowName + colName + '.png") no-repeat;' +
		       'background-size :cover; z-index: 2; position: absolute')
	  });
	div.append(button);
	var questionMark = $('<div/>').addClass('pressable')
	      .attr({'id' : 'questionMark' + rowName + colName,
		     'style' : ('background: url("../../images/unpressedCell-question.png") no-repeat;' +
				'display:none;background-size :cover; z-index: 2; position: absolute')});
	div.append(questionMark);
      }

      $("#context").append(div);
    });
  });

  // Now show whole grid
  $("#context").fadeIn();
}

function fadeInSelections(cells){
  _.forEach(cells, loc => {
    // Delete question marks since these are now impossible to ask about again...
    $('#questionMark' + loc)
      .css({opacity:1})
      .css({opacity: 0, 'transition': 'opacity 1s linear'})
      .remove();
    // $('#button-' + loc)
    //   .css({opacity:1})
    //   .css({opacity: 0, 'transition': 'opacity 0.5s linear'});
    
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

function fadeInQuestionMark(cell){
  // Move state to front
  $('#questionMark' + cell)
    .css({'z-index': 3});
  // Fade in
  $('#questionMark' + cell)
    .css({opacity: 0, 'pointer-events' : 'none'})
    .show()
    .css({opacity: 1, 'transition': 'opacity 1s linear'});
}

function drawScreen (game) {
  var player = game.getPlayer(game.my_id);
  if (player.message) {
    $('#waiting').html(this.player.message);
  } else {
    $('#waiting').html('');
    confetti.reset();
    initGrid(game);
    if(game.my_role == game.playerRoleNames.role2) {
      initBombMap(game);
    }    
  }
};

function reset (game, pointInTime) {
  if(pointInTime == 'answerReceived') {
    $('#safeness_choice').hide();
    game.answerSent = true;
    game.questionSent = false;
  } else if (pointInTime == 'questionReceived') {
    $('#answer_button').removeAttr('disabled');
    $('#goal_query').show();
    game.answerSent = false;
    game.questionSent = true;
  } else if (pointInTime == 'newRound') {
    game.roundOver = false;
    $('#goal_query').hide();
    game.questionNum = 0;
    game.questionSent = false;
    game.answerSent = false;
    game.getPlayer(game.my_id).message = "";
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
      var style_tag = game.goal == 'columns' ? '<b style="color:#F24495">' : '<b style="color:#3f95ff">';
      var goal_tag = game.goal == 'columns' ? 'COLUMN' : 'ROW';
      $('#leaderchatarea').show();
      $('#helperchatarea').hide();          
      $('#instructs')
	.append("<p>Your goal this round is... " + style_tag + "COMPLETE ANY " + goal_tag + "</b>.</p>" +
		"<p> Ask your partner a question to avoid the bombs!");
    } else if(game.my_role === game.playerRoleNames.role2) {
      $('#leaderchatarea').hide();
      $('#helperchatarea').show();
      $('#instructs')
	.append("<p>After your partner types their question</p>" +
		"<p>check your bomb map and help them!</p>");
    }
    drawScreen(game);
  } else {
    console.log('unknown reset param');
  }
}

module.exports = {
  confetti,
  drawScreen,
  fadeInQuestionMark,
  fadeInSelections,
  dropdownTip,
  submit,
  reset
};
