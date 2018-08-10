({
    onInit : function(c, e, h) {
        switch (c.get("v.searchBy")) {
            case "KEYWORD":
                c.set("v.isKeywordEnabled", true);
                c.set("v.isConditionEnabled", false);
                break;
            case "CONDITION":
                c.set("v.isKeywordEnabled", false);
                c.set("v.isConditionEnabled", true);
                break;
            case "BOTH":
                c.set("v.isKeywordEnabled", true);
                c.set("v.isConditionEnabled", true);
                break;
        }
        
    },
    onAfterScriptsLoaded : function(c, e, h) {
        // We will first tidy up field names by eliminate redundant spaces
        // and make all of them into lowercase for convenience.
        // Then request for Fields and store the result in promise object to use it later.
        const fieldNames = [];
        c.get("v.fieldNames").split(",").forEach(function(fieldName) {
            fieldNames.push(fieldName.trim().toLowerCase());
        });
        const p_getFields = h.getFields(c, h, c.get("v.objectName"), fieldNames.join(','));
        
        // Now we want to retrieve default values from the context record
        // if the user requests to and we have a context record.
        // Otherwise, we will simply use the values specified as default values without server request.
        // Again, save the result in a promise object for later use.
        const recordId = c.get("v.recordId");
        const fieldNamesOrDefaultValues = [];
        if (c.get("v.fieldNamesOrDefaultValues")){
            c.get("v.fieldNamesOrDefaultValues").split(",").forEach(function(value) {
                fieldNamesOrDefaultValues.push(value.trim().toLowerCase());
            });
        }
        let p_getDefaultValues = Promise.resolve(fieldNamesOrDefaultValues);
        if (recordId) p_getDefaultValues = h.getDefaultValues(c, h, recordId, fieldNamesOrDefaultValues.join(','));
        
        // Once we have fields and default values ready, 
        // we can start to set up the search box interface.
        // Here, we need to;
        // 1. make sure Fields have no errors or any other faults in them.
        // 2. insert the default values to each Fields.
        // 3. group Fields up with appropriate header lables.
        Promise.all([p_getFields, p_getDefaultValues])
        .then($A.getCallback(function([fields, defaultValues]) {
            
            // First, we will pre-process the fields.
            // This step includes;
            // 1. invalidate Fields which are not supported or may cause a mlfunctioning for this component
            // 2. invalidate Fields which are not supported by this component
            let index = 1;
            fields.forEach(function(field) {
                if (!field) {
                    fields[index] = null;
                } else if (!field.isFilterable) {
                    h.showError(c, h, `onAfterScriptsLoaded : The type '${field.name}' of '${field.objectName}' is not a queryable field.`);
                    fields[index] = null;
                } else if (field.type == "ADDRESS" || field.type == "COMBOBOX" || field.type == "REFERENCE" || field.type == "ANYTYPE" 
                           || field.type == "BASE64" || field.type == "DATACATEGORYGROUPREFERENCE" || field.type == "ENCRYPTEDSTRING") {
                    h.showError(c, h, `onAfterScriptsLoaded : The type '${field.type}' for '${field.name}' of '${field.objectName}' is unsupported.`);
                    fields[index] = null;
                } else {
                    field.index = index++;
                }
            });
            
            return [fields, defaultValues];
        }))
        .then($A.getCallback(function([fields, defaultValues]) {
 
            // Then we will pre-populate fields with default values.
            // If keyword-search is enabled, the first value is always set to the keyword.
            // The rest of values will be inserted into the Fields in order of the list.
            // Since the Field's visibility depends on the run-time user, 
            // hidden(invisible) fields also consume values.
            // On the other hand, invalid fields don't consume values 
            // since invalid fields are always invalid no matter who is running the component. 
            
            if (c.get("v.isKeywordEnabled")) c.set("v.keyword", defaultValues.shift());
            fields.forEach(function(field) {
                if (!field) {
                    // skip if null or invalid
                } else if (field.type==="INTEGER" || field.type==="PERCENT" || field.type==="CURRENCY" || field.type==="DOUBLE" ) {
                    const min = defaultValues.shift();
                    const max = defaultValues.shift();
                    field.minValue = min ? +min : "";
                    field.maxValue = max ? +max : "";
                } else if (field.type==="DATE") {
                    const min = defaultValues.shift();
                    const max = defaultValues.shift();
                    field.minValue = min ? moment(min).format("YYYY-MM-DD") : "";
                    field.maxValue = max ? moment(max).format("YYYY-MM-DD") : "";
                } else if (field.type==="DATETIME") {
                    const min = defaultValues.shift();
                    const max = defaultValues.shift();
                    field.minValue = min ? moment(min + ":000Z").format("YYYY-MM-DDTHH:mm") : "";
                    field.maxValue = max ? moment(max + ":000Z").format("YYYY-MM-DDTHH:mm") : "";
                } else if (field.type==="BOOLEAN") {
                    field.value = defaultValues.shift() === "true";
                } else if (field.type==="PICKLIST") {
                    const value = defaultValues.shift();
                    field.options.forEach(function(option) {
                        if (option.value === value) {
                            option.isSelected = true;
                            field.value = value;
                        }
                    }); 
                } else {
                    field.value = defaultValues.shift();
                }
            });
            c.set("v.fields",fields);
            
            return [fields, defaultValues];
        }))
        .then($A.getCallback(function([fields, defaultValues]) {
            
            // Here we will post-process the fields.
            // This is mainly for forcing user-specific limits or access controls 
            // This step includes;
            // 1. hide to prohibit access to fields which current user has no privilege to access to.
            fields.forEach(function(field, index) {
                if (field && !field.isAccessible) {
                    fields[index] = null;
                }
            });
            
            return [fields, defaultValues];
        }))
        .then($A.getCallback(function([fields, defaultValues]) {
            
            // Then we will derive a default logic if no custom logic is specified.
            // The index 0 is reserved for keyword, and the rest follows the index of each field.`
            const isKeywordEnabled = c.get("v.isKeywordEnabled");
            const isConditionEnabled = c.get("v.isConditionEnabled");
            let customLogic = c.get("v.customLogic");
            
            if (!customLogic) {
                const indices = fields.reduce(function(prev,field){
                    if (field) prev.push(field.index);
                    return prev;
                }, []);
                
                customLogic = isKeywordEnabled ? "0" : ""; 
                customLogic += isKeywordEnabled && isConditionEnabled && indices.length > 0 ? " AND " : ""; 
                customLogic += isConditionEnabled ? indices.join(" AND ") : "";
            }            
            c.set("v.customLogic", customLogic);
            
            return [fields, defaultValues];
        }))
        .then($A.getCallback(function([fields, defaultValues]) {
            
            // Then we will group up Fields in a size of group size specified. 
            // the group object consists of fields and headers.
            const headers = [];
            if (c.get("v.sectionHeaders")) {
                c.get("v.sectionHeaders").split(",").forEach(function (header) {
                    header = header.trim();
                    headers.push(header ? {label: header} : null);
                });
            }
            
            const groups = [];
            while (headers.length > 0 || fields.length > 0) {
                const group = {
                    header: headers.shift(),
                    fields: []
                };
                let count = c.get("v.numGroupItems");
                while(count--) group.fields.push(fields.shift());
                groups.push(group);
            }
            c.set("v.groups", groups);
        }))
        
        .catch(function(reason) {
            h.showError(c, h, "onAfterScriptsLoaded : " + reason);
        }); 
        
    },
    
    
    onFilterControlButtonClicked : function(c, e, h) {
        c.set("v.isConditionFolded", !c.get("v.isConditionFolded"));
    },
    onSearch : function(c, e, h) {
        
        // This is a function is called when user requests to perform a search.
        // There are few things to be done before querying the records on server and they are;
        // - to show an indicator.
        // - to get rid of all of null conditions.
        // - to format values into the expected form of SOQL queries.
        
        h.showSpinner(c, h);
        
        const fields = c.get("v.fields").filter(function(field) {return field; });
        
        fields.forEach(function(field) {
            if (field.type === "DATETIME") {
                if (field.minValue) field.minValue = moment(field.minValue).format("YYYY-MM-DDThh:mm:ssZ");
                if (field.maxValue) field.maxValue = moment(field.maxValue).format("YYYY-MM-DDThh:mm:ssZ");
            } else if (field.type === "TIME") {
                if (field.minValue && !field.minValue.endsWith("Z")) field.minValue += "Z";
                if (field.maxValue && !field.maxValue.endsWith("Z")) field.maxValue += "Z";
            } else if (field.type === "BOOLEAN") {
                if (c.get("v.isCheckboxIgnoredIfUnchecked") && !field.value) {
                    field.value = "";
                }
            }
        });
        
       
        
        // Now it is time to request the server to query the records.
        // The respose form the serve is only the record IDs of matching records.
        // Since this is a searching component, we will let other components to do the diplay.
        // There are 3 options;
        // - DEFAULT: create a datatable component to show the result.
        // - TAB    : open a new page, or tab if your on console, to show the result in a datatable.
        // - EVENT  : fire a RecordHunterEvent which is an application event to propagate the result to other component in the same page.
        
        h.findRecords(c, h, c.get("v.objectName"), c.get("v.keyword"), JSON.stringify(fields), c.get("v.customLogic"))
        .then($A.getCallback(function(recordIds) {

            console.log(recordIds.length);
            
            switch(c.get("v.resultTarget")) {
                case "DEFAULT":
                case "TAB":
                    h.getObjectsNameFieldName(c, h, c.get("v.objectName"))
                    .catch(function(reason) {
                        h.showError(c, h, "onSearch : " + reason);
                    })
                    .then($A.getCallback(function(objectsNameFieldName) {
                        let fieldNames = c.get("v.fieldNames");
                        if (!c.get("v.fields").some(function(field) {
                            return ( field.path == ( c.get("v.objectName") + '.' + objectsNameFieldName ).toLowerCase() );
                        })) {
                            fieldNames = objectsNameFieldName + ',' + fieldNames;
                        }
                        return fieldNames;
                    }))
                    .then($A.getCallback(function(fieldNames) {
                        switch(c.get("v.resultTarget")) {
                            case "DEFAULT":
                                h.createComponent(c, h, "c:RecordHunter_DataTable", {
                                    objectName : c.get("v.objectName"),
                                    fieldNames : fieldNames,
                                    recordId :  c.get("v.recordId"),
                                    recordIds : recordIds,
                                })
                                .then($A.getCallback(function(component) {
                                    c.set("v.body", [component]);
                                }))
                                .catch(function(reason) {
                                    h.showError(c, h, "onSearch : " + reason);
                                });
                                break;
                            case "TAB":
                                h.navigateToComponent(c, h, "c:RecordHunter_DataTable", {
                                    objectName : c.get("v.objectName"),
                                    fieldNames : fieldNames,
                                    recordId :  c.get("v.recordId"),
                                    recordIds : recordIds,
                                });
                                break;
                        }
                    }));
                    break;
                case "EVENT":
                    h.fireAppEvent(c, h, "e.c:RecordHunterEvent", {
                        recordIds : recordIds,
                    });
                    break;
            }
        }))
        .catch(function(reason) {
            h.showError(c, h, "onSearch : " + reason);
        })
        .then($A.getCallback(function() {
            h.hideSpinner(c, h);
        }));   
    },
})
