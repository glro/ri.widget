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
        wait: baseUrl + "/wait.gif"
    }
};
var styleSheetId = "ri-query-style-sheet";

var opts = {
    bgColor: "#fff",
    fgColor: "#333",
    hlColor: "#55f"
};


ri.widget = function(container) {
    if (document.getElementById(styleSheetId) == null)
        document.body.appendChild(elem("link", {type: "text/css", href: url.style, rel: "stylesheet", id: styleSheetId}));

    if (typeof container.length != "number")
        return new ri.widget.SearchForm(addClass(container, "ri-widget"));
    
    var widgets = [];
    for (var i = 0; i < container.length; i++)
        widgets.push(new ri.widget.SearchForm(addClass(container[i], "ri-widget")));
    return widgets;
};


ri.widget.SearchForm = function(container) {
    this.fields = [
        createField("Keyword Search", url.img.search, elem("input", {type: "text", name: "query"})),
        createField("Lake or River", url.img.lake, elem("select", {name: "lake"}, elem("option", {value: "all"}, text("All Lakes & Rivers")))),
        createField("Investigator", url.img.investigator, elem("input", {type: "text", name: "investigator"}))
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
        if (box)
            container.removeChild(box);
        box = elem("div", {"class": "result-box"});
        container.appendChild(box);
        var rb = new ri.widget.ResultBox(box, new ri.query.pager(query));
        return false;
    };
    
    // Populate lakes list
    //ri.query.lakes(function(result) {
    //    for (var l = result.lakes, i = 0; i < l.length; i++)
    //        form.lake.appendChild(elem("option", {value: "" + l[i].id}, text(l[i].name)));
    //});
    
    // Add the event handlers
    
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
    
    this.select(0);
    
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
    }
};


function createField(label, img, control) {
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
    box.setAttribute("class", "ri-widget-results");
    
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
        for (var i = 0; i < projects.length; i++) {
            var p = projects[i];
            this.list.appendChild(elem("li", null, elem("a", {href: p.url, target: "_blank"}, text(p.title))));
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

})();
