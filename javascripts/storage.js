/**
 * @depend txtvia.js
 **/
/*globals $, TxtVia, chrome, openDatabase,localStorage,console,alert,window,setTimeout,setInterval,clearTimeout */
TxtVia.WebDB = {};
TxtVia.WebDB.db = null;
TxtVia.WebDB.open = function () {
    var dbSize = 5 * 1024 * 1024;
    TxtVia.WebDB.db = openDatabase("TxtVia", "1.0", "Browser based SMS client", dbSize);
};
TxtVia.WebDB.onError = function (tx, e) {
    if (!e.CONSTRAINT_ERR) {
        console.error(e);
        alert("Awe damn, Something went wrong: " + e.message + "\n\rIt would probly be a good idea contact support. \n\rhttp://txtvia.com/support");
    }
};
TxtVia.WebDB.onSuccess = function (tx, r) {
    // :todo  
};
TxtVia.WebDB.createTables = function () {
    TxtVia.WebDB.db.transaction(function (tx) {
        // tx.executeSql('CREATE TABLE IF NOT EXISTS pending_messages (id INTEGER PRIMARY KEY ASC, ' +
        //                 'recipient TEXT, ' +
        //                 'body TEXT, ' +
        //                 'sent_at DATETIME)', [], function(){
        //                     console.log('[TxtVia.WebDB.createTables] pending_messages created');
        //                 }, TxtVia.WebDB.onError);
        tx.executeSql('CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY ASC, message_id INTEGER UNIQUE NOT NULL, device_id INTEGER NOT NULL, client_id INTEGER, recipient TEXT NOT NULL, body TEXT NOT NULL, read INTEGER DEFAULT 0, messaged_at DATEIME NOT NULL, sent_at DATETIME, received_at DATETIME, created_at DATETIME)', [], function (tx, r) {
            console.log('[TxtVia.WebDB.createTables] messages created');
        }, TxtVia.WebDB.onError);
        tx.executeSql('CREATE TABLE IF NOT EXISTS devices (id INTEGER PRIMARY KEY ASC, device_id INTEGER NOT NULL UNIQUE, name TEXT, device_type TEXT, unique_id TEXT UNIQUE NOT NULL, carrier TEXT)', [], function (tx, r) {
            console.log('[TxtVia.WebDB.createTables] devices created');
        }, TxtVia.WebDB.onError);
        tx.executeSql('CREATE TABLE IF NOT EXISTS contacts (name TEXT, number TEXT UNIQUE NOT NULL, photo_url TEXT)', [], function (tx, r) {
            console.log('[TxtVia.WebDB.createTables] contacts created');
        }, TxtVia.WebDB.onError);
    });
};
TxtVia.WebDB.purge = function (createTables) {
    localStorage.clear();
    TxtVia.WebDB.purgeDB(createTables);
};
TxtVia.WebDB.purgeDB = function (createTables) {
    TxtVia.WebDB.db.transaction(function (tx) {
        tx.executeSql('DROP TABLE devices', [], function () {
            console.log("[TxtVia.WebDB.purge] success");
        }, function (tx, e) {
            console.error("[TxtVia.WebDB.purge] Failed");
            console.error(e);
        });
        tx.executeSql('DROP TABLE messages', [], function () {
            console.log("[TxtVia.WebDB.purge] success");
        }, function (tx, e) {
            console.error("[TxtVia.WebDB.purge] Failed");
            console.error(e);
        });
        tx.executeSql('DROP TABLE contacts', [], function () {
            console.log("[TxtVia.WebDB.purge] success");
        }, function (tx, e) {
            console.error("[TxtVia.WebDB.purge] Failed");
            console.error(e);
        });
    });
    if (createTables) {
        TxtVia.WebDB.createTables();
    }
};
TxtVia.WebDB.insertInto = {};
TxtVia.WebDB.insertInto.messages = function (message, callback) {
    TxtVia.WebDB.db.transaction(function (tx) {
        console.log("[TxtVia.WebDB.insertInto.messages] accepted: ");
        console.log(message);
        tx.executeSql('INSERT INTO messages (recipient, body, message_id, device_id, client_id, messaged_at, sent_at, received_at, created_at) VALUES (?,?,?,?,?,?,?,?,?)', [TxtVia.TextUtil.mobileNumber(message.recipient), message.body, message.id, message.device_id, message.client_id, message.messaged_at, message.sent_at, message.received_at, message.created_at], callback, TxtVia.WebDB.onError);
    });
};
TxtVia.WebDB.insertInto.devices = function (device, callback) {
    TxtVia.WebDB.db.transaction(function (tx) {
        tx.executeSql('INSERT INTO devices(name, device_id, device_type, carrier, unique_id) VALUES (?,?,?,?,?)', [device.name, device.id, device.device_type, device.carrier, device.unique_id], callback, TxtVia.WebDB.onError);
    });
};
TxtVia.WebDB.insertInto.contacts = function (contact, callback) {
    TxtVia.WebDB.db.transaction(function (tx) {
        tx.executeSql('INSERT INTO contacts(name, number, photo_url) VALUES (?,?,?)', [contact.name, TxtVia.TextUtil.mobileNumber(contact.number), contact.photo_url], callback, TxtVia.WebDB.onError);
    });
};
TxtVia.WebDB.messageRead = function (id) {
    TxtVia.WebDB.db.transaction(function (tx) {
        tx.executeSql('UPDATE messages SET read = 1 WHERE id = ?', [id], null, TxtVia.WebDB.onError);
    });
};
TxtVia.WebDB.lastReceivedMessage = function (callback) {
    TxtVia.WebDB.db.transaction(function (tx) {
        tx.executeSql("SELECT * FROM messages m LEFT JOIN contacts c On c.number = m.recipient ORDER BY id DESC LIMIT 1", [], callback, TxtVia.WebDB.onError);
    });
};
TxtVia.WebDB.deletePendingMessage = function (id) {
    TxtVia.WebDB.db.transaction(function (tx) {
        tx.executeSql('DELETE FROM pending_messages WHERE id = ?', [id], null, TxtVia.WebDB.onError);
    });
};

