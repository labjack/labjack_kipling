

/*
 * A wrapper around used jquery functions in the presenter_framework to aid in
 * testing the presenter_framework.
*/
function JQueryWrapper (origJQuery) {
    this.html = function (selector, newHTML) {
        return $(selector).html(newHTML);
    };
    this.bind = function(selector, eventName,listener) {
        $(selector).bind(eventName,listener);
    };
    this.unbind = function(selector, eventName) {
        $(selector).unbind(eventName);
    };
    this.on = function (selector, eventName, listener) {
        $(selector).on(eventName, listener);
        // $(selector).bind(event, listener);
        // $(selector).unbind(event, listener);
    };

    this.find = function (selector) {
        return $(selector);
    };

    this.val = function (selector, newValue) {
        return $(selector).val(newValue);
    };
    this.hide = function(selector) {
        return $(selector).hide();
    };
    this.show = function(selector) {
        // return $(selector).show();
    };
    this.fadeOut = function(selector, duration, callback) {
        return $(selector).fadeOut(duration,callback);
    };
    this.fadeIn = function(selector, duration, callback) {
        return $(selector).fadeIn(duration,callback);
    };
    this.checkFirstDeviceRadioButton = function() {
        return $('.device-selection-radio').first().prop('checked', true);
    };
    this.text = function(selector, text) {
        return $(selector).text(text);
    };
    this.get = function(selector) {
        return $(selector);
    };
    this.is = function(selector, element) {
        return $(selector).is(element);
    };
}