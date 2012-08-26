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
}, {
    name: "pc",
    type: "image",
    src: "img/pc.png"
},

// data
{
    name: "level1",
    type: "tmx",
    src: "data/level1.tmx"
},

// audio
{
    name: "roar",
    type: "audio",
    src: "audio/",
    channel: 1
}, {
    name: "step",
    type: "audio",
    src: "audio/",
    channel: 1
}
];

//me.debug.renderHitBox = true;

function setStatic(opacity) {
    var staticImage = document.getElementById('static');
    staticImage.style.opacity = opacity;

    if(opacity <= 0) staticImage.style.display = 'none';
    else staticImage.style.display = 'block';
}
 
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
        me.entityPool.add('TextEntity', TextEntity);
        me.entityPool.add('TriggerEntity', TriggerEntity);

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

        me.game.lighting = {
            ctx: me.video.createCanvasSurface(640, 480),
            shadow: new ShadowEntity(),
            enabled: false
        };

        me.game.add(me.game.lighting.shadow, 10);
        me.game.sort();
    },

    onDestroyEvent: function() {
        me.game.disableHUD();
    }
});

var PlayerEntity = me.ObjectEntity.extend({
    init: function(x, y, settings) {
        settings.image = 'scientist';
        settings.spritewidth = 24;

        this.armImage = me.loader.getImage('scientist_arm');
        this.aimAngle = 0;

        this.parent(x, y, settings);
        this.GUID = settings.GUID || this.GUID;

        this.collidable = true;

        this.setVelocity(3, 12);
        this.accel = new me.Vector2d(0.7, 10);

        this.animationspeed = me.sys.fps / 13;
        this.stepSpeed = me.sys.fps / 26;
        this.lastStep = 0;

        this.health = 1;
        this.lastHealth = 1;
        this.lastEncounter = 0;

        this.updateColRect(0, this.width, 0, this.height);

        this.light = new LightEntity(x, y, {
            x: x,
            y: y,
            angle: 0,
            width: 60,
            enabled: false
        });
        me.game.add(this.light, this.z);
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

        if(this.light.enabled) {
            var dx = me.input.mouse.pos.x - x,
                dy = me.input.mouse.pos.y - y;
            this.aimAngle = Math.atan2(dy, dx) - Math.PI / 2;

            this.light.angle = this.aimAngle;
            this.light.pos.x = this.pos.x + 4 - 26 * Math.sin(this.aimAngle);
            this.light.pos.y = this.pos.y + 24 + 26 * Math.cos(this.aimAngle);
        } else {
            this.aimAngle = 0;
        }

        this.updateMovement();

        if(this.vel.x === 0) {
            this.setAnimationFrame(0);
        } else {
            this.parent();
        }

        if(Date.now() - this.lastEncounter > 2000) {
            this.health += 0.002;
        }

        if(this.health !== this.lastHealth) {
            setStatic(1 - this.health);
            this.lastHealth = this.health;
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

    doWalk: function(left) {
        var now = Date.now();
        if(now - this.lastStep >= 1000 / this.stepSpeed) {
            me.audio.play('step');
            this.lastStep = now;
        }

        this.parent(left);
    },

    doStop: function() {
        if(this.vel.x !== 0) {
            this.vel.x -= this.accel.x * me.timer.tick * this.vel.x > 0 ? 1 : -1;
            if(Math.abs(this.vel.x) <= 1) this.vel.x = 0;
        }
    }
});

var EnemyEntity = me.ObjectEntity.extend({
    init: function(x, y, settings) {
        settings.image = 'enemy';

        this.parent(x, y, settings);
        this.GUID = settings.GUID || this.GUID;

        this.attackRange = settings.attackRange || 80;
        this.lastAttack = 0;
        this.attackCooldown = 16000;
        this.roarLock = false;

        this.setVelocity(6, 12);
    },

    update: function() {
        if(!this.target) this.target = me.game.getEntityByGUID('mainPlayer');

        if(me.game.lighting.enabled) {
            if(!this.target.light.pointingAt(this)) {
                var dx = Math.abs(this.target.pos.x - this.pos.x);

                if(dx > 120) {
                    if(this.target.pos.x < this.pos.x) this.doWalk(true);
                    else this.doWalk(false);
                } else {
                    this.vel.x = 0;
                    if(dx < 100) this.doAttack();
                }
                this.roarLock = false;
            } else {
                this.vel.x = 0;
                if(Math.abs(this.target.pos.x - this.pos.x) < 300 &&
                Math.abs(this.target.pos.y - this.pos.y) < 50) {
                    this.doAttack();
                }
            }

            this.updateMovement();
        }

        return true;
    },

    doAttack: function() {
        if(this.target.light.pointingAt(this)) {
            var now = Date.now();
            if(now - this.lastAttack > this.attackCooldown) {
                if(!this.roarLock) {
                    me.audio.play('roar');
                    this.roarLock = true;
                }
                this.lastAttack = now;
            }
        }
        this.target.health -= (360 - Math.abs(this.target.pos.x - this.pos.x)) * 0.00001;
        this.target.lastEncounter = Date.now();
    }
});

var LightEntity = me.ObjectEntity.extend({
    init: function(x, y, settings) {
        settings.image = 'null';

        this.parent(x, y, settings);
        this.GUID = settings.GUID || this.GUID;

        if(settings.enabled !== undefined) this.enabled = settings.enabled;
        else this.enabled = true;

        this.angle = (settings.angle || 0) * Math.PI / 180;
        this.width = (settings.width || 45) * Math.PI / 180;

        this.rayWidth = (settings.rayWidth || 0.8) * Math.PI / 180;
        this.rayPrecision = settings.rayPrecision || 2;
        this.rayLength = settings.rayLength || 1000;
    },

    update: function() {
        return false;
    },

    draw: function(ctx) {
        if(this.enabled && me.game.lighting.enabled) {
            ctx = me.game.lighting.ctx;

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
    },

    pointingAt: function(obj) {
        var dx = obj.pos.x - this.pos.x,
            dy = obj.pos.y - this.pos.y;
        var angleTo = Math.atan2(dy, dx) - Math.PI / 2;

        var difference = Math.min(Math.abs(this.angle - angleTo),
            Math.abs(this.angle - angleTo - Math.PI * 2));

        if(difference <= this.width / 2) return true;
        return false;
    }
});

var ShadowEntity = me.ObjectEntity.extend({
    init: function() {},

    update: function() {
        return true;
    },

    draw: function(ctx) {
        if(me.game.lighting.enabled) {
            var lighting = me.game.lighting.ctx;

            lighting.globalCompositeOperation = 'xor';
            lighting.fillStyle = 'rgba(0,0,0,0.93)';
            lighting.fillRect(0, 0, 640, 480);

            ctx.drawImage(lighting.canvas, 0, 0);

            lighting.clearRect(0, 0, 640, 480);
        }
    }
});

var TextEntity = me.ObjectEntity.extend({
    init: function(x, y, settings) {
        settings.image = 'pc';

        this.parent(x, y, settings);
        this.GUID = settings.GUID || this.GUID;

        this.text = settings.text || '';
        this.columns = settings.columns || 24;

        this.collidable = true;
        this.displaying = false;
    },

    update: function() {
        var res = me.game.collide(this);
        if(res) {
            this.displaying = true;
        } else {
            this.displaying = false;
        }

        return false;
    },

    draw: function(ctx) {
        this.parent(ctx);

        if(this.displaying) {
            ctx.save();
            ctx.font = '16pt volter';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#00ff24';
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.shadowColor = 'black';

            var lines = [this.text];
            var i;

            while(lines[lines.length - 1].length > this.columns) {
                for(i = this.columns; i >= 0; i--) {
                    var line = lines.length - 1;

                    if(lines[line].charAt(i) === ' ') {
                        lines.push(lines[line].substr(i + 1));
                        lines[line] = lines[line].substr(0, i);
                        break;
                    }
                }
            }

            var x = ~~(this.pos.x - this.vp.pos.x),
                y = ~~(this.pos.y - this.vp.pos.y);

            for(i = 0; i < lines.length; i++) {
                ctx.fillText(lines[i], x + 16,
                    y - 40 - (lines.length - i) * 22);
            }
            ctx.restore();
        }
    }
});

var TriggerEntity = me.InvisibleEntity.extend({
    init: function(x, y, settings) {
        this.parent(x, y, settings);
        this.GUID = settings.GUID || this.GUID;

        this.collidable = true;

        this.locked = false;

        if(settings.onTrigger) this.onTrigger = new Function(settings.onTrigger);
        if(settings.onceTrigger) this.onceTrigger = new Function(settings.onceTrigger);
        if(settings.preTrigger) this.preTrigger = new Function(settings.preTrigger);
        if(settings.postTrigger) this.postTrigger = new Function(settings.postTrigger);

        this.event = settings.event;
        if(settings.target) this.target = me.game.getEntityByGUID(settings.target);
    },

    update: function() {
        var res = me.game.collide(this);

        if(res) {
            if(this.preTrigger && !this.locked) {
                this.preTrigger(res);
                this.locked = true;
            }

            if(this.onceTrigger) {
                this.onceTrigger(res);
                this.onceTrigger = null;
            }

            if(this.onTrigger) {
                this.onTrigger(res);
            }

            if(this.target && typeof this.target.onTrigger === 'function') {
                this.target.onTrigger(this.event, res);
            }
        } else {
            if(this.postTrigger) {
                this.postTrigger(res);
            }

            this.locked = false;
        }

        return false;
    }
});

window.onReady(function() {
    game.onload();
});