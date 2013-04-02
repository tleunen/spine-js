Spine.SendXhrRequest = function(options, successCallback, errorCallback) {
    var req = new XMLHttpRequest();

    req.open(options.method || 'GET', options.url, true);
    req.onreadystatechange = function(e) {
        if(req.readyState !== 4) {
            return;
        }

        if([200,304].indexOf(req.status) === -1) {
            if(errorCallback) errorCallback(req.status);
        } else {
            if(successCallback) successCallback(req.responseText);
        }
    };

    req.send(options.data || null);
};