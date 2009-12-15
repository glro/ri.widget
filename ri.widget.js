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
(function() {

var ri = window.ri = window.ri || {};
var document = window.document;

var baseUrl = ".";
var url = {
    style: baseUrl + "/style.css",
    img: {
        logo: baseUrl + "/ri-logo.png",
        search: baseUrl + "/search.png",
        lake: baseUrl + "/lakes.png",
        investigator: baseUrl + "/investigator.png",
        wait: baseUrl + "/wait.gif",
        close: baseUrl + "/close.png"
    }
};
var styleSheetId = "ri-query-style-sheet";


ri.widget = function(container, opts) {
    if (document.getElementById(styleSheetId) == null)
        document.body.appendChild(elem("link", {type: "text/css", href: url.style, rel: "stylesheet", id: styleSheetId}));

    if (typeof container.length != "number")
        return new ri.widget.SearchForm(addClass(container, "ri-widget"), opts);
    
    var widgets = [];
    for (var i = 0; i < container.length; i++)
        widgets.push(new ri.widget.SearchForm(addClass(container[i], "ri-widget"), opts));
    return widgets;
};


ri.widget.settings = {
    items: 5,
};


ri.widget.SearchForm = function(container, opts) {
    opts = opts || {};
    for (o in ri.widget.settings)
        opts[o] = opts[o] || ri.widget.settings[o];
    this.subscribers = {};
    
    this.fields = [
        field("Keyword Search", url.img.search, 
              starterClass(elem("input", {type: "text", name: "query"}), "kw-starter")),
        field("Lake or River", url.img.lake, elem("select", {name: "lake"}, 
              elem("option", {value: "all"}, text("All Lakes & Rivers")))),
        field("Investigator", url.img.investigator, 
              starterClass(elem("input", {type: "text", name: "investigator"}), "inv-starter"))
    ];
    
    this.searchForm = elem("form", {"class": "ri-query-form", method: "GET"}, 
        this.fields.concat([ elem("input", {type: "submit", name: "search", value: "Search"}) ])
    );

    // The result box
    var box = null;
    this.searchForm.onsubmit = function() {
        var query = { q: this.query.value };
        if (this.lake.value != "all")
            query.lake = this.lake.value;
        if (this.investigator.value != "")
            query.pi = this.investigator.value;
        if (box && box.parentNode)
            box.parentNode.removeChild(box);
        box = elem("div", {"class": "result-box"});
        container.appendChild(box);
        var rb = new ri.widget.ResultBox(box, new ri.query.pager(query, opts.items));
        return false;
    };
    
    // Add the event handlers to trigger selection
    
    var this_ = this;
    function selectorFor(i) {
        return function() { this_.select(i); return false };
    };
    
    for (var i = 0; i < this.fields.length; i++) {
        var a = this.fields[i].getElementsByTagName("a");
        var s = selectorFor(i);
        for (var j = 0; j < a.length; j++)
            a[j].onclick = s;
    }
    
    // Populate lakes list when Lakes tab selected
    
    var lakesPopulated = false;
    this.subscribe("selected", function(field) {
        var lakesField = this.fields[1];
        if (!lakesPopulated && lakesField == field) {
            ri.query.lakes(function(result) {
                var lakes = lakesField.getElementsByTagName("select")[0];
                for (var l = result.lakes, i = 0; i < l.length; i++)
                    lakes.appendChild(elem("option", {value: "" + l[i].id}, text(l[i].name)));
            });
            lakesPopulated = true;
        }
    });
    
    this.select(0);
    
    // Replace the contents of the container with the widget
    
    empty(container);
    container.appendChild(elem("div", {"class": "ri-widget-search"}, [
                                    elem("img", {src: url.img.logo, "class": "logo", alt: "Search the Research Inventory"}),
                                    this.searchForm
                               ]));
};


ri.widget.SearchForm.prototype = {
    select: function(field) {
        for (var i = 0; i < this.fields.length; i++)
            this.fields[i].setAttribute("class", "field" + (i == field ? " selected" : ""));
        this.notify("selected", this.fields[field]);
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


function field(label, img, control) {
    return elem("div", {"class": "field"}, [
        elem("a", {href: "#", title: label}, [
            elem("img", {src: img}), 
            elem("span", null, text(label))
        ]),
        elem("div", {"class": "control"}, control)
    ]);
}


ri.widget.ResultBox = function(box, pager) {
    this.pager = pager;
    
    empty(box);
    this.wait = box.appendChild(elem("div", {"class": "wait"}, elem("img", {src: url.img.wait})));
    this.list = box.appendChild(elem("ol", {"class": "list"}));
    this.pglist = box.appendChild(elem("ul", {"class": "pager"}));
    this.close = box.appendChild(elem("a", {href: "#", "class": "close-button"}, elem("img", {src: url.img.close, alt: "Close"})));
    box.setAttribute("class", "ri-widget-results");
    
    this.close.onclick = function(e) {
        box.parentNode.removeChild(box);
    };
    
    var this_ = this;
    pager.subscribe("switch", function(pg) {
        this_.wait.style.display = "block";
    });
    pager.subscribe("change", function() {
        this_.update();
        this_.wait.style.display = "none";
    });
    
    if (pager.ready)
        pager.switchPage(1);
};

ri.widget.ResultBox.prototype = {
    page: function(pg) {
        if (pg == undefined)
            return this.page;
    },
    update: function() {
        // Update list
        empty(this.list);
        this.list.setAttribute("start", "" + ((this.pager.page - 1) * this.pager.pageSize + 1));
        var projects = this.pager.getProjects();
        if (projects.length == 0) {
            // Display "Your search did not match any projects"
            this.list.appendChild(elem("li", {"class": class_}, [
                    elem("p", {"class": "no-projects"}, text("Your search did not match any projects."))
                ]));
        }
        for (var i = 0; i < projects.length; i++) {
            var p = projects[i];
            var class_ = "objective " + (i == 0 ? "first" : (i == projects.length - 1 ? "last" : ""));
            this.list.appendChild(elem("li", {"class": class_}, [
                    elem("a", {href: p.url, target: "_blank"}, text(p.title)),
                    elem("p", {"class": "objective"}, text(p.abstract))
                ]));
        }
        
        // Update page list
        empty(this.pglist);
        for (var i = 1; i <= this.pager.pageCount; i++) {
            (function(pg) {
                var pager = this.pager,
                    link = elem("a", {href: "#", "class": (pg == pager.page ? "selected page-num" : "page-num")}, text(pg));
                link.onclick = function() {
                    pager.switchPage(pg);
                    return false;
                };
                this.pglist.appendChild(elem("li", null, link));
            }).call(this, i);
        }
    }
};


// Returns true if obj is an Array, false otherwise
function isArray(obj) {
    return Object.prototype.toString.call(obj) == "[object Array]";
}


// Creates a new Element with attribute name => value pairs grabbed from the obj
// attrs and appends kids as the new element's children.
function elem(tag, attrs, kids) {
    attrs = attrs || {};
    kids = kids ? (isArray(kids) ? kids : [kids]) : [];
    var n = document.createElement(tag);
    for (var name in attrs)
        n.setAttribute(name, attrs[name]);
    for (var i = 0; i < kids.length; i++)
        n.appendChild(kids[i]);
    return n;
}


// Creates a TextNode with text txt
function text(txt) {
    return document.createTextNode("" + txt);
}


// Remove all children elements from Node n.
function empty(n, c) {
    while (c = n.firstChild) 
        n.removeChild(c);
}


// Add a class to an element n, if it does not already have it. Returns n.
function addClass(n, c) {
    var attr = n.attributes["class"],
        val = attr ? attr.nodeValue : "";
    var exists = new RegExp("(^|\s)" + c + "($|\s)");
    if (!exists.test(val))
        val += " " + c;
    n.setAttribute("class", val);
    return n;
}


// Remove a class from element n, if it has it. Returns n.
function removeClass(n, c) {
    var attr = n.attributes["class"],
        val = attr ? attr.nodeValue : "";
    var needle = new RegExp("(^|\s)" + c + "($|\s)");
    n.setAttribute("class", val.replace(needle, "", "g"));
    return n;
}

// Adds a "starter" class to text inputs. That is, whenever the field is empty,
// the class will be applied to the input. Then when it gains focus, the class
// is removed and only re-added if it is empty again on a blur.
function starterClass(txtIn, klass) {
    var nop = function() {},
        focusFunc = txtIn.onfocus || nop,
        blurFunc = txtIn.onblur || nop,
        showingStarter = false;
    
    function show() {
        showingStarter = true;
        addClass(txtIn, klass);
    }
    
    function hide() {
        showingStarter = false;
        removeClass(txtIn, klass);
    }
    
    txtIn.onfocus = function(e) {
        if (showingStarter)
            hide();
        return focusFunc.call(this, e);
    };
    
    txtIn.onblur = function(e) {
        if (txtIn.value == "")
            show();
        return blurFunc.call(this, e);
    };
    
    if (txtIn.value == "")
        show();
    return txtIn;
};

})();
