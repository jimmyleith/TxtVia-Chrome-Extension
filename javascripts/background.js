/*globals $, TxtVia, chrome, webkitNotifications, Pusher, Beacon, localStorage,console,window,setTimeout,setInterval,clearTimeout */
/**
 * @depend storage.js
 **/

var Background = {};
Background.init = function () {
    TxtVia.init();
    if ($.parseJSON(localStorage.clientID) === 0) {
        Background.Process.Post.client();
    }
    try {
        chrome.extension.onRequest.addListener(function (request, sender, callback) {
            if (request.sync) {
                Background.Process.fullDownload(callback);
            } else {
                console.log(request);
            }
        });
    } catch (e) {
        console.error("[Background.init] onRequest listener failed");

    }
    Background.Process.Post.messages();
    Background.connection();
};
Background.isError = false;
Background.Process = {
    isError: false,
    completed: 0
};
Background.Process.Post = {};
Background.Process.Post.messagesTries = 0;
Background.Process.Post.messages = function () {
    var pendingMessages = $.parseJSON(localStorage.pendingMessages);
    if (pendingMessages.length > 0 && window.navigator.onLine && localStorage.authToken) {
        console.log("[Background.Process.message] preparing to send message");
        $.ajax({
            url: TxtVia.url + "/messages.json",
            type: "POST",
            data: pendingMessages[0].data + "&sent_at=" + encodeURIComponent(new Date()) + "&client_id=" + localStorage.clientId + "&auth_token=" + localStorage.authToken,
            success: function (data) {
                Background.Process.Post.messagesTries = 0;
                console.log("[Background.Process.message] message sent");
                Background.Process.isError = false;

                Background.notify.message.sent(data);
                TxtVia.WebDB.insertInto.messages(data, function(){
                    chrome.extension.sendRequest({
                        message: data
                    },function(){
                        console.log("[Background.Process.Post.messages] sent to display");
                    });
                });
                // Update UI with success noteice, and new message in conversation.
                
                pendingMessages.shift();
                localStorage.pendingMessages = JSON.stringify(pendingMessages);
                localStorage.pendingMessages = JSON.stringify(pendingMessages);
                // Double kill yeah!
            },
            error: function () {
                Background.Process.Post.messagesTries = Background.Process.Post.messagesTries + 1;
                if (Background.Process.isError === false) {
                    Background.notify.message.failed(pendingMessages[0]);
                    Background.Process.isError = true;
                }
                if(Background.Process.Post.messagesTries >= 5){
                    Background.notify.message.skipped(pendingMessages[0]);
                    pendingMessages.shift();
                    localStorage.pendingMessages = JSON.stringify(pendingMessages);
                    localStorage.pendingMessages = JSON.stringify(pendingMessages);
                    Background.Process.isError = false;
                }
            },
            complete: function () {
                setTimeout(Background.Process.Post.messages, 100);
            }
        });
    } else {
        setTimeout(Background.Process.Post.messages, 100);
    }
};
Background.Process.Post.client = function () {
    $.ajax({
        url: TxtVia.url + "/devices.json",
        type: "POST",
        data: "unique_id=" + TxtVia.UNIQUE_ID + "&type=client&name=" + encodeURIComponent(TxtVia.appName) + "&auth_token=" + localStorage.authToken,
        success: function (data) {
            localStorage.clientId = data.id;
            Background.notify.client.success(data);
        },
        error: function (e, s, t) {
            if (e.status === 422) {
                Background.Process.Get.device();
            } else {
                console.error("[Background.Process.Post.client] failed : " + e.responseText);
                Background.notify.client.failed();
            }
        }
    });
};

Background.Process.Get = {};
Background.Process.Get.googleToken = function () {
    $.ajax({
        url: TxtVia.url + "/contacts/token.json?auth_token=" + localStorage.authToken,
        type: "GET",
        success: function (data) {
            localStorage.googleToken = data.get_token;
        },
        error: function (e) {
            console.error("[Background.Process.Get.googleToken] failed : " + e.responseText);
        }
    });
};
Background.Process.Get.contacts = function () {
    $.ajax({
        url: TxtVia.url + "/contacts.json?auth_token=" + localStorage.authToken,
        type: "GET",
        success: function (data) {
            if (data) {
                $.each(data, function () {
                    var contact = {
                        name: this.label,
                        number: this.value
                    };
                    TxtVia.WebDB.insertInto.contacts(contact, null);
                });
            }
            Background.Process.completed = Background.Process.completed + 1;
        },
        error: function (e) {
            console.error("[Background.Process.Get.contacts] failed : " + e.responseText);
        }
    });
};
Background.Process.Get.messages = function () {
    $.ajax({
        url: TxtVia.url + "/messages.json?auth_token=" + localStorage.authToken,
        type: "GET",
        success: function (data) {
            $.each(data.devices, function () {
                TxtVia.WebDB.insertInto.devices(this);
            });
            $.each(data.messages, function () {
                TxtVia.WebDB.insertInto.messages(this);
            });
            Background.Process.completed = Background.Process.completed + 1;
        },
        error: function (e) {
            console.error("[Background.Process.Get.messages] failed : " + e.responseText);
        }
    });
};
Background.Process.Get.device = function () {
    $.ajax({
        url: TxtVia.url + "/devices/" + TxtVia.UNIQUE_ID + ".json",
        type: "GET",
        success: function (data) {
            localStorage.clientId = data.id;
            Background.notify.client.restored(data);
        },
        error: function (e) {
            console.error("[Background.Process.Get.device] failed : " + e.responseText);
        }
    });
};
Background.Process.fullDownload = function (callback) {
    Background.Process.completed = 0;
    Background.Process.Get.contacts();
    Background.Process.Get.messages();
    function reDo(){
        if (Background.Process.completed >= 2) {
            Background.notify.syncComplete();
            if (callback) {
                callback();
            }
            Background.Process.completed = 0;
        } else {
            setTimeout(reDo, 500);
        }
    }
    reDo();
};

