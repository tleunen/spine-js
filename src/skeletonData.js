Spine.SkeletonData = function() {
    this.bones = [];
    this.slots = [];
    this.skins = [];
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
    }
};