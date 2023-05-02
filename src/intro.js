/*!
 * <%= title %> v<%= version %>
 * Docs & License: <%= homepage %>
 * (c) <%= copyright %>
 */

(function(factory) {
	if (typeof define === 'function' && define.amd) {
		define([ 'jquery', 'moment' ], factory);
	}
	else if (typeof exports === 'object') { // Node/CommonJS
		module.exports = factory(require('jquery'), require('moment'));
	}
	else {
		// Check if a legacy jQuery version is specified in the project, if so, use the preferred legacy version
		var jQueryLegacy = window.jQueryLegacy || null;
		var jQueryInstance = (!jQueryLegacy ? jQuery : jQueryLegacy);
		factory(jQueryInstance, moment);
	}
})(function($, moment) {
