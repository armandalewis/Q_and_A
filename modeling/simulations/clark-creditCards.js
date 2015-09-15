///fold:
var identity = function(x){return x;};

var negate = function(predicate){
  return function(x){
    return !predicate(x);
  };
};

var condition = function(x){
  var score = x ? 0 : -Infinity;
  factor(score);
};

var mean = function(thunk){
  return expectation(Enumerate(thunk), function(v){return v;});
};

var KL = function(erpTrue, erpApprox){
  var values = erpTrue.support([]);
  var xs = map(
    function(value){
      var p = Math.exp(erpTrue.score([], value));
      var q = Math.exp(erpApprox.score([], value));
      if (p == 0.0){
        return 0.0;
      } else {
        return p * Math.log(p / q);
      }
    },
    values);
  return sum(xs);
};

var flatten = function(xs){
  if (xs.length == 0) {
    return [];
  } else {
    return xs[0].concat(flatten(xs.slice(1)));
  }
};

var setsEqual = function(a1, a2){
  var s1 = a1.slice().sort();
  var s2 = a2.slice().sort();
  return JSON.stringify(s1) === JSON.stringify(s2);
}

var powerset = function(set) {
  if (set.length == 0)
    return [[]];
  else {
    var rest = powerset(set.slice(1));
    return map(
      function(element) {
        return [set[0]].concat(element);
      },
      rest).concat(rest);
  }
}

var mapReduce1 = function(f,g,ar){
  // specialized to above reduce
  return reduce(function(a,b) { return f(g(a),b); }, g(ar[ar.length-1]), ar.slice(0,-1));
};

var all = function(p,l) { 
  return mapReduce1(function(a,b){ return a & b; }, p, l); };

var permute = function (input) {
  var input = input.slice();
  var permArr = [];
  var usedChars = [];
  var doPerm = function() {
    if (input.length == 0) {
      permArr.push(usedChars.slice());
    }
    map(
      function(i) {
        var ch = input.splice(i, 1)[0];
        usedChars.push(ch);
        doPerm();
        usedChars.pop();
        input.splice(i, 0, ch);
      },
      _.range(input.length));
  };
  doPerm();
  return permArr;
};


var getFilteredCardList = function(world) {
  var cardList = map(function(value) {
    var hasCard = world[value];
    if(hasCard) {
      return value;
    } else {
      return []
    }
  }, _.keys(world))

  var filteredCardList = filter(function(val){
    if(_.isEmpty(val))
      return false
    else
      return true
  }, cardList)

  return filteredCardList;
}

var cartesianProductOf = function(listOfLists) {
    return reduce(function(b, a) {
        return _.flatten(map(function(x) {
          console.log(x)
            return map(function(y) {
              console.log(y)
              return x.concat(y);
            }, b);
          }, a), true);
  }, [[]], listOfLists);
};

// Sometimes you just need all possible combination of true and false
var TFCartesianProd = function(n) {
  var inner_fun = function(n, result) {
    if (n == 0)
      return result
    else
      return inner_fun(n-1, result.concat([['true','false']]))
  }
  var result = inner_fun(n, [])
  console.log(result)
  return cartesianProductOf(result);
}

var butLast = function(xs){
  return xs.slice(0, xs.length-1);
};

var uniformDraw = function (xs) {
  return xs[randomInteger(xs.length)];
};

///


// --------------------------------------------------------------------

var cardTypes = ['Visa','MasterCard', 'AmericanExpress', 'Diners', 'CarteBlanche']

// Reflect real probabilities of acceptance from Clark
var worldPrior = function(){
	return {
		'Visa' : flip(0.5),
		'MasterCard' : flip(0.5),
		'AmericanExpress' : flip(0.5),
		'Diners' : flip(0.5),
		'CarteBlanche' : flip(0.5)
	}
  // return {
  // 	'Visa' : flip(0.72),
  // 	'MasterCard' : flip(0.71),
  // 	'AmericanExpress' : flip(0.38),
  // 	'Diners' : flip(0.12),
  // 	'CarteBlanche' : flip(0.1)
  // }
};

var masterCardQuestion = "Do you accept MasterCard?";
var masterCardQuestionMeaning = function(world){
  return world['MasterCard']
};

var AmericanExpressQuestion = "Do you accept American Express?";
var AmericanExpressQuestionMeaning = function(world){
  return world['AmericanExpress']
};

var creditCardsQuestion = "Do you accept credit cards?";
var creditCardsQuestionMeaning = function(world){
  return _.some(_.values(world))
};

var anyKindsQuestion = "Do you accept any kinds of credit cards?";
var anyKindsQuestionMeaning = function(world){
  return _.some(_.values(world))
};

var questions = [masterCardQuestion, AmericanExpressQuestion, 
                 creditCardsQuestion, anyKindsQuestion];

var questionPrior = function(){
  return uniformDraw(questions);
};

var cardAnswerSpace = powerset(cardTypes);

// Say 'yes' 'no' or some combination of cards
var answerPrior = function(){
  // prefer yes/no over detailed answer
  return flip(0.2) ? uniformDraw(["yes", "no"]) : uniformDraw(cardAnswerSpace);
};

