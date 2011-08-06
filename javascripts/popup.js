PopUp = (function(){
    return {
        init:function(){
            TxtVia.init();
        },
        Actions: {
            loginLink:function(){
                window.close();
                chrome.tabs.create({
                    url:TxtVia.url + '/sign_in' 
                });
                // url:TxtVia.url + '/sign_in?appID=' + TxtVia.appID + '&type=chrome'
                
            },
            logoutLink:function(){
                window.close();
                chrome.tabs.create({
                    url:TxtVia.url + '/sign_out'
                });
            }
        },
        UI:{
            alert:function(){
                alert("MESSAGE< MESSAGE< MESSAGE");
            }
        }
    };
})();
PopUp.init();