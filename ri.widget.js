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
if (typeof ri.widget != "undefined")
    return;


// Holds all of stylesheets that have already been added to the page
var usedStylesheets = {};


/*
 * Creates a new RI widget in container. The argument container can be either
 * a single DOM Element or an array (or NodeList) of DOM Elements. The contents
 * of the container(s) will be replaced with RI widgets. The argument opts is
 * an optional object that specifies various options. The options available 
 * are:
 *
 *  "items" : Number of projects to display, per page, in the results
 *
 *  "images" : An object whose properties are the names of images. This is used
 *             to override images used by the widget. If only some of the
 *             required images are provided, the unprovided ones will default
 *             to the originals.
 *
 *  "stylesheets" : An array of stylesheets to include. Each "stylesheet" is an
 *                  object with, at least, the required properties "href" (
 *                  (specifying the URL/location of the stylesheet) and can also
 *                  contain the optional properties "type" and "media". This
 *                  array represents all stylesheets used. If you only wish to
 *                  override some parts of the default stylesheet, then you
 *                  must explictly list the default stylesheet in the array.
 *
 * As an example, let's say you wish to customize the widget by providing your
 * own colour scheme, but you wish to keep the rest of the styling as is. 
 * Additionally, you do not like the close button and wish to replace it. 
 * Lastly, you would prefer it if 8 items were shown instead of 5. You would 
 * use something like the following:
 *
 *     ri.widget(document.getElementById("ri-widget"), {
 *         items: 8,
 *         stylesheets: ri.widget.settings.stylesheets.concat([{
 *             href: "/css/ri-widget-theme.css"
 *          }]),
 *          images: {
 *              close: {
 *                  url: "/images/my-close.png", 
 *                  w: 30, h: 30, trans: true,
 *                  alt: "Close this window"
 *              }
 *          }
 *     });
 */
ri.widget = function(container, opts) {
    opts = extend({}, ri.widget.settings, opts || {});

    // Add the stylesheets
    
    for (var i = 0; i < opts.stylesheets.length; i++) {
        var sheet = opts.stylesheets[i];
        if (!(sheet.href in usedStylesheets)) {
            usedStylesheets[sheet.href] = sheet;
            n = elem("link", {
                    href: sheet.href,
                    type: "type" in sheet ? sheet.type : "text/css",
                    media: "media" in sheet ? sheet.media : "all",
                    rel: "stylesheet"
                });
            container.appendChild(n);
        }
    }

    if (typeof container.length != "number")
        return new ri.widget.SearchForm(addClass(container, "ri-widget"), opts);
    
    var widgets = [];
    for (var i = 0; i < container.length; i++)
        widgets.push(new ri.widget.SearchForm(addClass(container[i], "ri-widget"), opts));
    return widgets;
};


// The base URL to use for resources with relative paths
var baseUrl = ".";


/*
 * Default settings used by the RI widget.
 */
ri.widget.settings = {
    items: 5,
    stylesheets: [
        { href: baseUrl + "/style.css" }
    ],
    images: {
        logo: {
            url: baseUrl + "/ri-logo.png",
            w: 107, h: 60,
            alt: "Search the Research Inventory"
        },
        search: {
            url: baseUrl + "/search.png", 
            w: 30, h: 30,
            alt: "Filter projects by keyword",
            trans: true
        },
        lake: {
            url: baseUrl + "/lakes.png", 
            w: 49, h: 30,
            alt: "Filter projects by watershed",
            trans: true
        },
        investigator: {
            url: baseUrl + "/investigator.png", 
            w: 30, h: 30,
            alt: "Filter projects by investigators",
            trans: true
        },
        wait: {
            url: baseUrl + "/wait.gif",
            w: 48, h: 48,
            alt: "Loading search results"
        },
        close: {
            url: baseUrl + "/close.png",
            w: 30, h: 30,
            alt: "Close search results",
            trans: true
        },
        spacer: {
            url: baseUrl + "/spacer.gif"
        }
    }
};


/*
 * The SearchForm class handles the display of a search form. The constructor
 * requires a container to create the search form in, as well as some optional
 * settings. The opts parameter is an object with the following optional 
 * properties:
 *  "items": The number of items, per page, to display.
 * The container contents will be emptied during construction and replaced with
 * the SearchForm.
 *
 * The SearchForm only shows one field at a time by default. Other JavaScript
 * code that is interested in knowing when a field is selected can subscribe
 * to the SearchForm's "select" event.
 */
