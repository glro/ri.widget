(function() {

var ri = window.ri = window.ri || {};

ri.startertext = function(txtIn, starter, starterClass) {
    var focusFunc = txtIn.onfocus;
    var blurFunc = txtIn.onblur;
    var showingStarter = false;
    
    txtIn.onfocus = function(e) {
        if (showingStarter)
            txtIn.value = "";
        focusFunc.call(this, e);
    };
    
    txtIn.onblur = function(e) {
        if (txtIn.value == "") {
            showingStarter = true;
            txtIn.value = starter;
        }
        blurFunc.call(this, e);
    };
    
    if (txtIn.value == "") {
        showingStarter = true;
        txtIn.value = starter;
    }
};

})();
