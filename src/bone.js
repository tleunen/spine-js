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