Background.notify = {};
Background.notify.newMessage = function (message) {
    var notification = webkitNotifications.createNotification(chrome.extension.getURL('/images/icon48.png'), "New message from " + message.name, message.body);
    notification.ondisplay = function () {
        if($.parseJSON(localStorage.enableSounds)){
            sound = new Audio(chrome.extension.getURL(localStorage.newMessageSound));
            sound.play();
        }
        if ($.parseJSON(localStorage.autoHideNotifications)) {
            setTimeout(function () {
                notification.cancel();
            }, 10000);
        }
    };
    notification.onclick = function () {
        chrome.tabs.create({
            url: chrome.extension.getURL('popup.html')
        });
        notification.cancel();
    };
    notification.show();
    localStorage.unReadMessages = parseInt(localStorage.unReadMessages, 10) + 1;
    chrome.browserAction.setBadgeText({
        text: localStorage.unReadMessages === "0" ? localStorage.unReadMessages : ""
    });
};
Background.notify.newDevice = function (device) {
    var notification = webkitNotifications.createNotification(chrome.extension.getURL('/images/icon48.png'), "Congradulations", "You have successfully setup " + device.name + " with TxtVia.");
    notification.ondisplay = function () {
        if($.parseJSON(localStorage.enableSounds)){
            sound = new Audio(chrome.extension.getURL('done.mp3'));
            sound.play();
        }
        if ($.parseJSON(localStorage.autoHideNotifications)) {
            setTimeout(function () {
                notification.cancel();
            }, 10000);
        }
    };
    notification.onclick = function () {
        chrome.tabs.create({
            url: chrome.extension.getURL('popup.html')
        });
        notification.cancel();
    };
    notification.show();
};

