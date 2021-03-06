"use strict";
var logger = console;
var INIT_ACTION = "@ngrx/store/init";
var repeat = function (str, times) { return (new Array(times + 1)).join(str); };
var pad = function (num, maxLength) { return repeat("0", maxLength - num.toString().length) + num; };
var formatTime = function (time) { return ("@ " + pad(time.getHours(), 2) + ":" + pad(time.getMinutes(), 2) + ":" + pad(time.getSeconds(), 2) + "." + pad(time.getMilliseconds(), 3)); };
var timer = typeof performance !== "undefined" && typeof performance.now === "function" ? performance : Date;
var getLogLevel = function (level, action, payload, type) {
    switch (typeof level) {
        case "object":
            return typeof level[type] === "function" ? level[type].apply(level, payload) : level[type];
        case "function":
            return level(action);
        default:
            return level;
    }
};
var printBuffer = function (options) { return function (logBuffer) {
    var actionTransformer = options.actionTransformer, collapsed = options.collapsed, colors = options.colors, timestamp = options.timestamp, duration = options.duration, level = options.level;
    logBuffer.forEach(function (logEntry, key) {
        var started = logEntry.started, startedTime = logEntry.startedTime, action = logEntry.action, error = logEntry.error;
        var prevState = logEntry.prevState.nextState ? logEntry.prevState.nextState : '(Empty)';
        var took = logEntry.took, nextState = logEntry.nextState;
        var nextEntry = logBuffer[key + 1];
        if (nextEntry) {
            nextState = nextEntry.prevState;
            took = nextEntry.started - started;
        }
        var formattedAction = actionTransformer(action);
        var isCollapsed = (typeof collapsed === "function") ? collapsed(function () { return nextState; }, action) : collapsed;
        var formattedTime = formatTime(startedTime);
        var titleCSS = colors.title ? "color: " + colors.title(formattedAction) + ";" : null;
        var title = "action " + (timestamp ? formattedTime : "") + " " + formattedAction.type + " " + (duration ? "(in " + took.toFixed(2) + " ms)" : "");
        try {
            if (isCollapsed) {
                if (colors.title)
                    logger.groupCollapsed("%c " + title, titleCSS);
                else
                    logger.groupCollapsed(title);
            }
            else {
                if (colors.title)
                    logger.group("%c " + title, titleCSS);
                else
                    logger.group(title);
            }
        }
        catch (e) {
            logger.log(title);
        }
        var prevStateLevel = getLogLevel(level, formattedAction, [prevState], "prevState");
        var actionLevel = getLogLevel(level, formattedAction, [formattedAction], "action");
        var errorLevel = getLogLevel(level, formattedAction, [error, prevState], "error");
        var nextStateLevel = getLogLevel(level, formattedAction, [nextState], "nextState");
        if (prevStateLevel) {
            if (colors.prevState)
                logger[prevStateLevel]("%c prev state", "color: " + colors.prevState(prevState) + "; font-weight: bold", prevState);
            else
                logger[prevStateLevel]("prev state", prevState);
        }
        if (actionLevel) {
            if (colors.action)
                logger[actionLevel]("%c action", "color: " + colors.action(formattedAction) + "; font-weight: bold", formattedAction);
            else
                logger[actionLevel]("action", formattedAction);
        }
        if (error && errorLevel) {
            if (colors.error)
                logger[errorLevel]("%c error", "color: " + colors.error(error, prevState) + "; font-weight: bold", error);
            else
                logger[errorLevel]("error", error);
        }
        if (nextStateLevel) {
            if (colors.nextState)
                logger[nextStateLevel]("%c next state", "color: " + colors.nextState(nextState) + "; font-weight: bold", nextState);
            else
                logger[nextStateLevel]("next state", nextState);
        }
        try {
            logger.groupEnd();
        }
        catch (e) {
            logger.log("\u2014\u2014 log end \u2014\u2014");
        }
    });
    logBuffer.length = 0;
}; };
exports.storeLogger = function (opts) {
    if (opts === void 0) { opts = {}; }
    return function (reducer) {
        var log = {};
        var ua = typeof window !== 'undefined' && window.navigator.userAgent ? window.navigator.userAgent : '';
        var ms_ie = false;
        //fix for action display in IE
        var old_ie = ua.indexOf('MSIE ');
        var new_ie = ua.indexOf('Trident/');
        if ((old_ie > -1) || (new_ie > -1)) {
            ms_ie = true;
        }
        var defaults = {
            level: "log",
            enableFilter: function () { return true; },
            collapsed: false,
            duration: true,
            timestamp: true,
            stateTransformer: function (state) { return state; },
            actionTransformer: function (actn) { return actn; },
            colors: ms_ie ? {} : {
                title: function () { return "#000000"; },
                prevState: function () { return "#9E9E9E"; },
                action: function () { return "#03A9F4"; },
                nextState: function () { return "#4CAF50"; },
                error: function () { return "#F20404"; },
            }
        };
        var options = Object.assign({}, defaults, opts);
        var stateTransformer = options.stateTransformer;
        var buffer = printBuffer(options);
        return function (state, action) {
            var preLog, enabled = options.enableFilter();
            if (enabled) {
                preLog = {
                    started: timer.now(),
                    startedTime: new Date(),
                    prevState: stateTransformer(log),
                    action: action
                };
            }
            var nextState = reducer(state, action);
            if (enabled) {
                var postLog = {
                    took: timer.now() - preLog.started,
                    nextState: stateTransformer(nextState)
                };
                log = Object.assign({}, preLog, postLog);
                //ignore init action fired by store and devtools
                if (action.type !== INIT_ACTION) {
                    buffer([log]);
                }
            }
            return nextState;
        };
    };
};