ri.widget.SearchForm = function(container, opts) {
    opts = extend({}, ri.widget.settings, opts || {});
    this.images = extend({}, ri.widget.settings.images, opts.images || {});
    this.subscribers = {};
    
    // Create the fields used to filter the results
    
    this.fields = [
        field("Keyword Search", this.images.search, 
              starterClass(elem("input", {type: "text", name: "query"}), "kw-starter")),
        field("Lake or River", this.images.lake, elem("select", {name: "lake"}, 
              elem("option", {value: "all"}, text("All Lakes & Rivers")))),
        field("Investigator", this.images.investigator, 
              starterClass(elem("input", {type: "text", name: "investigator"}), "inv-starter"))
    ];
    
    // The actual form we can hook into
    
    this.searchForm = elem("form", {"class": "ri-query-form", method: "GET"}, 
        this.fields.concat([ elem("input", {type: "submit", name: "search", value: "Search"}) ])
    );

    // The result box
    
    var box = null;
    this.searchForm.onsubmit = function(e) {
        var query = { q: this.query.value };
        if (this.lake.value != "all")
            query.lake = this.lake.value;
        if (this.investigator.value != "")
            query.pi = this.investigator.value;
        if (box && box.parentNode)
            box.parentNode.removeChild(box);
        box = elem("div", {"class": "result-box"});
        container.appendChild(box);
        var rb = new ri.widget.ResultBox(box, new ri.query.pager(query, opts.items), opts);
        return false;
    };
    
    // Add the event handlers to trigger selection of a specific field (fields
    // are hidden unless selected to save screen real estate).
    
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
    
    // Populate lakes list when Lakes tab selected.
    
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
    
    // Select the first field (the keyword search)
    
    this.select(0);
    
    // Replace the contents of the container with the widget
    
    empty(container);
    container.appendChild(elem("div", {"class": "ri-widget-search"}, [
                                    img(this.images.logo, {"class": "logo"}),
                                    this.searchForm
                               ]));
};

ri.widget.SearchForm.prototype = {
    /* 
     * Select a field to display by index 
     */
    select: function(field) {
        for (var i = 0; i < this.fields.length; i++)
            this.fields[i].className = "field" + (i == field ? " selected" : "");
        this.notify("selected", this.fields[field]);
    },

    /*
     * Subscribe an observer obs to an event type.
     */
    subscribe: function(event, obs) {
        if (this.subscribers[event] == undefined)
            this.subscribers[event] = [];
        this.subscribers[event].push(obs);
    },

    /*
     * Notify subscribers of a particular event.
     */
    notify: function(event) {
        var subs = this.subscribers[event] || [];
        var args = subs.slice.call(arguments);
        args.shift();
        
        for (var i = 0; i < subs.length; i++)
            subs[i].apply(this, args);
    }
};


/*
 * Creates a new "field" in a form. The field requires a label as a string, an
 * 'image' (as per the img function), and the control as a DOM node. A "div"
 * Element containing the field is returned.
 */
function field(label, image, control) {
    return elem("div", {"class": "field"}, [
        elem("a", {href: "#", title: label}, [
            img(image),
            elem("label", null, text(label))
        ]),
        elem("div", {"class": "control"}, control)
    ]);
}


/*
 * The ResultBox class is used to display a list of paged results to the user.
 * It requires a container for the ResultBox (the box argument to the 
 * constructor) and a query pager (ie. an instance of ri.query.Pager). The
 * container will then be filled with results from pager, delegating the 
 * actual pagination to the pager. The pager itself is event driven, so the
 * result box hooks into the pager's switch and change events to determine when
 * to switch pages. The page links the result box displays trigger a switch in
 * the pager which, presumably, should eventually notify the result box of the
 * corresponding "switch" and "change" events.
 */