TxtVia.WebDB.getConversations = function (callback) {
    TxtVia.WebDB.db.transaction(function (tx) {
        tx.executeSql('SELECT * FROM messages m LEFT JOIN contacts c ON c.number = m.recipient GROUP BY m.recipient ORDER BY m.created_at DESC', [], function (tx, rs) {
            var i;
            for (i = 0; i < rs.rows.length; i++) {
                callback(rs.rows.item(i));
            }
        }, TxtVia.WebDB.onError);
    });
};
TxtVia.WebDB.getContacts = function (callback) {
    TxtVia.WebDB.db.transaction(function (tx) {
        tx.executeSql('SELECT * FROM contacts ORDER BY name DESC', [], function (tx, rs) {
            var i, array = [],
                hash;
            for (i = 0; i < rs.rows.length; i++) {
                hash = {
                    label: rs.rows.item(i).name,
                    value: rs.rows.item(i).number,
                    photo_url: rs.rows.item(i).photo_url
                };
                array.push(hash);
            }
            callback(array);
        }, TxtVia.WebDB.onError);
    });
};
TxtVia.WebDB.getMessages = function (recipient, callback) {
    TxtVia.WebDB.db.transaction(function (tx) {
        tx.executeSql('SELECT * FROM `messages` m LEFT JOIN contacts c ON c.number = m.recipient WHERE m.`recipient` = ? ORDER BY `messaged_at` ASC', [recipient], callback, TxtVia.WebDB.onError);
    });
};
TxtVia.WebDB.getMessagesCount = function (recipient, callback) {
    TxtVia.WebDB.db.transaction(function (tx) {
        tx.executeSql('SELECT count(*) c FROM `messages` WHERE `recipient` = ?', [recipient], function (tr, rs) {
            callback(rs.rows.item(0).c);
        }, TxtVia.WebDB.onError);
    });
};
TxtVia.WebDB.getContact = function (number, callback) {
    TxtVia.WebDB.db.transaction(function (tx) {
        tx.executeSql('SELECT * FROM `contacts` WHERE number = ? LIMIT 1', [number], callback, TxtVia.WebDB.onError);
    });
};
TxtVia.WebDB.getDevices = function (callback) {
    TxtVia.WebDB.db.transaction(function (tx) {
        tx.executeSql('SELECT * FROM devices ORDER BY `name` ASC', [], callback, TxtVia.WebDB.onError);
    });
};
TxtVia.WebDB.unReadMessageCount = function (callback) {
    TxtVia.WebDB.db.transaction(function (tx) {
        tx.executeSql("SELECT COUNT(*) c FROM messages WHERE read = 0", [], callback, TxtVia.WebDB.onError);
    });
};
TxtVia.WebDB.v112Fix = function (callback) {
    TxtVia.WebDB.db.transaction(function (tx) {
        tx.executeSql("UPDATE messages SET messaged_at = created_at WHERE messaged_at = 'undefined'", [], callback, TxtVia.WebDB.onError);
    });
    TxtVia.WebDB.db.transaction(function (tx) {
        tx.executeSql("ALTER TABLE devices ADD device_id INTEGER", [], callback, TxtVia.WebDB.onError);
    });
};
TxtVia.Storage = function () {
    if (!localStorage.env) {
        localStorage.env = "production";
    }
    if (!localStorage.version) {
        localStorage.version = chrome.app.getDetails() ? chrome.app.getDetails().version : '1.2.0';
    }
    if (!localStorage.unReadMessages) {
        localStorage.unReadMessages = 0;
    }
    if (!localStorage.firstLaunch) {
        localStorage.firstLaunch = true;
    }
    if (!localStorage.authToken) {
        localStorage.authToken = "";
    }
    if (!localStorage.googleToken) {
        localStorage.googleToken = "";
    }
    if (!localStorage.clientId) {
        localStorage.clientId = 0;
    }
    if (!localStorage.currentThread) {
        localStorage.currentThread = "";
    }
    if (!localStorage.draftMessage) {
        localStorage.draftMessage = "";
    }
    if (!localStorage.pendingMessages) {
        localStorage.pendingMessages = JSON.stringify([]);
    }
    if (!localStorage.failedMessages) {
        localStorage.failedMessages = JSON.stringify([]);
    }
    if (!localStorage.autoHideNotifications) {
        localStorage.autoHideNotifications = true;
    }
    if (!localStorage.enableSounds) {
        localStorage.enableSounds = true;
    }
    if (!localStorage.newMessageSound) {
        localStorage.newMessageSound = 'newMessage.mp3';
    }
    if (!localStorage.locale) {
        localStorage.locale = JSON.stringify({
            country_code: 'GB',
            country_calling: '+44'
        });
    }
};
