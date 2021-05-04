# Q_and_A
#code, data, and analysis for 'Questions and answers in dialogue' paper: https://psyarxiv.com/j2cp6/

This repo contains extension code for the Q_and_A code base in order to allow for a 4x4 grid. We would like to test how the model performs once the grid is expanded.


AL changes
**Q_andA/Experiments/SpatialExperiment**

**(A) map.js --> map_al.js**
1. edited this.labels = []
2. edited samplePractice
3. edited sampleRandom
4. edited samplePragmatic
5. edited sampleEmpty
6. edited allHidden
7. edited allBombs

**(B) index.html**
1. edited all display grids

**(C) drawing.js**
1. ASK ABOUT submit (event) func
2. initBombMap(game): edited grid and update range; WHAT ABOUT z-index?
3. initGrid(game): edited grid and update range; WHAT ABOUT z-index?
	WHAT ABOUT var shadow
	MAY ALSO NEED TWEAKING OF z-index IN VARS and STYLE
  
**(D) customGame.js**
1. edited variables for grid cells

**(E) customClient**
1. ASK ABOUT (149)   if(additionalCell != '') { --> needs other cell2Positive?
2. edited   game.checkGrid = function() { with updated grid
3. edited     if(!game.roundOver) { //update row and column length

**(F) config.js**
1. edited "numHorizontalCells" : 5 and   "numVerticalCells" : 5,

**Q_andA/Experiments/SpatialExperiment/src (config and server save csv)**
1. ASK ABOUT sharedUtils.js

**Q_andA/Experiments/SpatialExperiment/forms**

**(A) instructions.html**
1. edited grid to 4x4
2. HAVE TO SWAP OUT 3x3 IMAGES

**Q_andA/modeling/qa**
**(A) spatialModel.wppl**
1. edited grid
2. ASK ABOUT any need to expand shortAnswers and longAnswers

**(B) qa.js**
1. edited grid

**(C) LOOK AT/ASK ABOUT postprocessQ.js and postprocessA.js**

**Q_and_A/modeling/experiment3/**

**(A) questionerDataAnalysis.wppl**
1. edited grid in relevant places

**(B) generateBotBehavoir.wppl**
1. ASK ABOUT any need for examples?  left as they are for now

**(C) predictives.wppl**
1. edited grid in relevant places
