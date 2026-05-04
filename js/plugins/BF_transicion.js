//=============================================================================
//BF_transicion.js
//=============================================================================
/*
@author FriKitty / CeciDibujera
@plugindesc Use images for transitions v1.0
@filename BF_transicion.js

@param numeroImg
@text Number of images
@type number
@min 1
@desc Number of images the transition will have.

@param velFrame
@text Frame speed
@type number
@min 1
@desc How much each image in the transition will last, in frames.

@param introBat
@text Use battle intro
@type boolean
@default true
@on Default
@off Generic
@desc Use the default battle intro, or the generic one you set up in this plugin.


@help BF_transicion v.1.0

Plugin to change the default transitions (when a battle starts or
ends, when a new game starts, when you open the title menu, when you
change maps), to use images instead of a black background that gradually
loses opacity (or vice versa).

You can use this plugin for any project you want, commercial or not.

You must credit me as FriKitty AND CeciDibujera, OR just CeciDibujera.
You must credit "BF Project".
You can also edit this plugin as much as you like, as long as you add
in this description somewhere that you did (also, would be a good
idea to add this information in the Spanish instructions, or delete
it altogether, so Spanish speaking users can see that).
You can also look at my code and see how I did some things to make
your own plugin that does things differently. In that case, there is
no need to credit me. This is how people learn!

=======================================================================
By default, RPG Maker transitions are a black background that gradually
loses or gains opacity each frame until it finishes. They last 24 frames,
or double that for the slow ones.

This plugin changes those transitions so that:
· They all last the same.
· They use images in order, showing an animation.

You need to add your images in the img/pictures folder and name them
trans0.png, trans1.png, trans2.png... as many as you want ordered
from less dark to darker.
Remember to start with 0, not 1.

Then, you have to add the total image count in the "Number of images"
parameter. And what each image will last (in frames) in "Frame speed".

If you want to change the battle transition so it's not the default
one (with some zoom and a white flash), and it instead uses the same
one you have set up in this plugin, select "Generic" (false) in
"Use battle intro". If you need a different one, it's best if you
find a different plugin, like SRD_CEBattleIntro.

=======================================================================
This plugin does NOT modify the event commands "Fade out" and "Fade in".
If, in addition to those transitions for map transfer, load, new game, 
battle... you need manual transitions for your events, you'll have to
use a common event like so:

· Show image: #1, trans0, Upper left (0,0), (100%, 100%), 255, Normal
· Wait: X frames
· Show image: #1, trans1...

And the reverse for the opposite one.

By the way, this plugin makes it so that when you select the transition
"White" in "Transfer player" it doesn't change anything. If you need a
map transition with a different color, simply deactivate it in the 
Transfer player command and do it manually with images and/or
common events.

=======================================================================
EXTRA ADVICE
Images used with the "Show image" command will always lag a little the
first time they're used, which is very noticeable when you try to 
show them quick in order to create an animation. There are plugins to
preload images and any of them would work. But if you don't want to
do that, I'll tell you what I do:

Before I use an image, inside the common event or wherever, I select
the "Script" command and type:

ImageManager.reservePicture("imagename");
(without .png)

This for each image that the animation uses.
Then, a 1 frame pause ("Wait").
Then, I use a "Conditional branch" and in the last tab I select "script"
and type:

ImageManager.isReady()

Inside that if, I put all the images like I explained before.

If you know a better method you can ignore this advice, but it works
well for me.

By the way, the images used in this plugin are already preloaded,
this advice is only for different transitions you may need in your
events.

=======================================================================
Thanks to caethyril for giving me some pointers, and to LeonarthCG for
helping me make this plugin flexible with parameters.

Contact me on cecilia.ocon[at]gmail.com or on Twitter/Discord (frikitty)
if you need something.

*/