ri.widget.ResultBox = function(box, pager, opts) {
    opts = extend({}, ri.widget.settings, opts || {});
    this.images = extend({}, ri.widget.settings.images, opts.images || {});
    this.pager = pager;

    empty(box);
    this.wait = box.appendChild(elem("div", {"class": "wait"}, 
                                    img(this.images.wait)));
    this.list = box.appendChild(elem("ol", {"class": "list"}));
    this.pglist = box.appendChild(elem("ul", {"class": "pager"}));
    this.close = box.appendChild(elem("a", {href: "#", "class": "close-button"},
                                    img(this.images.close)));
    addClass(box, "ri-widget-results");
    
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
    /*
     * Return the current page being displayed.
     */
    page: function(pg) {
        if (pg == undefined)
            return this.page;
    },

    /*
     * This will update the result box from the pager. This should be called
     * whenever the pager has changed to a new page (eg. when the pager emits
     * a "change" event).
     */
    update: function() {
        var projects = this.pager.getProjects();

        // Update project list
        
        empty(this.list);
        if (projects.length == 0) {
            this.list.setAttribute("start", "1");
            this.list.appendChild(elem("li", {"class": class_}, [
                    elem("p", {"class": "no-projects"}, 
                        text("Your search did not match any projects.")
                    )
                ]));
        } else {
            this.list.setAttribute("start", 
                    "" + ((this.pager.page - 1) * this.pager.pageSize + 1));
            for (var i = 0; i < projects.length; i++) {
                var p = projects[i];
                var class_ = "objective " + 
                    (i == 0 ? "first"
                            : (i == projects.length - 1 ? "last" : ""));
                this.list.appendChild(elem("li", {"class": class_}, [
                    elem("a", {href: p.url, target: "_blank"}, text(p.title)),
                    elem("p", {"class": "objective"}, text(p.abstract))
                ]));
            }
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


/*
 * Returns true if obj is an Array, false otherwise.
 */
function isArray(obj) {
    return Object.prototype.toString.call(obj) == "[object Array]";
}


// Check to see if PNGs need to be "fixed" (for transparency)
var fixPNG = false,
    ie = navigator.userAgent.match(/\WMSIE (\d)\.(\d)\W/);
if (ie && parseInt(ie[1]) < 7)
    fixPNG = true;


/*
 * Creates a new Element with attribute name => value pairs grabbed from the 
 * obj attrs and appends kids as the new element's children. The kids argument
 * is an optional array of DOM nodes to add as children to the new Element.
 */
function elem(tag, attrs, kids) {
    attrs = attrs || {};
    kids = kids ? (isArray(kids) ? kids : [kids]) : [];
    var n = document.createElement(tag);
    if ("name" in attrs) {
        try {
            n = document.createElement("<" + tag + " name=\"" + attrs["name"] + "\">");
        } catch(e) { 
            // Exception is thrown in all browsers other than IE <= 7. This is
            // not a problem, as all other browsers can set the name attribute
            // using setAttribute (as below).
        }
    }
    for (var name in attrs) {
        if (name == "class") {
            n.className = attrs[name];
        } else {
            n.setAttribute(name, attrs[name]);
        }
    }
    for (var i = 0; i < kids.length; i++)
        n.appendChild(kids[i]);
    return n;
}


/*
 * Creates and returns a new DOM "img" Element. The params argument is expected
 * to be an object with the required property "url" (the image src) and 
 * optional properties "w" and "h" (image width and height) and "alt" (the 
 * image's alternate text). The attrs parameter are all additional attributes
 * given as an object.
 */
function img(params, attrs) {
    attrs = attrs || {};
    attrs["src"] = params.url;
    if ("w" in params)
        attrs["width"] = params.w;
    if ("h" in params)
        attrs["height"] = params.h;
    if ("alt" in params)
        attrs["alt"] = params.alt;
    i = elem("img", attrs);
    if (fixPNG && "trans" in params && params.trans && /\.png$/.test(attrs["src"]))
        i = wrapPNG(i);     // Fix transparency issues in IE 6 (and 5.5)
    return i;
}


/*
 * Wraps an IMG element to fix PNG transparency issues in IE 5.5 and 6.0.
 */
function wrapPNG(img) {
    var blank = elem("img", {
        src: images.spacer.url,
        width: img.width,
        height: img.height
    });
    var wrapper = elem("span", {}, blank);
    wrapper.style.width = img.width;
    wrapper.style.height = img.height;
    wrapper.style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + img.src + "', sizingMethod='scale')";
    return wrapper;
}


/*
 * Creates a TextNode with text txt.
 */
function text(txt) {
    return document.createTextNode("" + txt);
}


/*
 * Remove all children elements from Node n.
 */
function empty(n, c) {
    while (c = n.firstChild) 
        n.removeChild(c);
}


/*
 * Add a class to an element n, if it does not already have it. Returns n.
 */
function addClass(n, c) {
    var val = n.className || "",
        exists = new RegExp("(^|\\s)" + c + "($|\\s)");
    if (!exists.test(val))
        val += " " + c;
    n.className = val
    return n;
}


/*
 * Remove a class from element n, if it has it. Returns n.
 */
function removeClass(n, c) {
    var val = n.className || "",
        needle = new RegExp("(^|\\s)" + c + "($|\\s)");
    n.className = val.replace(needle, " ", "g");
    return n;
}

/* 
 * Adds a "starter" class to text inputs. That is, whenever the field is empty,
 * the class will be applied to the input. Then when it gains focus, the class
 * is removed and only re-added if it is empty again on a blur. 
 */
function starterClass(txtIn, klass) {
    var nop = function() {},
        focusFunc = txtIn.onfocus || nop,
        blurFunc = txtIn.onblur || nop,
        showingStarter = false,
        show = function() {
            showingStarter = true;
            addClass(txtIn, klass);
        },
        hide = function() {
            showingStarter = false;
            removeClass(txtIn, klass);
        };
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


function extend(dest) {
    for (var i = 1; i < arguments.length; i++) {
        var src = arguments[i];
        for (var nm in src)
            dest[nm] = src[nm];
    }
    return dest;
}

})();
