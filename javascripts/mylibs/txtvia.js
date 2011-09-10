if(!window.TxtVia){
    var TxtVia = {};
}
// App Types
TxtVia.CHROME = "Chrome";
TxtVia.SAFARI = "Safari";
TxtVia.FIREFOX = "FireFox";
TxtVia.UNKNOWN = "Unknown";
TxtVia.init = function () {
    jQuery.support.cors = true;
    $.ajaxSetup({
        cache: false,
        async: true,
        crossDomain: true,
        dataType: "json",
        timeout: 4000,
    });
    if (window.chrome) {
        try {
            TxtVia.appID = chrome.i18n.getMessage("@@extension_id");
        } catch (eer) {
            console.error("[Chrome] Can't determand extension_id");
        }
        TxtVia.appName = "Google Chrome";
        TxtVia.appType =  TxtVia.CHROME;
    } else {
        TxtVia.appID = "0";
        TxtVia.appName = "Unknown Client";
        TxtVia.appType = TxtVia.UNKNOWN;
    }
    TxtVia.Pusher = {};
    TxtVia.BeaconPush = {};
    TxtVia.env = "development";
    // TxtVia.env = "staging";
    switch (TxtVia.env) {
    case "development":
        TxtVia.url = "http://localhost:8080";
        TxtVia.PushMethod = "BeaconPush";
        TxtVia.Pusher.webSocketID = "c9351524b47769e60be7";
        TxtVia.BeaconPush.webSocketID = "1adeccce";
        break;
    case "staging":
        TxtVia.url = "http://staging.txtvia.com";
        TxtVia.PushMethod = "Pusher";
        TxtVia.Pusher.webSocketID = "02364a48c5da78fd5244";
        TxtVia.BeaconPush.webSocketID = "1adeccce";
        break;
    default:
        TxtVia.url = "http://txtvia.com";
        TxtVia.PushMethod = "Pusher";
        TxtVia.Pusher.webSocketID = "c0f2d772bdcdd2e04aa3";
        TxtVia.BeaconPush.webSocketID = "1adeccce";
        break;
    }
    
    
    
    TxtVia.Storage();
    WebDB.open();
    WebDB.createTables();
    if(TxtVia.uriParams('auth_token')){
        localStorage.authToken = TxtVia.uriParams('auth_token');
    }
    TxtVia.UNIQUE_ID = TxtVia.appType +":" + TxtVia.appID + ":" + localStorage.authToken;
};
TxtVia.uriParams = function (name) {
    var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
    try{
        return results[1] || 0;
    }catch(err){
        return null;
    }
};
TxtVia.TextUtil = {};
TxtVia.TextUtil.mobileNumber = function (number) {
    var code = JSON.parse(localStorage.locale).country_calling;
    return number.replace(/\s/, '').replace(/^0/, code);
};
// var TxtVia = (function() {
//     return {
//         init: function() {
//             if (window.chrome) {
//                 try {
//                     TxtVia.appID = chrome.i18n.getMessage("@@extension_id");
//                 } catch(eer) {
//                     console.error("[Chrome] Can't determand extension_id");
//                 }
//                 TxtVia.appName = "Google Chrome";
//             } else {
//                 TxtVia.appID = "0";
//                 TxtVia.appName = "Unknown Client";
//             }
// 
//             // TxtVia.env = "development";
//             // TxtVia.env = "staging";
//             switch (TxtVia.env) {
//             case "development":
//                 TxtVia.url = "http://localhost:8080";
//                 TxtVia.webSocketID = "c9351524b47769e60be7";
//                 break;
//             case "staging":
//                 TxtVia.url = "http://staging.txtvia.com";
//                 TxtVia.webSocketID = "02364a48c5da78fd5244";
//                 break;
//             default:
//                 TxtVia.url = "http://txtvia.com";
//                 TxtVia.webSocketID = "c0f2d772bdcdd2e04aa3";
//                 break;
//             }
//             TxtVia.Storage.setup();
//             // TxtVia.Process.setupDevice();
//             // TxtVia.connection.establish();
// 
//             // // Start worker
//             // setInterval(TxtVia.Process.pendingMessages, 5000);
//             // try {
//             //     if (TxtVia.getParams("auth_token")) {
//             //         console.log("got new auth_token");
//             //         localStorage.authToken = TxtVia.getParams("auth_token");
//             //         TxtVia.Storage.download();
//             //     }
//             // } catch(e) {}
// 
//             // Doesn't work on chrome :(
//             // window.addEventListener("storage", TxtVia.Event.storage, false);
//             /*
//             $.ajaxSetup({
//                 beforeSend: function() {
//                     var opts = {
//                       lines: 12, // The number of lines to draw
//                       length: 0, // The length of each line
//                       width: 4, // The line thickness
//                       radius: 10, // The radius of the inner circle
//                       color: '#fff', // #rbg or #rrggbb
//                       speed: 1, // Rounds per second
//                       trail: 100, // Afterglow percentage
//                       shadow: true // Whether to render a shadow
//                     };
//                     if(typeof(Spinner) === 'function'){
//                         var spinner = new Spinner(opts).spin();
//                         $('.loader').append(spinner.el);
//                     }
//                 },
//                 error: function(e, txt) {
//                     if (e.status === 401) {
//                         localStorage.authToken = "";
//                         localStorage.clientId = 0;
//                         if(window.PopUp){
//                             PopUp.UI.flash("red","You've been logged out, please re-authenticate.");
//                         }
//                         PopUp.Actions.loginLink();
//                         // $.ajax({
//                         //     url:TxtVia.url + "/sign_out",
//                         //     type:"GET",
//                         //     dataType: "html",
//                         //     crossDomain: true,
//                         //     cache: false,
//                         //     async: false,
//                         //     beforeSend:function(){
//                         //       console.log("reauthing");  
//                         //     },
//                         //     success:function(){
//                         //         chrome.tabs.create({
//                         //             url: TxtVia.url + '/sign_in'
//                         //         });
//                         //     }
//                         // });
// 
//                     }
//                 },
//                 complete: function() {
//                     $(".loader").empty();
//                 }
//             });
//             */
//         },
//         getParams: function(name) {
//             var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
//             return results[1] || 0;
//         },
//         Event: {
//             storage: function(e) {
//                 console.log("storage accessed:" + e.key);
//                 /*
//                 switch(e.key){
//                     case "messages":
//                         var message = localStorage.messages[localStorage.messages.length-1].message;
//                         if(message.sent_at){                                
//                             TxtVia.Notification.messageSent(message);
//                         }
//                         if(message.received_at){
//                             TxtVia.Notification.newMessage(message);
//                         }
//                     break;
//                     case "clientId":
//                         TxtVia.Notification.clientRegistered();
//                         TxtVia.connection.establish();
//                     break;
//                 }*/
// 
//             }
//         },
//         Notification: {
//             newMessage: function(message) {
//                 webkitNotifications.createNotification(
//                 '/images/icon48.png',
//                 'New Message Received',
//                 message.recipient + ' said:' + message.body
//                 ).show();
//                 localStorage.unReadMessages = parseInt(localStorage.unReadMessages, 10) + 1;
// 
//                 if (window.chrome) {
//                     (function() {
//                         var value = parseInt(localStorage.unReadMessages, 10);
//                         if (value === 0) {
//                             text = "";
//                         } else {
//                             text = value;
//                         }
//                         // wap
//                         chrome.browserAction.setBadgeText({
//                             text: text.toString()
//                         });
//                     })();
//                 }
//             },
//             messageCountClear: function() {
//                 if (window.chrome) {
//                     (function() {
//                         var value = parseInt(localStorage.unReadMessages, 10);
//                         if (value === 0) {
//                             text = "";
//                         } else {
//                             text = value;
//                         }
//                         // wap
//                         chrome.browserAction.setBadgeText({
//                             text: text.toString()
//                         });
//                     })();
//                 }
//             },
//             messageSent: function(message) {
//                 webkitNotifications.createNotification(
//                 '/images/icon48.png',
//                 "Message has been Sent",
//                 "Your message has been sent to " + message.recipient
//                 ).show();
//             },
//             clientRegistered: function(device) {
//                 webkitNotifications.createNotification(
//                 '/images/icon48.png',
//                 "Client Registered",
//                 "Your client has been registered and you can now send Messages."
//                 ).show();
//             }
//         },
//         Process: {
//             setupDevice: function() {
//                 if (localStorage.clientId === "0") {
//                     $.ajax({
//                         url: TxtVia.url + "/devices.json",
//                         type: "POST",
//                         dataType: "json",
//                         crossDomain: true,
//                         cache: false,
//                         async: false,
//                         data: "unique_id=" + TxtVia.appID + ":" + localStorage.authToken + "&type=client&name=" + encodeURIComponent(TxtVia.appName) + "&auth_token=" + localStorage.authToken,
//                         success: function(data) {
//                             localStorage.clientId = data.device.id;
//                             TxtVia.Notification.clientRegistered();
//                             TxtVia.connection.establish();
//                             TxtVia.Storage.download();
//                         },
//                         failure: function() {
//                             alert("Railed to register Client with TxtVia");
//                         }
//                     });
//                 }else{
//                     TxtVia.connection.establish();
//                     TxtVia.Storage.download();
//                 }
//             },
// 
//         },
//         Storage: {
//             setup: function() {
//                 if (!localStorage.messages) {
//                     localStorage.messages = JSON.stringify([]);
//                     // window.addEventListener("storage", handle_storage, false);
//                 }
//                 if (!localStorage.devices) {
//                     localStorage.devices = JSON.stringify([]);
//                     // window.addEventListener("storage", handle_storage, false);
//                 }
//                 if (!localStorage.contacts) {
//                     localStorage.contacts = JSON.stringify([]);
//                     // window.addEventListener("storage", handle_storage, false);
//                 }
//                 if (!localStorage.unReadMessages) {
//                     localStorage.unReadMessages = 0;
//                 }
//                 if (!localStorage.authToken) {
//                     localStorage.authToken = "";
//                 }
//                 if (!localStorage.clientId) {
//                     localStorage.clientId = 0;
//                 }
//                 if (!localStorage.pendingMessages) {
//                     localStorage.pendingMessages = JSON.stringify([]);
//                 }
//                 if(!localStorage.settings){
//                     localStorage.settings = {};
//                     localStorage.settings.autoHideNotifications = true;
//                 }
//                 // if (TxtVia.server) {
//                 //     if (TxtVia.server.connected) {
//                 //         window.addEventListener("storage", PopUp.UI.alert, false);
//                 //     }
//                 // }
// 
//             },
//             download: function() {
//                 $.ajax({
//                     url: TxtVia.url + "/contacts.json?auth_token=" + localStorage.authToken,
//                     type: "GET",
//                     dataType: "json",
//                     success: function(data) {
//                         if (data) {
//                             localStorage.contacts = JSON.stringify(data);
//                         }
//                     }
//                 });
//                 $.ajax({
//                     url: TxtVia.url + "/messages.json?auth_token=" + localStorage.authToken,
//                     type: "GET",
//                     dataType: "json",
//                     success: function(data) {
//                         // should we delete and download a fresh set of messages?
//                         // in this case, yes!
//                         if (data.devices) {
//                             localStorage.devices = JSON.stringify(data.devices);
//                             if (window.PopUp) {
//                                 PopUp.UI.deviceList();
//                             }
//                         }
//                         if (data.messages) {
//                             localStorage.messages = JSON.stringify(data.messages);
//                             if (window.PopUp) {
//                                 PopUp.Process.view();
//                             }
//                         }
//                     }
//                 });
//             }
//         }
//     };
// })();
