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