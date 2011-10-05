/*globals $, TxtVia, chrome,localStorage,console,alert,window,setTimeout,setInterval,clearTimeout */

/**
 * @depend storage.js
 **/
var PopUp = (function () {
    return {
        init: function () {
            TxtVia.init();
            PopUp.Check.firstLaunch(function () {
                PopUp.Check.authToken(function () {
                    PopUp.Check.client(function () {
                        PopUp.Check.devices();
                    });
                });
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
            $("select[name=device]").change(function(){
                var device_id = $(this).val();
                console.log('[Device Changed] to ' + device_id);
                $("input[name=device_id]").val(device_id);
            });

            try {
                chrome.extension.onRequest.addListener(function (request, sender, callback) {
                    if (request.message) {
                        if (PopUp.currentThread === TxtVia.TextUtil.mobileNumber(request.message.recipient)) {
                            PopUp.Process.threadConversation(request.message.recipient);
                        }
                        PopUp.Process.threads();
                    } else if(request.device){
                        PopUp.Check.devices();
                    } else {
                        console.log(request);
                    }
                });
            } catch (e) {
                console.error("[Background.init] onRequest listener failed");

            }

        },
        onReady: function () {
            console.log("[PopUp] Loaded...");
            $("body").addClass("loaded");
            if($.parseJSON(localStorage.currentThread)){
                console.log("Opening Thread " + $.parseJSON(localStorage.currentThread).recipient);
                PopUp.Process.thread($.parseJSON(localStorage.currentThread), PopUp.Actions.gotToThread);
            }
        },
        Check: {
            tries: 0,
            firstLaunch: function (callback) {
                if ($.parseJSON(localStorage.firstLaunch) === true) {
                    localStorage.firstLaunch = false;
                    console.log('[PopUp.Init] First Launch');
                    $("body").addClass("firstLaunch").removeClass("unlocked main steps");
                    try {
                        setTimeout(callback, 2000);
                    } catch (er1) {}
                    PopUp.onReady();
                } else {
                    console.log('[PopUp.Init] Normal Launch');
                    $("body").removeClass('firstLaunch');
                    try {
                        callback();
                    } catch (er2) {}
                }
            },
            authToken: function (callback) {
                if (localStorage.authToken === "") {
                    console.log('[PopUp.Init] No Auth Token');
                    $("body").removeClass('main unlocked').addClass('locked').addClass("steps");
                    PopUp.onReady();
                } else {
                    console.log('[PopUp.Init] Auth Token');
                    $("body").addClass("unlocked").removeClass("locked");
                    try {
                        callback();
                    } catch (err) {}
                }
            },
            client: function (callback) {
                if ($.parseJSON(localStorage.clientId) === 0) {
                    console.log('[PopUp.Init] Client not registered');
                    chrome.extension.sendRequest({
                        client: true
                    }, function () {
                        PopUp.Check.client();
                    });
                    $("body").removeClass('main');
                    $(".steps ol li:eq(0)").removeClass("done");
                    PopUp.onReady();
                } else {
                    console.log('[PopUp.Init] Client registered');
                    $(".steps ol li:eq(0)").addClass("done");
                    try {
                        callback();
                    } catch (err) {}
                }
            },
            devices: function () {
                if (PopUp.Check.tries < 5) {
                    TxtVia.WebDB.getDevices(function (t, r) {
                        var devices = [];
                        for(i=0;i<r.rows.length;i++){
                            if(r.rows.item(i).device_type != "client"){
                                devices.push(r.rows.item(i));
                            }
                        }
                        console.log(devices);
                        if (devices.length === 0) {
                            PopUp.Check.tries = PopUp.Check.tries + 1;
                            console.log('[PopUp.Init] No devices');
                            chrome.extension.sendRequest({
                                sync: true
                            }, function () {
                                PopUp.Check.devices();
                            });
                            $("body").removeClass('main').addClass("steps");

                        } else {
                            console.log('[PopUp.Init] ' + devices.length + ' devices registered');
                            PopUp.Process.view();
                            $("body").addClass("main").removeClass('steps');
                            $(".steps ol li:eq(0)").addClass("done");
                        }
                        PopUp.onReady();
                    });
                } else {
                    console.log("[PopUp.Check.devices] exceeded max tries.");
                }
            }
        },
        Process: {
            view: function () {
                console.log("Rendering View");
                PopUp.UI.deviceList();
                PopUp.Process.threads();
                PopUp.Process.contacts();
                $("form").removeClass("loading");
            },
            contacts: function () {
                TxtVia.WebDB.getContacts(function (data) {
                    $("input[type=search]").autocomplete({
                        source: data,
                        select: function (e, ui) {
                            var conversation = {
                                recipient: ui.item.value,
                                name: ui.item.label,
                                photo_url: ui.item.photo_url
                            };
                            e.preventDefault();
                            $("body").removeClass("threads").addClass("thread");
                            $("input[type=search]").val(ui.item.label).blur();
                            $("form#new_message textarea").focus();
                            $("form input[name=recipient]").val(ui.item.value);
                            PopUp.Process.thread(conversation, ui.item.value);
                        }
                    });
                });
            },
            threads: function () {
                console.log("Rendering Threads");
                $("#threads ul li:not(.new_message)").remove();
                TxtVia.WebDB.getConversations(function (message) {
                    var li, avatar, img, h3, p, count;

                    li = $("<li>", {
                        'class': 'clearfix'
                    });
                    avatar = message.photo_url ? message.photo_url + "?access_token=" + localStorage.googleToken : chrome.extension.getURL('/images/user_profile_image50.png');
                    //Contact.lookup(message.recipient).avatar ? Contact.lookup(message.recipient).avatar: '/images/user_profile_image50.png',
                    img = $("<img>", {
                        'class': 'avatar',
                        src: avatar
                    }).hide().data('photo_url', message.photo_url);
                    h3 = $("<h3>", {
                        html: (message.name ? TxtVia.TextUtil.removeNumber(message.name) : message.recipient)
                    });
                    p = $("<p>", {
                        text: message.body
                    });
                    img.error(function () {
                        var el = $(this);
                        PopUp.Actions.updateGoogleToken();
                        el.attr('src', chrome.extension.getURL('/images/user_profile_image50.png'));
                    }).bind('load', function () {
                        $(this).fadeIn();
                    });
                    TxtVia.WebDB.getMessagesCount(message.recipient, function (value) {
                        h3.append(" ");
                        h3.append($("<abbr>", {
                            text: "(" + value + ")",
                            title: value + " messages between you and " + TxtVia.TextUtil.removeNumber(message.name)
                        }));
                    });
                    li.append(img).append(h3).append(p);
                    li.bind("click", function () {
                        console.log("Opening Thread " + message.recipient);
                        localStorage.currentThread = JSON.stringify(message);
                        PopUp.Process.thread(message, PopUp.Actions.gotToThread);
                        // PopUp.Actions.gotToThread();
                    });
                    $("#threads ul").append(li);
                });
            },
            thread: function (conversation, callback) {
                console.log(conversation);
                PopUp.currentThread = conversation.recipient;
                var header = $("<h3>", {
                    text: conversation.name ? conversation.name : conversation.recipient
                }),
                    avatar = conversation.photo_url ? conversation.photo_url + "?access_token=" + localStorage.googleToken : chrome.extension.getURL('/images/user_profile_image30.png'),
                    img = $("<img>", {
                    'class': 'avatar',
                    src: avatar
                }).hide().data('photo_url', conversation.photo_url);
                try {
                    img.bind('load', function () {
                        $(this).fadeIn();
                    }).error(function () {
                        PopUp.Actions.updateGoogleToken();
                        $(this).attr('src', chrome.extension.getURL('/images/user_profile_image30.png'));
                    });
                } catch (err) {
                    console.log("[PopUp.Process.thread] can't load image");
                }
                $(".thread header hgroup").empty().append(img).append(header);
                $("form input[name=recipient]").val(conversation.recipient);
                $("select[name=device]").val(conversation.device_id);
                PopUp.Process.threadConversation(conversation.recipient);


                if (callback) {
                    callback();
                }
            },
            threadConversation: function (recipient) {
                $(".thread ol").empty();
                TxtVia.WebDB.getMessages(recipient, function (t, r) {
                    var i, li, message, time;
                    for (i = 0; i < r.rows.length; i = i + 1) {

                        message = r.rows.item(i);
                        li = $("<li>", {
                            'class': message.sent_at ? "sent" : "received",
                            html: message.body + "&nbsp;"
                        });
                        time = $("<time>", {
                            datetime: $.timeago(message.messaged_at),
                            html: $.timeago(message.messaged_at)
                        });
                        TxtVia.WebDB.messageRead(message.id);
                        li.append(time);
                        time.timeago();
                        $(".thread ol").append(li);
                    }
                    $(".thread .scroll").animate({
                        scrollTop: $(".thread .scroll .messages").height()
                    });
                    chrome.extension.sendRequest({
                        updateBadge: true
                    }, function () {
                        console.log("[Background.Process.threadConversation] comeplete");
                    });
                });
            }
        },
        RegisterEvents: {
            display: function () {
                var login = $("<a>", {
                    href: "#",
                    'class': 'login',
                    text: "Login",
                    click: function () {
                        PopUp.Actions.loginLink();
                    }
                }),
                    logout = $("<a>", {
                    href: "#",
                    'class': 'logout',
                    text: "Logout",
                    click: function () {
                        PopUp.Actions.logoutLink();
                    }
                }),
                    hr = $("<hr>"),
                    sync = $("<a>", {
                    href: "#",
                    'class': 'sync',
                    text: "Sync",
                    click: function () {
                        PopUp.Actions.syncLink();
                    }
                }),
                    donate = $("<a>", {
                    href: 'http://txtvia.com/donate_now',
                    'class': 'donate',
                    text: "Donate",
                    click: function () {
                        PopUp.Actions.donateLink();
                    }
                });
                $("header nav").empty().append(sync).append(donate).append(hr);
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
                    localStorage.draftMessage = $(this).val();
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
                    if ((e.ctrlKey || e.metaKey) && e.keyCode === 13) {
                        $("form#new_message").trigger('submit');
                    }
                });

                $("form#new_message").bind("submit", function (e) {
                    var self = $(this),
                        pendingMessages, li, body_p, header, article, time, item;
                    if ($("form#new_message textarea").val().length > 0) {

                        $("form#new_message").addClass("loading");
                        // $(":input[name=device_id]").val($(":input[name=device]").val());
                        // append message to pendingQueue
                        pendingMessages = $.parseJSON(localStorage.pendingMessages);
                        item = {
                            "data": $(this).serialize()
                        };
                        body_p = $("<p>", {
                            text: $(this).find(":input[name='body']").val()
                        });
                        header = $("<header>", {
                            text: $(this).find(":input[name='recipient']").val()
                        });
                        article = $("<article>").append(header).append(body_p);

                        $("#sent .messages").append(article);


                        li = $("<li>", {
                            'class': "sent sending",
                            html: self.find("textarea").val() + "&nbsp;"
                        });
                        time = $("<time>", {
                            html: "sending&hellip;"
                        });
                        li.append(time);
                        $(".thread ol").append(li);
                        $(".thread .scroll").animate({
                            scrollTop: $(".thread .scroll ol").height()
                        });
                        pendingMessages.push(item);
                        localStorage.currentThread = "";
                        localStorage.draftMessage = "";
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
                $.ajax({
                    url: TxtVia.url + '/sign_out.json',
                    beforeSend:function(){
                        localStorage.authToken = "";
                        localStorage.clientId = 0;
                        localStorage.googleToken = "";
                        localStorage.unReadMessages = 0;
                        TxtVia.WebDB.purgeDB(true);
                    },
                    failed:function(){
                        alert('Failed to properly logout, please try again.');
                    },
                    success:function(){
                        window.close();
                    }
                });
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
                chrome.extension.sendRequest({
                    sync: true
                }, function () {
                    PopUp.Process.view();
                    console.log("[Background.Process.fullDownload] comeplete");
                });
            },
            updateGoogleToken: function () {
                chrome.extension.sendRequest({
                    googleToken: true
                }, function (token) {
                    $("img.avatar").each(function () {
                        var url = $(this).data('photo_url');
                        if (url) {
                            $(this).fadeOut(function () {
                                $(this).attr('src', url + "?access_token=" + token);
                                $(this).bind('load', function () {
                                    $(this).fadeIn();
                                });
                            });
                        }
                    });
                });
            },
            donateLink: function () {
                chrome.tabs.create({
                    url: 'http://txtvia.com/donate_now'
                });
            },
            backToThreads: function () {
                $("body").removeClass("thread").addClass("threads");
                localStorage.currentThread = "";
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
                $(".thread .scroll").animate({
                    scrollTop: $(".thread .scroll").height()
                });
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
                TxtVia.WebDB.getDevices(function (t, r) {
                    var i, device;
                    for (i = 0; i < r.rows.length; i = i + 1) {
                        device = r.rows.item(i);
                        $("body").removeClass("firstLaunch steps").addClass("main");
                        if (device.device_type !== "client") {
                            $("select[name=device]").append($("<option>", {
                                text: device.name,
                                value: device.device_id
                            }));
                        }
                    }
                    $("input[name=device_id]").val(device.device_id);
                    $("select[name=device]").val(device.device_id);
                });
            }
        }
    };
}());
PopUp.init();
