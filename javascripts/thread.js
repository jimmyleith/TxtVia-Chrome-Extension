var Thread = (function () {
    return {
        list: function () {
            var all_messages = $.parseJSON(localStorage.messages),
                people = [];
            conversations = [];
            $.each(all_messages, function (i) {
                var message = this,
                    value = message.message.recipient.toString();
                if ($.inArray(value, people) == - 1) {
                    people.push(value);
                }

            });

            $.each(people, function () {
                conversation = {
                    "recipient": this.toString(),
                    "messages": Thread.messages(this.toString())
                };
                conversations.push(conversation);
            });
            return conversations;
        },
        messages: function (recipient) {
            var all_messages = $.parseJSON(localStorage.messages),
                messages = [];

            $.each(all_messages, function (i) {
                if (this.message.recipient === recipient) {
                    messages.push(this);
                }
            });
            return messages;
        }
    };
})();
