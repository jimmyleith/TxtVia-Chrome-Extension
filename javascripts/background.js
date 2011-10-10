/*globals $, TxtVia, chrome, webkitNotifications, Pusher, Beacon, localStorage,console,window,setTimeout,setInterval,clearTimeout,Audio */
/**
 * @depend storage.js
 **/

var Background = {};
Background.init = function () {
    TxtVia.init();
    Background.Update();

    try {
        chrome.extension.onRequest.addListener(function (request, sender, callback) {
            console.log("[Background.init.onRequest] Request received");
            if (callback) {
                console.log("[Background.init.onRequest] with callback");
            }
            if (request.sync) {
                Background.Process.fullDownload(callback);
                Background.Process.Poll.messages();
            } else if (request.client) {
                Background.Process.Post.client();
            } else if (request.updateBadge) {
                Background.notify.icon();
            } else if (request.googleToken) {
                Background.Process.Get.googleToken(callback);
            } else {
                console.log(request);
            }
        });
    } catch (e) {
        console.log("[Background.init] onRequest listener failed");
    }
    Background.notify.icon();
    Background.onAuthenticated();
};
Background.failed = false;
Background.waitForAuth = function () {
    if (Background.authenticated()) {
        console.log("[Background.waitForAuth] Authenticated after waiting");
        Background.onAuthenticated();
    } else {
        setTimeout(function () {
            Background.waitForAuth();
        }, 500);
    }
};
Background.authenticated = function () {
    if (localStorage.authToken) {
        return localStorage.authToken.length > 0;
    }
    return false;
};
Background.onAuthenticated = function () {
    if (Background.authenticated()) {
        console.log("[Background.onAuthenticated] Authenticated");
        if ($.parseJSON(localStorage.clientId) === 0) {
            Background.Process.Post.client();
        }
        Background.Process.Post.messages();
        Background.Process.Poll.messages();
        Background.connection();
    } else {
        console.log("[Background.onAuthenticated] Waiting for Auth");
        Background.waitForAuth();
    }
};
Background.isError = false;
Background.Update = function () {
    var version = parseInt(localStorage.version.replace(/\./g, ''), 10),
        current_version;
    if (window.chrome) {
        current_version = parseInt(chrome.app.getDetails().version.replace(/\./g, ''), 10);
    } else {
        console.log("[Background.Update] `current_version` not implemented");
    }

    function bumpVersion(v) {
        if (v !== localStorage.version) {
            localStorage.version = v;
            Background.notify.migrated();
        }
        if (v !== chrome.app.getDetails().version) {

            Background.Update();
        }
    }
    if (version < 110) {
        Background.Migrate.v110();
        bumpVersion("1.1.0");
        return;
    }
    if (version === 1111) {
        Background.Migrate.v112();
        bumpVersion("1.1.2");
        return;
    }
    if (version < 120) {
        Background.Migrate.v112();
        bumpVersion("1.2.0");
        return;
    }
    if (window.chrome) {
        bumpVersion(chrome.app.getDetails().version);
    } else {
        console.log("[Background.Update] `bumpVersion` not implemented");
    }
};
Background.Migrate = {};
Background.Migrate.v110 = function () {
    localStorage.removeItem("messages");
    localStorage.removeItem("devices");
    localStorage.removeItem("contacts");
};
Background.Migrate.v112 = function () {
    TxtVia.WebDB.v112Fix();
};

