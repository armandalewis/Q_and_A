---
layout: page
title: Clark (1979) -- credit card questions
status: current
---

In this experiment, the pragmatic answerer infers the questioner's goal from their *question* rather than an explicitly given context.

~~~~

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

// Reflect real probabilities of acceptance from Clark
var worldPrior = function(){
    return {
        'Visa' : flip(0.5),
        'MasterCard' : flip(0.5),
        'AmericanExpress' : flip(0.5),
        'Diners' : flip(0.5),
        'CarteBlanche' : flip(0.5)
    };
};

//  -------------------
// | Question knowledge |
//  -------------------

var masterCardQuestion = "Do you accept Master Card?";
var masterCardQuestionMeaning = function(world){
    return world['MasterCard'];
};

var AmericanExpressQuestion = "Do you accept American Express?";
var AmericanExpressQuestionMeaning = function(world){
    return world['AmericanExpress'];
};

var creditCardsQuestion = "Do you accept credit cards?";
var creditCardsQuestionMeaning = function(world){
    return _.some(_.values(world));
};

var anyKindsQuestion = "Do you accept any kinds of credit cards?";
var anyKindsQuestionMeaning = function(world){
    return _.some(_.values(world));
};

var questions = [masterCardQuestion, AmericanExpressQuestion,
                 creditCardsQuestion, anyKindsQuestion];

// Penalize questions for their length
var questionPrior = function(){
  var q = uniformDraw(questions);
  factor(q.split(' ').length);
  return q;
};

//  -----------------
// | Answer knowledge |
//  -----------------

var cardAnswerSpace = powerset(cardTypes);

var posCreditCardAnswer = "yes, we accept credit cards";
var negCreditCardAnswer = "no, we don't accept credit cards";
var posAmericanExpressAnswer = "yes, we accept American Express";
var negAmericanExpressAnswer = "no, we don't accept American Express";
var posMasterCardAnswer = "yes, we accept Master Card";
var negMasterCardAnswer = "no, we don't accept Master Card";
var booleanAnswerSpace = [posCreditCardAnswer, negCreditCardAnswer,
                          posAmericanExpressAnswer, negAmericanExpressAnswer,
                          posMasterCardAnswer, negMasterCardAnswer];

// Say 'yes' 'no' or some combination of cards
var answerPrior = function(){
    // prefer yes/no over detailed answer
    return (flip(0.2) ? 
            uniformDraw(booleanAnswerSpace) : 
            uniformDraw(cardAnswerSpace));
};

var cardAnswerMeaning = function(cardList){
  return function(world){
    return _.every(map(function(card) {
      return world[card];
    }, cardList));
  };
};

var booleanAnswerMeaning = function(utterance){
  return function(world){
    if (utterance == posMasterCardAnswer){
      return (world['MasterCard'] == true);
    } else if (utterance == negMasterCardAnswer) {
      return (world['MasterCard'] == false);
    } else if (utterance == posAmericanExpressAnswer) {
      return (world['AmericanExpress'] == true); 
    } else if (utterance == negAmericanExpressAnswer) {
      return (world['AmericanExpress'] == false);
    } else if (utterance == posCreditCardAnswer) {
      return (_.some(_.values(world)) == true);
    } else if (utterance == negCreditCardAnswer) {
      return (_.some(_.values(world)) == false);
    } else {
      return console.error("unknown utterance in boolean answer meaning!: " + utterance);
    }
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
    return (booleanUtterance(utterance) ? booleanAnswerMeaning(utterance) :
            cardUtterance(utterance) ? cardAnswerMeaning(utterance) :
            (utterance === masterCardQuestion) ? masterCardQuestionMeaning :
            (utterance === AmericanExpressQuestion) ? AmericanExpressQuestionMeaning :
            (utterance === creditCardsQuestion) ? creditCardsQuestionMeaning :
            (utterance === anyKindsQuestion) ? anyKindsQuestionMeaning :
            console.error('unknown utterance in meaning!', utterance));
};

var interpreter = cache(function(answer){
    return Enumerate(function(){
        var world = worldPrior();
        var answerMeaning = meaning(answer);
        condition(answerMeaning(world));
        return world;
    });
});

var makeTruthfulAnswerPrior = function(trueWorld) {
  var truthfulAnswerPrior = Enumerate(function(){
    var answer = answerPrior();
    factor(interpreter(answer).score([], trueWorld));
    return answer;
  });
  return truthfulAnswerPrior;
};

//  ------
// | QUDs |
//  ------

var qudNames = function(world) {return getFilteredCardList(world);};
var qudAny = function(world) {return _.any(_.values(world));};
var qudMasterCard = function(world){return world['MasterCard'];};
var qudMasterPlusDiners = function(world){return world['MasterCard'] | world['Diners'];};
var qudMasterExpressDiners = function(world){
  return world['AmericanExpress'] | world['MasterCard'] | world['Diners'];
};

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
	    qudName == masterCardQuestion ? masterCardQuestionMeaning :
	    qudName == AmericanExpressQuestion ? AmericanExpressQuestionMeaning:
	    qudName == creditCardsQuestion ? creditCardsQuestionMeaning :
	    qudName == anyKindsQuestion ? anyKindsQuestionMeaning :
            console.error('unknown qud name', qudName));
};

//  -------
// | Models |
//  -------

var explicitAnswerer = cache(function(question, trueWorld, rationality) {
  var qud = nameToQUD(question);
  return Enumerate(function(){
    var truthfulAnswerPrior = makeTruthfulAnswerPrior(trueWorld);
    var answer = sample(truthfulAnswerPrior);
    var score = mean(function(){
      var inferredWorld = sample(interpreter(answer));
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
        var world = sample(interpreter(answer));
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
  return Enumerate(function(){
    var qud = nameToQUD(sample(qudPosterior));
    var truthfulAnswerPrior = makeTruthfulAnswerPrior(trueWorld);
    var answer = sample(truthfulAnswerPrior);
    var score = mean(
      function(){
        var inferredWorld = sample(interpreter(answer));
        return (qud(trueWorld) == qud(inferredWorld)) ? 1.0 : 0.0;
      });
    factor(Math.log(score) * rationality);
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

print("Do you accept credit cards?");
print(pragmaticAnswerer(creditCardsQuestion, world, 1));

print("Do you accept Master Card?");
print(pragmaticAnswerer(masterCardQuestion, world, 1));

~~~~