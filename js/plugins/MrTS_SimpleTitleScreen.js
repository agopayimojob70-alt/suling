//=============================================================================
// MrTS_SimpleTitleScreen.js
//=============================================================================

/*:
* @plugindesc MrTS图片标题命令[v1.1.1]
* @author Mr. Trivel
*
* @param Display Cursor
* @text 显示光标
* @type boolean
* @on 启用
* @off 禁用
* @desc 是否在选中的命令旁显示光标？
* @default true
*
* @param Display Alternative
* @text 显示备选图片
* @type boolean
* @on 启用
* @off 禁用
* @desc 命令被选中时是否显示备选图片？
* @default true
*
* @param Display Behind
* @text 显示背景图片
* @type boolean
* @on 启用
* @off 禁用
* @desc 是否在选中的命令后方显示图片？
* @default true
*
* @param Display Press Start
* @text 显示按开始键提示
* @type boolean
* @on 启用
* @off 禁用
* @desc 是否显示并提示“按开始键”？
* @default true
*
* @param Commands Position
* @text 命令位置
* @desc 标题画面上的 X Y 位置。
* Default: 561 400
* @default 561 400
*
* @param Press Start Position
* @text 按开始键提示位置
* @desc 标题画面上的 X Y 位置
* Default: 561 580
* @default 561 580
*
* @param Cursor Offset
* @text 光标偏移量
* @desc 光标的 X Y 偏移量
* Default -60 0
* @default -60 0
*
* @param Behind Offset
* @text 背景图片偏移量
* @desc 背景图片的偏移量
* Default -100 0
* @default -100 0
*
* @param Vertical Spacing
* @text 垂直间距
* @desc 命令按钮之间的垂直距离（像素）
* @default 10
*  
* @help 
* --------------------------------------------------------------------------------
* 使用条款
* --------------------------------------------------------------------------------
* 不要移除头部信息或声称此插件由你编写。
* 在项目中使用此插件时，请注明 Mr. Trivel。
* 商业和非商业项目均可免费使用
* --------------------------------------------------------------------------------
* 版本 1.1.1
* --------------------------------------------------------------------------------
* 
* --------------------------------------------------------------------------------
* 图片列表
* --------------------------------------------------------------------------------
* 标题画面的主图片按常规在数据库中选择
* 
* 其他图片放入 img\system 文件夹：
* img\system\titleCursor.png - 如果光标设置为不显示，可省略
* img\system\titleBehindCommand.png - 如果背景设置为不显示，可省略
* img\system\titlePressStart.png - 如果按开始键提示设置为不显示，可省略
*
* 其余图片的名称是动态生成的，由 'command_' 和命令处理名称组成
* 例如：command_newGame（新游戏）、command_continue（继续）、command_options（选项）
* 这三个是 RPG Maker MV 的默认命令
* 如果使用了其他插件，可能需要添加更多图片
*
* 命令被选中时的备选图片命名方式类似：
* commandAlt_命令名称
* 例如：
* commandAlt_newGame、commandAlt_continue、commandAlt_options	
* --------------------------------------------------------------------------------
*
* --------------------------------------------------------------------------------
* Version History
* --------------------------------------------------------------------------------
* 1.1.1 - Added Vertical Spacing parameter
* 1.1 - Compatibility fix with plugins that disable command menu when press start
* 		is disabled.
* 1.0 - Release
*/

