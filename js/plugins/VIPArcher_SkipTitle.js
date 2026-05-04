//=============================================================================
// VIPArcher_SkipTitle.js
//=============================================================================
 
/*:
 * @plugindesc VIPA彻底跳过标题[v1.0]
 * @author VIPArcher
 *
 * @param Test Only
 * @text 仅当测试时跳过
 * @desc 设置为 true 时仅当测试时跳过
设置为 false 时彻底跳过
 * @default true
 * @type boolean
 *
 * @help 
 
这个插件没有需要操作的指令
不需要帮助

条款：
允许商业游戏制作

 */
 
void function() {
    var parameters = PluginManager.parameters('VIPArcher_SkipTitle');
    var testOnly = parameters['Test Only'] !== 'false';
    if (!testOnly || Utils.isOptionValid('test')) {
        Scene_Title.prototype.start = function() {
            Stage.prototype.initialize.call(this);
            SceneManager.clearStack();
            DataManager.setupNewGame();
            SceneManager.goto(Scene_Map);
        };
    }
}();