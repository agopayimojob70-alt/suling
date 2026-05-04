//=============================================================================
// Yanfly Engine Plugins - Battle Engine Extension - Action Sequence Pack 1
// YEP_X_ActSeqPack1.js
//=============================================================================

var Imported = Imported || {};
Imported.YEP_X_ActSeqPack1 = true;

var Yanfly = Yanfly || {};
Yanfly.ASP1 = Yanfly.ASP1 || {};
Yanfly.ASP1.version = 1.11;

//=============================================================================
 /*:
 * @plugindesc YEP动作序列拓展 1 [v1.11]
 * @author Yanfly Engine Plugins
 *
 * @param Default Volume
 * @text 默认音量
 * @desc 插件控制的 BGM/BGS/ME/SE
 * @default 90
 *
 * @param Default Pitch
 * @text 默认音调
 * @desc 插件控制的音视频默认音调
 * @default 100
 *
 * @param Default Pan
 * @text 默认声道
 * @desc 插件控制的音视频默认声道
 * @default 0
 *
 * @help
 * ============================================================================
 * 拓展 1：战斗表现
 * ============================================================================
 *
   该插件是 Yanfly 战斗引擎核心（YEP_BattleEngineCore） 
   的拓展插件，需先安装核心插件才能生效。
   它提供了丰富的战斗动作序列控制功能，可自定义技能
   战斗表现（如状态增减、数值修改、音视频控制等）
 *
============================================================================
 * 动作序列的 5 个阶段
============================================================================
 * 每个技能 / 物品的战斗动作由 5 个阶段 组成，需在技能 / 物品的「备注栏」中
   
   
【前期动作】    准备动作：如角色前移、拔武器、播放施法前动画
<setup action>

</setup action>
 

【统一动画】    全体目标动作：如对所有目标播放同一动画（无需逐个处理）
<whole action>

</whole action>
 
 
重要【单目标动作】    单个目标动作：如物理攻击的逐个伤害判定、单独动画
<target action>

</target action>

 
 
【单目标收尾动作后】 收尾清理：如移除「不死」状态、触发公共事件、刷新状态栏
<follow action>

</follow action>
 
 
 
【结束动作】 结束动作：如角色归位、播放结束音效、等待动画收尾
<finish action>

</finish action>
 

 * ============================================================================
 * 记忆存储
 * ============================================================================
 
  
  move user: target, front, 10  // 让使用者向目标移动，停在目标前方，移动速度为10（数值越小速度越慢）
  motion forward: user          // 使用者播放"向前"的动作（如迈步动画）
  
  wait for movement             // 等待移动完成后再执行后续动作
  wait for animation            // 等待动画播放完成
  
  motion damage: target         // 目标播放受击动作  
  
  action effect                 // 计算伤害
  
  wait: 5                       // 等待5帧（约0.08秒）
  
  face user: target             // 目标转向使用者
  wait for movement             // 等待目标转向完成
  immortal: targets, false      // 移除不死状态，恢复正常死亡判定
  
  motion thrust: user           // 使用者播放攻击动作
  motion chant: user            // 使用者播放吟唱动作
   
  immortal: targets, true（目标暂时不死，防止中途死亡）单目标打击
  immortal: targets, false
  
  
  action animation: target  // 对目标播放技能自带的攻击动画
  
   
  display action  // 显示技能名称
  
============================================================================   
动作序列复制 


若多个技能 / 物品需使用相同的动作序列，无需重复编写，
可使用「复制标签」直接复用其他技能 / 物品的序列：

<action copy: 类型:ID>

说明：
「类型」：填 skill（技能）或 item（物品）
「ID」：填目标技能 / 物品在数据库中的 ID
示例：<action copy: skill:45> 表示复制 ID 为 45 的技能的所有动作序列


 *
 * ============================================================================
 * 目标类型
 * ============================================================================

所有动作指令都需指定「作用目标」，以下是常用目标类型（覆盖绝大多数场景）：

目标类型	               作用对象

user	                   技能 / 物品的使用者（如释放技能的角色）
target / targets	       当前选中的单个 / 多个目标
actors / existing actors   所有存活的队友（玩家方角色）
all actors	               所有队友（含已死亡的）
dead actors	               所有已死亡的队友
enemies / existing enemies 所有存活的敌人
all enemies	               所有敌人（含已死亡的）
dead enemies	           所有已死亡的敌人
actor X	                   第 X 个位置的队友（如 actor 2 指队友 2 号位）
enemy X	                   第 X 个位置的敌人（如 enemy 1 指敌人 1 号位）
friends	                   使用者的所有存活队友（如敌人使用时，作用于其他敌人）
opponents	               使用者的所有存活对手（如队友使用时，作用于所有敌人）
all alive	               所有存活的角色（含队友和敌人）
focus	                   使用者 + 其选中的目标


 *   
   
 * ============================================================================
   1. 动画与等待指令
 * ============================================================================
 
action animation
action animation: 目标，mirror        播放技能 / 物品自带的动画（mirror 表示翻转动画）
示例：
action animation（对默认目标播动画）
action animation: user, mirror（对使用者播翻转动画）



animation X: 目标，mirror      播放数据库中 ID 为 X 的动画（mirror 可选）
示例：
animation 5: target（对目标播   ID5 动画）
animation 6: user  （对使用者播 ID6 动画）


wait: X        等待 X 帧（1 秒约 60 帧）    
示例：
wait: 30（等待 0.5 秒）
 
wait for animation    等待所有正在播放的动画结束
示例：
animation 5: target
wait for animation（等动画 5 播完再执行下一条）

wait for popups       等待所有伤害 / 治疗弹窗消失
示例：
hp +500: target, show
wait for popups（等 + 500HP 的弹窗消失

 * ============================================================================
2. 状态与属性（Buff/Debuff）指令
 * ============================================================================

add state X: 目标，show
add state X,Y,Z: 目标，show       给目标添加 ID 为 X（或 X,Y,Z）的状态（show 可选，显示日志提示）
示例：
add state 5: target（给目标加 ID5 的状态）
add state 6,7,8: user, show（给使用者加 6/7/8 状态，显示日志）

remove state X: 目标，show
remove state X,Y,Z: 目标，show     移除目标的 ID 为 X（或 X,Y,Z）的状态
示例：
remove state 5: target（移除目标的 ID5 状态）

add 属性 buff: 目标，回合数，show    给目标添加指定属性的增益（属性：hp/mp/atk/def/mat/mdf/agi/luk）
示例：
add atk buff: user, 3, show（使用者获得 3 回合攻击增益，显示日志）

add 属性 debuff: 目标，回合数，show   给目标添加指定属性的减益
示例：
add def debuff: target, 8（目标获得 8 回合防御减益，不显示日志）

remove 属性 buff: 目标，show       移除目标指定属性的增益
示例：
remove atk buff: user, show（移除使用者的攻击增益）


 * ============================================================================
3. 数值（HP/MP/TP/ 金币 / 物品）指令
 * ============================================================================

hp +X: 目标，show
hp -X%: 目标
hp +variable X: 目标        目标增减 HP（X 为固定值，% 为百分比，variable X 为变量 X 的值；show 显示弹窗）
示例：
hp +500: user（使用者 + 500HP，无弹窗）
hp -20%: target（目标减 20% HP）
hp +variable 3: target, show（目标 + 变量 3 的 HP，显示弹窗）

mp +X: 目标，show
tp -X: 目标                 同 HP 指令，分别作用于 MP 和 TP
示例：
mp +100: user, show（使用者 + 100MP，显示弹窗）
tp -50: target（目标 - 50TP）

gold +X
gold -X           队伍增减 X 金币
示例：
gold +2000（队伍 + 2000 金币）
gold -500（队伍 - 500 金币）

gain item X: Y
lose weapon X: Y    队伍获得 / 失去 ID 为 X 的物品 / 武器 / 护甲（Y 为数量，默认 1）
示例：
gain item 1: 20（获得 20 个 ID1 的物品）
lose weapon 2（失去 1 个 ID2 的武器）


 * ============================================================================
4. 开关与变量指令
 * ============================================================================

change switch X: on/off/toggle/switch Z   控制开关 X（on 开，off 关，toggle 翻转，switch Z 跟随开关 Z 的状态）
示例：
change switch 1: on（开关 1 打开）
change switch 2..4: off（开关 2-4 关闭）
change switch 5: switch 3（开关 5 跟随开关 3 的状态）

change variable X = Y
change variable X += Y     修改变量 X（支持 =、+=、-=、*=、/=、%= 运算；Y 可为数值或代码）
示例：
change variable 1 = 2（变量 1 设为 2）
change variable 3 += 4（变量 3+4）
change variable 5 = $gameActors.actor(1).hp（变量 5 设为队友 1 的当前 HP）


 * ============================================================================
5. 音视频（BGM/BGS/ME/SE）指令
 * ============================================================================

bgm: stop/memorize/memory
bgm: 文件名，音量，音调，声道    控制 BGM（stop 停止，memorize 记忆当前 BGM，memory 播放记忆的 BGM；文件名不含后缀）
示例：
bgm: stop（停止当前 BGM）
bgm: Battle7, 80, 100, 0（播放 Battle7.bgm，音量 80，音调 100，立体声）

bgs: 指令
me: 指令     同 BGM 指令，分别控制 BGS（背景音效）和 ME（剧情音乐）
示例：
bgs: City（播放 City.bgs）
me: Victory1（播放 Victory1.me）

se: 系统音效名
se: 文件名，音量，音调，声道      播放音效（系统音效名如 PLAY OK/PLAY ATTACK，自定义音效填文件名）
示例：
se: play enemy attack（播放敌人攻击的系统音效）
se: Ice1, 80, 100, 0（播放 Ice1.se）


 * ============================================================================
6. 其他常用指令
 * ============================================================================

common event: X  执行 ID 为 X 的公共事件（需等待事件结束再继续）
示例：
common event: 1（执行公共事件 1）

collapse: 目标，force    让目标触发「死亡坍塌」动画（force 强制杀死目标，无视 HP）
示例：
collapse: target（若目标已死，播放坍塌动画）
collapse: enemy 1, force（强制杀死敌人 1 并播放坍塌动画）

immortal: 目标，true/false  	给目标添加 / 移除「不死」状态（防止目标在动作序列中死亡）
示例：
immortal: targets, true（当前目标暂时不死）
immortal: targets, false（移除目标的不死状态）

break action    强制终止当前阶段的所有剩余动作序列
示例：
if $gameSwitches.value(1) == false
  break action（若开关 1 关闭，终止当前阶段）
end

eval: 代码    执行 JavaScript 代码（进阶功能，需懂基础语法）
示例：
eval: $gameParty.loseItem($dataItems[3], 10)（队伍失去 10 个 ID3 的物品）


 * ============================================================================
 * 进阶功能：条件判断（IF...ELSE）
 * ============================================================================
   支持用「条件判断」实现动态动作序列（如开关为开时执行 A 动作，关时执行 B 动作），语法与编程一致：
   
if 条件
    指令1
    指令2
else if 条件2
    指令3
else
    指令4
end


条件示例：
$gameSwitches.value(1)（开关 1 是否为开）

$gameVariables.value(5) > 100（变量 5 是否大于 100）

user.hp < user.mhp / 2（使用者 HP 是否低于最大值的一半）

完整示例（根据开关 1 状态执行不同动作）:
<target action>
    if $gameSwitches.value(1)
        animation 5: target
        action effect
    else
        animation 6: target, mirror
        action effect
        hp +100: user, show
    end
</target action>


======================================================================




【攻击冲刺】
<setup action>
immortal: target, true
</setup action>

<target action>
move user: target, front, 10
motion forward: user
wait for movement
end
motion thrust: user
attack animation: target
wait for animation
motion damage: target
action effect
wait: 5
face user: target
wait for movement
</target action>



【火焰斩】
<setup action>
display action
animation 67: user
wait: 30
wait for animation
</setup action>

<target action>
move user: target, front, 10
motion forward: user
wait for movement
motion thrust: user
wait for animation
animation 8: target
motion damage: target
wait: 5
action effect
wait: 5
face user: target
wait for movement
wait: 40
</target action>

<follow action>
immortal: targets, false
</follow action>

【火焰双斩】
<setup action>
display action
animation 67: user
wait: 30
wait for animation
</setup action>

<target action>
move user: target, front, 10
motion forward: user
wait for movement
motion thrust: user
wait for animation
animation 8: target
motion damage: target
wait: 5
action effect
wait: 40

motion thrust: user
wait for animation
animation 3: target
motion damage: target
wait: 5
action effect
face user: target
wait for movement
wait: 20
</target action>

<follow action>
immortal: targets, false
</follow action>

【双治疗】
<setup action>
display action
animation 97: user
wait: 30
wait for animation
</setup action>

<target action>
motion thrust: user
wait for animation
animation 46: target
action effect
wait: 50

motion thrust: user
wait for animation
wait: 10
animation 46: target
action effect
wait: 30


wait for movement
wait: 20
</target action>

【超级连环治疗】
<setup action>
display action
animation 97: user
wait: 30
wait for animation
</setup action>

<target action>
motion thrust: user
wait for animation
animation 48: target
action effect
wait: 20
action effect
wait: 20
action effect
wait: 20
action effect
wait: 20
action effect
wait: 20
action effect
wait: 20
action effect
wait: 20

wait for movement
wait: 20
</target action>


【火云召唤】
<setup action>
display action
motion chant: user
wait: 30
animation 67: user
wait: 10
wait for animation
</setup action>

<target action>
wait for movement
motion thrust: user

animation 121: target
wait: 20
motion damage: target
wait: 5
action effect
wait: 5
action effect
wait: 5
action effect
wait: 5
action effect
wait: 5
action effect
wait: 5
action effect
wait: 5
action effect
wait: 5
action effect
wait: 40

face user: target
wait for movement
wait: 20
</target action>

<follow action>
immortal: targets, false
</follow action>
















注意事项
依赖关系：必须先安装并启用 YEP_BattleEngineCore，否则该插件无法生效；
指令顺序：动作序列按「从上到下」执行，需注意等待指令（如wait for animation）的位置，避免动画与伤害不同步；
不死状态：若动作序列中有多次伤害 / 治疗，建议先给目标加immortal: targets, true，避免目标中途死亡导致后续动作失效；
音视频文件：自定义 BGM/BGS/SE 需放在对应文件夹（如 BGM 放audio/bgm），且指令中无需写文件后缀（如bgm: Battle7对应Battle7.bgm）；
进阶功能：eval指令需懂基础 JavaScript 语法，建议先测试简单代码（如修改变量、增减物品），避免报错。


 * ============================================================================
 * Changelog
 * ============================================================================
 *
 * Version 1.11:
 * - Lunatic Mode fail safes added.
 *
 * Version 1.10a:
 * - Changed the 'Change Variable' action sequence to read more effectively.
 * - Documentation update for 'Action Common Event' and 'Common Event' to
 * indicate that they will not work immediately if used as a forced action
 * since another event is already running.
 *
 * Version 1.09:
 * - Fixed a bug that didn't allow for HP and MP buff/debuff removal.
 *
 * Version 1.08:
 * - Added 'Break Action' action sequence effect to completely cancel out all
 * of the remaining action effects.
 *
 * Version 1.07:
 * - Fixed a bug with the forcing a Collapse action sequence.
 *
 * Version 1.06:
 * - If using the Add State action sequence to add the Death state, it will
 * remove immortality settings.
 *
 * Version 1.05:
 * - Optimized status window to refresh at a minimum.
 *
 * Version 1.04:
 * - Updated help file to include Character X for target typing.
 *
 * Version 1.03:
 * - Fixed a bug that didn't make the sounds played work properly (again).
 *
 * Version 1.02:
 * - Fixed a bug that didn't make the sounds played work properly.
 *
 * Version 1.01:
 * - Fixed a small bug that didn't allow Change Variable to work properly with
 * evaluated strings.
 *
 * Version 1.00:
 * - Finished plugin!
 */
