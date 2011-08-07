PopUp = (function(){
    return {
        init:function(){
            TxtVia.init();
            PopUp.RegisterEvents.submitForm();
            PopUp.RegisterEvents.display();
            PopUp.RegisterEvents.validateForm();
            PopUp.Process.view();
        },
        Process:{
            view:function(){
                PopUp.Process.threads();
                if(Thread.list()[0]){
                    PopUp.Process.thread(Thread.list()[0].recipient);
                }
                $("form").removeClass("loading");
            },
            threads:function(){
                $("#threads ul").empty();
                $.each(Thread.list(),function(index){
                   var li = $("<li>",{
                       'class':'clearfix',
                       'id':'threadID'+index
                   }),
                   img = $("<img>",{
                       src:'/images/user_profile_image50.png'
                   }),
                   h3 = $("<h3>",{
                       text: this.recipient
                   }),
                   p = $("<p>",{
                       text: this.messages[this.messages.length-1].message.body
                   }), 
                   recipient = this.recipient;
                                      
                   li.append(h3).append(p);
                   li.bind("click",function(){
                       // console.log("clicked");
                       PopUp.Process.thread(recipient);
                       PopUp.Actions.gotToThread();
                   });
                   
                   $("#threads ul").append(li);

                });
            },
            thread:function(recipient){
                var header = $(".thread header hgroup h3").text(recipient),
                img = $(".thread header img",{
                    src:"/images/user_profile_image30.png"
                });
                $("form input[name=recipient]").val(recipient);
                $(".thread ol").empty();
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
                $("#showSettings").bind("mouseenter",function(){
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
                        $("form").find("input[type=submit]").attr("disabled","disabled");
                    }else{
                        $("form").find("input[type=submit]").removeAttr("disabled");
                        
                    }
                });
            },
            submitForm:function(){
                $("form").bind("submit",function(e){
                    $("form").addClass("loading");
                    
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
                    url:TxtVia.url + '/sign_in' 
                });
                // url:TxtVia.url + '/sign_in?appID=' + TxtVia.appID + '&type=chrome'
                
            },
            logoutLink:function(){
                window.close();
                localStorage.authToken = "";
                chrome.tabs.create({
                    url:TxtVia.url + '/sign_out'
                });
            },
            backToThreads:function(){
                $(".threads").animate({
                   left:'0%',
                   right:'0%' 
                },500,'swing');
                $(".thread").animate({
                    left:'100%',
                    right:'-100%'
                },500,'swing');
            },
            gotToThread:function(){
                $(".threads").css({
                    width:$(".threads").width()
                }).animate({
                   left:'-100%',
                   right:'100%' 
                },500,'swing');
                $(".thread").css({
                    width:$(".threads").width()
                }).animate({
                    left:'0%',
                    right:'0%'
                },500,'swing');
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