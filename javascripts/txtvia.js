var TxtVia = (function(){
    return {
        init:function(){
            TxtVia.connection.establish();
            TxtVia.storage.setup();
            
        },
        storage:{
            setup:function(){
                if (!localStorage["inbox"]) {
                  localStorage["inbox"] = JSON.stringify([]);
                  // window.addEventListener("storage", handle_storage, false);
                }
                if(TxtVia.server){
                    if(TxtVia.server.connected){
                        window.addEventListener("storage", PopUp.UI.alert, false);
                    }
                }
            },
            inbox:$.parseJSON(localStorage["inbox"])
        },
        connection:{
            establish:function(){
                TxtVia.server = new Pusher('c9351524b47769e60be7', 'txtvia');
                if(TxtVia.server){
                    console.log("connection established");
                }
                TxtVia.server.bind('rails_browser', function(data) {
                    try{
                        TxtVia.storage.inbox.push(data);
                        console.log("Data Received");
                        console.log(data);
                        localStorage["inbox"] = JSON.stringify(TxtVia.storage.inbox);
                    }catch(e){
                        console.error("something gone wrong with getting the data from WebSocket");
                    }
                });
            }
        }
    };
})();
TxtVia.init();