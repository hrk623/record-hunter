({
    updatOptions : function(c, h) {
        const valueSet = new Set(c.get("v.values").split(";"));
        const options = c.get("v.options");
        options.forEach(function(option) {
            if (valueSet.has(option.value)) {
                option.selected = true;
            } else {
                option.selected = false;
            }
        });
        c.set("v.options", options);
    },
    updatLabels : function(c, h) {
        const valueSet = new Set(c.get("v.values").split(";"));
        const labels = [];
        c.get("v.options").forEach(function(option) {
            if (valueSet.has(option.value)) labels.push(option.label);
        });
        c.set("v.labels", labels.join(','));
    },
    updatValues : function(c, h, selectedValue) {
        const valueSet = new Set(c.get("v.values").split(";"));
        c.get("v.options").forEach(function(option) {
            if (option.value === selectedValue) {
                if (valueSet.has(option.value)) valueSet.delete(option.value);
                else valueSet.add(option.value);
            }
        });
        valueSet.delete("");
        c.set("v.values", [...valueSet].join(';'));
    }
})