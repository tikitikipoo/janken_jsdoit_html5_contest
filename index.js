;var jg = (function( win, doc, undefined ) {

"use strict";

Array.prototype.contains = function( value ) {
    for ( var i in this ) {
        if ( this.hasOwnProperty(i) && this[i] === value ) {
            return true;
        }
    }
    return false;
}

String.prototype.capitalizeFirstLetter = function(){
    return this.charAt(0).toUpperCase() + this.slice(1);
};

var vendor = (/webkit/i).test(navigator.appVersion) ? 'webkit' : (/firefox/i).test(navigator.userAgent) ? 'Moz' : 'opera' in window ? 'O' : '';

/**
 *  @namespace window.jg
 *  jg = junken game
 */
var jg = win.jg = win.jg || {};

jg.Util = function() {};
var randomArray = jg.Util.prototype.randomArray = function( arr, num ) {
    var len = arr.length,
        res = [],
        i, value;

    while( num ) {
        i = Math.floor( Math.random() * len ),
        value = arr[i];

        if ( !res.contains(value) ) {
            res.push(value);
            num--;
        }
    }
    res.sort( function( a, b ){
            if ( a < b ) return -1;
            if ( a > b ) return 1;
            return 0;
        } );
    return res;
}

var addEvent = jg.Util.addEvent = (function() {
    if ( doc.addEventListener ) {
        return function( elm, type, handler, needVendor ) {
            needVendor ? elm.addEventListener( vendor + type.capitalizeFirstLetter(), handler, false )
                       : elm.addEventListener( type, handler, false );
        }
    } else if ( doc.attachEvent ) {
        return function( elm, type, handler ) {
            elm.attachEvent('on' + type, function( evt ) {
                handler.call( elm, evt );
            });
        }
    }
})();

var removeEvent = jg.Util.removeEvent = (function() {
    if ( doc.removeEventListener ) {
        return function( elm, type, handler, needVendor ) {
            needVendor ? elm.removeEventListener( vendor + type.capitalizeFirstLetter(), handler, false )
                       : elm.removeEventListener( type, handler, false );
        }
    } else if ( doc.detachEvent ) {
        return function( elm, type, handler ) {
            elm.detachEvent( 'on' + type, function( evt ) {
                handler.call( elm, evt );
            });
        }
    }
})();

var element = jg.Util.element = function(html) {
    var rng = doc.createRange(),
        df;

    html = html || "";
    html = html + "";
    html = html.replace(/^\s+/, "").replace(/\s+$/, "");

    rng.selectNode(doc.body);
    df = rng.createContextualFragment(html);
    rng.detach();
    rng = null;

    return df.childNodes.length > 1 ? df : df.childNodes[0];
};

jg.Events = {};
var MouseEvent = jg.Events.MouseEvent = (function( isTouchFuncInWindow ) {
    return {
        CLICK      : isTouchFuncInWindow ? "click"      : "click",
        MOUSE_DOWN : isTouchFuncInWindow ? "touchStart" : "mousedown",
        MOUSE_MOVE : isTouchFuncInWindow ? "touchmove"  : "mousemove",
        MOUSE_UP   : isTouchFuncInWindow ? "touchend"   : "mouseup",
        MOUSE_OVER : isTouchFuncInWindow ? "mouseover"  : "mouseover",
        MOUSE_OUT  : isTouchFuncInWindow ? "mouseout"   : "mouseout"
    };
})( "ontouchstart" in win );

var Key = jg.Events.Key = function() {
    var keyMap = {
            '37' : 'left',
            '39' : 'right',
            '38' : 'up'
        },
        kInfo = {
            'left' : 0,
            'right': 0,
            'up': 0
        },
        key;

    function handler( event ) {
        event.preventDefault();
        key = '' + event.which;
        if ( keyMap[key] !== undefined ) {
            kInfo[keyMap[key]] = event.type === "keydown" ? 1 : 0;
            return false;
        }
    }

    addEvent( doc, "keyup", handler );
    addEvent( doc, "keydown", handler );

    return kInfo;

}();

var ROW = 8,
    COL = 5,
    CEL_WIDTH = 60,
    CEL_HEIGHT = 60,
    SCREEN_WIDTH = 320,
    SCREEN_HEIGHT = 480,
    LEVEL_1  = 1,
    LEVEL_2  = 2,
    LEVEL_3  = 3,
    LEVEL_4  = 4,
    offset_x = 10,
    evy      = 3,
    ovx      = 5,
    EVY_MAX  = 10,
    OVX_MAX  = 20,
    canvas   = document.getElementById("canvas"),
    SYS_process;

var Processor = function() {
    var processList = [],
        addedItems  = [];

    return {
        add : function(process) {
            addedItems.push( process );
        },
        process : function() {
            var newProcessList = [],
                len = processList.length;

            for ( var i = 0; i < len; i++ ) {
                if ( !processList.removed ) {
                    processList[i].move();
                    newProcessList.push( processList[i] )
                }
            }
            processList = newProcessList.concat( addedItems );
            addedItems = [];
        }
    };
};

var Sprite = function() {

    /*----------------------------
      INIT
    ----------------------------*/
    var _hand = doc.createElement('div'),
        _style = _hand.style;

    /*----------------------------
      EXPORT
    ----------------------------*/
    return {
        draw : function( x, y ) {
            _style.left = x + 'px'
            _style.top  = y + 'px'
        },

        show : function() {
            _style.visibility = 'visible';
        },

        hide : function() {
            _style.visibility = 'hidden';
        },

        remove : function() {
            var parentNode = _hand.parentNode;
            if (! parentNode ) return;
            parentNode.removeChild( _hand );
        },

        changeImage : function( index, imagesWidth ) {
            if( !this.width || !this.height ) {
                return
            }

            // _handと_styleをカプセル化しなかったら
            // この一行必要なかったな><
            // getDom、getStyleなんてめんどくさいし
            this.style || ( this.style = this.getStyle() );

            var offsetX = (index % (imagesWidth / this.width) ) * this.width;
            var offsetY = Math.floor( index / ( imagesWidth / this.width  ) ) * this.height;

            this.style.backgroundPosition = -offsetX + 'px ' + -offsetY + 'px';

        },

        getDom : function() {
            return _hand;
        },

        getStyle : function() {
            return _style;
        },

        appendBody: function() {
            canvas.appendChild( _hand );
        }
    };
};

var Hand = function( type ) {
    /*----------------------------
      INIT
    ----------------------------*/
    var self = Sprite.apply( this, arguments );
    var _type = type,
        _types = [ Hand.G, Hand.C, Hand.P ],
        _images = ['0 0', '-120px 0', '-240px 0'],
        _elm    = self.getDom(),
        _style  = self.getStyle();

    _style.position = 'absolute';
    _style.visibility = 'hidden';
    _style.width = CEL_WIDTH + 'px';
    _style.height = CEL_HEIGHT + 'px';
    _style.background = 'url(http://lh4.googleusercontent.com/-qnBHjNy_2R8/UJi0U7ob_XI/AAAAAAAAAFg/Rn0jt0Ee-6E/s300/junken.png) no-repeat top left';

    /*----------------------------
      PUBLIC
    ----------------------------*/
    self.setType = function( type ) {
        if ( !_types.contains( type ) ) {
            throw "INVALID JUNKEN TYPE " + type;
        }
        _type = type
        _style.backgroundPosition = _images[type];
    };

    self.getType = function() {
        return _type
    };

    /**
     * @param target Hand
     */
    self.battle = function( target ) {
        var targetType = target.getType();
        if ( ((_type + 1) % 3) === targetType ) return Hand.WIN;
        if ( _type === targetType ) return Hand.EVEN;
        return Hand.LOOSE;
    };

    return self;
};

Hand.G = 0;
Hand.C = 1;
Hand.P = 2;
Hand.WIN = 1;
Hand.EVEN = 0;
Hand.LOOSE = -1;

var Enemy = function() {
    /*----------------------------
      INIT
    ----------------------------*/
    var self = Hand.apply( this, arguments );
    self.x = 0;
    self.y = 0;
    self.vx = 0;
    self.vy = evy;
    self.width = CEL_WIDTH;
    self.height = CEL_HEIGHT;
    self.removeFlag = false;

    self.setType( Math.floor( Math.random() * 3) );
    self.appendBody();

    /*----------------------------
      PUBLIC
    ----------------------------*/
    self.move = function() {
        self.x += self.vx;
        self.y += self.vy;

        self.draw( self.x, self.y );

        if ( self.y - CEL_HEIGHT > 420 ) {
            self.removeFlag = true;
        }

    };

    self.collide = function() {
        new Explode( self.x, self.y );
    };

    return self;
};

var EnemyManager = function(gameCallback) {
    var res,
        pauseFlag   = false,
        enemy_x_pos = [],
        enemys      = [],
        addedEnemy  = [],
        cel_half_w  = (CEL_WIDTH / 2),
        cel_half_h  = (CEL_HEIGHT / 2),
        cond_height = SCREEN_HEIGHT - (CEL_HEIGHT * 2),
        cond_long   = (CEL_HEIGHT / 2) * 2,
        collideEnableFlag = true;

    for( var i = 0; i < COL; i++ ) {
        enemy_x_pos.push(offset_x + ( i * CEL_WIDTH ));
    }

    /*----------------------------
      INIT
    ----------------------------*/
    res = {
        move: function() {
            if ( pauseFlag ) return;
            var newEnemysList = [],
                enemyLen = enemys.length -1,
                i;

            for ( i = enemyLen; i >= 0; i-- ) {
                if ( !enemys[i].removeFlag ) {
                    enemys[i].move();
                    newEnemysList.push( enemys[i] );

                    if ( enemys[i].y > 30 ) {
                        enemys[i].show();
                    } else {
                        enemys[i].hide();
                    }

                } else {
                    enemys[i].remove();
                    enemys.slice(i, 1);
                }

            }

            enemys = newEnemysList.concat( addedEnemy );
            addedEnemy = [];

        },

        pause : function( time ) {
            pauseFlag = true;
            time = time || false;
            if ( time ) {
                setTimeout( function() {
                    pauseFlag = false;
                }, time );
            }
        },

        cancelPause: function() {
            pauseFlag = false;
        },

        createEnemy: function(level) {
            level || (level = Math.floor( Math.random() * 3 ) + 1);
//            level || (level = 1);

            var enemynum = 0;
            enemynum = ( level === LEVEL_4 ) ? 4 : enemynum;
            enemynum = ( level === LEVEL_3 ) ? 3 : enemynum;
            enemynum = ( level === LEVEL_2 ) ? 2 : enemynum;
            enemynum = ( level === LEVEL_1 ) ? 1 : enemynum;

            var arr = randomArray( enemy_x_pos, enemynum );

            if ( !arr.length ) return;
            for ( var i = 0; i <  arr.length; i++ ) {
                addedEnemy.push( new Enemy );
                addedEnemy[addedEnemy.length-1].x = arr[i];
                addedEnemy[addedEnemy.length-1].y = - CEL_HEIGHT;
            }
        },

        collide: function(own) {
            if ( !own || !collideEnableFlag ) {
                return;
            }

            var enemyLen = enemys.length -1,
                i,
                ene_x, ene_y,
                tmp_x, tmp_y,
                rerult;

            for ( i = enemyLen; i >= 0; i-- ) {
                if( enemys[i].y > cond_height ) {
                    ene_x = enemys[i].x;
                    ene_y = enemys[i].y;
                    tmp_x = own.x - ene_x;
                    tmp_y = own.y - ene_y;
                    if ( Math.abs(own.x - ene_x ) >
                            (own.width / 3) + (enemys[i].width / 3)) {
                        continue;
                    }
                    if ( Math.abs(own.y - ene_y ) >
                            (own.height / 3) + (enemys[i].height / 3)) {
                        continue;
                    }

                    var result = own.battle( enemys[i] )
                    if ( result === Hand.WIN ) {
                        gameCallback("win");
                    } else if ( result === Hand.LOOSE ) {
                        gameCallback("gameOver");
                    } else if ( result === Hand.EVEN ) {
                        gameCallback("even");
                    }
                    enemys[i].collide();
                    enemys[i].removeFlag = true;
                }
            }
        },

        spell1 : function() {
            collideEnableFlag = false;
            var enemyLen = enemys.length -1,
                i;

            for ( i = enemyLen; i >= 0; i-- ) {
                    enemys[i].collide();
                    enemys[i].remove();
            }

            enemys = [];

            res.cancelPause();
            collideEnableFlag = true;
        },
        spell2 : function() {
            res.spell1();
        },
        spell3 : function(own) {
            collideEnableFlag = false;
            setTimeout( function() {
                res.cancelPause();
                collideEnableFlag = true;
            }, 1500 );
        },
    };

    SYS_process.add( res );

    return res;
};

var Own = function(gameCallback) {
    /*----------------------------
      INIT
    ----------------------------*/
    var self = Hand.apply( this, arguments );
    self.x  = SCREEN_WIDTH / 2 - CEL_WIDTH / 2;
    self.y  = SCREEN_HEIGHT - CEL_HEIGHT - 10;
    self.vx = 0;
    self.vy = 0;
    self.width = CEL_WIDTH;
    self.height = CEL_HEIGHT;
    self.removeFlag = false;
    self.pauseFlag = false;

    // グー、チョキー、パーいずれか設定
    self.setType( Math.floor( Math.random() * 3) );
    self.appendBody();
    var _elm = self.getDom();
    var _sty = self.getStyle();
    _sty.zIndex = 10;

    /*----------------------------
      PUBLIC
    ----------------------------*/
    self.move = function() {
        if ( self.pauseFlag ) {
            return;
        }

        if ( Key.up ) {
            self.pauseFlag = true;
            gameCallback("spell");
            return;
        }

        self.vx = Key.left  ? -ovx : 0;
        self.vx = Key.right ? ovx : self.vx;

        self.x += self.vx;
        self.y += self.vy;

        if ( self.x > SCREEN_WIDTH - CEL_WIDTH - offset_x &&
                self.vx > 0 ) {
            self.x = SCREEN_WIDTH - CEL_WIDTH - offset_x;
        }

        if ( self.x < offset_x && self.vx < 0 ) {
            self.x = offset_x;
        }

        self.draw( self.x, self.y );
    };

    self.shiver = function() {
        self.pauseFlag = true;
        _elm.className ='shake';
        setTimeout( function() {
            _elm.className ='';
            self.pauseFlag = false;
        }, 1000 )
    };

    self.destroy = function() {
        self.removeFlag = true;
        new Explode( self.x, self.y );
        self.remove();
    };

    self.pause = function() {
        self.pauseFlag = true;
    };

    self.cancelPause = function() {
        self.pauseFlag = false;
    };

    SYS_process.add( self );

    return self;
};

var Explode = function( x, y ) {
    /*----------------------------
      INIT
    ----------------------------*/
    var self = Sprite.apply( this, arguments );
    var _elm    = self.getDom(),
        _style  = self.getStyle(),
        _imageIndex = 0,
        _imagesWidth = 480,
        _imagesList = 64;

    _style.position = 'absolute';
    _style.visibility = 'hidden';
    _style.width = CEL_WIDTH + 'px';
    _style.height = CEL_HEIGHT + 'px';
    _style.background = 'url(http://tikitikipoo.phpfogapp.com/wp-content/uploads/2012/11/crash_480x480.png) no-repeat top left';

    self.width = 60;
    self.height = 60;
    self.removeFlag = false;
    self.appendBody();

    self.move = function() {
        self.changeImage( _imageIndex, _imagesWidth );
        self.show();
        _imageIndex += 2;
        if ( _imageIndex === _imagesList ) {
            _imageIndex = 0;
            self.removeFlag = true;
            self.remove();
        }
        self.draw( x, y );
    };

    SYS_process.add( self );

    return self;

}

var Game = jg.Game = function() {
    /*----------------------------
      INIT
    ----------------------------*/
    var _EnemyManager,
        _Own,
        _gameState = 'splash',
        _score = 0,
        _dummy,
        _screen,
        _gameover  = doc.getElementById("gameover"),
        _spellwrap = doc.getElementById("spellwrap"),
        _scoreDom,
        _touchCanvas = false,
        _titleScreenReady = false,
        _isSpellCasting   = false,
        _spellDom1 = doc.getElementById("spell1"),
        _spellDom2 = doc.getElementById("spell2"),
        _spellDom3 = doc.getElementById("spell3"),
        _spellDoms = { 1:_spellDom1, 2:_spellDom2, 3:_spellDom3 },
        _spellType, _spellDom,
        _time = 0, _speedTmp = 0;

    _createScreen();
    addEvent( canvas, MouseEvent.MOUSE_DOWN, _screenHandleMouseDown, false );
    addEvent( _spellwrap, MouseEvent.MOUSE_DOWN, _screenHandleMouseDown, false );
    addEvent( _gameover, MouseEvent.MOUSE_DOWN, _screenHandleMouseDown, false );
    addEvent( _spellDom1, 'animationEnd', _spellAnimationEnd, true );
    addEvent( _spellDom2, 'animationEnd', _spellAnimationEnd, true );
    addEvent( _spellDom3, 'animationEnd', _spellAnimationEnd, true );

    function _createScreen() {
        var tmpl = doc.getElementById("screen_tmpl"),
        _screen = element( tmpl.innerHTML );
        _screen.id = "screen";
        _screen.getElementsByTagName('div')[0].id = "screen_content";
        canvas.appendChild(_screen);
        addEvent( _screen, "animationEnd", _screenHandleAnimationEnd, true);
    };

    function _screenHandleAnimationEnd() {
        _titleScreenReady = true;
        _screen = doc.getElementById( "screen" );
        removeEvent( _screen, "animationEnd", _screenHandleAnimationEnd, true );
    }

    function _screenHandleMouseDown() {
        _touchCanvas = true;
        removeEvent( canvas, MouseEvent.MOUSE_DOWN, _screenHandleMouseDown, false );
    }

    function _removeScreenAnimation() {
        _screen = doc.getElementById( "screen" );
        _screen.style.webkitAnimation = 'none';
        removeEvent( _screen, "animationEnd", _screenHandleAnimationEnd, true );
    }

    function _spellCasting() {
        _spellType = Math.floor( Math.random() * 3 + 1 ),
        _spellDom  = _spellDoms[ _spellType ]
        _spellDom.style.display = 'block';
    }

    function _spellAnimationEnd() {
        _spellDom.style.display = 'none';
        gameCallback("spellAnimationEnd");
    }

    function _removeCanvasContents () {
        while ( canvas.firstChild ) {
            canvas.removeChild( canvas.firstChild );
        }
    }

    function readyForCreateEnemy () {
        if ( _isSpellCasting ) return false;
        if ( !_dummy ) {
            _dummy = new Enemy;
        }
        _dummy.move();
        if ( evy < 4 ) _speedTmp = CEL_HEIGHT;
        if ( evy > 4 && evy < 6 ) _speedTmp = CEL_HEIGHT - 30;
        if ( evy >= 7 ) _speedTmp = CEL_HEIGHT - 35;
        if ( _dummy.y > _speedTmp ) {
            _dummy.y = 0;
            return true;
        }
        return false;
    }

    function createScoreDom() {
        _scoreDom = doc.createElement("div");
        _scoreDom.id = "score";
        canvas.appendChild(_scoreDom);
    }

    function updateScore( score ) {
        _scoreDom.innerHTML = 'SCORE: ' + score;
    }

    /*----------------------------
      PUBLIC
    ----------------------------*/
    var init = function() {
        SYS_process = new Processor; // @TODO singletonにする
        _EnemyManager = new EnemyManager(gameCallback); // @TODO singletonにする
        _Own = new Own(gameCallback);
        _Own.draw( _Own.x, _Own.y );
        _Own.show();
        createScoreDom();
        updateScore(0);
        _score = 0;
    };

    var gameCallback = function(message) {
        switch( message ) {
            case "win" :
                _score += 100;
                updateScore( _score );
                break;
            case "even" :
                _Own.shiver();
                break;
            case "spell" :
                _isSpellCasting = true;
                _EnemyManager.pause();
                _spellCasting();
                break;
            case "spellAnimationEnd" :
                if ( _EnemyManager ) {
                    _EnemyManager["spell" + _spellType](_Own);
                    _Own.cancelPause();
                }
                _isSpellCasting = false;
                break;
            case "gameOver" :
                _Own.destroy();
                _Own.pause();
                _Own = null;
                setTimeout( function() {
                    _gameover.style.display = 'block';
                    _EnemyManager = null;
                    addEvent( canvas, MouseEvent.MOUSE_DOWN, _screenHandleMouseDown, false );
                    _gameState = 'none';
                }, 1200 );
                break;
        }
    };

    var gameLoop = function() {
        switch( _gameState ) {
            case 'none' :
                if ( _touchCanvas) {
                    _gameover.style.display = 'none';
                    _touchCanvas      = false;
                    _titleScreenReady = true;
                    _removeCanvasContents();
                    _createScreen();
                    _removeScreenAnimation();
                    addEvent( canvas, MouseEvent.MOUSE_DOWN, _screenHandleMouseDown, false );
                    _gameState = 'splash';
                }
                break;
            case 'splash' :
                if ( _titleScreenReady && _touchCanvas) {
                    _gameState = 'titleScreen';
                }
                break;
            case 'titleScreen' :
                _titleScreenReady = false;
                _touchCanvas = false;
                _removeCanvasContents();
                init();
                _gameState = 'playGame';
                break;
            case 'playGame' :
                if ( _time > 150 ) {
                    evy += 1; ovx += 1;
                    if ( evy > EVY_MAX ) evy = EVY_MAX;
                    if ( ovx > OVX_MAX ) ovx = OVX_MAX;
                    _time = 0;
                }
                SYS_process.process();
                _EnemyManager.collide(_Own);
                if ( readyForCreateEnemy() ) {
                    _EnemyManager.createEnemy();
                }
                _time++;
                break;
        }
    };

    setInterval( gameLoop, 1000 / 20 );
};

return jg;

})( window, document );

new jg.Game;
/*
var img = document.createElement("img");
img.src = "http://tikitikipoo.phpfogapp.com/wp-content/uploads/2012/11/crash_480x480.png";
img.onload = function() {
      new jg.Game;
}
*/