Background.Process = {
    isError: false,
    completed: 0,
    lock: false,
    pollLock: false
};
Background.Process.Get = {};
Background.Process.Post = {};
Background.Process.Poll = {};
Background.Process.Post.messagesTries = 0;
Background.Process.Post.messages = function () {
    var pendingMessages = $.parseJSON(localStorage.pendingMessages),
        failedMessages = $.parseJSON(localStorage.failedMessages);

    if (pendingMessages.length > 0 && window.navigator.onLine && Background.authenticated()) {
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
                TxtVia.WebDB.insertInto.messages(data, function () {
                    chrome.extension.sendRequest({
                        message: data
                    }, function () {
                        console.log("[Background.Process.Post.messages] sent to display");
                    });
                });
                // Update UI with success noteice, and new message in conversation.
                pendingMessages.shift();
                localStorage.pendingMessages = JSON.stringify(pendingMessages);
                localStorage.pendingMessages = JSON.stringify(pendingMessages);
                // Double kill yeah!
            },
            error: function (e) {
                console.log(e);
                if (Background.Process.isError === false && (e.status === 422 && $.parseJSON(e.responseText).client)) {
                    Background.Process.Post.client(function () {
                        Background.Process.isError = false;
                    });
                    Background.Process.isError = true;
                } else {
                    Background.Process.Post.messagesTries = Background.Process.Post.messagesTries + 1;
                    if (Background.Process.isError === false) {
                        Background.notify.message.failed(pendingMessages[0]);
                        Background.Process.isError = true;
                    }
                    if (Background.Process.Post.messagesTries >= 5) {
                        Background.notify.message.skipped(pendingMessages[0]);
                        failedMessages.push(pendingMessages[0]);
                        localStorage.failedMessages = JSON.stringify(failedMessages);
                        pendingMessages.shift();
                        localStorage.pendingMessages = JSON.stringify(pendingMessages);
                        localStorage.pendingMessages = JSON.stringify(pendingMessages);
                        Background.Process.isError = false;
                    }
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
Background.Process.Post.client = function (callback) {
    var unique_id = TxtVia.GenerateUniqueID();
    if (Background.Process.lock === false && Background.authenticated()) {
        $.ajax({
            url: TxtVia.url + "/devices.json",
            type: "POST",
            data: "unique_id=" + unique_id + "&type=client&name=" + encodeURIComponent(TxtVia.appName) + "&auth_token=" + localStorage.authToken,
            beforeSent: function () {
                Background.Process.lock = true;
                localStorage.UNIQUE_ID = unique_id;
            },
            success: function (data) {
                localStorage.clientId = data.id;
                Background.notify.client.success(data);
                chrome.extension.sendRequest({
                    client: data
                }, function () {
                    console.log("[Background.Process.Post.messages] sent to display");
                });
            },
            error: function (e, s, t) {
                console.log("[Background.Process.Post.messages] error");
                if (e.status === 422) {
                    Background.Process.Get.device();
                } else {
                    console.log("[Background.Process.Post.client] failed : " + e.responseText);
                    Background.notify.client.failed(e.status);
                }
            },
            complete: function () {
                Background.Process.lock = false;
                if (callback) {
                    callback();
                }
            }
        });
    } else {
        Background.notify.client.failed(401);
    }
};

Background.Process.Get.googleToken = function (callback) {
    if (Background.Process.lock === false && Background.authenticated()) {
        $.ajax({
            url: TxtVia.url + "/contacts/token.json?auth_token=" + localStorage.authToken,
            type: "GET",
            beforeSend: function () {
                Background.Process.lock = true;
            },
            success: function (data) {
                localStorage.googleToken = data.get_token;
                callback(data.get_token);
            },
            error: function (e) {
                console.log("[Background.Process.Get.googleToken] failed : " + e.responseText);
            },
            complete: function () {
                Background.Process.lock = false;
            }
        });
    }
};
Background.Process.Get.contacts = function () {
    if (Background.authenticated()) {
        $.ajax({
            url: TxtVia.url + "/contacts.json?auth_token=" + localStorage.authToken,
            type: "GET",
            success: function (data) {
                if (data) {
                    $.each(data, function () {
                        var contact = {
                            name: this.label,
                            number: this.value,
                            photo_url: this.avatar
                        };
                        TxtVia.WebDB.insertInto.contacts(contact, null);
                    });
                }
                Background.Process.completed = Background.Process.completed + 1;
            },
            error: function (e) {
                console.log("[Background.Process.Get.contacts] failed : " + e.responseText);
            }
        });
    }
};
Background.Process.Get.messages = function () {
    if (Background.authenticated()) {
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
                console.log("[Background.Process.Get.messages] failed : " + e.responseText);
                if (e.status === 401) {
                    localStorage.authToken = "";
                }
            }
        });
    }
};
Background.Process.Poll.messages = function () {
    if (!Background.Process.pollLock && Background.authenticated() && $.parseJSON(localStorage.pollForMessages)) {
        Background.Process.pollLock = true;
        $.ajax({
            url: TxtVia.url + "/messages/poll.json?auth_token=" + localStorage.authToken,
            type: "GET",
            complete: function () {
                Background.Process.pollLock = false;
                setTimeout(function () {
                    Background.Process.Poll.messages();
                }, 30000);
            },
            error: function (e) {
                console.log("[Background.Process.Get.messages] failed : " + e.responseText);
            }
        });
    }
};
Background.Process.Get.device = function () {
    if (Background.authenticated()) {
        $.ajax({
            url: TxtVia.url + "/devices/" + localStorage.UNIQUE_ID + ".json?auth_token=" + localStorage.authToken + "&type=client",
            type: "GET",
            success: function (data) {
                console.log(data);
                if (data) {
                    localStorage.clientId = data.id;
                    Background.notify.client.restored(data);
                    chrome.extension.sendRequest({
                        device: data
                    }, function () {
                        console.log("[Background.Process.Get.device] sent to display");
                    });
                }
            },
            error: function (e) {
                console.log("[Background.Process.Get.device] failed : " + e.responseText);
            }
        });
    }
};
Background.Process.fullDownload = function (callback) {
    Background.Process.completed = 0;
    Background.Process.Get.contacts();
    Background.Process.Get.messages();
    Background.Process.onDevices(callback);
};
Background.Process.onDevices = function (callback) {
    if (Background.Process.completed >= 2) {
        TxtVia.WebDB.getDevices(function (t, r) {
            var silence = false;
            if (r.rows.length > 0) {
                console.log(r.rows.length);
                if (r.rows.length === 1 && r.rows.item(0).device_type === "client") {
                    silence = true;
                }
                if (!callback && !silence) {
                    Background.notify.syncComplete();
                }
                chrome.extension.sendRequest({
                    device: true
                }, function () {
                    console.log("[Background.Process.Get.device] sent to display");
                });
            }
        });
        Background.Process.completed = 0;
    } else {
        setTimeout(Background.Process.onDevices, 500);
    }
};

