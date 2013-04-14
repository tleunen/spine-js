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