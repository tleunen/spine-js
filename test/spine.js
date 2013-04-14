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
Spine.SendXhrRequest = function(options, successCallback, errorCallback) {
    var req = new XMLHttpRequest();

    req.open(options.method || 'GET', options.url, true);
    req.onreadystatechange = function(e) {
        if(req.readyState !== 4) {
            return;
        }

        if([200,304].indexOf(req.status) === -1) {
            if(errorCallback) errorCallback(req.status);
        } else {
            if(successCallback) successCallback(req.responseText);
        }
    };

    req.send(options.data || null);
};
Spine.SkeletonJson = function(attachmentResolver) {
    this._attachmentResolver = attachmentResolver;
    this._scale = 1;
    this._yDown = true;
};

Spine.SkeletonJson.prototype = {
    destroy: function() {
        this._attachmentResolver.destroy();
        this._attachmentResolver = null;
    },

    setScale: function(scale) {
        this._scale = scale;
    },

    readSkeletonData: function(jsonFile, successCallback) {
        var that = this;

        Spine.SendXhrRequest({url: jsonFile}, function(value) {
            var parsed = JSON.parse(value),
                i, j, k, n;

            var skeletonData = new Spine.SkeletonData();

            // bones
            var bonesData = parsed['bones'],
                bone;
            if(bonesData) {
                skeletonData.bones = new Array(bonesData.length);

                for(i=0,n=bonesData.length; i<n; ++i) {
                    bone = {
                        name: bonesData[i]['name'],
                        parent: null,
                        length: (bonesData[i]['length'] || 0) * that._scale,
                        x: (bonesData[i]['x'] || 0) * that._scale,
                        y: (bonesData[i]['y'] || 0) * that._scale,
                        scaleX: bonesData[i]['scaleX'] || 1,
                        scaleY: bonesData[i]['scaleY'] || 1,
                        rotation: bonesData[i]['rotation'] || 0,
                        yDown: that._yDown
                    };

                    var parentName = bonesData[i]['parent'];
                    if(parentName) {
                        bone.parent = skeletonData.findBone(parentName);
                        if(!bone.parent) {
                            console.error("Parent bone not found: " + parentName);
                        }
                    }
                    skeletonData.bones[i] = bone;
                }
            }

            // slots
            var slotsData = parsed['slots'],
                slot;
            if(slotsData) {
                skeletonData.slots = new Array(slotsData.length);
                for(i=0,n=slotsData.length; i<n; ++i) {
                    slot = {
                        name: slotsData[i]['name'],
                        bone: null,
                        r: 1,
                        g: 1,
                        b: 1,
                        a: 1,
                        attachmentName: slotsData[i]['attachment'] || ''
                    };

                    var color = slotsData[i]['color'];
                    if(color) {
                        slot.r = that._toColor(color, 0);
                        slot.g = that._toColor(color, 1);
                        slot.b = that._toColor(color, 2);
                        slot.a = that._toColor(color, 3);
                    }

                    var boneName = slotsData[i]['bone'];
                    if(boneName) {
                        slot.bone = skeletonData.findBone(boneName);
                        if(!slot.bone) {
                            console.error("Slot bone not found: " + boneName);
                        }
                    }

                    skeletonData.slots[i] = slot;
                }
            }

            // skins
            var skinsData = parsed['skins'],
                skin,
                attachmentsData, attachment;
            if(skinsData) {
                skeletonData.skins = new Array(skinsData.length);

                for(i in skinsData) {
                    skin = new Spine.Skin(i);

                    slotsData = skinsData[i];
                    for(j in slotsData) {
                        var slotIndex = skeletonData.findSlotIndex(j);

                        attachmentsData = slotsData[j];
                        for(k in attachmentsData) {
                            var attachmentMap = attachmentsData[k];

                            attachment = new Spine.RegionAttachment(k, that._attachmentResolver);
                            attachment.x = (attachmentMap['x'] || 0) * that._scale;
                            attachment.y = (attachmentMap['y'] || 0) * that._scale;
                            attachment.scaleX = (attachmentMap['scaleX'] || 1) * that._scale;
                            attachment.scaleY = (attachmentMap['scaleY'] || 1) * that._scale;
                            attachment.rotation = attachmentMap['rotation'] || 0;
                            attachment.width = (attachmentMap['width'] || 32) * that._scale;
                            attachment.height = (attachmentMap['height'] || 32) * that._scale;

                            skin.addAttachment(slotIndex, k, attachment);
                        }
                    }

                    skeletonData.skins.push(skin);
                    if(i == 'default') skeletonData.defaultSkin = skin;
                }
            }

            // animations
            var animationsMap = parsed['animations'];
            if(animationsMap) {
                for(i in animationsMap) {
                    that._readAnimation(i, animationsMap[i], skeletonData);
                }
            }

            successCallback(skeletonData);
        });
    },

    _readAnimation: function(animKey, animValue, skeletonData) {
        var TIMELINE_SCALE       = "scale",
            TIMELINE_ROTATE      = "rotate",
            TIMELINE_TRANSLATE   = "translate",
            TIMELINE_ATTACHMENT  = "attachment",
            TIMELINE_COLOR       = "color";

        var timelines = [],
            duration = 0;

        var timelineMap, timelineName, timelineValues, timeline, valueMap,
            i, n;

        var bonesData = animValue['bones'],
            boneName, boneIndex;
        if(bonesData) {
            for(boneName in bonesData) {
                boneIndex = skeletonData.findBoneIndex(boneName);
                if(boneIndex < 0) throw 'Bone not found: ' + boneName;

                timelineMap = bonesData[boneName];
                for(timelineName in timelineMap) {
                    timelineValues = timelineMap[timelineName];

                    // Rotate
                    if (timelineName == TIMELINE_ROTATE) {
                        timeline = new Spine.RotateTimeline(timelineValues.length);
                        timeline.boneIndex = boneIndex;

                        for(i=0,n=timelineValues.length; i<n; ++i) {
                            valueMap = timelineValues[i];

                            timeline.setKeyframe(i, valueMap['time'], valueMap['angle']);
                            this._readCurve(timeline, i, valueMap);
                        }
                    }
                    else if(timelineName == TIMELINE_TRANSLATE || timelineName == TIMELINE_SCALE) {
                        var timelineScale = 1;
                        if(timelineName == TIMELINE_TRANSLATE)
                            timeline = new Spine.TranslateTimeline(timelineValues.length);
                        else {
                            timeline = new Spine.ScaleTimeline(timelineValues.length);
                            timelineScale = this._scale;
                        }
                        timeline.boneIndex = boneIndex;

                        for(i=0,n=timelineValues.length; i<n; ++i) {
                            valueMap = timelineValues[i];

                            timeline.setKeyframe(i,
                                valueMap['time'],
                                (valueMap['x'] || 0) * timelineScale,
                                (valueMap['y'] || 0) * timelineScale
                            );
                            this._readCurve(timeline, i, valueMap);
                        }
                    }
                    else {
                        throw "Invalid timeline type for a bone: " + timelineName + " (" + boneName + ")";
                    }

                    timelines.push(timeline);
                    if(timeline.getDuration() > duration)
                        duration = timeline.getDuration();
                }
            }
        }

        var slotsData = animValue['slots'],
            slotName, slotIndex;
        if(slotsData) {
            for(slotName in slotsData) {
                slotIndex = skeletonData.findSlotIndex(slotName);
                if(slotIndex < 0) throw 'Slot not found: ' + slotName;

                timelineMap = slotsData[slotName];
                for(timelineName in timelineMap) {
                    timelineValues = timelineMap[timelineName];

                    if(timelineName == TIMELINE_COLOR) {
                        timeline = new Spine.ColorTimeline(timelineValues.length);
                        timeline.slotIndex = slotIndex;

                        for(i=0,n=timelineValues.length; i<n; ++i) {
                            valueMap = timelineValues[i];

                            var color = valueMap['color'];
                            timeline.setKeyframe(i,
                                valueMap['time'],
                                this._toColor(color, 0),
                                this._toColor(color, 1),
                                this._toColor(color, 2),
                                this._toColor(color, 3)
                            );
                            this._readCurve(timeline, i, valueMap);
                        }
                    }
                    else if(timelineName == TIMELINE_ATTACHMENT) {
                        timeline = new Spine.AttachmentTimeline(timelineValues.length);
                        timeline.slotIndex = slotIndex;

                        for(i=0,n=timelineValues.length; i<n; ++i) {
                            valueMap = timelineValues[i];

                            timeline.setKeyframe(i,
                                valueMap['time'],
                                valueMap['name'] || ''
                            );
                        }
                    }
                    else {
                        throw "Invalid timeline type for a slot: " + timelineName + " (" + slotName + ")";
                    }

                    timelines.push(timeline);
                    if(timeline.getDuration() > duration)
                        duration = timeline.getDuration();
                }
            }
        }

        skeletonData.animations.push(new Spine.Animation(animKey, timelines, duration));
    },

    _readCurve: function(timeline, keyframeIndex, valueMap) {
        var curve = valueMap['curve'];
        if(!curve) return;

        if(curve == 'stepped') {
            timeline.setStepped(keyframeIndex);
        }
        else if(Array.isArray(curve)) {
            timeline.setCurve(keyframeIndex, curve[0], curve[1], curve[2], curve[3]);
        }
    },

    _toColor: function(value, index) {
        if(value.length != 8) throw "Error parsing color, length must be 8: " + value;
        var color = parseInt(value.substr(index*2,2), 16);
        return color / 255;
    }
};
Spine.SkeletonData = function() {
    this.bones = [];
    this.slots = [];
    this.skins = [];
    this.animations = [];
    this.defaultSkin = null;
};

