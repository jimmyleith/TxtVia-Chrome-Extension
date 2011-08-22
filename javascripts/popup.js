PopUp = (function() {
    return {
        init: function() {
            TxtVia.init();
            localStorage.unReadMessages = 0;
            TxtVia.Notification.messageCountClear();
            PopUp.RegisterEvents.submitForm();
            PopUp.RegisterEvents.display();
            PopUp.RegisterEvents.validateForm();
            
            PopUp.Process.view();
            if (TxtVia.Storage.devices.length > 0) {
                $("body").removeClass("firstLaunch").addClass("main").addClass("loaded");
                $(".steps ol li:eq(0)").addClass("done");
            } else {
                $("body").removeClass('main').addClass("firstLaunch");
                if(JSON.parse(localStorage.clientId) !== 0){
                    $("body").addClass("steps");
                    $(".steps ol li:eq(0)").addClass("done");
                }
                setTimeout(function() {
                    $("body").addClass("loaded");
                },
                500);
            }
            $("form#security").submit(function(e) {
                e.preventDefault();
            });
            $("input[type=password][name=pincode]").bind("keyup",
            function(e) {
                if (parseInt($(this).val(), 10) === 1234) {
                    $(this).val("");
                    PopUp.Actions.unlock();
                }
            });
            // window.addEventListener("storage",PopUp.Event.storage,false);
        },
        Event: {
            storage: function(e) {
                console.log("storage accessed:" + e.key);

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
        Process: {
            view: function() {
                PopUp.UI.deviceList();
                PopUp.Process.threads();
                if (Thread.list()[0]) {
                    PopUp.Process.thread(Thread.list()[0].recipient);
                }
                $("input[type=search]").autocomplete({
                    source: TxtVia.Storage.contacts,
                    select: function(e, ui) {
                        $("body").removeClass("threads").addClass("thread");
                        $("input[type=search]").val(ui.item.label);
                        $("form input[name=recipient]").val(ui.item.value);
                        PopUp.UI.displayContact(ui.item);
                        // $(".thread header hgroup h3").html(ui.item.label);
                        // $(".thread header hgroup img").attr('src', ui.item.avatar);
                    }
                });
                $("form").removeClass("loading");
                PopUp.UI.displayEnv();
            },
            threads: function() {
                $("#threads ul li:not(.new_message)").remove();
                $.each(Thread.list(),
                function(index) {
                    var li = $("<li>", {
                        'class': 'clearfix',
                        'id': 'threadID' + index
                    }),
                    img = $("<img>", {
                        src: Contact.lookup(this.recipient).avatar
                    }),
                    h3 = $("<h3>", {
                        html: Contact.lookup(this.recipient).label
                    }),
                    p = $("<p>", {
                        text: this.messages[this.messages.length - 1].message.body
                    }),
                    recipient = this.recipient;
                    li.append(img).append(h3).append(p);
                    li.bind("click",
                    function() {
                        // console.log("clicked");
                        PopUp.Process.thread(recipient);
                        PopUp.Actions.gotToThread();
                    });

                    $("#threads ul").append(li);

                });
            },
            thread: function(recipient) {
                var header = $("<h3>",{
                    text:Contact.lookup(recipient).label
                }),
                img = $("<img>", {
                    src: Contact.lookup(recipient).avatar
                });
                
                $(".thread header hgroup").empty().append(img).append(header);
                $("form input[name=recipient]").val(recipient);
                $(".thread ol").empty();
                $.each(Thread.messages(recipient),
                function() {

                    var li = $("<li>", {
                        'class': this.message.sent_at ? "sent": "received",
                        html: this.message.body + "&nbsp;"
                    }),
                    time = $("<time>", {
                        datetime: $.timeago(this.message.sent_at ? this.message.sent_at: this.message.received_at),
                        html: $.timeago(this.message.sent_at ? this.message.sent_at: this.message.received_at)
                    });
                    li.append(time);
                    time.timeago();
                    $(".thread ol").append(li);

                });
                $(".thread .scroll").animate({
                    scrollTop: $(".thread .scroll").height()
                });
            }

        },
        RegisterEvents: {
            display: function() {
                var login = $("<a>", {
                    href: "#",
                    text: "Login",
                    click:function(){
                        PopUp.Actions.loginLink();
                    }
                }),
                logout = $("<a>", {
                    href: "#",
                    text: "Logout",
                    click:function(){
                        PopUp.Actions.logoutLink();
                    }
                }),
                hr = $("<hr>"),
                sync = $("<a>",{
                    href: "#",
                    text:"Sync",
                    click:function(){
                        PopUp.Actions.syncLink();
                    }
                });
                $("header nav").empty().append(sync).append(hr);
                if (localStorage.authToken !== "") {
                    $("header nav").append(logout);
                    logout.bind("click",
                    function() {
                        PopUp.Actions.logoutLink();
                    });
                } else {
                    $("header nav").append(login);
                    login.bind("click",
                    function() {
                        PopUp.Actions.loginLink();
                    });
                }

                $("a.showSettings").bind("click",
                function() {
                    $(".settings:not(:visible)").fadeIn();
                });
                $(".settings a").click(function(){
                    $(".settings:visible").fadeOut();
                });
                $(".settings").bind("mouseleave",
                function() {
                    if (window.settingTimeout) {
                        clearTimeout(window.settingTimeout);
                    }
                    window.settingTimeout = setTimeout(function() {
                        $(".settings:visible").fadeOut();
                    },
                    3000);
                });

            },
            validateForm: function() {
                $("textarea").bind("keyup",
                function() {
                    if ($(this).val() === "") {
                        $("form#new_message").find("input[type=submit]").attr("disabled", "disabled");
                    } else {
                        $("form#new_message").find("input[type=submit]").removeAttr("disabled");

                    }
                });
            },
            submitForm: function() {
                $("form#new_message").bind("submit",
                function(e) {
                    var self = $(this);
                    $("form#new_message").addClass("loading");

                    // append message to pendingQueue
                    var pendingMessages = $.parseJSON(localStorage.pendingMessages),
                    item = {
                        "data": $(this).serialize()
                    },
                    body_p = $("<p>", {
                        text: $(this).find(":input[name='body']").val()
                    }),
                    header = $("<header>", {
                        text: $(this).find(":input[name='recipient']").val()
                    }),
                    article = $("<article>").append(header).append(body_p);

                    $("#sent .messages").append(article);


                    var li = $("<li>", {
                        'class': "sent sending",
                        html: self.find("textarea").val() + "&nbsp;"
                    }),
                    time = $("<time>", {
                        html: "sending&hellip;"
                    });
                    li.append(time);
                    $(".thread ol").append(li);

                    pendingMessages.push(item);
                    localStorage.pendingMessages = JSON.stringify(pendingMessages);
                    $(this).find("textarea").val("");
                    TxtVia.Process.pendingMessages();
                    e.preventDefault();
                });
            }
        },
        Actions: {
            loginLink: function() {
                if(chrome.tabs){
                    chrome.tabs.create({
                        url: TxtVia.url + '/sign_in?return_url=' + encodeURIComponent(chrome.extension.getURL("/popup.html"))
                    });
                }else{
                    window.open(TxtVia.url + '/sign_in?return_url=' + window.location.href);
                }
                window.close();
                // url:TxtVia.url + '/sign_in?app_identifier=' + TxtVia.appID + '&app_type=chrome'
            },
            logoutLink: function() {
                localStorage.authToken = "";
                localStorage.clientId = 0;
                chrome.tabs.create({
                    url: TxtVia.url + '/sign_out'
                });
                window.close();
            },
            syncLink: function(){
                TxtVia.Storage.download();
            },
            backToThreads: function() {
                $("body").removeClass("thread").addClass("threads");
            },
            gotToThread: function(empty) {
                if(empty){
                    $(".thread ol").empty();
                    var input = $("<input>",{
                       type:"tel",
                       required:true,
                       placeholder:"Mobile Phone Number"
                    });
                    $(".thread header hgroup").empty().html(input);
                }
                $("body").removeClass("threads").addClass("thread");
            },
            lock: function() {
                $("body").removeClass("unlocked").addClass("locked");
            },
            unlock: function() {
                $("body").removeClass("locked").addClass("unlocked");
            }
        },
        UI: {
            displayContact:function(contact){
                var img = $("<img>",{
                    src: contact.avatar
                }),
                header = $("<h3>",{
                    text: contact.label
                });
                
                $(".thread header hgroup").empty().append(img).append(header);
            },
            alert: function() {
                alert("MESSAGE< MESSAGE< MESSAGE");
            },
            displayEnv: function() {
                if (TxtVia.env !== "production" || TxtVia.env === undefined) {
                    $(".threads footer").html("Running in " + TxtVia.env + " mode");
                }
            },
            deviceList: function() {
                $("select[name=device]").empty();
                $.each(JSON.parse(localStorage.devices),
                function() {
                    $("body").removeClass("firstLaunch steps").addClass("main");
                    if(this.device.device_type != "client"){
                        $("select[name=device]").append($("<option>", {
                            text: this.device.name,
                            value: this.device.id
                        }));
                    }
                });
            }
        }
    };
})();
PopUp.init();