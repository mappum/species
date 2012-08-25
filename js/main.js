var resources = [
// images
{
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
    name: "enemy",
    type: "image",
    src: "img/enemy.png"
},

// data
{
    name: "level1",
    type: "tmx",
    src: "data/level1.tmx"
},

// audio
{
    name: "shoot",
    type: "audio",
    src: "audio/",
    channel: 1
}, {
    name: "jump",
    type: "audio",
    src: "audio/",
    channel: 1
}, {
    name: "roar",
    type: "audio",
    src: "audio/",
    channel: 1
}
];

//me.debug.renderHitBox = true;
 
var game = {
    onload: function() {
        if (!me.video.init('game', 640, 480, false, 1.0)) {
            alert("Sorry, your browser does not support this game :(");
            return;
        }

        me.audio.init("mp3,ogg,wav");
 
        me.loader.onload = this.loaded.bind(this);
        me.loader.preload(resources);
        me.state.change(me.state.LOADING);
    },

    loaded: function() {
        me.state.set(me.state.PLAY, new GameScreen());

        me.entityPool.add('PlayerEntity', PlayerEntity);
        me.entityPool.add('EnemyEntity', EnemyEntity);
        me.entityPool.add('LightEntity', LightEntity);
        me.entityPool.add('ShadowEntity', ShadowEntity);

        me.input.bindKey(me.input.KEY.A, 'left');
        me.input.bindKey(me.input.KEY.D, 'right');
        me.input.bindKey(me.input.KEY.W, 'jump', true);
        me.input.bindKey(me.input.KEY.SPACE, 'jump', true);

        try { me.input.registerMouseEvent(); } catch(e) {}

        me.state.change(me.state.PLAY);
    }
};

var GameScreen = me.ScreenObject.extend({
    onResetEvent: function() {
        me.levelDirector.loadLevel('level1');

        me.game.lighting = me.video.createCanvasSurface(640, 480);
    },

    onDestroyEvent: function() {
    }
});

var PlayerEntity = me.ObjectEntity.extend({
    init: function(x, y, settings) {
        settings.image = 'scientist';
        settings.spritewidth = 24;

        this.armImage = me.loader.getImage('scientist_arm');
        this.aimAngle = 0;

        this.parent(x, y, settings);

        this.collidable = true;

        this.setVelocity(4, 12);
        this.accel = new me.Vector2d(0.7, 10);

        this.animationspeed = me.sys.fps / 16;

        this.updateColRect(0, this.width, 0, this.height);

        this.lightEntity = new LightEntity(x, y, {
            x: x,
            y: y,
            angle: 0,
            width: 65
        });
        me.game.add(this.lightEntity, this.z);
        me.game.sort();

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
        this.aimAngle = Math.atan2(dy, dx) - Math.PI / 2;

        this.lightEntity.angle = this.aimAngle;
        this.lightEntity.pos.x = this.pos.x + 4 - 18 * Math.sin(this.aimAngle);
        this.lightEntity.pos.y = this.pos.y + 24 + 18 * Math.cos(this.aimAngle);

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

        var x = ~~(this.pos.x - this.vp.pos.x),
            y = ~~(this.pos.y - this.vp.pos.y);

        ctx.save();
        ctx.translate(x + 4, y + 24);
        ctx.rotate(this.aimAngle);
        ctx.drawImage(this.armImage, -2, -2);
        ctx.restore();
    },

    doStop: function() {
        if(this.vel.x !== 0) {
            this.vel.x -= this.accel.x * me.timer.tick * this.vel.x > 0 ? 1 : -1;
            if(Math.abs(this.vel.x) <= 1) this.vel.x = 0;
        }
    },

    doJump: function() {
        me.audio.play('jump');
        this.parent();
    }
});

var EnemyEntity = me.ObjectEntity.extend({
    init: function(x, y, settings) {
        settings.image = 'enemy';

        this.parent(x, y, settings);

        this.collidable = true;

        this.attackRange = settings.attackRange || 80;

        this.setVelocity(6, 12);

        this.target = me.game.getEntityByName('PlayerEntity')[0];
    },

    update: function() {
        if(Math.abs(this.target.pos.x - this.pos.x) > 10) {
            if(this.target.pos.x < this.pos.x) this.doWalk(true);
            else this.doWalk(false);
        } else {
            this.vel.x = 0;
        }

        if(this.distanceTo(this.target) < this.attackRange) {
            this.doAttack();
        }

        this.updateMovement();

        return true;
    },

    doAttack: function() {
        this.doJump();
        me.audio.play('roar');
    }
});

var LightEntity = me.ObjectEntity.extend({
    init: function(x, y, settings) {
        settings.image = 'null';

        this.parent(x, y, settings);

        this.angle = (settings.angle || 0) * Math.PI / 180;
        this.width = (settings.width || 45) * Math.PI / 180;

        this.rayWidth = (settings.rayWidth || 1) * Math.PI / 180;
        this.rayPrecision = settings.rayPrecision || 4;
        this.rayLength = settings.rayLength || 1000;
    },

    update: function() {
        return false;
    },

    draw: function(ctx) {
        ctx = me.game.lighting;

        var x = ~~(this.pos.x - this.vp.pos.x),
            y = ~~(this.pos.y - this.vp.pos.y);

        var rayStart = (-this.width / 2) - this.angle;
        var rayEnd = (this.width / 2) - this.angle;

        ctx.beginPath();
        ctx.fillStyle = 'rgba(255,255,255,0.5)';

        for(var i = rayStart; i < rayEnd; i += this.rayWidth) {
            var leftX, leftY,
                rightX, rightY;

            var sinI = Math.sin(i),
                cosI = Math.cos(i),
                sinIr = Math.sin(i + this.rayWidth + 0.05),
                cosIr = Math.cos(i + this.rayWidth + 0.05);

            for(var j = this.rayPrecision; j < this.rayLength; j += this.rayPrecision) {
                leftX = j * sinI;
                leftY = j * cosI;
                rightX = j * sinIr;
                rightY = j * cosIr;

                try {
                    var tileX = Math.floor(((leftX + rightX) / 2 + this.pos.x) / 32),
                        tileY = Math.floor(((leftY + rightY) / 2 + this.pos.y) / 32);

                    var tile = me.game.collisionMap.layerData[tileX][tileY];
                    if(tile && tile.tileId === 1) {
                        //ctx.fillRect(tile.pos.x - this.vp.pos.x, tile.pos.y - this.vp.pos.y,
                        //    tile.width, tile.height);
                        break;
                    }
                } catch(e) { break; }
            }

            ctx.moveTo(x, y);
            ctx.lineTo(x + leftX, y + leftY);
            ctx.lineTo(x + rightX, y + rightY);
            ctx.closePath();
        }

        ctx.fill();
    }
});

var ShadowEntity = me.ObjectEntity.extend({
    init: function(x, y, settings) {
    },

    update: function() {
        return true;
    },

    draw: function(ctx) {
        console.log('draw');
        var lighting = me.game.lighting;

        lighting.globalCompositeOperation = 'xor';
        lighting.fillStyle = 'rgba(0,0,0,0.92)';
        lighting.fillRect(0, 0, 640, 480);

        ctx.drawImage(lighting.canvas, 0, 0);

        lighting.clearRect(0, 0, 640, 480);
    }
});

window.onReady(function() {
    game.onload();
});