Spine.SkeletonData.prototype = {
    findBone: function(boneName) {
        var idx = this.findBoneIndex(boneName);
        if(idx < 0) return null;
        return this.bones[idx];
    },
    findBoneIndex: function(boneName) {
        for(var i=0, iend=this.bones.length; i<iend; ++i) {
            if(this.bones[i].name == boneName)
                return i;
        }
        return -1;
    },

    findSlot: function(slotName) {
        var idx = this.findSlotIndex(slotName);
        if(idx < 0) return null;
        return this.slots[idx];
    },
    findSlotIndex: function(slotName) {
        for(var i=0, iend=this.slots.length; i<iend; ++i) {
            if(this.slots[i].name == slotName)
                return i;
        }
        return -1;
    },

    findSkin: function(skinName) {
        for(var i=0, iend=this.skins.length; i<iend; ++i) {
            if(this.skins[i].name == skinName)
                return this.skins[i];
        }
        return null;
    },

    findAnimation: function(animationName) {
        for(var i=0, n=this.animations.length; i<n; ++i) {
            if(this.animations[i].name == animationName)
                return this.animations[i];
        }
        return null;
    }
};
Spine.AttachmentLoader = function(path) {
    this._path = path;
    this._images = {};
};

Spine.AttachmentLoader.prototype = {
    destroy: function() {
        for(var i in this._images) {
            this._images[i] = null;
        }
    },

    resolve: function(name) {
        var i = this._images[name];
        if(i) return i;

        var p = this._path.split('{name}').join(name);
        var img = new Image();
        img._spine_loaded = false;
        img.onload = function() {
            img._spine_loaded = true;
        };
        img.src = p;
        this._images[name] = img;
        return img;
    }

};
Spine.RegionAttachment = function(name, attachmentResolver) {
    this.name = name;
    this._attachmentResolver = attachmentResolver;
    this.x = 0;
    this.y = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.rotation = 0;
    this.width = 0;
    this.height = 0;

    this._img = this._attachmentResolver.resolve(name);
    this._imgX = 0;
    this._imgY = 0;
    this._imgRot = 0;
    this._imgScaleX = 1;
    this._imgScaleY = 0;

    this._alpha = null;
};