//=============================================================================

if (Imported.YEP_BattleEngineCore) {

//=============================================================================
// Parameters
//=============================================================================

Yanfly.Parameters = PluginManager.parameters('YEP_X_ActSeqPack1');
Yanfly.Param = Yanfly.Param || {};

Yanfly.Param.SoundVolume = Number(Yanfly.Parameters['Default Volume']);
Yanfly.Param.SoundPitch = Number(Yanfly.Parameters['Default Pitch']);
Yanfly.Param.SoundPan = Number(Yanfly.Parameters['Default Pan']);

//=============================================================================
// BattleManager
//=============================================================================

Yanfly.ASP1.BattleManager_processActionSequence =
    BattleManager.processActionSequence;
BattleManager.processActionSequence = function(actionName, actionArgs) {
  // ADD X BUFF
  if (actionName.match(/ADD[ ](.*)[ ]BUFF/i)) {
    return this.actionAddBuff(actionName, actionArgs);
  }
  // ADD X DEBUFF
  if (actionName.match(/ADD[ ](.*)[ ]DEBUFF/i)) {
    return this.actionAddDebuff(actionName, actionArgs);
  }
  // ADD STATE X
  if (actionName.match(/(?:ADD_STATE|ADD STATE)[ ](\d+(?:\s*,\s*\d+)*)/i)) {
    return this.actionAddState(actionName, actionArgs);
  }
  // ANIMATION X
  if (actionName.match(/ANIMATION[ ](\d+)/i)) {
    return this.actionAnimation(parseInt(RegExp.$1), actionArgs);
  }
  // BGM, MUSIC, SONG
  if (['BGM', 'MUSIC', 'SONG'].contains(actionName)) {
    return this.actionBgmPlay(actionArgs);
  }
  // BGS, AMBIENCE
  if (['BGS', 'AMBIENCE'].contains(actionName)) {
    return this.actionBgsPlay(actionArgs);
  }
  // BREAK ACTION
  if (actionName === 'BREAK ACTION') {
    return this.actionBreakAction();
  }
  // COLLAPSE: target, (force)
  if (actionName === 'COLLAPSE') {
    return this.actionCollapse(actionArgs);
  }
  // COMMON EVENT: event id
  if (actionName === 'COMMON EVENT') {
    return this.actionCommonEvent(actionArgs[0]);
  }
  // CHANGE SWITCH X
  if (actionName.match(/CHANGE[ ]SWITCH[ ](.*)/i)) {
    return this.actionChangeSwitch(actionName, actionArgs);
  }
  // CHANGE VARIABLE X
  if (actionName.match(/CHANGE[ ]VARIABLE[ ](.*)/i)) {
    return this.actionChangeVariable(actionName);
  }
  // EVAL, SCRIPT
  if (['EVAL', 'SCRIPT'].contains(actionName)) {
    return this.actionEval(actionArgs);
  }
  // GAIN ITEM (item, weapon, armor) X
  if (actionName.match(/GAIN[ ](.*)[ ](\d+)/i) ||
  actionName.match(/LOSE[ ](.*)[ ](\d+)/i)) {
    return this.actionGainItem(actionName, actionArgs);
  }
  // GOLD +/- VALUE
  if (actionName.match(/GOLD[ ]([\+\-]\d+)/i)) {
    return this.actionGoldModify(parseInt(RegExp.$1));
  }
  // ME, FANFARE
  if (['ME', 'FANFARE'].contains(actionName)) {
    return this.actionMePlay(actionArgs);
  }
  // REFRESH STATUS, REFRESH WINDOW
  if (['REFRESH STATUS', 'REFRESH WINDOW'].contains(actionName)) {
    return this.actionRefreshStatus();
  }
  // REMOVE X BUFF
  if (actionName.match(/REMOVE[ ](.*)[ ]BUFF/i)) {
    return this.actionRemoveBuff(actionName, actionArgs);
  }
  // REMOVE X DEBUFF
  if (actionName.match(/REMOVE[ ](.*)[ ]DEBUFF/i)) {
    return this.actionRemoveDebuff(actionName, actionArgs);
  }
  // REMOVE STATE X
  if
  (actionName.match(/(?:REMOVE_STATE|REMOVE STATE)[ ](\d+(?:\s*,\s*\d+)*)/i)) {
    return this.actionRemoveState(actionName, actionArgs);
  }
  // SE, SOUND, SFX
  if (['SE', 'SOUND', 'SFX'].contains(actionName)) {
    return this.actionSePlay(actionArgs);
  }
  // HP +/- VALUE
  if (actionName.match(/HP[ ](.*)/i)) {
    return this.actionHpModify(actionName, actionArgs);
  }
  // MP +/- VALUE
  if (actionName.match(/MP[ ](.*)/i)) {
    return this.actionMpModify(actionName, actionArgs);
  }
  // TP +/- VALUE
  if (actionName.match(/TP[ ](.*)/i)) {
    return this.actionTpModify(actionName, actionArgs);
  }
  return Yanfly.ASP1.BattleManager_processActionSequence.call(this,
    actionName, actionArgs);
};

BattleManager.getParamId = function(stat) {
    switch (stat) {
    case 'HP':
    case 'MAXHP':
    case 'MAX HP':
      return 0;
      break;
    case 'MP':
    case 'MAXMP':
    case 'MAX MP':
    case 'SP':
    case 'MAXSP':
    case 'MAX SP':
      return 1;
      break;
    case 'ATK':
    case 'STR':
      return 2;
      break;
    case 'DEF':
      return 3;
      break;
    case 'MAT':
    case 'INT' || 'SPI':
      return 4;
      break;
    case 'MDF':
    case 'RES':
      return 5;
      break;
    case 'AGI':
    case 'SPD':
      return 6;
      break;
    case 'LUK':
      return 7;
      break;
    }
    return -1;
};

BattleManager.actionAddBuff = function(actionName, actionArgs) {
  var targets = this.makeActionTargets(actionArgs[0]);
  if (targets.length < 1) return false;
  var show = false;
  for (var i = 0; i < actionArgs.length; ++i) {
    var actionArg = actionArgs[i];
    if (actionArg.toUpperCase() === 'SHOW') show = true;
  }
  if (actionName.match(/ADD[ ](.*)[ ]BUFF/i)) {
    var paramId = this.getParamId(String(RegExp.$1).toUpperCase());
  } else {
    return true;
  }
  if (actionArgs[1] && parseInt(actionArgs[1]) > 0) {
    var turns = parseInt(actionArgs[1]);
  } else {
    var turns = 5;
  }
  if (paramId < 0) return true;
  targets.forEach(function(target) {
    target.addBuff(paramId, turns);
    if (show) this._logWindow.displayActionResults(this._subject, target);
  }, this);
  return true;
};

BattleManager.actionAddDebuff = function(actionName, actionArgs) {
  var targets = this.makeActionTargets(actionArgs[0]);
  if (targets.length < 1) return false;
  var show = false;
  for (var i = 0; i < actionArgs.length; ++i) {
    var actionArg = actionArgs[i];
    if (actionArg.toUpperCase() === 'SHOW') show = true;
  }
  if (actionName.match(/ADD[ ](.*)[ ]DEBUFF/i)) {
    var paramId = this.getParamId(String(RegExp.$1).toUpperCase());
  } else {
    return true;
  }
  if (actionArgs[1] && parseInt(actionArgs[1]) > 0) {
    var turns = parseInt(actionArgs[1]);
  } else {
    var turns = 5;
  }
  if (paramId < 0) return true;
  targets.forEach(function(target) {
    target.addDebuff(paramId, turns);
    if (show) this._logWindow.displayActionResults(this._subject, target);
  }, this);
  return true;
};

BattleManager.actionAddState = function(actionName, actionArgs) {
  var targets = this.makeActionTargets(actionArgs[0]);
  if (targets.length < 1) return false;
  var show = false;
  for (var i = 0; i < actionArgs.length; ++i) {
    var actionArg = actionArgs[i];
    if (actionArg.toUpperCase() === 'SHOW') show = true;
  }
  if (actionName.match(/(?:ADD_STATE|ADD STATE)[ ](\d+(?:\s*,\s*\d+)*)/i)) {
    var states = JSON.parse('[' + RegExp.$1.match(/\d+/g) + ']');
  } else {
    return true;
  }
  targets.forEach(function(target) {
    for (var i = 0; i < states.length; ++i) {
      stateId = states[i];
      if (stateId === target.deathStateId()) {
        if (target._prevImmortalState === false) target.forceRemoveImmortal();
      }
      target.addState(stateId);
      if (show) this._logWindow.displayActionResults(this._subject, target);
    }
  }, this);
  return true;
};

BattleManager.actionAnimation = function(aniId, actionArgs) {
  if (aniId <= 0) return;
  var targets = this.makeActionTargets(actionArgs[0]);
  if (targets.length < 1) return false;
  var mirror = false;
  if (actionArgs[1] && actionArgs[1].toUpperCase() === 'MIRROR') mirror = true;
  this._logWindow.showNormalAnimation(targets, aniId, mirror);
  return true;
};

BattleManager.actionBgmPlay = function(actionArgs) {
  if (actionArgs.length < 1) return true;
  if (actionArgs[0].toUpperCase() === 'STOP') {
    AudioManager.stopBgm();
  } else if (actionArgs[0].toUpperCase() === 'MEMORIZE') {
    this._battleMemorizedBgm = AudioManager.saveBgm();
    return true;
  } else if (actionArgs[0].toUpperCase() === 'MEMORY') {
    if (this._battleMemorizedBgm) {
      AudioManager.replayBgm(this._battleMemorizedBgm);
    }
  } else {
    var name = actionArgs[0];
    if (!name) return true;
    var vol = actionArgs[1] || Yanfly.Param.SoundVolume;
    var pitch = actionArgs[2] || Yanfly.Param.SoundPitch;
    var pan = actionArgs[3] || Yanfly.Param.SoundPan;
    var bgm = {
      name: name,
      volume: vol,
      pitch: pitch,
      pan: pan
    };
    AudioManager.playBgm(bgm);
  }
  return true;
};

BattleManager.actionBgsPlay = function(actionArgs) {
  if (actionArgs.length < 1) return true;
  if (actionArgs[0].toUpperCase() === 'STOP') {
    AudioManager.stopBgs();
  } else if (actionArgs[0].toUpperCase() === 'MEMORIZE') {
    this._battleMemorizedBgs = AudioManager.saveBgs();
    return true;
  } else if (actionArgs[0].toUpperCase() === 'MEMORY') {
    if (this._battleMemorizedBgs) {
      AudioManager.replayBgs(this._battleMemorizedBgs);
    }
  } else {
    var name = actionArgs[0];
    if (!name) return true;
    var vol = actionArgs[1] || Yanfly.Param.SoundVolume;
    var pitch = actionArgs[2] || Yanfly.Param.SoundPitch;
    var pan = actionArgs[3] || Yanfly.Param.SoundPan;
    var bgs = {
      name: name,
      volume: vol,
      pitch: pitch,
      pan: pan
    };
    AudioManager.playBgs(bgs);
  }
  return true;
};

BattleManager.actionBreakAction = function() {
    this._targets = [];
    this._actionList = [];
    this._individualTargets = [];
    this._phase = 'phaseChange';
    return false;
};

BattleManager.actionCollapse = function(actionArgs) {
  var targets = this.makeActionTargets(actionArgs[0]);
  var force = false;
  if (actionArgs[1]) var force = (actionArgs[1].toUpperCase() === 'FORCE');
  targets.forEach(function(target) {
    if (force) {
      target.removeImmortal();
      target.addState(target.deathStateId());
    }
    if (target.isDeathStateAffected()) target.performCollapse();

  }, this);
  return false;
};

BattleManager.actionCommonEvent = function(id) {
  if ($gameTroop.isEventRunning()) {
    var ev = $dataCommonEvents[id];
    if (!ev) return;
    var list = ev.list;
    var interpreter = $gameTroop._interpreter;
    interpreter.setupChild(list, 0);
  } else {
    $gameTemp.reserveCommonEvent(id);
  }
  return false;
};

BattleManager.actionChangeSwitch = function(actionName, actionArgs) {
  var subject = this._subject;
  var user = this._subject;
  var target = this._targets[0];
  var targets = this._targets;
  var action = this._action;
  var item = this._action.item();
  var switches = [];
  if (actionName.match(/SWITCH[ ](\d+)/i)) {
    switches = [parseInt(RegExp.$1)];
  } else if (actionName.match(/SWITCH[ ](\d+)..(\d+)/i)) {
    switches = [getRange(parseInt(RegExp.$1), parseInt(RegExp.$2))];
  } else if (actionName.match(/SWITCH[ ](\d+)[ ]TO[ ](\d+)/i)) {
      switches = [getRange(parseInt(RegExp.$1), parseInt(RegExp.$2))];
  } else {
    return true;
  }
  var result = actionArgs[0].toUpperCase();
  var value;
  if (['ON', 'TRUE'].contains(result)) {
    value = true;
  } else if (['OFF', 'FALSE'].contains(result)) {
    value = false;
  } else if (['TOGGLE', 'OPPOSITE', 'REVERSE'].contains(result)) {
    value = 'toggle';
  } else if (result.match(/SWITCH[ ](\d+)/i)) {
    value = $gameSwitches.value(parseInt(RegExp.$1));
  }
  switches.forEach(function(switchId) {
    if (value === 'toggle') {
      $gameSwitches.setValue(switchId, !$gameSwitches.value(switchId));
    } else {
      $gameSwitches.setValue(switchId, value);
    }
  }, this);
  return true;
};

BattleManager.actionChangeVariable = function(actionName) {
  var cV1 =
  /CHANGE[ ](?:VARIABLE|VAR)[ ](\d+)[ ](.*)[ ](?:VARIABLE|VAR)[ ](\d+)/i;
  var cV2 = /CHANGE[ ](?:VARIABLE|VAR)[ ](\d+)[ ](.*?)[ ](.*)/i;
  var subject = this._subject;
  var user = this._subject;
  var target = this._targets[0];
  var targets = this._targets;
  var action = this._action;
  var item = this._action.item();
  if (this._actSeq[0].match(cV1)) {
    var mainVar = parseInt(RegExp.$1);
    var operation = String(RegExp.$2);
    var editVar = $gameVariables.value(parseInt(RegExp.$3));
  } else if (this._actSeq[0].match(cV2)) {
    var mainVar = parseInt(RegExp.$1);
    var operation = String(RegExp.$2);
    var editVar = eval(String(RegExp.$3));
  } else {
    return true;
  }
  var mainValue = $gameVariables.value(mainVar);
  if (['='].contains(operation)) {
    $gameVariables.setValue(mainVar, eval(editVar));
  } else if (['+=', '+'].contains(operation)) {
    $gameVariables.setValue(mainVar, mainValue + eval(editVar));
  } else if (['-=', '-'].contains(operation)) {
    $gameVariables.setValue(mainVar, mainValue - eval(editVar));
  } else if (['*=', '*'].contains(operation)) {
    $gameVariables.setValue(mainVar, mainValue * eval(editVar));
  } else if (['/=', '/'].contains(operation)) {
    $gameVariables.setValue(mainVar, mainValue / eval(editVar));
  } else if (['%=', '%'].contains(operation)) {
    $gameVariables.setValue(mainVar, mainValue % eval(editVar));
  }
  return true;
};

BattleManager.actionEval = function(actionArgs) {
    if (actionArgs.length < 1) return true;
    var subject = this._subject;
    var user = this._subject;
    var target = this._targets[0];
    var targets = this._targets;
    var action = this._action;
    var item = this._action.item();
    var text = String(actionArgs[0]);
    for (var i = 1; i < actionArgs.length; ++i) {
        text = text + ', ' + String(actionArgs[i]);
    }
    try {
      eval(text);
    } catch (e) {
      Yanfly.Util.displayError(e, text, 'ACTION SEQUENCE EVAL ERROR');
    }
    return false;
};

BattleManager.actionGainItem = function(actionName, actionArgs) {
    var gainItem;
    var type;
    var itemId;
    if (actionName.match(/GAIN[ ](.*)[ ](\d+)/i)) {
      gainItem = true;
      type = String(RegExp.$1).toUpperCase();
      itemId = parseInt(RegExp.$2);
    } else if (actionName.match(/LOSE[ ](.*)[ ](\d+)/i)) {
      gainItem = false;
      type = String(RegExp.$1).toUpperCase();
      itemId = parseInt(RegExp.$2);
    } else {
      return true;
    }
    var item;
    if (type === 'ITEM') {
      item = $dataItems[itemId];
    } else if (['WPN', 'WEAPON'].contains(type)) {
      item = $dataWeapons[itemId];
    } else if (['ARM', 'ARMOR', 'ARMOUR'].contains(type)) {
      item = $dataArmors[itemId];
    } else {
      return true;
    }
    var amount = Math.max(1, parseInt(actionArgs[0]));
    if (isNaN(amount)) amount = 1;
    if (gainItem)  $gameParty.gainItem(item, amount);
    if (!gainItem) $gameParty.loseItem(item, amount);
    return true;
};

BattleManager.actionGoldModify = function(value) {
    $gameParty.gainGold(value);
    return true;
};

BattleManager.actionHpModify = function(actionName, actionArgs) {
    var targets = this.makeActionTargets(actionArgs[0]);
    if (targets.length < 1) return false;
    var change;
    var percent;
    if (actionName.match(/HP[ ]([+-])(?:VARIABLE|VAR)[ ](\d+)/i)) {
      change = parseInt($gameVariables.value(parseInt(RegExp.$2)));
      if (String(RegExp.$1) === '-') change *= -1;
      percent = false;
    } else if
    (actionName.match(/HP[ ]([+-])(?:VARIABLE|VAR)[ ](\d+)([%％])/i)) {
      change = parseInt($gameVariables.value(parseInt(RegExp.$2)));
      if (String(RegExp.$1) === '-') change *= -1;
      percent = true;
    } else if (actionName.match(/HP[ ]([\+\-]\d+)([%％])/i)) {
      change = parseInt(RegExp.$1);
      percent = true;
    } else if (actionName.match(/HP[ ]([\+\-]\d+)/i)) {
      change = parseInt(RegExp.$1);
      percent = false;
    } else {
      return false;
    }
    var show = false;
    for (var i = 0; i < actionArgs.length; ++i) {
      var actionArg = actionArgs[i];
      if (actionArg.toUpperCase() === 'SHOW') show = true;
    }
    var value;
    targets.forEach(function(target) {
      target.clearResult();
      value = percent ? (target.mhp * change * 0.01) : change;
      target.gainHp(parseInt(value));
      if (show) {
        target.startDamagePopup();
        this._logWindow.displayActionResults(this._subject, target);
      }
    }, this);
    return true;
};

BattleManager.actionMePlay = function(actionArgs) {
  if (actionArgs.length < 1) return true;
  if (actionArgs[0].toUpperCase() === 'STOP') {
    AudioManager.stopMe();
  } else {
    var name = actionArgs[0];
    if (!name) return true;
    var vol = actionArgs[1] || Yanfly.Param.SoundVolume;
    var pitch = actionArgs[2] || Yanfly.Param.SoundPitch;
    var pan = actionArgs[3] || Yanfly.Param.SoundPan;
    var me = {
      name: name,
      volume: vol,
      pitch: pitch,
      pan: pan
    };
    AudioManager.playMe(me);
  }
  return true;
};

BattleManager.actionMpModify = function(actionName, actionArgs) {
    var targets = this.makeActionTargets(actionArgs[0]);
    if (targets.length < 1) return false;
    var change;
    var percent;
    if (actionName.match(/MP[ ]([+-])(?:VARIABLE|VAR)[ ](\d+)/i)) {
      change = parseInt($gameVariables.value(parseInt(RegExp.$2)));
      if (String(RegExp.$1) === '-') change *= -1;
      percent = false;
    } else if
    (actionName.match(/MP[ ]([+-])(?:VARIABLE|VAR)[ ](\d+)([%％])/i)) {
      change = parseInt($gameVariables.value(parseInt(RegExp.$2)));
      if (String(RegExp.$1) === '-') change *= -1;
      percent = true;
    } else if (actionName.match(/MP[ ]([\+\-]\d+)([%％])/i)) {
      change = parseInt(RegExp.$1);
      percent = true;
    } else if (actionName.match(/MP[ ]([\+\-]\d+)/i)) {
      change = parseInt(RegExp.$1);
      percent = false;
    } else {
      return false;
    }
    var show = false;
    for (var i = 0; i < actionArgs.length; ++i) {
      var actionArg = actionArgs[i];
      if (actionArg.toUpperCase() === 'SHOW') show = true;
    }
    var value;
    targets.forEach(function(target) {
      target.clearResult();
      value = percent ? (target.mmp * change * 0.01) : change;
      target.gainMp(parseInt(value));
      if (show) {
        target.startDamagePopup();
        this._logWindow.displayActionResults(this._subject, target);
      }
    }, this);
    return true;
};

BattleManager.actionRefreshStatus = function() {
    this._statusWindow.refresh();
    return false;
};

BattleManager.actionRemoveBuff = function(actionName, actionArgs) {
  var targets = this.makeActionTargets(actionArgs[0]);
  if (targets.length < 1) return false;
  var show = false;
  for (var i = 0; i < actionArgs.length; ++i) {
    var actionArg = actionArgs[i];
    if (actionArg.toUpperCase() === 'SHOW') show = true;
  }
  if (actionName.match(/REMOVE[ ](.*)[ ]BUFF/i)) {
    var paramId = this.getParamId(String(RegExp.$1).toUpperCase());
  } else {
    return true;
  }
  if (paramId < 0) return true;
  targets.forEach(function(target) {
    if (target.isBuffAffected(paramId)) {
      target.removeBuff(paramId);
      if (show) this._logWindow.displayActionResults(this._subject, target);
    }
  }, this);
  return true;
};

BattleManager.actionRemoveDebuff = function(actionName, actionArgs) {
  var targets = this.makeActionTargets(actionArgs[0]);
  if (targets.length < 1) return false;
  var show = false;
  for (var i = 0; i < actionArgs.length; ++i) {
    var actionArg = actionArgs[i];
    if (actionArg.toUpperCase() === 'SHOW') show = true;
  }
  if (actionName.match(/REMOVE[ ](.*)[ ]DEBUFF/i)) {
    var paramId = this.getParamId(String(RegExp.$1).toUpperCase());
  } else {
    return true;
  }
  if (paramId < 0) return true;
  targets.forEach(function(target) {
    if (target.isDebuffAffected(paramId)) {
      target.removeBuff(paramId);
      if (show) this._logWindow.displayActionResults(this._subject, target);
    }
  }, this);
  return true;
};

BattleManager.actionRemoveState = function(actionName, actionArgs) {
  var targets = this.makeActionTargets(actionArgs[0]);
  if (targets.length < 1) return false;
  var show = false;
  for (var i = 0; i < actionArgs.length; ++i) {
    var actionArg = actionArgs[i];
    if (actionArg.toUpperCase() === 'SHOW') show = true;
  }
  if
  (actionName.match(/(?:REMOVE_STATE|REMOVE STATE)[ ](\d+(?:\s*,\s*\d+)*)/i)) {
    var states = JSON.parse('[' + RegExp.$1.match(/\d+/g) + ']');
  } else {
    return true;
  }
  targets.forEach(function(target) {
    for (var i = 0; i < states.length; ++i) {
      stateId = states[i];
      if (target.isStateAffected(stateId)) {
        target.removeState(stateId);
        if (show) this._logWindow.displayActionResults(this._subject, target);
      }
    }
  }, this);
  return true;
};

BattleManager.actionSePlay = function(actionArgs) {
  if (actionArgs.length < 1) return true;
  if (actionArgs[0].toUpperCase() === 'PLAY CURSOR') {
    SoundManager.playCursor();
  } else if (actionArgs[0].toUpperCase() === 'PLAY OK') {
    SoundManager.playOk();
  } else if (actionArgs[0].toUpperCase() === 'PLAY CANCEL') {
    SoundManager.playCancel();
  } else if (actionArgs[0].toUpperCase() === 'PLAY BUZZER') {
    SoundManager.playBuzzer();
  } else if (actionArgs[0].toUpperCase() === 'PLAY EQUIP') {
    SoundManager.playEquip();
  } else if (actionArgs[0].toUpperCase() === 'PLAY SAVE') {
    SoundManager.playSave();
  } else if (actionArgs[0].toUpperCase() === 'PLAY LOAD') {
    SoundManager.playLoad();
  } else if (actionArgs[0].toUpperCase() === 'PLAY BATTLE START') {
    SoundManager.playBattleStart();
  } else if (actionArgs[0].toUpperCase() === 'PLAY ESCAPE') {
    SoundManager.playEscape();
  } else if (actionArgs[0].toUpperCase() === 'PLAY ENEMY ATTACK') {
    SoundManager.playEnemyAttack();
  } else if (actionArgs[0].toUpperCase() === 'PLAY ENEMY DAMAGE') {
    SoundManager.playEnemyDamage();
  } else if (actionArgs[0].toUpperCase() === 'PLAY ENEMY COLLAPSE') {
    SoundManager.playEnemyCollapse();
  } else if (actionArgs[0].toUpperCase() === 'PLAY BOSS COLLAPSE 1') {
    SoundManager.playBossCollapse1();
  } else if (actionArgs[0].toUpperCase() === 'PLAY BOSS COLLAPSE 2') {
    SoundManager.playBossCollapse2();
  } else if (actionArgs[0].toUpperCase() === 'PLAY ACTOR DAMAGE') {
    SoundManager.playActorDamage();
  } else if (actionArgs[0].toUpperCase() === 'PLAY ACTOR COLLAPSE') {
    SoundManager.playActorCollapse();
  } else if (actionArgs[0].toUpperCase() === 'PLAY RECOVERY') {
    SoundManager.playRecovery();
  } else if (actionArgs[0].toUpperCase() === 'PLAY MISS') {
    SoundManager.playMiss();
  } else if (actionArgs[0].toUpperCase() === 'PLAY EVASION') {
    SoundManager.playEvasion();
  } else if (actionArgs[0].toUpperCase() === 'PLAY MAGIC EVASION') {
    SoundManager.playMagicEvasion();
  } else if (actionArgs[0].toUpperCase() === 'PLAY REFLECTION') {
    SoundManager.playReflection();
  } else if (actionArgs[0].toUpperCase() === 'PLAY SHOP') {
    SoundManager.playShop();
  } else if (actionArgs[0].toUpperCase() === 'PLAY USE ITEM') {
    SoundManager.playUseItem();
  } else if (actionArgs[0].toUpperCase() === 'PLAY USE SKILL') {
    SoundManager.playUseSkill();
  } else {
    var name = actionArgs[0];
    if (!name) return true;
    var vol = actionArgs[1] || Yanfly.Param.SoundVolume;
    var pitch = actionArgs[2] || Yanfly.Param.SoundPitch;
    var pan = actionArgs[3] || Yanfly.Param.SoundPan;
    var se = {
      name: name,
      volume: vol,
      pitch: pitch,
      pan: pan
    };
    AudioManager.playSe(se);
  }
  return true;
};

BattleManager.actionTpModify = function(actionName, actionArgs) {
    var targets = this.makeActionTargets(actionArgs[0]);
    if (targets.length < 1) return false;
    var change;
    var percent;
    if (actionName.match(/TP[ ]([+-])(?:VARIABLE|VAR)[ ](\d+)/i)) {
      change = parseInt($gameVariables.value(parseInt(RegExp.$2)));
      if (String(RegExp.$1) === '-') change *= -1;
      percent = false;
    } else if
    (actionName.match(/TP[ ]([+-])(?:VARIABLE|VAR)[ ](\d+)([%％])/i)) {
      change = parseInt($gameVariables.value(parseInt(RegExp.$2)));
      if (String(RegExp.$1) === '-') change *= -1;
      percent = true;
    } else if (actionName.match(/TP[ ]([\+\-]\d+)([%％])/i)) {
      change = parseInt(RegExp.$1);
      percent = true;
    } else if (actionName.match(/TP[ ]([\+\-]\d+)/i)) {
      change = parseInt(RegExp.$1);
      percent = false;
    } else {
      return false;
    }
    var show = false;
    for (var i = 0; i < actionArgs.length; ++i) {
      var actionArg = actionArgs[i];
      if (actionArg.toUpperCase() === 'SHOW') show = true;
    }
    var value;
    targets.forEach(function(target) {
      target.clearResult();
      value = percent ? (target.maxTp() * change * 0.01) : change;
      target.gainTp(parseInt(value));
      if (show) {
        target.startDamagePopup();
        this._logWindow.displayActionResults(this._subject, target);
      }
    }, this);
    return true;
};

//=============================================================================
// Utilities
//=============================================================================

Yanfly.Util = Yanfly.Util || {};

Yanfly.Util.displayError = function(e, code, message) {
  console.log(message);
  console.log(code || 'NON-EXISTENT');
  console.error(e);
  if (Utils.isNwjs() && Utils.isOptionValid('test')) {
    if (!require('nw.gui').Window.get().isDevToolsOpen()) {
      require('nw.gui').Window.get().showDevTools();
    }
  }
};

//=============================================================================
// End of File
//=============================================================================
};
