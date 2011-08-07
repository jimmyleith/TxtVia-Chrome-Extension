PopUp = (function(){
    return {
        init:function(){
            TxtVia.init();
            PopUp.RegisterEvents.submitForm();
        },
        RegisterEvents: {
            validateForm:function(){
                $("textarea").bind("keyup",function(){
                    if($(this).val() === ""){
                        $("form").find("input[type=submit]").attr("disabled","disabled");
                    }
                });
            },
            submitForm:function(){
                $("form").bind("submit",function(e){
                    // append message to pendingQueue
                    var pendingMessages = $.parseJSON(localStorage["pendingMessages"]),
                    item = {"data":$(this).serialize()},
                    body_p = $("<p>",{
                        text:$(this).find(":input[name='body']").val()
                    }),
                    header = $("<header>",{
                        text:$(this).find(":input[name='recipient']").val()
                    }),
                    article = $("<article>").append(header).append(body_p);
                    
                    $("#sent .messages").append(article);

                    pendingMessages.push(item);
                    localStorage["pendingMessages"] = JSON.stringify(pendingMessages);
                    $(this).find("textarea").val("");
                    TxtVia.Process.pendingMessages();
                    e.preventDefault();
                });
            }
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