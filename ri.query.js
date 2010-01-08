/* Copyright (c) 2009, International Joint Commission
 * 
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
 * ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
 * ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
 * OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

/** @fileoverview
 *
 * <p>RI Query is a Javascript library for querying the RI database using its
 * web api. It provides a single method, <code>ri.query</code>, that can be used for
 * querying the database.</p>
 *
 * <p>The easiest way to use this library is through the function
 * <code>ri.query(query, callback)</code>. This function takes 2 parameters, the
 * <code>query</code> and the <code>callback</code>. The <code>query</code> 
 * parameter can either be a single string or an object. If it is a string, then
 * the library will query all projects with that string in the Title. Otherwise,
 * if an object is passed, then its key: value pairs are used as the paramters 
 * to the query. Valid paramters in the query object, in this case, are (all 
 * dates are in the format yyyy-mm-dd) :</p>
 *
 *  <ul>
 *      <li><code>title</code>: String must be in the project's title</li>
 *      <li><code>pi</code>: String must match on of the investigator's names</li>
 *      <li><code>startDate</code>: Project must have been started on or after this date</li>
 *      <li><code>endDate</code>: Project must have ended on or before this date</li>
 *      <li><code>maxResults</code>: The maximum number of results to return (default 10)</li>
 *      <li><code>limitAbstract</code>: Number of characters to limit the abstract to</li>
 *      <li><code>page</code>: The page to return (each page has <code>maxResults</code> results)</li>
 *  </ul>
 *
 * <p>The query itself is performed asynchronously and so <code>ri.query</code> 
 * does not return anything. Instead, after the query is completed, the provided
 * callback function will be called with 1 parameter; the JSON object returned 
 * by the web service. Probably the most important part of the result object is 
 * the <code>projects</code> array (eg. </code>result.projects</code>). This 
 * is an array of objects, each representing a single project. Properties of
 * projects include <code>investigators, title, url, abstract, startDate, 
 * endDate,</code> etc.</p>
 *
 * The following code is an example of a possible call back function. Here we
 * assume there is some list element with the ID <code>result-list</code>. When
 * the callback function is called with the result, we clear what is currently
 * in the list, then put the new results in the list in their place.
 *
 * <pre>
 * function riQueryCallback(result) {
 *     var list = document.getElementById("result-list");
 *     while (list.firstChild)
 *         list.removeChild(list.firstChild);
 *
 *     if (results.projects.length == 0)
 *         list.appendChild(document.createElement("li"))   // returns li element
 *             .appendChild(document.createElement("em"))   // returns em element
 *             .appendChild(document.createTextNode("Query returned no results."));
 *                
 *     for (var i = 0; i < result.projects.length; i++) {
 *         var link = document.createElement("a");
 *         link.setAttribute("href", result.projects[0].url);
 *         link.appendChild(document.createTextNode(results.project[0].title));
 *         list.appendChild(document.createElement("li")).appendChild(link);
 *     }
 * }
 * </pre>
 * 
 *
 * @note RI Query (ri.query) uses JSONP, currently.
 *
 * @author Thomas Switzer <switzert@windsor.ijc.org>
 */
(function() {


var ri = window.ri = window.ri || {};
var document = window.document;


function Pager(query, pageSize) {
    this.query = typeof query == "string" ? {q: query} : query;
    this.ready = false;
    this.pageCount = 1;
    this.pageSize = pageSize > 0 ? pageSize : 10;
    this.pages = [];
    this.page = 1;
    this.subscribers = {};
    
    query.maxResults = this.pageSize;
    
    var this_ = this;
    this.run = function(query) {
        jsonp(ri.query.service.projects, query, function(result) {
            this_.pageCount = result.pageCount;
            this_.pageSize = result.pageSize;
            this_.page = result.page;
            this_.pages[this_.page] = result.projects;
            this_.ready = true;
            this_.notify("change");
        });
    };
    
    this.switchPage(1);
}
    
Pager.prototype = {
    getProjects: function() {
        if (!this.ready)
            return null;
        return this.pages[this.page];
    },
    switchPage: function(pg) {
        if (pg < 1 || pg > this.pageCount)
            throw new Error("Cannot switch to invalid page: " + pg);
        this.notify("switch", pg);
        
        if (this.pages[pg]) {
            this.page = pg;
            this.notify("change");
            
        } else {
            this.ready = false;
            this.query.page = pg;
            this.run(this.query);
        }
    },
    subscribe: function(event, obs) {
        if (this.subscribers[event] == undefined)
            this.subscribers[event] = [];
        this.subscribers[event].push(obs);
    },
    notify: function(event) {
        var subs = this.subscribers[event] || [];
        var args = subs.slice.call(arguments);
        args.shift();
        
        for (var i = 0; i < subs.length; i++)
            subs[i].apply(this, args);
    }
};


/**
 * Queries the Research Inventory with query string <code>query</code> and calls 
 * the function <code>callback</code> with the result. The result is a JSON
 * object.
 */
ri.query = function(query, callback) {
    if (typeof query == "string")
        query = {q: query};
    jsonp(ri.query.service.projects, query, callback);
}


ri.query.pager = function(query, pageSize) {
    return new Pager(query, pageSize);
}


/**
 * Uses the RI's webapi to return a list of lakes used.
 */
ri.query.lakes = function(callback) {
    jsonp(ri.query.service.lakes, null, callback);
}


/** The URL of the RI's JSONP web service */
var webServiceUrlBase = "http://ri.ijc.org/webapi/dev";
ri.query.service = {
    projects: webServiceUrlBase + "/projects.json.cfm",
    lakes: webServiceUrlBase + "/lakes.json.cfm"
};


/** An array of callbacks. Allows each JSONP callback to be unique. */
ri.query.callbacks = [];


/**
 * This will call the JSONP service <code>service</code> with parameters (GET) 
 * <code>params</code> and callback function <code>callback</code>. 
 * <code>callback<code> can be any function (including an anonymous function). 
 * The actual JSONP callback provided to the service is generated automatically
 * and will call the provided callback.
 *
 * @param service  The URL of the JSONP service
 * @param params   The parameters to use for the call
 * @param callback A function to callback with the result of the call
 */
function jsonp(service, params, callback) {
    params = params || {};
    // Generate new unique JSONP callback
    var cbIdx = ri.query.callbacks.length;
    ri.query.callbacks[cbIdx] = callback;
    params['callback'] = "ri.query.callbacks[" + cbIdx + "]";
    
    var url = urlWithParams(service, params);
    var e = document.createElement("script");
    e.setAttribute("src", url);
    e.setAttribute("type", "text/javascript");
    document.body.appendChild(e);
}


/**
 * Returns <code>url</code> with the parameters <code>params</code> added to it. For 
 * example, <code>urlWithParams("http://google.ca/search", {'q': 'Research Inventory'})</code>
 * would return "http://google.ca/search?q=Research%20Inventory". This works
 * regardless if there are existing GET parameter in the query URL or not.
 *
 * @param url The original url
 * @param params A JS object whose key, value pairs are the params names & values
 * @return <code>url</code> with params added as additional GET parameters
 * @type String
 */
function urlWithParams(url, params) {
    var parts = [];
    for (p in params)
        parts.push(p + "=" + escape(params[p]));
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + parts.join("&");
}

})();
