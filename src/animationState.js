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