Spine.RegionAttachment.prototype = {
    destroy: function() {},

    updateWorldTransform: function(flipX, flipY, slot) {
        this._alpha = slot.a;

        if(this._img._spine_loaded) {
            this._imgX = slot.bone.worldX + this.x * slot.bone.m00 + this.y * slot.bone.m01;
            this._imgY = slot.bone.worldY + this.x * slot.bone.m10 + this.y * slot.bone.m11;
            this._imgRot = -(slot.bone.worldRotation + this.rotation);
            this._imgScaleX = slot.bone.worldScaleX + this.scaleX - 1;
            this._imgScaleY = slot.bone.worldScaleY + this.scaleY - 1;

            if(flipX) {
                this._imgScaleX *= -1;
                this._imgRot *= -1;
            }

            if(flipY) {
                this._imgScaleY *= -1;
                this._imgRot *= -1;
            }
        }

    },

    draw: function(context) {
        context.save();

        context.globalAlpha = this._alpha;

        context.translate(this._imgX, this._imgY);
        context.rotate(this._imgRot * (Math.PI/180));
        context.scale(this.scaleX, this.scaleY);

        var x = -((this._img.width*this._imgScaleX)>>1),
            y = -((this._img.height*this._imgScaleY)>>1);

        context.drawImage(this._img, x, y, this.width, this.height);

        context.restore();
    }

};
Spine.Animation = function(name, timelines, duration) {
    this.name = name;
    this.timelines = timelines;
    this.duration = duration * 1000; // convert in ms
};

Spine.Animation.prototype = {
    destroy: function() {
        for(var i=0, n=this.timelines.length; i<n; ++i) {
            this.timelines[i].destroy();
            this.timelines[i] = null;
        }
    },

    /** Poses the skeleton at the specified time for this animation. */
    apply: function(skeleton, time, loop, alpha) {
        if(loop && this.duration) time %= this.duration;
        time *= 0.001;

        for(var i=0, n=this.timelines.length; i<n; ++i) {
            this.timelines[i].apply(skeleton, time, alpha || 1);
        }
    },

    /** Poses the skeleton at the specified time for this animation mixed with the current pose.
     * @param alpha The amount of this animation that affects the current pose. */
    mix: function(skeleton, time, loop, alpha) {
        this.apply(skeleton, time, loop, alpha);
    }
};

//
// Curve Timeline
//
var LINEAR = 0;
var STEPPED = -1;
var BEZIER_SEGMENTS = 10;


var CurveTimeline = function(keyframeCount) {
    this.curves = new Float32Array((keyframeCount-1) *6); // dfx, dfy, ddfx, ddfy, dddfx, dddfy, ...
};

CurveTimeline.prototype = {
    destroy: function() {
        this.curves = null;
    },

    setLinear: function(keyframeIndex) {
        this.curves[keyframeIndex * 6] = LINEAR;
    },
    setStepped: function(keyframeIndex) {
        this.curves[keyframeIndex * 6] = STEPPED;
    },

    /** Sets the control handle positions for an interpolation bezier curve used to transition from this keyframe to the next.
     * cx1 and cx2 are from 0 to 1, representing the percent of time between the two keyframes. cy1 and cy2 are the percent of
     * the difference between the keyframe's values. */
    setCurve: function(keyframeIndex, cx1, cy1, cx2, cy2) {
        var subdiv_step = 1 / BEZIER_SEGMENTS,
            subdiv_step2 = subdiv_step * subdiv_step,
            subdiv_step3 = subdiv_step2 * subdiv_step,
            pre1 = 3 * subdiv_step,
            pre2 = 3 * subdiv_step2,
            pre4 = 6 * subdiv_step2,
            pre5 = 6 * subdiv_step3,
            tmp1x = -cx1 * 2 + cx2,
            tmp1y = -cy1 * 2 + cy2,
            tmp2x = (cx1 - cx2) * 3 + 1,
            tmp2y = (cy1 - cy2) * 3 + 1,
            i = keyframeIndex * 6;

        this.curves[i] = cx1 * pre1 + tmp1x * pre2 + tmp2x * subdiv_step3;
        this.curves[i + 1] = cy1 * pre1 + tmp1y * pre2 + tmp2y * subdiv_step3;
        this.curves[i + 2] = tmp1x * pre4 + tmp2x * pre5;
        this.curves[i + 3] = tmp1y * pre4 + tmp2y * pre5;
        this.curves[i + 4] = tmp2x * pre5;
        this.curves[i + 5] = tmp2y * pre5;
    },
    getCurvePercent: function(keyframeIndex, percent) {
        var curveIndex = keyframeIndex * 6,
            dfx = this.curves[curveIndex] || 0;

        if(dfx == LINEAR) return percent;
        if(dfx == STEPPED) return 0;

        var dfy = this.curves[curveIndex + 1],
            ddfx = this.curves[curveIndex + 2],
            ddfy = this.curves[curveIndex + 3],
            dddfx = this.curves[curveIndex + 4],
            dddfy = this.curves[curveIndex + 5],
            x = dfx, y = dfy,
            i = BEZIER_SEGMENTS - 2;

        while(true) {
            if(x >= percent) {
                var lastX = x - dfx,
                    lastY = y - dfy;

                return lastY + (y - lastY) * (percent - lastX) / (x - lastX);
            }
            if (i === 0) break;
            i--;
            dfx += ddfx;
            dfy += ddfy;
            ddfx += dddfx;
            ddfy += dddfy;
            x += dfx;
            y += dfy;
        }

        return y + (1 - y) * (percent - x) / (1 - x); // Last point is 1,1.
    }
};

