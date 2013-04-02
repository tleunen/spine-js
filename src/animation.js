Spine.Animation = function(timelines, duration) {
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