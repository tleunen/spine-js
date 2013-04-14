var Spine = Spine || {};

Spine._DEBUG_ = false;

Spine.AttachmentType = {
    REGION: 0,
    REGION_SEQUENCE: 1
};

self.Float32Array = self.Float32Array || Array;

if(!Array.isArray) {
    Array.isArray = function (vArg) {
        return Object.prototype.toString.call(vArg) === "[object Array]";
    };
}

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating

// requestAnimationFrame polyfill by Erik Möller
// fixes from Paul Irish and Tino Zijdel
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] ||
                                      window[vendors[x]+'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); },
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };

    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());


Spine.max = function(a,b) {
    return a>b ? a : b;
};


Spine.load = function(dataLoad, callback) {
    if(!dataLoad.skeleton) throw "dataLoad.skeleton should be defined";
    if(!dataLoad.imgPattern && !dataLoad.atlas) throw "dataLoad.imgPattern or data.atlas should be defined";

    var attachmentLoader, skeleton;

    if(dataLoad.imgPattern) attachmentLoader = new Spine.AttachmentLoader(dataLoad.imgPattern);
    else if(dataLoad.atlas) throw "atlas not supported yed";

    var skeletonJson = new Spine.SkeletonJson(attachmentLoader);
    if(dataLoad.skeletonScale) skeletonJson.setScale(dataLoad.skeletonScale);

    skeletonJson.readSkeletonData(dataLoad.skeleton, function(skeletonData) {
        callback(new Spine.Skeleton(skeletonData));
    });
};