/** @param target After the first and before the last entry. */
function binarySearch(values, valuesLength, target, step) {
    var low = 0,
        high = valuesLength / step - 2;

    if(high === 0) return step;

    var current = high >> 1;
    while(true) {
        if(values[(current + 1) * step] <= target)
            low = current + 1;
        else
            high = current;

        if(low == high) return (low + 1) * step;
        current = (low + high) >> 1;
    }
    return 0;
}

//
// Rotate Timeline
//
var ROTATE_LAST_FRAME_TIME = -2;
var ROTATE_FRAME_VALUE = 1;

Spine.RotateTimeline = function(keyframeCount) {
    CurveTimeline.call(this, keyframeCount);

    this.framesLength = keyframeCount * 2;
    this.frames = new Float32Array(this.framesLength);
    this.boneIndex = 0;
};

Spine.RotateTimeline.prototype = Object.create(CurveTimeline.prototype);

Spine.RotateTimeline.prototype.destroy = function() {
    this.curves = null;
    this.frames = null;
};

Spine.RotateTimeline.prototype.getDuration = function() {
    return this.frames[this.framesLength - 2];
};
Spine.RotateTimeline.prototype.getKeyFrameCount = function() {
    return this.framesLength / 2;
};
Spine.RotateTimeline.prototype.setKeyframe = function(keyframeIndex, time, value) {
    keyframeIndex *= 2;
    this.frames[keyframeIndex] = time;
    this.frames[keyframeIndex + 1] = value;
};

Spine.RotateTimeline.prototype.apply = function(skeleton, time, alpha) {
    if(time < this.frames[0]) return; // Time is before first frame.

    var bone = skeleton.bones[this.boneIndex],
        amount;

    if(time >= this.frames[this.framesLength - 2]) { // Time is after last frame.
        amount = bone.boneData.rotation + this.frames[this.framesLength - 1] - bone.rotation;
        while (amount > 180)
            amount -= 360;
        while (amount < -180)
            amount += 360;
        bone.rotation += amount * alpha;
        return;
    }

    // Interpolate between the last frame and the current frame.
    var frameIndex = binarySearch(this.frames, this.framesLength, time, 2),
        lastFrameValue = this.frames[frameIndex - 1],
        frameTime = this.frames[frameIndex],
        percent = 1 - (time - frameTime) / (this.frames[frameIndex + ROTATE_LAST_FRAME_TIME] - frameTime);

    if (percent < 0)
        percent = 0;
    else if (percent > 1) //
        percent = 1;
    percent = this.getCurvePercent(frameIndex / 2 - 1, percent);

    amount = this.frames[frameIndex + ROTATE_FRAME_VALUE] - lastFrameValue;
    while (amount > 180)
        amount -= 360;
    while (amount < -180)
        amount += 360;
    amount = bone.boneData.rotation + (lastFrameValue + amount * percent) - bone.rotation;
    while (amount > 180)
        amount -= 360;
    while (amount < -180)
        amount += 360;
    bone.rotation += amount * alpha;
};


//
// Translate Timeline
//
var TRANSLATE_LAST_FRAME_TIME = -3;
var TRANSLATE_FRAME_X = 1;
var TRANSLATE_FRAME_Y = 2;

Spine.TranslateTimeline = function(keyframeCount) {
    CurveTimeline.call(this, keyframeCount);

    this.framesLength = keyframeCount * 3;
    this.frames = new Float32Array(this.framesLength); // time, value, value, ...
    this.boneIndex = 0;
};

Spine.TranslateTimeline.prototype = Object.create(CurveTimeline.prototype);

Spine.TranslateTimeline.prototype.destroy = function() {
    this.curves = null;
    this.frames = null;
};

Spine.TranslateTimeline.prototype.getDuration = function() {
    return this.frames[this.framesLength - 3];
};
Spine.TranslateTimeline.prototype.getKeyFrameCount = function() {
    return this.framesLength / 3;
};
Spine.TranslateTimeline.prototype.setKeyframe = function(keyframeIndex, time, x, y) {
    keyframeIndex *= 3;
    this.frames[keyframeIndex] = time;
    this.frames[keyframeIndex + 1] = x;
    this.frames[keyframeIndex + 2] = y;
};

