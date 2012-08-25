var resources = [{
    name: "null",
    type: "image",
    src: "img/null.png"
}, {
    name: "tiles",
    type: "image",
    src: "img/tiles.png"
}, {
    name: "bullet",
    type: "image",
    src: "img/bullet.png"
}, {
    name: "scientist",
    type: "image",
    src: "img/scientist.png"
}, {
    name: "scientist_arm",
    type: "image",
    src: "img/scientist_arm.png"
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
        me.input.bindKey(me.input.KEY.W, 'jump', true);
        me.input.bindKey(me.input.KEY.SPACE, 'jump', true);
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
        settings.image = 'scientist';
        settings.spritewidth = 24;
        this.armImage = me.loader.getImage('scientist_arm');

        this.parent(x, y, settings);

        this.collidable = true;

        this.setVelocity(4, 12);
        this.accel = new me.Vector2d(0.7, 10);

        this.animationspeed = me.sys.fps / 16;

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

        if(this.vel.x === 0) {
            this.setAnimationFrame(0);
        } else {
            this.parent();
        }

        return true;
    },

    draw: function(ctx) {
        this.parent(ctx);

        ctx.save();
        
        var x = ~~(this.pos.x - this.vp.pos.x),
            y = ~~(this.pos.y - this.vp.pos.y);

        ctx.translate(x + 4, y + 24);
        ctx.rotate(this.aimAngle - Math.PI / 2);
        ctx.drawImage(this.armImage, -2, -2);

        ctx.restore();
    },

    doStop: function() {
        if(this.vel.x !== 0) {
            this.vel.x -= this.accel.x * me.timer.tick * this.vel.x > 0 ? 1 : -1;
            if(Math.abs(this.vel.x) <= 1) this.vel.x = 0;
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