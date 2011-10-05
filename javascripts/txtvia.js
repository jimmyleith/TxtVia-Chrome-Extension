/*globals $,chrome,localStorage,console,window,setTimeout,setInterval,clearTimeout */

var TxtVia = {};

// App Types
TxtVia.CHROME = "Chrome";
TxtVia.SAFARI = "Safari";
TxtVia.FIREFOX = "FireFox";
TxtVia.UNKNOWN = "Unknown";
TxtVia.init = function () {
    $.support.cors = true;
    $.ajaxSetup({
        cache: false,
        async: true,
        crossDomain: true,
        dataType: "json",
        timeout: 60000
    });
    if (window.chrome) {
        try {
            TxtVia.appID = chrome.i18n.getMessage("@@extension_id");
        } catch (eer) {
            console.error("[Chrome] Can't determand extension_id");
        }
        TxtVia.appName = "Google Chrome";
        TxtVia.appType = TxtVia.CHROME;
    } else {
        TxtVia.appID = "0";
        TxtVia.appName = "Unknown Client";
        TxtVia.appType = TxtVia.UNKNOWN;
    }
    TxtVia.Pusher = {};
    TxtVia.BeaconPush = {};
    TxtVia.PushMethod = "Pusher";
    switch (localStorage.env) {
    case "development":
        TxtVia.url = "http://localhost:8080";
        TxtVia.Pusher.webSocketID = "c9351524b47769e60be7";
        TxtVia.BeaconPush.webSocketID = "1adeccce";
        break;
    case "staging":
        TxtVia.url = "http://staging.txtvia.com";
        TxtVia.Pusher.webSocketID = "02364a48c5da78fd5244";
        TxtVia.BeaconPush.webSocketID = "1adeccce";
        break;
    default:
        TxtVia.url = "http://txtvia.com";
        TxtVia.Pusher.webSocketID = "c0f2d772bdcdd2e04aa3";
        TxtVia.BeaconPush.webSocketID = "1adeccce";
        break;
    }



    TxtVia.Storage();
    TxtVia.WebDB.open();
    TxtVia.WebDB.createTables();
    if (TxtVia.uriParams('auth_token')) {
        localStorage.authToken = TxtVia.uriParams('auth_token');
    }
    TxtVia.UNIQUE_ID = TxtVia.appType + ":" + TxtVia.appID + ":" + localStorage.authToken;
};
TxtVia.uriParams = function (name) {
    var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
    try {
        return results[1] || 0;
    } catch (err) {
        return null;
    }
};
TxtVia.TextUtil = {};
TxtVia.TextUtil.mobileNumber = function (number) {
    try {
        var code = JSON.parse(localStorage.locale).country_calling;
        return number.replace(/\s/, '').replace(/^0/, code).replace(/^([^\+*])/, '+$1');
    } catch (err) {
        console.log("[TxtVia.TextUtil.mobileNumber] can't convert number : " + number);
    }
};
TxtVia.TextUtil.removeNumber = function (number) {
    try {
        return number.replace(/\s*?\(.*\)/, '');
    } catch (err) {
        console.log("[TxtVia.TextUtil.removeNumber] can't remove number : " + number);
    }
};
TxtVia.Authenticate = function () {
    $.ajax({
        url: TxtVia.url + '/sign_out.json',
        beforeSend: function () {
            localStorage.authToken = "";
        },
        complete: function () {
            chrome.tabs.create({
                url: TxtVia.url + '/sign_in?return_url=' + encodeURIComponent(chrome.extension.getURL("/popup.html"))
            });
        }
    });
};