Spine.TranslateTimeline.prototype.apply = function(skeleton, time, alpha) {
    if(time < this.frames[0]) return; // Time is before first frame.

    var bone = skeleton.bones[this.boneIndex];

    if(time >= this.frames[this.framesLength - 3]) { // Time is after last frame.
        bone.x += (bone.boneData.x + this.frames[this.framesLength - 2] - bone.x) * alpha;
        bone.y += (bone.boneData.y + this.frames[this.framesLength - 1] - bone.y) * alpha;
        return;
    }

    // Interpolate between the last frame and the current frame.
    var frameIndex = binarySearch(this.frames, this.framesLength, time, 3),
        lastFrameX = this.frames[frameIndex - 2],
        lastFrameY = this.frames[frameIndex - 1],
        frameTime = this.frames[frameIndex],
        percent = 1 - (time - frameTime) / (this.frames[frameIndex + TRANSLATE_LAST_FRAME_TIME] - frameTime);
    if (percent < 0)
        percent = 0;
    else if (percent > 1) //
        percent = 1;
    percent = this.getCurvePercent(frameIndex / 3 - 1, percent);

    bone.x += (bone.boneData.x + lastFrameX + (this.frames[frameIndex + TRANSLATE_FRAME_X] - lastFrameX) * percent - bone.x) * alpha;
    bone.y += (bone.boneData.y + lastFrameY + (this.frames[frameIndex + TRANSLATE_FRAME_Y] - lastFrameY) * percent - bone.y) * alpha;
};

//
// Scale Timeline
//
Spine.ScaleTimeline = function(keyframeCount) {
    Spine.TranslateTimeline.call(this, keyframeCount);
};

Spine.ScaleTimeline.prototype = Object.create(Spine.TranslateTimeline.prototype);

Spine.ScaleTimeline.prototype.apply = function(skeleton, time, alpha) {
    if(time < this.frames[0]) return; // Time is before first frame.

    var bone = skeleton.bones[this.boneIndex];

    if(time >= this.frames[this.framesLength - 3]) { // Time is after last frame.
        bone.scaleX += (bone.boneData.scaleX - 1 + this.frames[this.framesLength - 2] - bone.scaleX) * alpha;
        bone.scaleY += (bone.boneData.scaleY - 1 + this.frames[this.framesLength - 1] - bone.scaleY) * alpha;
        return;
    }

    // Interpolate between the last frame and the current frame.
    var frameIndex = binarySearch(this.frames, this.framesLength, time, 3),
        lastFrameX = this.frames[frameIndex - 2],
        lastFrameY = this.frames[frameIndex - 1],
        frameTime = this.frames[frameIndex],
        percent = 1 - (time - frameTime) / (this.frames[frameIndex + TRANSLATE_LAST_FRAME_TIME] - frameTime);

    if (percent < 0)
        percent = 0;
    else if (percent > 1) //
        percent = 1;
    percent = this.getCurvePercent(frameIndex / 3 - 1, percent);

    bone.scaleX += (bone.boneData.scaleX - 1 + lastFrameX + (this.frames[frameIndex + TRANSLATE_FRAME_X] - lastFrameX) * percent - bone.scaleX) * alpha;
    bone.scaleY += (bone.boneData.scaleY - 1 + lastFrameY + (this.frames[frameIndex + TRANSLATE_FRAME_Y] - lastFrameY) * percent - bone.scaleY) * alpha;
};

//
// Color Timeline
//
var COLOR_LAST_FRAME_TIME = -5;
var COLOR_FRAME_R = 1;
var COLOR_FRAME_G = 2;
var COLOR_FRAME_B = 3;
var COLOR_FRAME_A = 4;

Spine.ColorTimeline = function(keyframeCount) {
    CurveTimeline.call(this, keyframeCount);

    this.framesLength = keyframeCount * 5;
    this.frames = new Float32Array(this.framesLength);  // time, r, g, b, a, ...
    this.slotIndex = 0;
};

Spine.ColorTimeline.prototype = Object.create(CurveTimeline.prototype);

Spine.ColorTimeline.prototype.destroy = function() {
    this.curves = null;
    this.frames = null;
};

Spine.ColorTimeline.prototype.getDuration = function() {
    return this.frames[this.framesLength - 5];
};
Spine.ColorTimeline.prototype.getKeyFrameCount = function() {
    return this.framesLength / 5;
};
Spine.ColorTimeline.prototype.setKeyframe = function(keyframeIndex, time, r, g, b, a) {
    keyframeIndex *= 5;
    this.frames[keyframeIndex] = time;
    this.frames[keyframeIndex + 1] = r;
    this.frames[keyframeIndex + 2] = g;
    this.frames[keyframeIndex + 3] = b;
    this.frames[keyframeIndex + 4] = a;
};

