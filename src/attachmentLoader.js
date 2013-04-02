Spine.AttachmentLoader = function(path) {
    this._path = path;
    this._images = {};
};

Spine.AttachmentLoader.prototype = {
    destroy: function() {
        for(var i in this._images) {
            this._images[i] = null;
        }
    },

    resolve: function(name) {
        var i = this._images[name];
        if(i) return i;

        var p = this._path.split('{name}').join(name);
        var img = new Image();
        img._spine_loaded = false;
        img.onload = function() {
            img._spine_loaded = true;
        };
        img.src = p;
        this._images[name] = img;
        return img;
    }

};