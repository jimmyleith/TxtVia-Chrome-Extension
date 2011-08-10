var Contact = (function() {
    return {
        lookup: function(number) {
            switch (number) {
            case "+447575790552":
                return "Kyle Welsby";
            case "+447854376693":
                return "Chuck J Hardy";
            case "+447794752136":
                return "Kimberley Jassal";
            default:
                return "Unknown Contact (" + number + ")";
            }
        }, 
        data: [
            {
                value: "+447794752136",
                label: "Kimberley Jassal (+447794752136)"
            },
            {
                value: "+447854376693",
                label: "Chuck J Hardy"
            },
            {
                value: "+447575790552",
                label: "Kyle Welsby"
            }
        ]
    };
})();
