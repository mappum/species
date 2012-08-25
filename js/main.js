var resources = [{
    name: "null",
    type: "image",
    src: "img/null.png"
}, {
    name: "mountains",
    type: "image",
    src: "img/mountains.png"
}, {
    name: "sky",
    type: "image",
    src: "img/sky.png"
}, {
    name: "tiles",
    type: "image",
    src: "img/tiles.png"
}, {
    name: "level1",
    type: "tmx",
    src: "data/level1.tmx"
}];

me.debug.renderHitBox = true;
 
var game = {
    onload: function() {
        if (!me.video.init('game', 640, 480, false, 1.0)) {
            alert("Sorry, your browser does not support this game :(");
            return;
        }
 
        me.audio.init("mp3,ogg");
        me.loader.onload = this.loaded.bind(this);
        me.loader.preload(resources);
        me.state.change(me.state.LOADING);
    },
    loaded: function() {
        me.state.set(me.state.PLAY, new GameScreen());

        me.entityPool.add('PlayerEntity', PlayerEntity);

        me.input.bindKey(me.input.KEY.A, 'left');
        me.input.bindKey(me.input.KEY.D, 'right');
        me.input.bindKey(me.input.KEY.W, 'jump');
        me.input.bindKey(me.input.KEY.SPACE, 'jump');
        me.input.bindKey(me.input.KEY.X, 'shoot');

        try { me.input.registerMouseEvent(); } catch(e) {}
        me.input.bindMouse(me.input.mouse.LEFT, me.input.KEY.X);


        window.addEventListener('mousemove', function(e) {
            var offset = me.video.getPos();

            var x = e.pageX - offset.x;
            var y = e.pageY - offset.y;

            if(me.sys.scale !== 1) {
                x /= me.sys.scale;
                y /= me.sys.scale;
            }

            me.input.mouse.pos.x = x;
            me.input.mouse.pos.y = y;
        }, false);

        me.state.change(me.state.PLAY);
    }
};

var GameScreen = me.ScreenObject.extend({
    onResetEvent: function() {
        me.levelDirector.loadLevel('level1');
    },

    onDestroyEvent: function() {
    }
});

var PlayerEntity = me.ObjectEntity.extend({
    init: function(x, y, settings) {
        settings.image = 'null';
        this.parent(x, y, settings);

        this.width = settings.width;
        this.height = settings.height;

        this.collidable = true;

        this.setVelocity(7, 17);
        this.updateColRect(0, this.width, 0, this.height);

        me.game.viewport.follow(this.pos, me.game.viewport.AXIS.BOTH);
    },

    update: function() {
        if(me.input.isKeyPressed('left')) this.doWalk(true);
        else if(me.input.isKeyPressed('right')) this.doWalk(false);
        else this.doStop();

        if(me.input.isKeyPressed('jump')) this.doJump();

        if(me.input.isKeyPressed('shoot')) console.log('shoot')

        var x = ~~(this.pos.x - this.vp.pos.x),
            y = ~~(this.pos.y - this.vp.pos.y);

        var dx = me.input.mouse.pos.x - x,
            dy = me.input.mouse.pos.y - y;
        this.aimAngle = Math.atan2(dy, dx);

        this.updateMovement();

        return true;
    },

    draw: function(ctx) {
        this.parent(ctx);

        ctx.save();
        
        var x = ~~(this.pos.x - this.vp.pos.x),
            y = ~~(this.pos.y - this.vp.pos.y);

        ctx.fillStyle = '#000';
        ctx.fillRect(x, y,
            this.width, this.height);

        ctx.translate(x + 16, y + 16);
        ctx.fillStyle = '#fff';
        ctx.rotate(this.aimAngle);
        ctx.fillRect(-4, -8, 32, 16);

        ctx.restore();
    },

    doStop: function() {
        if(this.vel.x !== 0) {
            this.vel.x -= this.accel.x * me.timer.tick * this.vel.x > 0 ? 1 : -1;
        }
    }
});

window.onReady(function() {
    game.onload();
});