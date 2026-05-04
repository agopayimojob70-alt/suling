/*:
 * @plugindesc [v3.0] 拖拽拼图小游戏（终极修复：像素判定+位置偏移+中心散布）
 * @author Gemini
 *
 * @param Scale
 * @text 图片缩放比例
 * @desc 调整碎片大小。建议 0.3 - 0.5。
 * @default 0.3
 *
 * @param SnapDistance
 * @text 吸附触发距离
 * @desc 距离目标点多少像素时自动吸附。建议 50-80。
 * @default 60
 *
 * @param ScatterRange
 * @text 初始散布范围
 * @desc 碎片在中心点周围随机偏移的最大像素距离。
 * @default 200
 *
 * @param OffsetX
 * @text 完成位置 X 偏移
 * @desc 拼图完成后整体向右移动的像素量。0 为紧贴左边。
 * @default 100
 *
 * @param OffsetY
 * @text 完成位置 Y 偏移
 * @desc 拼图完成后整体向下移动的像素量。增大此值可避开顶部文字。
 * @default 150
 *
 * @help 
 * 插件指令: StartPuzzleGame
 * * 特色功能：
 * 1. 像素级检测：鼠标必须点在有图案的地方才能抓取，解决了透明边挡住鼠标的问题。
 * 2. 中心散布：碎片初始会在屏幕中心随机乱放，不再死板地叠在一起。
 * 3. 归位偏移：通过参数 OffsetX 和 OffsetY 调整拼好后的位置，防止遮挡 UI。
 */

(function() {
    const scriptName = document.currentScript.src.split("/").pop().replace(/\.js$/, "");
    const parameters = PluginManager.parameters(scriptName);
    
    const globalScale = Number(parameters['Scale']) || 0.3;
    const globalSnapDist = Number(parameters['SnapDistance']) || 60;
    const globalScatter = Number(parameters['ScatterRange']) || 200;
    const globalOffX = Number(parameters['OffsetX']) || 100;
    const globalOffY = Number(parameters['OffsetY']) || 150;

    const _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        _Game_Interpreter_pluginCommand.call(this, command, args);
        if (command === 'StartPuzzleGame') {
            SceneManager.push(Scene_PuzzleDrag);
        }
    };

    function Scene_PuzzleDrag() { this.initialize.apply(this, arguments); }
    Scene_PuzzleDrag.prototype = Object.create(Scene_MenuBase.prototype);
    Scene_PuzzleDrag.prototype.constructor = Scene_PuzzleDrag;

    Scene_PuzzleDrag.prototype.create = function() {
        Scene_MenuBase.prototype.create.call(this);
        this._pieces = [];
        this._draggingPiece = null;
        this._correctCount = 0;
        this.createPieces();
        this.createHelpWindow();
    };

    Scene_PuzzleDrag.prototype.createPieces = function() {
        let pieceNames = ['map1', 'map2', 'map3', 'map4', 'map5', 'map6', 'map7'];
        pieceNames.sort(() => Math.random() - 0.5);

        const cx = Graphics.width / 2;
        const cy = Graphics.height / 2;

        pieceNames.forEach((name) => {
            const sprite = new Sprite(ImageManager.loadPicture(name));
            sprite.anchor.set(0.5);
            sprite.scale.set(globalScale);
            
            // 初始在中心点周围随机散开
            sprite.x = cx + (Math.random() * globalScatter - globalScatter / 2);
            sprite.y = cy + (Math.random() * globalScatter - globalScatter / 2);
            
            sprite.isCorrect = false;
            this._pieces.push(sprite);
            this.addChild(sprite);
        });
    };

    Scene_PuzzleDrag.prototype.createHelpWindow = function() {
        this._helpWindow = new Window_Help(1);
        this._helpWindow.setText("玩法：拖动碎片还原地图。");
        this.addWindow(this._helpWindow);
    };

    Scene_PuzzleDrag.prototype.update = function() {
        Scene_MenuBase.prototype.update.call(this);
        this.updateDrag();
    };

    Scene_PuzzleDrag.prototype.updateDrag = function() {
        if (TouchInput.isPressed()) {
            if (!this._draggingPiece) {
                this.checkPickUp();
            } else {
                this._draggingPiece.x = TouchInput.x - this._dragOffsetX;
                this._draggingPiece.y = TouchInput.y - this._dragOffsetY;
            }
        } else if (this._draggingPiece) {
            this.checkDrop();
        }
    };

    Scene_PuzzleDrag.prototype.checkPickUp = function() {
        for (let i = this._pieces.length - 1; i >= 0; i--) {
            const p = this._pieces[i];
            if (!p.isCorrect && this.isPixelPressed(p)) {
                this._draggingPiece = p;
                this._dragOffsetX = TouchInput.x - p.x;
                this._dragOffsetY = TouchInput.y - p.y;
                this.removeChild(p);
                this.addChild(p);
                break;
            }
        }
    };

    // 精准像素检测逻辑
    Scene_PuzzleDrag.prototype.isPixelPressed = function(sprite) {
        if (!sprite.bitmap || !sprite.bitmap.isReady()) return false;
        const localX = (TouchInput.x - sprite.x) / sprite.scale.x + sprite.anchor.x * sprite.bitmap.width;
        const localY = (TouchInput.y - sprite.y) / sprite.scale.y + sprite.anchor.y * sprite.bitmap.height;
        if (localX >= 0 && localY >= 0 && localX < sprite.bitmap.width && localY < sprite.bitmap.height) {
            const alpha = sprite.bitmap.getAlphaPixel(Math.floor(localX), Math.floor(localY));
            return alpha > 0;
        }
        return false;
    };

    Scene_PuzzleDrag.prototype.checkDrop = function() {
        const p = this._draggingPiece;
        
        // 计算目标归位位置（应用了 OffsetX 和 OffsetY）
        const targetX = (p.bitmap.width * globalScale) / 2 + globalOffX;
        const targetY = (p.bitmap.height * globalScale) / 2 + globalOffY;
        
        const dist = Math.sqrt(Math.pow(p.x - targetX, 2) + Math.pow(p.y - targetY, 2));
        
        if (dist < globalSnapDist) {
            p.x = targetX;
            p.y = targetY;
            p.isCorrect = true;
            SoundManager.playOk();
            this._correctCount++;
            if (this._correctCount === this._pieces.length) {
                $gameSwitches.setValue(20, true);
                setTimeout(() => SceneManager.pop(), 1200);
            }
        }
        this._draggingPiece = null;
    };
})();