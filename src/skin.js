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