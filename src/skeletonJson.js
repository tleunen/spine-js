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