Spine.ColorTimeline.prototype.apply = function(skeleton, time, alpha) {
    if(time < this.frames[0]) return; // Time is before first frame.

    var slot = skeleton.slots[this.slotIndex];

    if(time >= this.frames[this.framesLength - 5]) { // Time is after last frame.
        var i = this.framesLength - 1;
        slot.r = this.frames[i - 3];
        slot.g = this.frames[i - 2];
        slot.b = this.frames[i - 1];
        slot.a = this.frames[i];
        return;
    }

    // Interpolate between the last frame and the current frame.
    var frameIndex = binarySearch(this.frames, this.framesLength, time, 5),
        lastFrameR = this.frames[frameIndex - 4],
        lastFrameG = this.frames[frameIndex - 3],
        lastFrameB = this.frames[frameIndex - 2],
        lastFrameA = this.frames[frameIndex - 1],
        frameTime  = this.frames[frameIndex],
        percent = 1 - (time - frameTime) / (this.frames[frameIndex + COLOR_LAST_FRAME_TIME] - frameTime);

    if (percent < 0)
        percent = 0;
    else if (percent > 1) //
        percent = 1;
    percent = this.getCurvePercent(frameIndex / 5 - 1, percent);

    var r = lastFrameR + (this.frames[frameIndex + COLOR_FRAME_R] - lastFrameR) * percent,
        g = lastFrameG + (this.frames[frameIndex + COLOR_FRAME_G] - lastFrameG) * percent,
        b = lastFrameB + (this.frames[frameIndex + COLOR_FRAME_B] - lastFrameB) * percent,
        a = lastFrameA + (this.frames[frameIndex + COLOR_FRAME_A] - lastFrameA) * percent;

    if (alpha < 1) {
        slot.r += (r - slot.r) * alpha;
        slot.g += (g - slot.g) * alpha;
        slot.b += (b - slot.b) * alpha;
        slot.a += (a - slot.a) * alpha;
    }
    else {
        slot.r = r;
        slot.g = g;
        slot.b = b;
        slot.a = a;
    }
};

//
// Attachment Timeline
//
Spine.AttachmentTimeline = function(keyframeCount) {
    this.framesLength = keyframeCount;
    this.frames = new Float32Array(this.framesLength);  // time, ...
    this.attachmentNames = [];
    this.slotIndex = 0;
};

Spine.AttachmentTimeline.prototype = {
    destroy: function() {
        this.frames = null;
    },

    getDuration: function() {
        return this.frames[this.framesLength - 1];
    },
    getKeyframeCount: function() {
        return this.framesLength;
    },

    setKeyframe: function(keyframeIndex, time, attachmentName) {
        this.frames[keyframeIndex] = time;
        if(this.attachmentNames[keyframeIndex]) this.attachmentNames[keyframeIndex] = null;
        this.attachmentNames[keyframeIndex] = attachmentName;
    },

    apply: function(skeleton, time, alpha) {
        if(time < this.frames[0]) return; // Time is before first frame.

        var frameIndex;
        if (time >= this.frames[this.framesLength - 1]) // Time is after last frame.
            frameIndex = this.framesLength - 1;
        else
            frameIndex = binarySearch(this.frames, this.framesLength, time, 1) - 1;

        var attachmentName = this.attachmentNames[frameIndex];
        skeleton.slots[this.slotIndex].setAttachment(attachmentName ? skeleton.getAttachmentByIndex(this.slotIndex, attachmentName) : null);
    }
};
Spine.AnimationState = function(data) {
    if(!data) throw "data cannot be null";
    this._data = data;

    this.currentAnim = null;
    this.previousAnim = null;

    this.currentTime = 0;
    this.previousTime = 0;

    this.currentLoop = false;
    this.previousLoop = false;

    this.mixTime = 0;
    this.mixDuration = 0;
};

Spine.AnimationState.prototype = {
    destroy: function() {},

    update: function(delta) {
        this.currentTime += delta;
        this.previousTime += delta;
        this.mixTime += delta;
    },

    apply: function(skeleton) {
        if(!this.currentAnim) return;
        if(this.previousAnim) {
            this.previousAnim.apply(skeleton, this.previousTime, this.previousLoop);
            var alpha = this.mixTime / this.mixDuration;
            if(alpha >= 1) {
                alpha = 1;
                this.previousAnim = null;
            }

            this.currentAnim.mix(skeleton, this.currentTime, this.currentLoop, alpha);
        }
        else {
            this.currentAnim.apply(skeleton, this.currentTime, this.currentLoop);
        }
    },

    setAnimationFromName: function(animationName, loop) {
        var animation = this._data.getSkeletonData().findAnimation(animationName);
        if(!animation) throw "Animation not found: " + animationName;

        this.setAnimation(animation, loop);
    },

    setAnimation: function(animation, loop) {
        this.previousAnim = null;
        if(animation && this.currentAnim) {
            this.mixDuration = this._data.getMix(this.currentAnim, animation);
            if(this.mixDuration > 0) {
                this.mixTime = 0;
                this.previousAnim = this.currentAnim;
                this.previousTime = this.currentTime;
                this.previousLoop = this.currentLoop;
            }
        }

        this.currentAnim = animation;
        this.currentLoop = loop;
        this.currentTime = 0;
    },

    getAnimation: function() {
        return this.currentAnim;
    },

    getTime: function() {
        return this.currentTime;
    }
};
Spine.AnimationStateData = function(skeletonData) {
    this._skeletonData = skeletonData;
    this._animationToMixTime = {};
};

