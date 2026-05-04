
(function(){ 
var My_Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
  Game_Interpreter.prototype.pluginCommand = function(command, args) {
    if (command === "addCost") {
	
    }
	else {
      My_Game_Interpreter_pluginCommand.call(this, command, args);
    }
  };
})();


Game_Enemy.prototype.selectAllActions = function(actionList) {
    var ratingMax = Math.max.apply(null, actionList.map(function(a) {
        return a.rating;
    }));
    var ratingZero = ratingMax - 3;
    actionList = actionList.filter(function(a) {
        return a.rating > ratingZero;
    });
	var action;
    for (var i = 0; i < this.numActions(); i++) {
		action = null;
		action = this.selectAction(actionList, ratingZero);
        this.action(i).setEnemyAction(action);
		if(action) this.addState($dataSkills[action.skillId].stypeId)
    }
};//敌人行动显示

Game_BattlerBase.prototype.paySkillCost = function(skill) {
	if(this.isActor() && $gameParty.inBattle()) return;
    this._mp -= this.skillMpCost(skill);
    this._tp -= this.skillTpCost(skill);
};