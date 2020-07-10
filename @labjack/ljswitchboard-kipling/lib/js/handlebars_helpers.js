
var handlebars = global.require('handlebars');

try {
    handlebars.registerHelper('eachDict', function(context, options) {
        var ret = "";
        var data = {};
        context.forEach(function(value,name){
            if(value) {
                data.key = name;
                data.info = value;
            }
            ret = ret + options.fn(value, {data: data});
        });
        return ret;
    });
    handlebars.registerHelper('printContext', function() {
        return new handlebars.SafeString(JSON.stringify({'context': this}, null, 2));
    });
} catch(err) {
    console.error('Error Registering handlebars helpers', err);
}