Spine.AnimationStateData.prototype = {
    destroy: function() {},

    getSkeletonData: function() {
        return this._skeletonData;
    },

    setMixFromNames: function(fromName, toName, duration) {
        var from = this._skeletonData.findAnimation(fromName),
            to = this._skeletonData.findAnimation(toName);
        if(!from) throw "Animation not found: " + fromName;
        if(!to) throw "Animation not found: " + toName;

        this.setMix(from, to, duration);
    },

    setMix: function(from, to, duration) {
        if(!from || !to) throw "From or to cannot be null";
        var key = {
            a1: from,
            a2: to
        };
        this._animationToMixTime[key] = duration;
    },

    getMix: function(from, to) {
        var key = {
            a1: from,
            a2: to
        };
        if(this._animationToMixTime.hasOwnProperty(key)) {
            return this._animationToMixTime[key];
        }
        return 0;
    }
};
Spine.Skeleton = function(skeletonData) {
    this.skeletonData = skeletonData;
    this.bones = [];
    this.slots = [];
    this.drawOrder = [];
    this.skin = null;
    //this.time = 0;
    this.flipX = false;
    this.flipY = false;

    if(!skeletonData) throw "skeletonData cannot be null";

    var boneCount = skeletonData.bones.length,
        slotCount = skeletonData.slots.length,
        boneData, bone, i, ii, slotData, slot;

    // copy bones
    this.bones = new Array(boneCount);
    for(i=0; i<boneCount; ++i) {
        boneData = skeletonData.bones[i];
        bone = new Spine.Bone(boneData);

        if(boneData.parent) {
            for(ii=0; ii < boneCount; ++ii) {
                if(skeletonData.bones[ii] == boneData.parent) {
                    bone.parent = this.bones[ii];
                    break;
                }
            }
        }
        this.bones[i] = bone;
    }

    // copy slots
    this.slots = new Array(slotCount);
    this.drawOrder = new Array(slotCount);
    for(i=0; i<slotCount; ++i) {
        slotData = skeletonData.slots[i];
        bone = null;

        // find bone for the slotData's bone
        for(ii=0; ii < boneCount; ++ii) {
            if(skeletonData.bones[ii] == slotData.bone) {
                bone = this.bones[ii];
                break;
            }
        }
        slot = new Spine.Slot(slotData, this, bone);
        this.slots[i] = slot;
        this.drawOrder[i] = slot;
    }
};

Spine.Skeleton.prototype = {
    destroy: function() {
        var i, n;
        for(i=0, n=this.bones.length; i<n; ++i) {
            this.bones[i].destroy();
            this.bones[i] = null;
        }
        for(i=0, n=this.slots.length; i<n; ++i) {
            this.slots[i].destroy();
            this.slots[i] = null;
        }
    },

    updateWorldTransform: function() {
        var i,n;
        for(i=0, n=this.bones.length; i<n; ++i) {
            this.bones[i].updateWorldTransform(this.flipX, this.flipY);
        }

        var slot, attachment;
        for(i=0, n=this.drawOrder.length; i<n; ++i) {
            slot = this.drawOrder[i];
            attachment = slot.attachment;
            if(attachment) {
                attachment.updateWorldTransform(this.flipX, this.flipY, slot);
            }
        }
    },

    setToBindPose: function() {
        this.setBonesToBindPose();
        this.setSlotsToBindPose();
    },
    setBonesToBindPose: function() {
        for(var i=0, n=this.bones.length; i<n; ++i) {
            this.bones[i].setToBindPose();
        }
    },
    setSlotsToBindPose: function() {
        for(var i=0, n=this.slots.length; i<n; ++i) {
            this.slots[i].setToBindPoseByIndex(i);
        }
    },

    getRootBone: function() {
        if(this.bones.length === 0) return null;
        return this.bones[0];
    },
    findBone: function(boneName) {
        var idx = this.findBoneIndex(boneName);
        if(idx < 0) return null;
        return this.bones[idx];
    },
    findBoneIndex: function(boneName) {
        for(var i=0, iend=this.bones.length; i<iend; ++i) {
            if(this.bones[i].boneData.name == boneName)
                return i;
        }
        return -1;
    },

    findSlot: function(slotName) {
        var idx = this.findSlotIndex(slotName);
        if(idx < 0) return null;
        return this.slots[idx];
    },
    findSlotIndex: function(slotName) {
        for(var i=0, iend=this.slots.length; i<iend; ++i) {
            if(this.slots[i].slotData.name == slotName)
                return i;
        }
        return -1;
    },

    setSkinByName: function(skinName) {
        var skin = skeletonData.findSkin(skinName);
        if(!skin) throw "Skin not found: " + skinName;
        this.setSkin(skin);
    },
    setSkin: function(newSkin) {
        if(this.skin && newSkin) {
            newSkin.attachAll(this, skin);
        }
        this.skin = newSkin;
    },

    getAttachmentByName: function(slotName, attachmentName) {
        return this.getAttachmentByIndex(this.skeletonData.findSlotIndex(slotName), attachmentName);
    },
    getAttachmentByIndex: function(slotIndex, attachmentName) {
        if(this.skin) {
            return this.skin.getAttachment(slotIndex, attachmentName);
        }

        if(this.skeletonData.defaultSkin) {
            var attachment = this.skeletonData.defaultSkin.getAttachment(slotIndex, attachmentName);
            if(attachment) return attachment;
        }
        return null;
    },
    setAttachment: function(slotName, attachmentName) {
        if(!slotName) throw "slotName cannot be null.";
        var slot, attachment;
        for(var i=0, n=this.slots.length; i<n; ++i) {
            slot = this.slots[i];
            if(slot.slotData.name == slotName) {
                if(attachmentName) {
                    attachment = this.getAttachmentByIndex(i, attachmentName);
                    if(!attachment) {
                        throw "Attachment not found: " + attachmentName + ", for slot: " + slotName;
                    }
                    slot.setAttachment(attachment);
                }
                return;
            }
        }
        throw "Slot not found: " + slotName;
    },

    draw: function(context) {
        var attachment;
        for(i=0, n=this.drawOrder.length; i<n; ++i) {
            attachment = this.drawOrder[i].attachment;
            if(attachment) {
                attachment.draw(context);
            }
        }

        if(Spine._DEBUG_) {

            for(var j=0, m=this.bones.length; j<m; ++j) {

                if(this.bones[j].boneData.length > 0) {
                    context.save();
                    context.strokeStyle = "red";
                    context.translate(this.bones[j].worldX, this.bones[j].worldY);
                    context.rotate(-this.bones[j].worldRotation * (Math.PI/180));
                    context.beginPath();
                    context.moveTo(0, 0);
                    context.lineTo(this.bones[j].boneData.length, 0);
                    context.closePath();
                    context.stroke();
                    context.restore();
                }

                context.fillStyle = "green";
                context.arc(this.bones[j].worldX, this.bones[j].worldY, 3, 0, Math.PI*2, true);
                context.closePath();
                context.fill();
            }
        }
    }
};
Spine.Bone = function(boneData) {
    this.boneData = boneData;
    this.parent = null;
    this.x = boneData.x;
    this.y = boneData.y;
    this.rotation = boneData.rotation;
    this.scaleX = boneData.scaleX;
    this.scaleY = boneData.scaleY;

    this.m00 = 0; // a
    this.m01 = 0; // b
    this.worldX = 0; // x
    this.m10 = 0; // c
    this.m11 = 0; // d
    this.worldY = 0; // y
    this.worldRotation = 0;
    this.worldScaleX = 1;
    this.worldScaleY = 1;

    if(!boneData) throw "boneData cannot be null";

};