Background.notify = {};

Background.notify.icon = function () {
    TxtVia.WebDB.unReadMessageCount(function (t, r) {
        var count = r.rows.item(0).c;
        if (window.chrome) {
            chrome.browserAction.setBadgeText({
                text: count > 0 ? count.toString() : ""
            });
        } else {
            console.log("[Background.notify.icon] not implemented");
        }
    });

};
Background.notify.newMessage = function (message) {
    var name, notification;
    name = (message.name ? TxtVia.TextUtil.removeNumber(message.name) : message.recipient);
    notification = webkitNotifications.createNotification(chrome.extension.getURL('/images/newMessage.png'), "New message from " + name, message.body);
    notification.ondisplay = function () {
        var sound;
        if ($.parseJSON(localStorage.enableSounds)) {
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

    chrome.extension.sendRequest({
        message: message
    }, function () {
        console.log("[Background.notify.newMessage] message sent to PopUp");
    });
    Background.notify.icon();
};

Background.notify.client = {};
Background.notify.client.success = function (device) {
    var notification = webkitNotifications.createNotification(chrome.extension.getURL('/images/complete.png'), "Congradulations", "You have successfully setup " + device.name + " with TxtVia.");

    notification.ondisplay = function () {
        var sound;
        if ($.parseJSON(localStorage.enableSounds)) {
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
    var notification = webkitNotifications.createNotification(chrome.extension.getURL('/images/synced.png'), "Welcome Back", "You have successfully restored TxtVia for " + device.name);
    notification.ondisplay = function () {
        var sound;
        if ($.parseJSON(localStorage.enableSounds)) {
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
            TxtVia.Authenticate();
        };
        message = "Failed to successfully login to TxtVia. \n\rClick here re-authenticate.";
        break;
    case 500:
        message = "Oh my gosh, TxtVia is having a major hickup right now. ";
        break;
    default:
        action = function () {
            // Background.Process.Post.client();
            window.location.reload();
        };
        message = "Failed to successfully setup client with TxtVia.\n\r Click here to reload TxtVia.";
        break;
    }
    notification = webkitNotifications.createNotification(chrome.extension.getURL('/images/failed.png'), "Awe damn", message);
    notification.onclick = function () {
        action();
        notification.cancel();
    };
    console.log(notification);
    if (Background.failed === false) {
        Background.failed = true;
        notification.show();
    }
};
Background.notify.message = {};
Background.notify.message.sent = function (message) {
    var notification = webkitNotifications.createNotification(chrome.extension.getURL('/images/messageSent.png'), "Sent Message", "Your message is on it's way to " + message.recipient);
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
    var notification = webkitNotifications.createNotification(chrome.extension.getURL('/images/messageFailed.png'), "Awe damn", "Failed to successfully send a message. \nDon't worry, the message will be delivered soon.");
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
    var notification = webkitNotifications.createNotification(chrome.extension.getURL('/images/messageFailed.png'), "Awe damn", "A messsage has failed to be processed. \n\rThis message is being skipped.");
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
    var notification = webkitNotifications.createNotification(chrome.extension.getURL('/images/messageSyncComplete.png'), "Woohooo", "Your messages and contacts are now synced.");
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
Background.notify.migrated = function () {
    var notification = webkitNotifications.createNotification(chrome.extension.getURL('/images/complete.png'), "Great news", "TxtVia has been updated to version " + localStorage.version);
    notification.ondisplay = function () {
        setTimeout(function () {
            notification.cancel();
        }, 5000);
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
                console.log("[WebSocket] gave status code : " + status);
                if (status === 401) {
                    Background.notify.client.failed(status);
                }
            });
            TxtVia.server.connection.bind('connected', function () {
                console.log("[WebSocket] Connected");
            });
            TxtVia.channel.bind('message', function (data) {
                try {
                    if (data) {
                        TxtVia.WebDB.insertInto.messages(data);
                        TxtVia.WebDB.getMessages(data.recipient, function (t, r) {
                            try {
                                data.name = r.rows.item(0).name;
                            } catch (e) {
                                data.name = data.recipient;
                            }
                            Background.notify.newMessage(data);
                        });
                    }
                } catch (err) {
                    console.log("[WebSocket] Failed to parse message data.");
                    console.log(err);
                }
            });
            TxtVia.channel.bind('device', function (data) {
                try {
                    if (data) {
                        chrome.extension.sendRequest({
                            device: data
                        }, function () {
                            console.log("[Background.Process.Get.device] sent to display");
                        });
                        console.log(data);
                        TxtVia.WebDB.insertInto.devices(data);
                        Background.notify.client.success(data);
                    }
                } catch (err) {
                    console.log("[WebSocket] Failed to parse device data.");
                    console.log(err);
                }
            });
            break;
        case "BeaconPush":
            console.log("[Background.connection] Using BeaconPush");
            Beacon.connect(TxtVia.BeaconPush.webSocketID, ['txtvia'], {
                log: localStorage.env === "development" ? true : false,
                user: localStorage.authToken
            });
            // Beacon.connect(TxtVia.BeaconPush.webSocketID, ['txtvia']);
            Beacon.listen(function (data) {
                console.log(data);
                var message, device;
                try {
                    if (data.message) {
                        message = $.parseJSON(data.message);
                        console.log(message);
                        TxtVia.WebDB.insertInto.messages(message, function () {
                            console.log("insterted message");
                        });
                        TxtVia.WebDB.getMessages(message.recipient, function (t, r) {
                            message.name = r.rows.item(0).name;
                        });
                        Background.notify.newMessage(message);
                    } else if (data.device) {
                        device = $.parseJSON(data.device);
                        Background.notify.client.success(device);
                        TxtVia.WebDB.insertInto.devices(device);
                    }
                } catch (err) {
                    console.log("[WebSocket] Failed to parse Beacon Push data.");
                    console.log(err);
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
        setTimeout(Background.connection, 1000);
        return TxtVia.server;
    }
};


Background.init();
