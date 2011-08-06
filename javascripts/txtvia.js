var TxtVia = (function(){
    return {
        init:function(){
            TxtVia.connection.establish();
            TxtVia.Storage.setup();
            TxtVia.appID = "jencinkdkgacfpadaoikfmakekjdhdmn";
            TxtVia.url = "http://localhost:8080";
            
            // Start worker
            setInterval(TxtVia.Process.pendingMessages, 5000);
            try{
                if(TxtVia.getParams("auth_token")){
                    localStorage["authToken"] = TxtVia.getParams("auth_token");
                }
            }catch(e){}
        },
        getParams: function(name){
            var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
            return results[1] || 0;
        },
        Process: {
            pendingMessages:function(){
                // ajax post to server
                var pendingMessages = $.parseJSON(localStorage["pendingMessages"]);
                    if(pendingMessages.length > 0 && window.navigator.onLine){
                        console.log("preparing to send message");
                        $.ajax({
                            url: TxtVia.url + "/messages.json",
                            type: "POST",
                            dataType: "json",
                            crossDomain:true,
                            cache:false,
                            async:false,
                            data: pendingMessages[0]['data'] + "&auth_token=" + TxtVia.Storage.authToken,
                            success: function(){
                                console.log("message sent");
                                pendingMessages.shift();
                                localStorage["pendingMessages"] = JSON.stringify(pendingMessages);
                                localStorage["pendingMessages"] = JSON.stringify(pendingMessages); // Double kill yeah!
                            },
                            failure:function(){
                                alert("Failed to send message, Will retry."); // turn to notification
                            },
                            completed:function(){  

                                console.log(pendingMessages); 
                                setTimeout(TxtVia.Process.pendingMessages, 100);
                            }
                        });
                    }
            }
        },
        Storage:{
            setup:function(){
                if (!localStorage["messages"]) {
                  localStorage["messages"] = JSON.stringify([]);
                  // window.addEventListener("storage", handle_storage, false);
                }
                if(!localStorage["authToken"]){
                    localStorage["authToken"] = "";
                }
                if(!localStorage["pendingMessages"]){
                    localStorage["pendingMessages"] = JSON.stringify([]);
                }
                if(TxtVia.server){
                    if(TxtVia.server.connected){
                        window.addEventListener("storage", PopUp.UI.alert, false);
                    }
                }
            },
            inbox: $.parseJSON(localStorage["messages"]),
            authToken: localStorage["authToken"]
        },
        connection:{
            establish:function(){
                if(!TxtVia.server){
                    TxtVia.server = new Pusher('c9351524b47769e60be7', 'txtvia');
                }

                console.log("connection established");
                
                TxtVia.server.bind('messages', function(data) {
                    try{
                        TxtVia.Storage.inbox.push(data);
                        console.log("Data Received");
                        console.log(data);
                        localStorage["messages"] = JSON.stringify(TxtVia.Storage.inbox);
                    }catch(e){
                        console.error("something gone wrong with getting the data from WebSocket");
                        console.error(e);
                    }
                });
            }
        }
    };
})();
TxtVia.init();