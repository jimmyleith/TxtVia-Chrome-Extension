PopUp = (function(){
    return {
        init:function(){
            TxtVia.init();
        },
        Actions: {
            loginLink:function(){
                window.close();
                chrome.tabs.create({
                    url:TxtVia.url + '/sign_in?appID=' + TxtVia.appID + '&type=chrome'
                });
            },
            logoutLink:function(){
                window.close();
                chrome.tabs.create({
                    url:TxtVia.url + '/sign_out?appID=' + TxtVia.appID + '&type=chrome'
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