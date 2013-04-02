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