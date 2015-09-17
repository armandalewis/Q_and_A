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

var allFalse = function(boolList) {
  return reduce(function(val, memo) {
    return !val && memo;
  }, true, boolList)
}

var butLast = function(xs){
  return xs.slice(0, xs.length-1);
};

var uniformDraw = function (xs) {
  return xs[randomInteger(xs.length)];
};

///


// --------------------------------------------------------------------

//   ---------------
// | World knowledge |
//   ---------------

var cardTypes = ['Visa','MasterCard', 'AmericanExpress', 'Diners', 'CarteBlanche'];

var cardPowerSet = powerset(cardTypes);

var cardLikelihoods = {
  'Visa' : 0.72,
  'MasterCard' : 0.71,
  'AmericanExpress' : 0.5,
  'Diners' : 0.12,
  'CarteBlanche' : 0.10
};

// Reflect real probabilities of acceptance from Clark
var worldPrior = function(){
  return {
    'Visa' : flip(cardLikelihoods['Visa']),
    'MasterCard' : flip(cardLikelihoods['MasterCard']),
    'AmericanExpress' : flip(cardLikelihoods['AmericanExpress']),
    'Diners' : flip(cardLikelihoods['Diners']),
    'CarteBlanche' : flip(cardLikelihoods['CarteBlanche'])
  };
};

var hasCard = function(world, card) {
  if(_.contains(_.keys(world), card))
    return world[card];
  else
    return false;
};

//  -------------------
// | Question knowledge |
//  -------------------

var masterCardQuestion = "Do you accept Master Card?";
var masterCardQuestionMeaning = function(world){
  return world['MasterCard'];
};

var VisaQuestion = "Do you accept Visa card?";
var VisaQuestionMeaning = function(world){
  return world['Visa'];
};

var dinersQuestion = "Do you accept Diners card?";
var dinersQuestionMeaning = function(world){
  return world['Diners'];
};

var carteBlancheQuestion = "Do you accept Carte Blanche?";
var carteBlancheQuestionMeaning = function(world){
  return world['CarteBlanche'];
};

var AmericanExpressQuestion = "Do you accept American Express?";
var AmericanExpressQuestionMeaning = function(world){
  return world['AmericanExpress'];
};

var creditCardsQuestion = "Do you accept credit cards?";
var creditCardsQuestionMeaning = function(world){
  return _.some(_.values(world));
};

var questions = [masterCardQuestion, AmericanExpressQuestion, VisaQuestion,
                 dinersQuestion, carteBlancheQuestion,
                 creditCardsQuestion];

// Penalize questions for their length
var questionPrior = function(){
  var q = uniformDraw(questions);
  factor(- Math.log(q.split(' ').length));
  return q;
};

//  -----------------
// | Answer knowledge |
//  -----------------

var cardAnswerSpace = powerset(cardTypes);

var countAnswerCombinations = function(n) {
  return filter(function(l) {return l.length == n;}, cardAnswerSpace).length;
};

var booleanAnswerSpace = ["yes", "no"];

// Say 'yes' 'no' or some combination of cards
var answerPrior = function(){
  // prefer yes/no over detailed answer
  return (flip(0.5) ?
          uniformDraw(booleanAnswerSpace) :
          uniformDraw(cardAnswerSpace));
};

var cardAnswerMeaning = function(cardList){
  return function(questionMeaning){
    return function(world){
      return _.every(map(function(card) {
        return world[card];
      }, cardList));
    };
  };
};

var booleanAnswerMeaning = function(bool){
  return function(questionMeaning){
    return function(world){
      if (questionMeaning == masterCardQuestionMeaning){
        return (world['MasterCard'] == bool);
      } else if (questionMeaning == VisaQuestionMeaning) {
        return (world['Visa'] == bool);
      } else if (questionMeaning == carteBlancheQuestionMeaning) {
        return (world['CarteBlanche'] == bool);        
      } else if (questionMeaning == dinersQuestionMeaning) {
        return (world['Diners'] == bool);
      } else if (questionMeaning == AmericanExpressQuestionMeaning){
        return (world['AmericanExpress'] == bool);
      } else if (questionMeaning == creditCardsQuestionMeaning){
        return (_.some(_.values(world)) == bool);
      } else {
        console.error("unknown question meaning");
      }
    };
  };
};

var noneMeaning = function() {
  return function(questionMeaning){
    return function(world){
      var doTheyHaveCards = map(function(card) {
        hasCard(world, card);
      }, cardTypes);
      return allFalse(doTheyHaveCards);
    };
  };
};

var cardUtterance = function(utterance) {
  var filteredList = filter(function(x) {
    return _.isEqual(x, utterance);
  }, cardAnswerSpace);
  return !_.isEmpty(filteredList);
};

var booleanUtterance = function(utterance) {
  var filteredList = filter(function(x) {
    return _.isEqual(x, utterance);
  }, booleanAnswerSpace);
  return !_.isEmpty(filteredList);
};

//   -----------
// | Interpreter |
//   -----------

var meaning = function(utterance){
  return (utterance === "yes" ? booleanAnswerMeaning(true) :
          utterance === "no" ? booleanAnswerMeaning(false) :
          cardUtterance(utterance) ? cardAnswerMeaning(utterance) :
          _.isEqual(utterance, [ "none" ]) ? noneMeaning() :
          (utterance === masterCardQuestion) ? masterCardQuestionMeaning :
          (utterance === VisaQuestion) ? VisaQuestionMeaning :
          (utterance === dinersQuestion) ? dinersQuestionMeaning :
          (utterance === carteBlancheQuestion) ? carteBlancheQuestionMeaning :
          (utterance === AmericanExpressQuestion) ? AmericanExpressQuestionMeaning :
          (utterance === creditCardsQuestion) ? creditCardsQuestionMeaning :
          console.error('unknown utterance in meaning!', utterance));
};