(function() {
	var parameters = PluginManager.parameters('MrTS_SimpleTitleScreen');
	var paramDisplayCursor = (parameters['Display Cursor'] || "true").toLowerCase() === "true";
	var paramDisplayAlternative = (parameters['Display Alternative'] || "true").toLowerCase() === "true";
	var paramDisplayBehind = (parameters['Display Behind'] || "true").toLowerCase() === "true";
	var paramDisplayPressStart = (parameters['Display Press Start'] || "true").toLowerCase() === "true";
	var paramCommandsPos = String(parameters['Commands Position'] || "561 400");
	var paramPressStartPos = String(parameters['Press Start Position'] || "561 580");
	var paramCursorOffset = String(parameters['Cursor Offset'] || "-60 0");
	var paramBehindOffset = String(parameters['Behind Offset'] || "-100 0");
	var paramVerticalSpacing = Number(parameters['Vertical Spacing'] || 10); // 新增垂直间距参数

	var _WindowTitleCommand_initialize = Window_TitleCommand.prototype.initialize;
	Window_TitleCommand.prototype.initialize = function() {
		this._commandSprites = [];
		this._altSprites = [];
		_WindowTitleCommand_initialize.call(this);
		this.openness = 255;
		var pos = paramCommandsPos.split(' ');
		this.x = Number(pos[0]);
		this.y = Number(pos[1]);
		this.opacity = 0;
	};

	Window_TitleCommand.prototype.setupSprites = function() {
		for (var i = 0; i < this._list.length; i++) {
			var rect = this.itemRect2(i);
			var spr = new Sprite();
			var symbol = this._list[i].symbol;
			spr.bitmap = ImageManager.loadSystem("command_"+symbol);
			spr.x = this.standardPadding();
			spr.y = rect.y + this.standardPadding();
			this._commandSprites.push(spr);
			this.addChild(spr);

			if (paramDisplayAlternative)
			{
				var spr2 = new Sprite();
				spr2.bitmap = ImageManager.loadSystem("commandAlt_"+symbol);
				spr2.x = this.standardPadding();
				spr2.y = rect.y + this.standardPadding();
				this._altSprites.push(spr2);
				spr2.visible = false;
				this.addChild(spr2);
			}

		}
		this.select(this.index());
	};

	var _WindowTitleCommand_select = Window_TitleCommand.prototype.select
	Window_TitleCommand.prototype.select = function(index) {
		_WindowTitleCommand_select.call(this, index);
		if (paramDisplayAlternative)
		{
			if (this._commandSprites[index] && this._altSprites[index])
			{
				for (var i = 0; i < this._commandSprites.length; i++) {
					this._commandSprites[i].visible = true;
					this._altSprites[i].visible = false;
				}
				this._commandSprites[index].visible = false;
				this._altSprites[index].visible = true;
			}
		}
	};

	Window_TitleCommand.prototype.drawItem = function(index) {
	};

	Window_TitleCommand.prototype.updateCursor = function() {
        this.setCursorRect(0, 0, 0, 0);
	};

	Window_TitleCommand.prototype.itemRect2 = function(index) {
	    var rect = new Rectangle();
	    var maxCols = this.maxCols();
	    rect.width = this.itemWidth();
	    rect.height = this.itemHeight();
	    rect.x = index % maxCols * (rect.width + this.spacing()) - this._scrollX;
	    // 应用垂直间距参数
	    rect.y = Math.floor(index / maxCols) * (rect.height + paramVerticalSpacing) - this._scrollY;
	    return rect;
	};

	Window_TitleCommand.prototype.itemRect = function(index) {
		if (!this._commandSprites[index]) return this.itemRect2(index);
	    var rect = new Rectangle();
	    rect.width = this._commandSprites[index].width;
	    rect.height = this._commandSprites[index].height
	    rect.x = this._commandSprites[index].x - this.standardPadding();
	    rect.y = this._commandSprites[index].y - this.standardPadding();
	    return rect;
	};

	Window_TitleCommand.prototype.close = function() {
	};

	var _SceneTitle_createCommandWindow = Scene_Title.prototype.createCommandWindow;
	Scene_Title.prototype.createCommandWindow = function() {
		_SceneTitle_createCommandWindow.call(this);
		this._commandWindow.setupSprites();
		if (paramDisplayPressStart)
		{
			this._commandWindow.hide();
			this._commandWindow.deactivate();
		}
	};

	var _SceneTitle_createBackground = Scene_Title.prototype.createBackground;
	Scene_Title.prototype.createBackground = function() {
		_SceneTitle_createBackground.call(this);

		if (paramDisplayBehind)
		{
			this._behindPos = paramBehindOffset.split(' ');
			this._behindSpr = new Sprite();
			this._behindSpr.bitmap = ImageManager.loadSystem("titleBehindCommand");
			this.addChild(this._behindSpr);
		}

		if (paramDisplayCursor)
		{
			this._cursorPos = paramCursorOffset.split(' ');
			this._cursorSpr = new Sprite();
			this._cursorSpr.bitmap = ImageManager.loadSystem("titleCursor");
			this.addChild(this._cursorSpr);
		}

		if (paramDisplayPressStart)
		{
			this._pressStartSpr = new Sprite();
			this._pressStartSpr.bitmap = ImageManager.loadSystem("titlePressStart");
			var pos = paramPressStartPos.split(" ");
			this._pressStartSpr.x = Number(pos[0]);
			this._pressStartSpr.y = Number(pos[1]);
			this.addChild(this._pressStartSpr);

			if (paramDisplayCursor) this._cursorSpr.visible = false;
			if (paramDisplayBehind) this._behindSpr.visible = false;
		}
	};

	var _SceneTitle_update = Scene_Title.prototype.update;
	Scene_Title.prototype.update = function() {
		_SceneTitle_update.call(this);
		if (!this._commandWindow.active && this._pressStartSpr && (Input.isTriggered('ok') || TouchInput.isTriggered()))
		{
			SoundManager.playOk();
			this._commandWindow.show();
			if (paramDisplayCursor) this._cursorSpr.visible = true;
			if (paramDisplayBehind) this._behindSpr.visible = true;
			this._commandWindow.active = true;
			this._pressStartSpr.visible = false;
		}

		var rect = this._commandWindow.itemRect(this._commandWindow.index());
		if (paramDisplayCursor)
		{
			this._cursorSpr.x = this._commandWindow.x + Number(this._cursorPos[0]) + rect.x + this._commandWindow.standardPadding();
			this._cursorSpr.y = this._commandWindow.y + Number(this._cursorPos[1]) + rect.y + this._commandWindow.standardPadding();
		}

		if (paramDisplayBehind)
		{
			this._behindSpr.x = this._commandWindow.x + Number(this._behindPos[0]) + rect.x + this._commandWindow.standardPadding();
			this._behindSpr.y = this._commandWindow.y + Number(this._behindPos[1]) + rect.y + this._commandWindow.standardPadding();
		}
	};

})();