/*:
@author FriKitty / CeciDibujera
@plugindesc BF自定义过渡动画[v1.0]
@filename BF_transicion.js

@param numeroImg
@text 图片数量
@type number
@min 1
@desc 过渡动画使用的图片总数
@default 1

@param velFrame
@text 帧速
@type number
@min 1
@desc 每张过渡图片持续的帧数
@default 20

@param introBat
@text 使用战斗默认开场
@type boolean
@default true
@on 默认
@off 通用
@desc 是否使用RPG Maker默认的战斗开场动画
关闭则使用本插件配置的通用过渡效果

@help BF_transicion v.1.0

本插件用于替换RPG Maker默认的过渡效果
（战斗开始/结束、新游戏启动、打开标题菜单、地图切换时）
不再使用逐渐变透明/不透明的黑色背景，而是通过序列图片实现动画过渡

你可将本插件用于任意项目（商业/非商业均可）
必须标注作者为：FriKitty 和 CeciDibujera，或仅标注 CeciDibujera
必须标注 "BF Project"
你也可以自由修改本插件，但需在说明文档中注明修改痕迹（建议同时在西班牙语说明中补充，或直接删除西语说明）
你也可以参考本插件的代码逻辑编写自定义插件，此种情况无需标注作者——这是学习的过程！

=======================================================================
RPG Maker 默认过渡效果说明：
默认过渡是黑色背景逐帧改变透明度，普通过渡持续24帧，慢速过渡持续双倍时长（48帧）

本插件对过渡效果的修改：
· 所有过渡效果时长统一
· 按顺序播放图片，形成自定义动画

使用步骤：
1. 将过渡图片放入 img/pictures 文件夹
2. 图片命名规则：trans0.png、trans1.png、trans2.png……（从最亮到最暗排序，必须从0开始）
3. 在插件参数中设置：
   - 图片总数（与实际图片数量一致）
   - 单张图片持续帧数

战斗开场特殊设置：
若想替换默认战斗开场（带缩放和白色闪屏的效果），将「使用战斗默认开场」设为 false（通用）
若需要专属战斗开场效果，建议使用其他插件（如 SRD_CEBattleIntro）

=======================================================================
重要说明：
本插件不会修改事件指令中的「淡出画面」和「淡入画面」
若需为事件添加自定义过渡动画，需通过公共事件实现，示例：

· 显示图片：#1, trans0, 左上(0,0), (100%,100%), 255, 普通
· 等待：X 帧
· 显示图片：#1, trans1……（依次切换图片）

反向过渡则按倒序播放图片

补充：
地图转移时选择「白色过渡」不会生效
若需自定义颜色过渡，需关闭地图转移的过渡选项
通过图片/公共事件手动实现

=======================================================================
额外建议
使用「显示图片」指令调用图片时，首次加载会出现轻微卡顿（动画场景中尤为明显）
可通过图片预加载插件解决，或使用以下手动预加载方法：

在调用图片前，执行「脚本」指令：
ImageManager.reservePicture("图片名"); // 无需后缀.png
（每个动画图片都需执行一次）

然后添加「等待：1帧」，再创建「条件分支」（最后一页选择「脚本」）：
ImageManager.isReady()

在该条件分支内编写图片显示逻辑即可

注：本插件的过渡图片已自动预加载，此建议仅适用于事件中自定义的过渡动画

=======================================================================
致谢
感谢 caethyril 提供技术指导，感谢 LeonarthCG 协助实现参数化配置。

如需帮助可联系：
邮箱：cecilia.ocon@gmail.com
社交平台：Twitter/Discord (frikitty)


*/


//Velocidad de transición y número de imágenes
//Cogemos los parámetros primero y después los multiplicamos en fadeSpeed
var bfNumeroImg = parseInt(PluginManager.parameters('BF_transicion')["numeroImg"])
var bfVelFrame = parseInt(PluginManager.parameters('BF_transicion')["velFrame"])

Scene_Base.prototype.fadeSpeed = function() {
    return bfNumeroImg * bfVelFrame;
};