Spine.Bone.prototype = {
    destroy: function() {},

    setToBindPose: function() {
        this.x = this.boneData.x;
        this.y = this.boneData.y;
        this.rotation = this.boneData.rotation;
        this.scaleX = this.boneData.scaleX;
        this.scaleY = this.boneData.scaleY;
    },

    updateWorldTransform: function(flipX, flipY) {
        if(this.parent) {
            this.worldX = this.x * this.parent.m00 + this.y * this.parent.m01 + this.parent.worldX;
            this.worldY = this.x * this.parent.m10 + this.y * this.parent.m11 + this.parent.worldY;
            this.worldScaleX = this.parent.worldScaleX * this.scaleX;
            this.worldScaleY = this.parent.worldScaleY * this.scaleY;
            this.worldRotation = this.parent.worldRotation + this.rotation;
        }
        else {
            this.worldX = this.x;
            this.worldY = this.y;
            this.worldScaleX = this.scaleX;
            this.worldScaleY = this.scaleY;
            this.worldRotation = this.rotation;
        }

        var radians = this.worldRotation * Math.PI / 180,
            cos = Math.cos(radians),
            sin = Math.sin(radians);

        this.m00 = cos * this.worldScaleX;
        this.m10 = sin * this.worldScaleX;
        this.m01 = -sin * this.worldScaleY;
        this.m11 = cos * this.worldScaleY;

        if(flipX) {
            this.m00 *= -1;
            this.m01 *= -1;
        }
        if(flipY) {
            this.m10 *= -1;
            this.m11 *= -1;
        }
        if(this.boneData.yDown) {
            this.m10 *= -1;
            this.m11 *= -1;
        }
    }
};
Spine.Slot = function(slotData, skeleton, bone) {
    this.slotData = slotData;
    this.skeleton = skeleton;
    this.bone = bone;
    this.r = 1;
    this.g = 1;
    this.b = 1;
    this.a = 1;
    this.attachment = null;

    this._attachmentTime = 0;

    if(!slotData) throw "slotData cannot be null";
    if (!skeleton) throw "skeleton cannot be null";
    if (!bone) throw "bone cannot be null";

    this.setToBindPose();
};

Spine.Slot.prototype = {
    destroy: function() {},

    setAttachment: function(attachment) {
        this.attachment = attachment;
        this._attachmentTime = this.skeleton.time;
    },

    setAttachmentTime: function(time) {
        this._attachmentTime = this.skeleton.time - time;
    },
    getAttachmentTime: function() {
        return this.skeleton.time - this._attachmentTime;
    },

    setToBindPoseByIndex: function(slotIndex) {
        this.r = this.slotData.r;
        this.g = this.slotData.g;
        this.b = this.slotData.b;
        this.a = this.slotData.a;
        this.setAttachment(this.slotData.attachmentName ? this.skeleton.getAttachmentByIndex(slotIndex, this.slotData.attachmentName) : null);
    },
    setToBindPose: function() {
        for(var i=0, n=this.skeleton.skeletonData.slots.length; i<n; ++i) {
            if(this.slotData == this.skeleton.skeletonData.slots[i]) {
                this.setToBindPoseByIndex(i);
                return;
            }
        }
    }
};
Spine.Skin = function(name) {
    this.name = name;
    this._attachments = {};
};

Spine.Skin.prototype = {
    destroy: function() {
        for(var key in this._attachments) {
            this._attachments[key].destroy();
            this._attachments[key] = null;
        }
    },

    addAttachment: function(slotIndex, name, attachment) {
        if(!attachment) throw "attachment cannot be null.";
        var key = [slotIndex, name];
        this._attachments[key] = attachment;
    },
    getAttachment: function(slotIndex, name) {
        var key = [slotIndex, name];
        if(this._attachments.hasOwnProperty(key)) {
            return this._attachments[key];
        }
        return null;
    },

    attachAll: function(skeleton, oldSkin) {
        var slot, attachment;
        for(var key in this._attachments) {
            slot = skeleton.slots[key[0]];
            if(slot.attachment == key[1]) {
                attachment = this.getAttachment(key[0], key[1]);
                if(attachment) slot.setAttachment(attachment);
            }
        }
    }
};