var interpreter = cache(function(question, answer){
  return Enumerate(function(){
    var world = worldPrior();
    var answerMeaning = meaning(answer);
    var questionMeaning = meaning(question);
    condition(answerMeaning(questionMeaning)(world));
    return world;
  });
});

var checkExhaustive = function(answer, trueWorld) {
  var cardsAccepted = filter(function(key){
    return trueWorld[key];
  }, _.keys(trueWorld));
  return _.isEqual(answer, cardsAccepted);
};

var makeTruthfulAnswerPrior = function(question, trueWorld) {
  var truthfulAnswerPrior = Enumerate(function(){
    var answer = answerPrior();
    var possibleWorlds = interpreter(question, answer);
    var containsTrueWorld = _.some(map(function(v){
      return _.isEqual(trueWorld, v);
    }, possibleWorlds.support()));
    var exhaustive = (cardUtterance(answer)
                      ? checkExhaustive(answer, trueWorld)
                      : true);
    condition(containsTrueWorld & exhaustive);
    return answer;
  });
  return truthfulAnswerPrior;
};

//  ------
// | QUDs |
//  ------

var qudFactory = function(cardString) {
var cardList = cardString.split(",");
  return function(world){
    return _.some(map(function(card){
      return world[card];
    }, cardList));
  };
};

var cardSetLikelihood = function(cardSet) {
  var cardsNotInSet = _.difference(cardTypes, cardSet);
  var inSetScore = reduce(function(v, memo){
    return memo * cardLikelihoods[v];
  }, 1, cardSet);
  var outOfSetScore = reduce(function(v, memo) {
    return memo * (1 - cardLikelihoods[v]);
  }, 1, cardsNotInSet);
  return inSetScore * outOfSetScore;
};

var qudPrior = function(){
  var cardSet = cardSetPrior();
  return "QUD" + cardSet;
};

var cardSetPrior = function(){
  var filteredPowerSet = filter(function(cardSet){
    return !_.isEmpty(cardSet);
  }, cardPowerSet);
  var cardSet = uniformDraw(filteredPowerSet);
  factor(cardSetLikelihood(cardSet));
  return cardSet;
};

var nameToQUD = function(qudName){
  if (qudName == masterCardQuestion) {
    return masterCardQuestionMeaning;
  } else if (qudName == VisaQuestion) {
    return VisaQuestionMeaning;
  } else if (qudName == dinersQuestion) {
    return dinersQuestionMeaning;
  } else if (qudName == carteBlancheQuestion) {
    return carteBlancheQuestionMeaning;
  } else if (qudName == AmericanExpressQuestion) {
    return AmericanExpressQuestionMeaning;
  } else if (qudName == creditCardsQuestion) {
    return creditCardsQuestionMeaning;
  } else if (qudName.slice(0,3) === "QUD") {
    return qudFactory(qudName.slice(3));
  } 
};

//  -------
// | Models |
//  -------

var explicitAnswerer = cache(function(question, trueWorld, rationality) {
  var qud = nameToQUD(question);
  return Enumerate(function(){
    var truthfulAnswerPrior = makeTruthfulAnswerPrior(question, trueWorld);
    var answer = sample(truthfulAnswerPrior);
    var score = mean(function(){
      var inferredWorld = sample(interpreter(question, answer));
      return (qud(trueWorld) == qud(inferredWorld) ? 1 : 0);
    });
    factor(Math.log(score) * rationality);
    return answer;
  });
});

var explicitQuestioner = cache(function(qudName, rationality) {
  var qud = nameToQUD(qudName);
  return Enumerate(function(){
    var question = questionPrior();
    var prior = Enumerate(function(){
      return qud(worldPrior());});
    var expectedKL = mean(function(){
      var trueWorld = worldPrior();
      var answer = sample(explicitAnswerer(question, trueWorld, rationality));
      var posterior = Enumerate(function(){
        var world = sample(interpreter(question, answer));
        return qud(world);
      });
      return KL(posterior, prior);
    });
    factor(expectedKL * rationality);
    return question;
  });
});

var pragmaticAnswerer = function(question, trueWorld, rationality){
  var qudPosterior = Enumerate(function(){
    var qudName = qudPrior();
    var qud = nameToQUD(qudName);
    var q_erp = explicitQuestioner(qudName, rationality);
    factor(q_erp.score([], question));
    return qudName;
  });
  qa.printERP(qudPosterior);
  return Enumerate(function(){
    var qud = nameToQUD(sample(qudPosterior));
    var truthfulAnswerPrior = makeTruthfulAnswerPrior(question, trueWorld);
    var answer = sample(truthfulAnswerPrior);
    var score = mean(
      function(){
        var inferredWorld = sample(interpreter(question, answer));
        return (qud(trueWorld) == qud(inferredWorld)) ? 1.0 : 0.0;
      });
    factor(Math.log(score) * rationality);
    return answer;
  });
};

var world = {
  'Visa' : true,
  'MasterCard' : false,
  'AmericanExpress' : true,
  'Diners' : false,
  'CarteBlanche' : false
};

var runModel = function(question) {
  return mean(function(){
    var trueWorld = worldPrior();
    var ansERP = pragmaticAnswerer(question, trueWorld, 100000);
    var literalAns = Math.exp(ansERP.score([], "yes")) || Math.exp(ansERP.score([], "no"));
    return literalAns;
  });
};

pragmaticAnswerer(creditCardsQuestion, world, 100000);
console.log("\n\n\n\n");
pragmaticAnswerer(VisaQuestion, world, 100000);