//Slow es igual que la normal ahora
Scene_Base.prototype.slowFadeSpeed = function() {
    return this.fadeSpeed();
};

//Creamos un diccionario vacío donde luego vamos a meter las reservas de imagen
var bfTransImg = {}
//Nos inventamos un contador i, empieza a 0, mientras sea menor que bfNumeroImg hará la cosa, y cada vez aumenta 1
for (let i = 0; i < bfNumeroImg; i++){
    //metemos en bfTransImg cada imagen, que se tiene que llamar trans[numero].png (sin corchetes). Empezando por el 0
    bfTransImg[i] = ImageManager.reservePicture("trans"+i)
}

//Crear un sprite de fade sin bitmap asociado todavía
Scene_Base.prototype.createFadeSprite = function() {
    if(!this.spriteTrans){
        this.spriteTrans = new Sprite();
        this.addChild(this.spriteTrans)
    }
};

//Cuando te vas a negro, ponerle el bitmap primero, bfTransImg[0]
Scene_Base.prototype.startFadeOut = function(duration) {
    //Cuando te vas a negro
        this.createFadeSprite();
        this._fadeSign = -1;
        this._fadeDuration = duration;
        this.spriteTrans.bitmap = bfTransImg[0];
        this.spriteTrans.visible = true;
};

//Cuando vuelves de negro empiezas con la imagen última, que como puede cambiar es bfNumeroImg -1
Scene_Base.prototype.startFadeIn = function(duration) {
    //Cuando vuelves de negro
    this.createFadeSprite();
    this._fadeSign = 1;
    this._fadeDuration = duration;
    //es bfNumeroImg -1 porque siempre va a cambiar el número de imágenes. Y como empieza a contar desde 0, pues -1
    this.spriteTrans.bitmap = bfTransImg[bfNumeroImg-1];
    this.spriteTrans.visible = true;
};

//En updateFade es donde ponemos la animación
Scene_Base.prototype.updateFade = function() {
    if (this._fadeDuration > 0) {
        this._fadeDuration--;
        //imagenActual me va a dar la key de bfTransImg que toca. Se divide la cuenta atrás (fadeDuration) entre la velocidad de cada frame
        //Y se redondea pabajo pa que no haya decimales
        //Por ejemplo la animación dura 16 frames, son 4 imágenes: empieza siempre con uno menos, 15
        //15/4 = 3,noseque, redondeado 3. Entonces me pone la imagen 3, que es la 4ª porque contamos desde 0
        var imagenActual = Math.floor(this._fadeDuration / bfVelFrame)
        if (this._fadeSign > 0) {
            //esto es fadein (venir de negro)
            this.spriteTrans.bitmap = bfTransImg[imagenActual];
        } 
        else {
            //Esto de abajo es el fadeout (irse a negro)
            //De esto no me voy a acordar nunca pero de cada número que habría en fadein, te da el complementario para hacer fadeout
            //Por ejemplo, si de un total de 4, tengo el 3 (4º img), te da el 0 (1ª img)
            //Si tengo el 2 (3ª), te da el 1 (2ª)
            //No entiendo del todo PERO CHUSCA
            imagenActual = bfNumeroImg - imagenActual - 1
            this.spriteTrans.bitmap = bfTransImg[imagenActual];
        }
        if(this._fadeDuration <= 0 && this._fadeSign > 0){
            this.spriteTrans.visible = false;
        }
    }
};

//Batalla con intro normal
if(PluginManager.parameters('BF_transicion')["introBat"] == "false"){
    Scene_Map.prototype.launchBattle = function() {
        BattleManager.saveBgmAndBgs();
        this.stopAudioOnBattleStart();
        SoundManager.playBattleStart();
        //Cambiar startEncounterEffect por startFadeOut y punto
        this.startFadeOut(this.fadeSpeed())
        this._mapNameWindow.hide();
    };
}