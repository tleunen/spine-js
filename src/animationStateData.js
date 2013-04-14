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