---
layout: page
title: Playing Pictionary with RSA (Rational Sketch Act) model
status: other
---

We obviously want to make a robot that can play pictionary with another robot.

To do so, we adopt a visual analogy to the Rational Speech Act model (Frank and Goodman, 2012; Goodman and Stuhlmuller, 2013), which we call the Rational Sketch Act model.

A sketcher, like a speaker, seeks to be informative about the topic (QUD) they're trying to convey. In pictionary, this topic is some object. The sketcher wants to draw a sketch that maximizes the likelihood that their partner will guess the correct object. In order to infer what this sketch might look like, they reason about what their partner will believe after seeing a sketch (i.e. P(object | sketch)). To compute this conditional probability, we use the approach developed by Fan et al (2015) using a convolutional neural network (CNN) to investigate object representations in a visual production task. 

~~~~
var drawCurves = function(drawObj, splines){
  var curve = splines[0];
  drawObj.drawSpline(curve[0], curve[1], curve[2], curve[3],
                     curve[4], curve[5], curve[6], curve[7]);
  if (splines.length > 1) {
    drawCurves(drawObj, splines.slice(1));
  }
};

var makeSplines = function(n, splines){
  // Add a curve line to the set of curves
  var startX = randomInteger(50) + 10;
  var startY = randomInteger(50) + 10;
  var mid1X = randomInteger(50) + 10;
  var mid1Y = randomInteger(50) + 10;
  var mid2X = randomInteger(50) + 10;
  var mid2Y = randomInteger(50) + 10;
  var endX = randomInteger(50) + 10;
  var endY = randomInteger(50) + 10;
  var newSplines = splines.concat([[startX, startY, mid1X, mid1Y,
		                    mid2X, mid2Y, endX, endY]]);
  // Repeat until you have the desired number
  return (n==1) ? newSplines : makeSplines(n-1, newSplines);
};

// Takes the name of an object you're trying to get opponent to guess
var drawer = function(goalObj) {
  var splineParams = makeSplines(1, [], 0); // Sample a curve
  var generatedImg = Draw(70, 70, true);    // Generate a sketch from the curve
  drawCurves(generatedImage, splineParams);
  var guessDist = guesser(generatedImage);  // Query the CNN for its guess
  factor(guessDist.score([], goalObj));     // Score the curve based on guess
  return splineParams;
};

ParticleFilter(drawer("chair"), 1000);
~~~~