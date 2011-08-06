var TxtVia = (function(){
    return {
        init:function(){
            TxtVia.connection.establish();
            TxtVia.Storage.setup();
            TxtVia.appID = "jencinkdkgacfpadaoikfmakekjdhdmn";
            TxtVia.url = "http://localhost:8080";
            try{
                if(TxtVia.getParams("auth_token")){
                    localStorage["authToken"] = TxtVia.getParams("auth_token");
                }
            }catch(){}
        },
        getParams: function(name){
            var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
            return results[1] || 0;
        },
        Storage:{
            setup:function(){
                if (!localStorage["inbox"]) {
                  localStorage["inbox"] = JSON.stringify([]);
                  // window.addEventListener("storage", handle_storage, false);
                }
                if(!localStorage["authToken"]){
                    localStorage["authToken"] = "";
                }
                if(TxtVia.server){
                    if(TxtVia.server.connected){
                        window.addEventListener("storage", PopUp.UI.alert, false);
                    }
                }
            },
            inbox: $.parseJSON(localStorage["inbox"]),
            authToken: localStorage["authToken"]
        },
        connection:{
            establish:function(){
                TxtVia.server = new Pusher('c9351524b47769e60be7', 'txtvia');
                if(TxtVia.server){
                    console.log("connection established");
                }
                TxtVia.server.bind('rails_browser', function(data) {
                    try{
                        TxtVia.Storage.inbox.push(data);
                        console.log("Data Received");
                        console.log(data);
                        localStorage["inbox"] = JSON.stringify(TxtVia.Storage.inbox);
                    }catch(e){
                        console.error("something gone wrong with getting the data from WebSocket");
                    }
                });
            }
        }
    };
})();
TxtVia.init();