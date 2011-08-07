var Thread = (function(){
    return {
        list: function(recipient){
            var all_messages = $.parseJSON(localStorage["messages"]),
            messages = [];
            
            $.each(all_messages,function(i){
                if(this.message.recipient === recipient){
                    messages.push(this);
                }
            });
            return messages;
        }
    };
})();