var cardAnswerMeaning = function(cardList){
  return function(questionMeaning){
    return function(world){
      return _.every(map(function(card) {
      	return world[card];
      }, cardList))
    };
  };
};

var booleanAnswerMeaning = function(bool){
  return function(questionMeaning){
    return function(world){
      if (questionMeaning == masterCardQuestionMeaning){
        return (world['MasterCard'] == bool);
      } else if (questionMeaning == AmericanExpressQuestionMeaning){
      	return (world['AmericanExpress'] == bool);
      } else if (questionMeaning == creditCardsQuestionMeaning 
      	         || questionMeaning == anyKindsQuestionMeaning){
      	return (_.some(_.values(world)) == bool);
      }
    }
  }
}

var containsUtterance = function(utterance) {
	var filteredList = filter(function(x) {
		return _.isEqual(x, utterance)
	},cardAnswerSpace)
	return !_.isEmpty(filteredList)
}

var meaning = function(utterance){
  return ((utterance === "yes") ? booleanAnswerMeaning(true) :
          (utterance === "no") ? booleanAnswerMeaning(false) :
          containsUtterance(utterance) ? cardAnswerMeaning(utterance) :
          (utterance === masterCardQuestion) ? masterCardQuestionMeaning :
          (utterance === AmericanExpressQuestion) ? AmericanExpressQuestionMeaning :
          (utterance === creditCardsQuestion) ? creditCardsQuestionMeaning :
          (utterance === anyKindsQuestion) ? anyKindsQuestionMeaning :
          console.error('unknown utterance!', utterance));
};

var literalListener = cache(function(question, answer){
  return Enumerate(function(){
    var world = worldPrior();
    var questionMeaning = meaning(question);
    var answerMeaning = meaning(answer);
    condition(answerMeaning(questionMeaning)(world));
    return world;
  });
});

var literalAnswerer = cache(function(question, trueWorld){
  return Enumerate(
    function(){
      var answer = answerPrior();
      factor(literalListener(question, answer).score([], trueWorld) * 3);
      return answer;
    }
  );
});

var qudMasterCard = function(world){return world['MasterCard'];};
var qudMasterPlusDiners = function(world){return world['MasterCard'] | world['Diners']};
var qudMasterExpressDiners = function(world){return world['AmericanExpress'] | world['MasterCard'] | world['Diners']};
var qudNames = function(world) {return getFilteredCardList(world)}
var qudAny = function(world) {return _.any(_.values(world))}

var qudSpace = ["qudMasterCard", "qudMasterPlusDiners", 
	            "qudMasterExpressDiners", "qudNames"];

var qudPrior = function(){
	return uniformDraw(qudSpace);
};

var nameToQUD = function(qudName){
  return (qudName == "qudMasterCard" ? qudMasterCard :
    qudName == "qudAmericanExpress" ? qudAmericanExpress :
    qudName == "qudMasterPlusDiners" ? qudMasterPlusDiners :
    qudName == "qudMasterExpressDiners" ? qudMasterExpressDiners :
    qudName == "qudAny" ? qudAny :
    qudName == "qudNames" ? qudNames :
    console.error('unknown qud name', qudName));
};

var questioner = function(qudName) {
  var qud = nameToQUD(qudName);
  return Enumerate(function(){
    var question = questionPrior();
    var prior = Enumerate(function(){
      return qud(worldPrior());
    });
    var expectedKL = mean(
      function(){
      	var trueWorld = worldPrior();
      	var answer = sample(literalAnswerer(question, trueWorld));
      	var posterior = Enumerate(function(){
      		var world = sample(literalListener(question, answer));
      		return qud(world);
      	});
      	return KL(posterior, prior);
      });
    factor(expectedKL * 3);

    return question;
	});
};

var pragmaticAnswerer = function(question, trueWorld){
  var qudPosterior = Enumerate(function(){
    var qudName = qudPrior();
    var qud = nameToQUD(qudName);
    var q_erp = questioner(qudName);
    factor(q_erp.score([], question));
    return qudName;
  });
  qa.printERP(qudPosterior)
  return Enumerate(function(){
    var qudName = sample(qudPosterior);
    var qud = nameToQUD(qudName);
    var truthfulAnswerPrior = Enumerate(function(){
      var answer = answerPrior();
      factor(literalListener(question, answer).score([], trueWorld));
      return answer
    })
    // Pick answer conditioned on communicating question predicate value
    var answer = sample(truthfulAnswerPrior);
    var score = mean(
      function(){
        var inferredWorld = sample(literalListener(question, answer));
        return (qud(trueWorld) == qud(inferredWorld)) ? 1.0 : 0.0;
      });
    factor(Math.log(score) * 3);
    return answer;
  });
};

var world = {
      'Visa' : false,
      'MasterCard' : true,
      'AmericanExpress' : false,
      'Diners' : true,
      'CarteBlanche' : false
  };

console.log("any kinds of credit cards?")
qa.printERP(pragmaticAnswerer(creditCardsQuestion, world))

console.log("mastercard?")
qa.printERP(pragmaticAnswerer(masterCardQuestion, world))