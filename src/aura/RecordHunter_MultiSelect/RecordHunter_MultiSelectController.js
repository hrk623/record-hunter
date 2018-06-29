({
    onInit: function(c, e, h) {
        window.addEventListener("click", $A.getCallback(function(e) {
            c.set("v.showOptions", false);
        }));
        if (!c.get("v.values")) c.set("v.values", "");
        h.updatLabels(c, h);
    },
    onComboboxClicked : function(c, e, h) {
        e.stopPropagation();
        c.set("v.showOptions", !c.get("v.showOptions"));
        h.updatOptions(c, h);
    },
    onOptionClicked : function(c, e, h) {
        e.stopPropagation();
        h.updatValues(c, h, e.currentTarget.dataset.value);
        h.updatLabels(c, h);
        h.updatOptions(c, h);
    },
})