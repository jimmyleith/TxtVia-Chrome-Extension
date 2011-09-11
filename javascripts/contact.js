var Contact = (function() {
    return {
        lookup: function(number) {
            var rn = {
                label:"Unknown Number ("+number+")",
                value:number,
                avatar:null
            };
            
            $.each(TxtVia.Storage.contacts, function(){
                if(parseInt(this.value,10) === parseInt(number,10)){
                    rn = this;
                }
            });

            return rn;
        }
    };
})();
