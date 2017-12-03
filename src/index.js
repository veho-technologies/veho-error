/* eslint func-names: "off" */
/* eslint no-param-reassign: "off" */

import forEach from 'lodash/forEach';

function inherits(Child, Parent) {
    // copy Parent static properties
    forEach(Parent, (val, key) => {
        Child[key] = Parent[key];
});

    // a middle member of prototype chain: takes the prototype from the Parent
    const Middle = function () {
        this.constructor = Child;
    };
    Middle.prototype = Parent.prototype;
    Child.prototype = new Middle();
    Child.__super__ = Parent.prototype;
    return Child;
}

// Makes an error subclass which properly contains a stack trace in most
// environments. constructor can set fields on `this` (and should probably set
// `message`, which is what gets displayed at the top of a stack trace).
//
function makeErrorType(name, constructor) {
    const errorClass = function (...args) {
        // Ensure we get a proper stack trace in most Javascript environments
        if (Error.captureStackTrace) {
            // V8 environments (Chrome and Node.js)
            Error.captureStackTrace(this, errorClass);
        } else {
            // Borrow the .stack property of a native Error object.
            this.stack = new Error().stack;
        }
        // Safari magically works.

        constructor.call(this, ...args);

        this.errorType = name;
    };

    inherits(errorClass, Error);

    return errorClass;
}

// This should probably be in the livedata package, but we don't want
// to require you to use the livedata package to get it. Eventually we
// should probably rename it to DDP.Error and put it back in the
// 'livedata' package (which we should rename to 'ddp' also.)
//
// Note: The DDP server assumes that Meteor.Error EJSON-serializes as an object
// containing 'error' and optionally 'reason' and 'details'.
// The DDP client manually puts these into Meteor.Error objects. (We don't use
// EJSON.addType here because the type is determined by location in the
// protocol, not text on the wire.)

/**
 * @summary This class represents a symbolic error thrown by a method.
 * @locus Anywhere
 * @class
 * @param {String} error A string code uniquely identifying this kind of error.
 * This string should be used by callers of the method to determine the
 * appropriate action to take, instead of attempting to parse the reason
 * or details fields. For example:
 *
 * ```
 * // on the server, pick a code unique to this error
 * // the reason field should be a useful debug message
 * throw new Meteor.Error("logged-out",
 *   "The user must be logged in to post a comment.");
 *
 * // on the client
 * Meteor.call("methodName", function (error) {
 *   // identify the error
 *   if (error && error.error === "logged-out") {
 *     // show a nice error message
 *     Session.set("errorMessage", "Please log in to post a comment.");
 *   }
 * });
 * ```
 *
 * For legacy reasons, some built-in Meteor functions such as `check` throw
 * errors with a number in this field.
 *
 * @param {String} [reason] Optional.  A short human-readable summary of the
 * error, like 'Not Found'.
 * @param {String} [details] Optional.  Additional information about the error,
 * like a textual stack trace.
 */
export const VehoError = makeErrorType(
    'Error',
    function (error, reason, details) {
        const self = this;

        // String code uniquely identifying this kind of error.
        self.error = error;

        // Optional: A short human-readable summary of the error. Not
        // intended to be shown to end users, just developers. ("Not Found",
        // "Internal Server Error")
        self.reason = reason;

        // Optional: Additional information about the error, say for
        // debugging. It might be a (textual) stack trace if the server is
        // willing to provide one. The corresponding thing in HTTP would be
        // the body of a 404 or 500 response. (The difference is that we
        // never expect this to be shown to end users, only developers, so
        // it doesn't need to be pretty.)
        self.details = details;

        // This is what gets displayed at the top of a stack trace. Current
        // format is "[404]" (if no reason is set) or "File not found [404]"
        if (self.reason) {
            self.message = `${self.reason} [${self.error}]`;
        } else {
            self.message = `[${self.error}]`;
        }
    },
);
