PopUp = (function(){
    return {
        init:function(){
            TxtVia.init();
            PopUp.RegisterEvents.submitForm();
            PopUp.RegisterEvents.display();
            PopUp.RegisterEvents.validateForm();
            PopUp.Process.view();
            if(localStorage.authToken){
                $("body").removeClass("firstLaunch").addClass("main");
            }
            $("form#security").submit(function(e){
               e.preventDefault();
            });
            $("input[type=password][name=pincode]").bind("keyup", function(e){
                console.log($(this).val());
                if(parseInt($(this).val(),10) === 1234){
                    console.log("unlock");
                    $(this).val("");
                    PopUp.Actions.unlock();
                }
            });
            // window.addEventListener("storage",PopUp.Event.storage,false);
        },
        Event:{
          storage:function(e){
              console.log("storage accessed:"+ e.key);
              
/*
              switch(e.key){
                  case "devices":
                    PopUp.UI.deviceList();
                  break;
                  case "messages":
                    PopUp.Process.view();
                  break;
              }*/

          }  
        },
        Process:{
            view:function(){
                PopUp.UI.deviceList();
                PopUp.Process.threads();
                if(Thread.list()[0]){
                    PopUp.Process.thread(Thread.list()[0].recipient);
                }
                $("input[type=search]").autocomplete({
                    source: Contact.data,
                    select:function(e,ui){
                        $("form input[name=recipient]").val(ui.item.value);
                    }
                });
                $("form").removeClass("loading");
                PopUp.UI.displayEnv();
            },
            threads:function(){
                $("#threads ul li:not(.new_message)").remove();
                $.each(Thread.list(),function(index){
                   var li = $("<li>",{
                       'class':'clearfix',
                       'id':'threadID'+index
                   }),
                   img = $("<img>",{
                       src:'/images/user_profile_image50.png'
                   }),
                   h3 = $("<h3>",{
                       text: Contact.lookup(this.recipient)
                   }),
                   p = $("<p>",{
                       text: this.messages[this.messages.length-1].message.body
                   }), 
                   recipient = this.recipient;

                   li.append(img).append(h3).append(p);
                   li.bind("click",function(){
                       // console.log("clicked");
                       PopUp.Process.thread(recipient);
                       PopUp.Actions.gotToThread();
                   });
                   
                   $("#threads ul").append(li);

                });
            },
            thread:function(recipient){
                var header = $(".thread header hgroup h3").html(Contact.lookup(recipient)),
                img = $(".thread header img",{
                    src:"/images/user_profile_image30.png"
                });
                header.append(img);
                $("form input[name=recipient]").val(recipient);
                $(".thread ol").empty();
                console.log(recipient);
                $.each(Thread.messages(recipient),function(){
                    
                   var li = $("<li>",{
                       'class': this.message.sent_at ? "sent" : "received",
                       html: this.message.body + "&nbsp;"
                   }),
                   time = $("<time>",{
                       datetime: $.timeago(this.message.sent_at ? this.message.sent_at : this.message.received_at),
                       html: $.timeago(this.message.sent_at ? this.message.sent_at : this.message.received_at)
                   });
                   li.append(time);
                   time.timeago();
                   $(".thread ol").append(li);

                });
                $(".thread .scroll").animate({
                    scrollTop:$(".thread .scroll").height()
                });
            }
            
        },
        RegisterEvents: {
            display:function(){
                var login = $("<a>",{
                    href:"#",
                    text:"Login"
                }),
                logout = $("<a>",{
                    href:"#",
                    text:"Logout"
                });
                if(localStorage.authToken !== ""){
                    $("header nav").append(logout);
                    logout.bind("click",function(){
                        PopUp.Actions.logoutLink();   
                    });
                }else{
                    $("header nav").append(login);
                    login.bind("click",function(){
                        PopUp.Actions.loginLink();   
                    });
                }
                $("#showSettings").bind("click",function(){
                    $("#settings").fadeIn();
                });
                $("#showSettings").bind("mouseleave",function(){
                    if(window.settingTimeout){
                        clearTimeout(window.settingTimeout);
                    }
                    window.settingTimeout = setTimeout(function(){
                        $("#settings").fadeOut();
                    },3000);
                });
            },
            validateForm:function(){
                $("textarea").bind("keyup",function(){
                    if($(this).val() === ""){
                        $("form#new_message").find("input[type=submit]").attr("disabled","disabled");
                    }else{
                        $("form#new_message").find("input[type=submit]").removeAttr("disabled");
                        
                    }
                });
            },
            submitForm:function(){
                $("form#new_message").bind("submit",function(e){
                    $("form#new_message").addClass("loading");
                    
                    // append message to pendingQueue
                    var pendingMessages = $.parseJSON(localStorage.pendingMessages),
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
                    localStorage.pendingMessages = JSON.stringify(pendingMessages);
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
                    url:TxtVia.url + '/sign_in?return_url=' + encodeURIComponent(chrome.extension.getURL("/popup.html"))
                });
                 // url:TxtVia.url + '/sign_in?app_identifier=' + TxtVia.appID + '&app_type=chrome'
                
            },
            logoutLink:function(){
                window.close();
                localStorage.authToken = "";
                localStorage.clientId = 0;
                chrome.tabs.create({
                    url:TxtVia.url + '/sign_out'
                });
            },
            backToThreads:function(){
                $("body").removeClass("thread").addClass("threads");
                // $(".threads").animate({
                //    left:'0%',
                //    right:'0%' 
                // },500,'swing');
                // $(".thread").animate({
                //     left:'100%',
                //     right:'-100%'
                // },500,'swing');
            },
            gotToThread:function(){
                $("body").removeClass("threads").addClass("thread");
                // $(".threads").css({
                //     width:$(".threads").width()
                // }).animate({
                //    left:'-100%',
                //    right:'100%' 
                // },500,'swing');
                // $(".thread").css({
                //     width:$(".threads").width()
                // }).animate({
                //     left:'0%',
                //     right:'0%'
                // },500,'swing');
            },
            lock:function(){
                $("body").removeClass("unlocked").addClass("locked");
            },
            unlock:function(){
                $("body").removeClass("locked").addClass("unlocked");
            }
        },
        UI:{
            alert:function(){
                alert("MESSAGE< MESSAGE< MESSAGE");
            },
            displayEnv:function(){
                if(TxtVia.env !== "production" || TxtVia.env === undefined){
                    $(".threads footer").html("Running in " + TxtVia.env + " mode");
                }
            },
            deviceList:function(){
                $("select[name=device]").empty();
                $.each(JSON.parse(localStorage.devices),function(){
                    console.log(this);
                    $("select[name=device]").append($("<option>",{
                        text:this.device.name,
                        value:this.device.id
                    }));
                });
            }
        }
    };
})();
PopUp.init();