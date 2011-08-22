var TxtVia = (function() {
    return {
        init: function() {

            TxtVia.Storage.setup();
            TxtVia.connection.establish();

            if (window.chrome) {
                try {
                    TxtVia.appID = chrome.i18n.getMessage("@@extension_id");
                } catch(eer) {

                    }
                TxtVia.appName = "Google Chrome";
            } else {
                TxtVia.appID = "0";
                TxtVia.appName = "Unknown Client";
            }

            // TxtVia.env = "development";
            switch (TxtVia.env) {
            case "development":
                TxtVia.url = "http://localhost:8080";
                TxtVia.webSocketID = "c9351524b47769e60be7";
                break;
            case "staging":
                TxtVia.url = "http://staging.txtvia.com";
                TxtVia.webSocketID = "02364a48c5da78fd5244";
                break;
            default:
                TxtVia.url = "http://txtvia.com";
                TxtVia.webSocketID = "c0f2d772bdcdd2e04aa3";
                break;
            }

            // Start worker
            setInterval(TxtVia.Process.pendingMessages, 5000);
            try {
                if (TxtVia.getParams("auth_token")) {
                    console.log("got new auth_token");
                    localStorage.authToken = TxtVia.getParams("auth_token");
                    TxtVia.Storage.download();
                }
            } catch(e) {}

            // Doesn't work on chrome :(
            window.addEventListener("storage", TxtVia.Event.storage, false);
            $.ajaxSetup({
                beforeSend:function(){
                    $("progress").fadeIn("fast").val(1);
                },
                error:function(e,txt){
                    if(e.status === 401){
                        localStorage.authToken = "";
                        localStorage.clientId = 0;
                        alert("You're not authenicated, please sign in.");
                        chrome.tabs.create({
                            url: TxtVia.url + '/sign_out'
                        });
                    }
                },
                complete:function(){
                    $("progress").val(4).delay(1000).fadeOut("fast");
                }
            });
        },
        getParams: function(name) {
            var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
            return results[1] || 0;
        },
        Event: {
            storage: function(e) {
                console.log("storage accessed:" + e.key);
                /*
                switch(e.key){
                    case "messages":
                        var message = localStorage.messages[localStorage.messages.length-1].message;
                        if(message.sent_at){                                
                            TxtVia.Notification.messageSent(message);
                        }
                        if(message.received_at){
                            TxtVia.Notification.newMessage(message);
                        }
                    break;
                    case "clientId":
                        TxtVia.Notification.clientRegistered();
                        TxtVia.connection.establish();
                    break;
                }*/

            }
        },
        Notification: {
            newMessage: function(message) {
                webkitNotifications.createNotification(
                '/images/icon48.png',
                'New Message Received',
                message.recipient + ' said:' + message.body
                ).show();
                localStorage.unReadMessages = parseInt(localStorage.unReadMessages, 10) + 1;

                if (window.chrome) {
                    (function() {
                        var value = parseInt(localStorage.unReadMessages,10);
                        if (value === 0) {
                            text = "";
                        }else{
                            text = value;
                        }
                        // wap
                        chrome.browserAction.setBadgeText({
                            text: text.toString()
                        });
                    })();
                }
            },
            messageCountClear: function(){
                if (window.chrome) {
                    (function() {
                        var value = parseInt(localStorage.unReadMessages,10);
                        if (value === 0) {
                            text = "";
                        }else{
                            text = value;
                        }
                        // wap
                        chrome.browserAction.setBadgeText({
                            text: text.toString()
                        });
                    })();
                }
            },
            messageSent: function(message) {
                webkitNotifications.createNotification(
                '/images/icon48.png',
                "Message has been Sent",
                "Your message has been sent to " + message.recipient
                ).show();
            },
            clientRegistered: function(device) {
                webkitNotifications.createNotification(
                '/images/icon48.png',
                "Client Registered",
                "Your client has been registered and you can now sent Messages."
                ).show();
            }
        },
        Process: {
            setupDevice: function() {
                if (localStorage.clientId === "0") {
                    $.ajax({
                        url: TxtVia.url + "/devices.json",
                        type: "POST",
                        dataType: "json",
                        crossDomain: true,
                        cache: false,
                        async: false,
                        data: "unique_id=" + TxtVia.appID + ":" + localStorage.authToken + "&type=client&name=" + encodeURIComponent(TxtVia.appName) + "&auth_token=" + localStorage.authToken,
                        success: function(data) {
                            localStorage.clientId = data.device.id;
                            TxtVia.Notification.clientRegistered();
                            TxtVia.connection.establish();
                            TxtVia.Storage.download();
                        },
                        failure: function() {
                            alert("Railed to register Client with TxtVia");
                        }
                    });
                }
            },
            pendingMessages: function() {
                // ajax post to server
                var pendingMessages = $.parseJSON(localStorage.pendingMessages);
                if (pendingMessages.length > 0 && window.navigator.onLine && localStorage.authToken) {
                    console.log("preparing to send message");
                    $.ajax({
                        url: TxtVia.url + "/messages.json",
                        type: "POST",
                        dataType: "json",
                        crossDomain: true,
                        cache: false,
                        async: false,
                        data: pendingMessages[0].data + "&sent_at=" + encodeURIComponent(new Date()) + "&client_id=" + localStorage.clientId + "&auth_token=" + localStorage.authToken,
                        success: function(data) {
                            console.log("message sent");
                            TxtVia.Storage.messages.push(data);
                            localStorage.messages = JSON.stringify(TxtVia.Storage.messages);
                            TxtVia.Notification.messageSent(data.message);
                            if (window.PopUp) {
                                PopUp.Process.view();
                            }
                            pendingMessages.shift();
                            localStorage.pendingMessages = JSON.stringify(pendingMessages);
                            localStorage.pendingMessages = JSON.stringify(pendingMessages);
                            // Double kill yeah!
                        },
                        failure: function() {
                            alert("Failed to send message, Will retry.");
                            // turn to notification
                        },
                        completed: function() {
                            setTimeout(TxtVia.Process.pendingMessages, 100);
                        }
                    });
                }
            }
        },
        Storage: {
            setup: function() {
                if (!localStorage.messages) {
                    localStorage.messages = JSON.stringify([]);
                    // window.addEventListener("storage", handle_storage, false);
                }
                if (!localStorage.devices) {
                    localStorage.devices = JSON.stringify([]);
                    // window.addEventListener("storage", handle_storage, false);
                }
                if (!localStorage.contacts) {
                    localStorage.contacts = JSON.stringify([]);
                    // window.addEventListener("storage", handle_storage, false);
                }
                if (!localStorage.unReadMessages) {
                    localStorage.unReadMessages = 0;
                }
                if (!localStorage.authToken) {
                    localStorage.authToken = "";
                }
                if (!localStorage.clientId) {
                    localStorage.clientId = 0;
                }
                if (!localStorage.pendingMessages) {
                    localStorage.pendingMessages = JSON.stringify([]);
                }
                if (TxtVia.server) {
                    if (TxtVia.server.connected) {
                        window.addEventListener("storage", PopUp.UI.alert, false);
                    }
                }
            },
            download: function() {
                $.ajax({
                   url: TxtVia.url + "/contacts.json?auth_token=" + localStorage.authToken,
                   type: "GET",
                   dataType: "json",
                   success: function(data){
                       console.log(data);
                       if (data){
                           localStorage.contacts = JSON.stringify(data);
                       }
                   }
                });
                $.ajax({
                    url: TxtVia.url + "/messages.json?auth_token=" + localStorage.authToken,
                    type: "GET",
                    dataType: "json",
                    success: function(data) {
                        // should we delete and download a fresh set of messages?
                        // in this case, yes!
                        console.log(data.devices);
                        console.log(data.messages);
                        if (data.devices) {
                            localStorage.devices = JSON.stringify(data.devices);
                            if (window.PopUp) {
                                PopUp.UI.deviceList();
                            }
                        }
                        if (data.messages) {
                            localStorage.messages = JSON.stringify(data.messages);
                            if (window.PopUp) {
                                PopUp.Process.view();
                            }
                        }
                    }
                });
            },
            contacts: $.parseJSON(localStorage.contacts),
            devices: $.parseJSON(localStorage.devices),
            messages: $.parseJSON(localStorage.messages),
            authToken: localStorage.authToken
        },
        connection: {
            establish: function() {
                if (!TxtVia.server && localStorage.authToken && TxtVia.webSocketID) {
                    Pusher.channel_auth_endpoint = TxtVia.url + "/users/auth/client/";
                    // TxtVia.server = new Pusher(TxtVia.webSocketID.toString(), 'txtvia_' + localStorage.authToken);
                    TxtVia.server = new Pusher(TxtVia.webSocketID.toString());
                    // TxtVia.channel = TxtVia.server.subscribe("private-txtvia");
                    TxtVia.channel = TxtVia.server.subscribe('txtvia_' + localStorage.authToken);
                    TxtVia.channel.bind('messages',
                    function(data) {
                        try {
                            data.message.read = false;
                            TxtVia.Storage.messages.push(data);
                            console.log("Message Data Received");
                            console.log(data);
                            localStorage.messages = JSON.stringify(TxtVia.Storage.messages);
                            if (data.message.sent_at) {
                                TxtVia.Notification.messageSent(data.message);
                            }
                            if (data.message.received_at) {
                                TxtVia.Notification.newMessage(data.message);
                            }
                            if (window.PopUp) {
                                PopUp.Process.view();
                            }

                        } catch(e) {
                            console.error("something gone wrong with getting the data from WebSocket");
                            console.error(e);
                        }
                    });

                    TxtVia.channel.bind('devices',
                    function(data) {
                        try {
                            TxtVia.Storage.devices.push(data);
                            console.log("Device Data Received");
                            console.log(data);
                            localStorage.devices = JSON.stringify(TxtVia.Storage.devices);
                            if(window.PopUp){
                                PopUp.UI.deviceList();
                            }
                        } catch(e) {
                            console.error("something gone wrong with getting the data from WebSocket");
                            console.error(e);
                        }
                    });

                    // Put device pusher here.
                    console.log("connection established");
                }
            }
        }
    };
})();
TxtVia.init();