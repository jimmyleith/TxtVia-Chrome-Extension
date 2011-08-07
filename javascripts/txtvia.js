var TxtVia = (function(){
    return {
        init:function(){
            TxtVia.connection.establish();
            TxtVia.Storage.setup();
            TxtVia.appID = "jencinkdkgacfpadaoikfmakekjdhdmn";
            TxtVia.url = "http://localhost:8080"; // Development
            // TxtVia.url = "http://txtvia.com"; // Production
            
            // Start worker
            setInterval(TxtVia.Process.pendingMessages, 5000);
            try{
                if(TxtVia.getParams("auth_token")){
                    localStorage.authToken = TxtVia.getParams("auth_token");
                }
            }catch(e){}
        },
        getParams: function(name){
            var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
            return results[1] || 0;
        },
        Notification:{
            newMessage:function(message){
                webkitNotifications.createNotification(
                  '/images/icon48.png',
                  'New Message Received',
                  message.recipient + ' said:' + message.body
                ).show();
            },
            messageSent:function(message){                
                webkitNotifications.createNotification(
                    '/images/icon48.png',
                    "Message has been Sent",
                    "Your message has been sent to " + message.recipient
                ).show();
            }
        },
        Process: {
            pendingMessages:function(){
                // ajax post to server
                var pendingMessages = $.parseJSON(localStorage.pendingMessages);
                    if(pendingMessages.length > 0 && window.navigator.onLine){
                        console.log("preparing to send message");
                        $.ajax({
                            url: TxtVia.url + "/messages.json",
                            type: "POST",
                            dataType: "json",
                            crossDomain:true,
                            cache:false,
                            async:false,
                            data: pendingMessages[0].data + "&sent_at=" + encodeURIComponent(new Date()) + "&auth_token=" + TxtVia.Storage.authToken,
                            success: function(){
                                console.log("message sent");
                                pendingMessages.shift();
                                localStorage.pendingMessages = JSON.stringify(pendingMessages);
                                localStorage.pendingMessages = JSON.stringify(pendingMessages); // Double kill yeah!
                            },
                            failure:function(){
                                alert("Failed to send message, Will retry."); // turn to notification
                            },
                            completed:function(){  
                                setTimeout(TxtVia.Process.pendingMessages, 100);
                            }
                        });
                    }
            }
        },
        Storage:{
            setup:function(){
                if (!localStorage.messages) {
                  localStorage.messages = JSON.stringify([]);
                  // window.addEventListener("storage", handle_storage, false);
                }
                if(!localStorage.authToken){
                    localStorage.authToken = "";
                }
                if(!localStorage.pendingMessages){
                    localStorage.pendingMessages = JSON.stringify([]);
                }
                if(TxtVia.server){
                    if(TxtVia.server.connected){
                        window.addEventListener("storage", PopUp.UI.alert, false);
                    }
                }
            },
            inbox: $.parseJSON(localStorage.messages),
            authToken: localStorage.authToken
        },
        connection:{
            establish:function(){
                if(!TxtVia.server){
                    TxtVia.server = new Pusher('c9351524b47769e60be7', 'txtvia');
                    TxtVia.server.bind('messages', function(data) {
                        try{
                            TxtVia.Storage.inbox.push(data);
                            console.log("Data Received");
                            localStorage.messages = JSON.stringify(TxtVia.Storage.inbox);
                            if(data.message.sent_at){                                
                                TxtVia.Notification.messageSent(data.message);
                            }
                            if(data.message.received_at){
                                TxtVia.Notification.newMessage(data.message);
     
                            }
                            if(window.PopUp){
                                PopUp.Process.view();
                            }

                        }catch(e){
                            console.error("something gone wrong with getting the data from WebSocket");
                            console.error(e);
                        }
                    });
                    console.log("connection established");
                }
            }
        }
    };
})();
TxtVia.init();