var PopUp = (function () {
    return {
        init: function () {
            TxtVia.init();
            PopUp.Check.firstLaunch(function(){
                PopUp.Check.authToken(function(){
                    PopUp.Check.client(function(){
                        PopUp.Check.devices();
                    });
                });
            });
            
            $(window).load(function(){
                $("body").addClass("loaded");
            });
            
            PopUp.RegisterEvents.submitForm();
            PopUp.RegisterEvents.display();
            PopUp.RegisterEvents.validateForm();
            
            // PopUp.Process.view();

            $("form#security").submit(function (e) {
                e.preventDefault();
            });
            $("input[type=search]").focus(function () {
                $(this).val("");
            });
            $("input[type=password][name=pincode]").bind("keyup", function (e) {
                if (parseInt($(this).val(), 10) === 1234) {
                    $(this).val("");
                    PopUp.Actions.unlock();
                }
            });

        },
        Check: {
            tries: 0,
            firstLaunch:function(callback){
                if ($.parseJSON(localStorage.firstLaunch) === true) {
                    localStorage.firstLaunch = false;
                    console.log('[PopUp.Init] First Launch');
                    $("body").addClass("firstLaunch").removeClass("unlocked main steps");
                    setTimeout(callback,2000);
                } else {
                    callback();
                    console.log('[PopUp.Init] Normal Launch');
                    $("body").removeClass('firstLaunch');
                }
            },
            authToken: function(callback){
                if (localStorage.authToken === "") {
                    console.log('[PopUp.Init] No Auth Token');
                    $("body").removeClass('main unlocked').addClass('locked').addClass("steps");
                } else {
                    console.log('[PopUp.Init] Auth Token');
                    $("body").addClass("unlocked").removeClass("locked");
                    callback();
                }
            },
            client: function(callback){
                if ($.parseJSON(localStorage.clientId) !== 0) {
                    console.log('[PopUp.Init] Client not registered');
                    $("body").removeClass('main');
                    $(".steps ol li:eq(0)").removeClass("done");
                }else{
                    console.log('[PopUp.Init] Client registered');
                    $(".steps ol li:eq(0)").addClass("done");
                    callback();
                }
            },
            devices: function(){
                if(PopUp.Check.tries < 5){
                    TxtVia.WebDB.getDevices(function(t,r){
                        if(r.rows.length === 0){
                            console.log('[PopUp.Init] No devices');
                            chrome.extension.sendRequest({sync: true}, function(){
                                PopUp.Check.devices();
                            });
                            $("body").removeClass('main').addClass("steps");
                        }else{
                            console.log('[PopUp.Init] ' + r.rows.length + ' devices registered');
                            PopUp.Process.view();
                            $("body").addClass("main").removeClass('steps');
                            $(".steps ol li:eq(0)").addClass("done");
                        }
                    });
                }else{
                    console.log("[PopUp.Check.devices] exceeded max tries.");
                }
            }
        },
        Process: {
            view: function () {
                console.log("Rendering View");
                PopUp.UI.deviceList();
                PopUp.Process.threads();
                $("input[type=search]").autocomplete({
                    source: $.parseJSON(localStorage.contacts),
                    select: function (e, ui) {
                        e.preventDefault();
                        $("body").removeClass("threads").addClass("thread");
                        $("input[type=search]").val(ui.item.label).blur();
                        $("form#new_message textarea").focus();
                        $("form input[name=recipient]").val(ui.item.value);
                        PopUp.Process.thread(ui.item.value);
                    }
                });
                $("form").removeClass("loading");
                PopUp.UI.displayEnv();
            },
            threads: function () {
                console.log("Rendering Threads");
                $("#threads ul li:not(.new_message)").remove();
                TxtVia.WebDB.getConversations(function (message) {
                    var li = $("<li>", {
                        'class': 'clearfix'
                    }),
                        avatar = chrome.extension.getURL('/images/user_profile_image.png'),
                    //Contact.lookup(message.recipient).avatar ? Contact.lookup(message.recipient).avatar: '/images/user_profile_image50.png',
                    img = $("<img>", {
                        src: avatar
                    }),
                        h3 = $("<h3>", {
                        html: message.recipient
                    }),
                        p = $("<p>", {
                        text: message.body
                    });
                    li.append(img).append(h3).append(p);
                    li.bind("click", function () {
                        console.log("Opening Thread " + message.recipient);
                        PopUp.Process.thread(message, PopUp.Actions.gotToThread);
                        // PopUp.Actions.gotToThread();
                    });
                    $("#threads ul").append(li);
                });
            },
            thread: function (conversation, callback) {

                var header = $("<h3>", {
                    text: conversation.name + "(" + conversation.recipient + ")"
                }),
                    avatar = chrome.extension.getURL('/images/user_profile_image.png'),
                    img = $("<img>", {
                    src: avatar
                });

                $(".thread header hgroup").empty().append(img).append(header);
                $("form input[name=recipient]").val(conversation.recipient);
                $(".thread ol").empty();

                TxtVia.WebDB.getMessages(conversation.recipient, function (t, r) {
                    console.log(r);
                    var i;
                    for (i = 0; i < r.rows.length; i++) {
                        var message = r.rows.item(i),
                            li = $("<li>", {
                            'class': message.sent_at ? "sent" : "received",
                            html: message.body + "&nbsp;"
                        }),
                            time = $("<time>", {
                            datetime: $.timeago(message.message_at),
                            html: $.timeago(message.message_at)
                        });
                        li.append(time);
                        time.timeago();
                        $(".thread ol").append(li);
                    }
                });

                $(".thread .scroll").animate({
                    scrollTop: $(".thread .scroll").height()
                });
                callback();
            }
        },
        RegisterEvents: {
            display: function () {
                var login = $("<a>", {
                    href: "#",
                    text: "Login",
                    click: function () {
                        PopUp.Actions.loginLink();
                    }
                }),
                    logout = $("<a>", {
                    href: "#",
                    text: "Logout",
                    click: function () {
                        PopUp.Actions.logoutLink();
                    }
                }),
                    hr = $("<hr>"),
                    sync = $("<a>", {
                    href: "#",
                    text: "Sync",
                    click: function () {
                        PopUp.Actions.syncLink();
                    }
                });
                $("header nav").empty().append(sync).append(hr);
                if (localStorage.authToken !== "") {
                    $("header nav").append(logout);
                } else {
                    $("header nav").append(login);
                }

                $("a.showSettings").bind("click", function () {
                    $(".settings:not(:visible)").fadeIn();
                });
                $(".settings a").click(function () {
                    $(".settings:visible").fadeOut();
                });
                $(".settings").bind("mouseleave", function () {
                    if (window.settingTimeout) {
                        clearTimeout(window.settingTimeout);
                    }
                    window.settingTimeout = setTimeout(function () {
                        $(".settings:visible").fadeOut();
                    }, 3000);
                });

            },
            validateForm: function () {
                $("textarea").bind("keyup", function () {
                    if ($(this).val() === "") {
                        $("form#new_message").find("input[type=submit]").attr("disabled", "disabled");
                    } else {
                        $("form#new_message").find("input[type=submit]").removeAttr("disabled");

                    }
                });
            },
            submitForm: function () {
                $("form#new_message textarea").keydown(function (e) {
                    // alert(e.keyCode);
                    if ((e.ctrlKey || e.metaKey) && e.keyCode == 13) {
                        $("form#new_message").trigger('submit');
                    }
                });

                $("form#new_message").bind("submit", function (e) {
                    var self = $(this);
                    if ($("form#new_message textarea").val().length > 0) {
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
                    }
                    e.preventDefault();
                });
            }
        },
        Actions: {
            loginLink: function () {
                if (chrome.tabs) {
                    chrome.tabs.create({
                        url: TxtVia.url + '/sign_in?return_url=' + encodeURIComponent(chrome.extension.getURL("/popup.html"))
                    });
                } else {
                    window.open(TxtVia.url + '/sign_in?return_url=' + window.location.href);
                }
                window.close();
                // url:TxtVia.url + '/sign_in?app_identifier=' + TxtVia.appID + '&app_type=chrome'
            },
            logoutLink: function () {
                localStorage.authToken = "";
                localStorage.clientId = 0;
                chrome.tabs.create({
                    url: TxtVia.url + '/sign_out'
                });
                window.close();
            },
            download: function (app) {
                switch (app) {
                case 'android':
                    chrome.tabs.create({
                        url: TxtVia.url + '/downloads/android'
                    });
                    break;
                case 'iphone':
                    alert("Not available yet, please keep upto date on twitter @txtvia");
                    break;
                case 'blackberry':
                    alert("Not available yet, please keep upto date on twitter @txtvia");
                    break;
                }
            },
            syncLink: function () {
                chrome.extension.sendRequest({sync: true}, function(){
                    console.log("comeplete");
                });
            },
            backToThreads: function () {
                $("body").removeClass("thread").addClass("threads");
            },
            gotToThread: function (empty) {
                if (empty) {
                    $(".thread ol").empty();
                    var input = $("<input>", {
                        type: "tel",
                        required: true,
                        placeholder: "Mobile Phone Number"
                    });
                    input.bind('keyup', function () {
                        $("form input[name=recipient]").val(this.value);
                    });
                    $("form input[name=recipient]").val("");
                    $(".thread header hgroup").empty().html(input);
                }
                $("body").removeClass("threads").addClass("thread");
            },
            lock: function () {
                $("body").removeClass("unlocked").addClass("locked");
            },
            unlock: function () {
                $("body").removeClass("locked").addClass("unlocked");
            }
        },
        UI: {
            displayContact: function (contact) {
                var img = $("<img>", {
                    src: 'images/user_profile_image_30.png'
                }),
                    header = $("<h3>", {
                    text: contact.label
                });

                $(".thread header hgroup").empty().append(img).append(header);
            },
            alert: function () {
                alert("MESSAGE< MESSAGE< MESSAGE");
            },
            displayEnv: function () {
                if (TxtVia.env !== undefined) {
                    $(".threads footer").html("Running in " + TxtVia.env + " mode");
                }
            },
            flash: function (state, message) {
                function show() {
                    $(".flash").removeClass('red yellow green');
                    switch (state) {
                    case 'red':
                        $(".flash").addClass('red');
                        break;
                    case 'yellow':
                        $(".flash").addClass('yellow');
                        break;
                    case 'green':
                        $(".flash").addClass('green');
                        break;
                    }
                    $(".flash").html(message).slideDown().click(function () {
                        $(this).slideUp();
                    });

                }
                if ($(".flash").is(':visible')) {
                    $(".flash").slideUp(function () {
                        show();
                    });
                } else {
                    show();
                }
            },
            deviceList: function () {
                console.log("Rendering Device List");
                $("select[name=device]").empty();
                TxtVia.WebDB.getDevices(function(t,r){
                    var i, device;
                    for(i=0;i<r.rows.length;i++){
                        device = r.rows.item(i);
                        $("body").removeClass("firstLaunch steps").addClass("main");
                        if (device.device_type != "client") {
                            $("select[name=device]").append($("<option>", {
                                text: device.name,
                                value: device.id
                            }));
                        }
                    }
                });
            }
        }
    };
})();
PopUp.init();
