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
    name: "bullet",
    type: "image",
    src: "img/bullet.png"
}, {
    name: "level1",
    type: "tmx",
    src: "data/level1.tmx"
}];

//me.debug.renderHitBox = true;
 
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
        me.entityPool.add('ProjectileEntity', ProjectileEntity);

        me.input.bindKey(me.input.KEY.A, 'left');
        me.input.bindKey(me.input.KEY.D, 'right');
        me.input.bindKey(me.input.KEY.W, 'jump');
        me.input.bindKey(me.input.KEY.SPACE, 'jump');
        me.input.bindKey(me.input.KEY.X, 'shoot', true);

        try { me.input.registerMouseEvent(); } catch(e) {}
        me.input.bindMouse(me.input.mouse.LEFT, me.input.KEY.X);

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

        var x = ~~(this.pos.x - this.vp.pos.x),
            y = ~~(this.pos.y - this.vp.pos.y);

        var dx = me.input.mouse.pos.x - x,
            dy = me.input.mouse.pos.y - y;
        this.aimAngle = Math.atan2(dy, dx);

        if(me.input.isKeyPressed('shoot')) {
            me.game.add(new ProjectileEntity(this.pos.x, this.pos.y, {
                x: this.pos.x,
                y: this.pos.y,
                angle: this.aimAngle,
                power: 12,
                name: 'ProjectileEntity'
            }), 5);
            me.game.sort();
        }

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

var ProjectileEntity = me.ObjectEntity.extend({
    init: function(x, y, settings) {
        settings.image = settings.image || 'bullet';
        this.parent(x, y, settings);

        this.collidable = true;
        this.gravity = 0;

        this.setFriction(0, 0);

        this.power = settings.power || 12;
        this.angle = settings.angle || 0;

        var velX = this.power * Math.cos(this.angle),
            velY = this.power * Math.sin(this.angle);
        this.vel = new me.Vector2d(velX, velY);
        this.startVel = new me.Vector2d(velX, velY);
    },

    update: function() {
        this.updateMovement();

        me.game.collide(this);
        if(this.vel.x !== this.startVel.x || this.vel.y !== this.startVel.y) this.onWorldCollision();

        return true;
    },

    onCollision: function(res, obj) {
        this.collidable = false;
    },

    onWorldCollision: function() {
        me.game.remove(this);
    }
});

window.onReady(function() {
    game.onload();
});