Background.notify.client = {};
Background.notify.client.success = function (device) {
    var notification = webkitNotifications.createNotification(chrome.extension.getURL('/images/icon48.png'), "Congradulations", "You have successfully setup " + device.name + " with TxtVia.");

    notification.ondisplay = function () {
        if($.parseJSON(localStorage.enableSounds)){
            sound = new Audio(chrome.extension.getURL('done.mp3'));
            sound.play();
        }
        if ($.parseJSON(localStorage.autoHideNotifications)) {
            setTimeout(function () {
                notification.cancel();
            }, 10000);
        }
    };
    notification.onclick = function () {
        notification.cancel();
    };
    notification.show();
};
Background.notify.client.restored = function (device) {
    var notification = webkitNotifications.createNotification(chrome.extension.getURL('/images/icon48.png'), "Welcome Back", "You have successfully restored TxtVia for " + device.name);
    notification.ondisplay = function () {
        if($.parseJSON(localStorage.enableSounds)){
            sound = new Audio(chrome.extension.getURL('done.mp3'));
            sound.play();
        }
        if ($.parseJSON(localStorage.autoHideNotifications)) {
            setTimeout(function () {
                notification.cancel();
            }, 10000);
        }
    };
    notification.onclick = function () {
        notification.cancel();
    };
    notification.show();
};
Background.notify.client.failed = function (status) {
    var notification, message, action;
    switch (status) {
    case 401:
        action = function () {
            chrome.tabs.create({
                url: TxtVia.url + '/sign_in?return_url=' + encodeURIComponent(chrome.extension.getURL("/popup.html"))
            });
        };
        message = "Failed to successfully login to TxtVia. \n\rClick here re-authenticate.";
        break;
    case 500:
        message = "Oh my gosh, TxtVia is having a major hickup right now. ";
        break;
    default:
        action = function () {
            Background.Process.Post.client();
        };
        message = "Failed to successfully setup device with TxtVia.\n\r Click here to try again.";
        break;
    }
    notification = webkitNotifications.createNotification(chrome.extension.getURL('/images/icon48.png'), "Awe damn", message);
    notification.onclick = function () {
        action();
        notification.cancel();
    };
    console.log(notification);
    notification.show();
};
Background.notify.message = {};
Background.notify.message.sent = function(message){
    var notification = webkitNotifications.createNotification(chrome.extension.getURL('/images/icon48.png'), "Sent Message", "Your message is on it's way to " + message.recipient);
    notification.ondisplay = function () {
        if ($.parseJSON(localStorage.autoHideNotifications)) {
            setTimeout(function () {
                notification.cancel();
            }, 5000);
        }
    };
    notification.onclick = function () {
        notification.cancel();
    };
    notification.show();
};
Background.notify.message.failed = function (message) {
    var notification = webkitNotifications.createNotification(chrome.extension.getURL('/images/icon48.png'), "Awe damn", "Failed to successfully send a message. \nDon't worry, the message will be delivered soon.");
    notification.ondisplay = function () {
        if ($.parseJSON(localStorage.autoHideNotifications)) {
            setTimeout(function () {
                notification.cancel();
            }, 5000);
        }
    };
    notification.onclick = function () {
        notification.cancel();
    };
    notification.show();
};
Background.notify.message.skipped = function (message) {
    var notification = webkitNotifications.createNotification(chrome.extension.getURL('/images/icon48.png'), "Awe damn", "A messsage has failed to be processed. \n\rThis message is being skipped.");
    // notification.ondisplay = function () {
    //     if (localStorage.autoHideNotifications) {
    //         setTimeout(function () {
    //             notification.cancel();
    //         }, 5000);
    //     }
    // };
    notification.onclick = function () {
        notification.cancel();
    };
    notification.show();
};
Background.notify.syncComplete = function (message) {
    var notification = webkitNotifications.createNotification(chrome.extension.getURL('/images/icon48.png'), "Woohooo", "Your messages and contacts are now synced.");
    notification.ondisplay = function () {
        if ($.parseJSON(localStorage.autoHideNotifications)) {
            setTimeout(function () {
                notification.cancel();
            }, 5000);
        }
    };
    notification.onclick = function () {
        notification.cancel();
    };
    notification.show();
};
Background.connection = function () {
    if (!TxtVia.server && window.navigator.onLine) {
        Pusher.channel_auth_endpoint = TxtVia.url + "/users/auth/client/?auth_token=" + localStorage.authToken;
        switch (TxtVia.PushMethod) {
        case "Pusher":
            console.log("[Background.connection] Using Pusher");
            TxtVia.server = new Pusher(TxtVia.Pusher.webSocketID.toString());
            TxtVia.channel = TxtVia.server.subscribe('txtvia_' + localStorage.authToken);
            TxtVia.channel.bind('subscription_error', function (status) {
                console.error("[WebSocket] gave status code : " + status);
                if (status === 401) {
                    Background.notify.client.failed(status);
                }
            });
            TxtVia.channel.bind('message', function (data) {
                try {
                    TxtVia.WebDB.insertInto.messages(data);
                    Background.notify.newMessage(data);
                } catch (err) {
                    console.error("[WebSocket] Failed to parse message data.");
                    console.error(err);
                }
            });
            TxtVia.channel.bind('device', function (data) {
                try {
                    console.log(data);
                    TxtVia.WebDB.insertInto.devices(data);
                    Background.notify.newDevice(data);
                } catch (err) {
                    console.error("[WebSocket] Failed to parse device data.");
                    console.error(err);
                }
            });
            break;
        case "BeaconPush":
            console.log("[Background.connection] Using BeaconPush");
            Beacon.connect(TxtVia.BeaconPush.webSocketID, ['txtvia'], {
                log: TxtVia.env === "development" ? true : false,
                user: localStorage.authToken
            });
            // Beacon.connect(TxtVia.BeaconPush.webSocketID, ['txtvia']);
            Beacon.listen(function (data) {
                console.log(data);
                var message, device;
                try {
                    if (data.message) {
                        message = $.parseJSON(data.message);
                        TxtVia.WebDB.insertInto.messages(message, function (tx, r) {
                            console.log('inserted');
                            TxtVia.WebDB.lastReceivedMessage(function (tx, r) {
                                console.log('display message');
                                Background.notify.newMessage(r.rows.item(0));
                            });
                        });
                    } else if (data.device) {
                        device = $.parseJSON(data.device);
                        Background.notify.newDevice(device);
                        TxtVia.WebDB.insertInto.devices(device);
                    }
                } catch (err) {
                    console.error("[WebSocket] Failed to parse Beacon Push data.");
                    console.error(err);
                }
            });
            break;
        default:
            TxtVia.PushMethod = "Pusher";
            Background.connection();
            break;
        }
        return TxtVia.server;
    } else {
        setTimeout(Background.connection,1000);
        return TxtVia.server;
    }
};


Background.init();