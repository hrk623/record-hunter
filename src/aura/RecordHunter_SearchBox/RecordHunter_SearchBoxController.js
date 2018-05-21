({
    onInit : function(c, e, h) {
        switch (c.get('v.searchBy')) {
            case 'KEYWORD':
                c.set('v.isKeywordEnabled', true);
                c.set('v.isConditionEnabled', false);
                break;
            case 'CONDITION':
                c.set('v.isKeywordEnabled', false);
                c.set('v.isConditionEnabled', true);
                break;
            case 'BOTH':
                c.set('v.isKeywordEnabled', true);
                c.set('v.isConditionEnabled', true);
                break;
        }        
    },
    onAfterScriptsLoaded : function(c, e, h) {
        h.getFields(c, h, c.get('v.objectName'), c.get('v.fieldNames'))
        .then($A.getCallback(function(fields) {
            const sectionHeaders = c.get('v.sectionHeaders');            
            if (sectionHeaders) {
                const headers = sectionHeaders.split(',');
                for (let i = 0; i < fields.length; i += c.get('v.numGroupItems')) fields[i].header = headers.shift();
            }
            c.set('v.fields', fields);
            
            const recordId = c.get('v.recordId');
            const fieldNamesOrDefaultValues = c.get('v.fieldNamesOrDefaultValues');
            if (recordId) return h.getDefaultValues(c, h, c.get('v.recordId'), c.get('v.fieldNamesOrDefaultValues'));
            else return Promise.resolve(fieldNamesOrDefaultValues ? fieldNamesOrDefaultValues.split(',') : []);
        }))
        .then($A.getCallback(function(defaultValues) {
            console.log(defaultValues);
            
            c.set('v.keyword', defaultValues.shift());
            const fields = c.get('v.fields');
            fields.forEach(function(field) {
               if (field.type=='INTEGER' || field.type=='PERCENT' || field.type=='CURRENCY' || field.type=='DOUBLE') {
                    const min = defaultValues.shift();
                    const max = defaultValues.shift();
                    field.minValue = min ? +min : '';
                    field.maxValue = max ? +max : '';
                } else if (field.type=='DATE') {
                    const min = defaultValues.shift();
                    const max = defaultValues.shift();
                    field.minValue = min ? moment(min).format('YYYY-MM-DD') : '';
                    field.maxValue = max ? moment(max).format('YYYY-MM-DD') : '';
                } else if (field.type=='DATETIME') {
                    const min = defaultValues.shift();
                    const max = defaultValues.shift();
                    field.minValue = min ? moment(min + ':000Z').format('YYYY-MM-DDTHH:mm') : '';
                    field.maxValue = max ? moment(max + ':000Z').format('YYYY-MM-DDTHH:mm') : '';
                } else if (field.type=='BOOLEAN') {
                    field.value = defaultValues.shift() === "true";
                } else if (field.type=='PICKLIST' || field.type=='MULTIPICKLIST') {
                    const value = defaultValues.shift();
                    field.options.forEach(function(option) {
                        if (option.value === value) {
                            option.isSelected = true;
                            field.value = value;
                        }
                    }); 
                } else if (!field.type) {
                    // skip if field is invalid
                } else {
                    field.value = defaultValues.shift();
                }
            });
            c.set('v.fields', fields);
        }))
        .catch(function(reason) {
            h.showErrorToast(c, h, reason + '(controller.onAfterScriptsLoaded)');
        }); 
    },
    onFilterControlButtonClicked : function(c, e, h) {
        c.set('v.isConditionFolded', !c.get('v.isConditionFolded'));
    },
    onSearch : function(c, e, h) {
        h.showSpinner(c, h);
        const fields = c.get('v.fields');
        fields.forEach(function(field) {
            if (field.type === 'DATETIME') {
                if (field.minValue) field.minValue = moment(field.minValue).format('YYYY-MM-DDThh:mm:ssZ');
                if (field.maxValue) field.maxValue = moment(field.maxValue).format('YYYY-MM-DDThh:mm:ssZ');
            } else if (field.type === 'BOOLEAN') {
                if (c.get('v.isCheckboxIgnoredIfUnchecked') && !field.value) {
                    field.value = '';
                }
            }
        });

        const objectName = c.get('v.objectName');
        const isKeywordEnabled = c.get('v.isKeywordEnabled');
        const isConditionEnabled = c.get('v.isConditionEnabled');
        let customLogic = c.get('v.customLogic');
        if (!customLogic) {
            customLogic = isKeywordEnabled ? '0' : ''; 
            customLogic += isKeywordEnabled && isConditionEnabled ? ' AND ' : ''; 
            const list = [];
            for (var i = 1; i <= fields.length; i++) list.push(i);
            customLogic += isConditionEnabled ? list.join(' AND ') : '';
        }
        
        h.findRecords(c, h, objectName, c.get('v.keyword'), JSON.stringify(fields), customLogic)
        .then($A.getCallback(function(recordIds) {
            h.hideSpinner(c, h);
            
            switch(c.get('v.resultTarget')) {
                case 'DEFAULT':
                    h.createComponent(c, h, 'c:RecordHunter_DataTable', {
                        objectName : c.get('v.objectName'),
                        fieldNames : c.get('v.fieldNames'),
                        recordId :  c.get('v.recordId'),
                        recordIds : recordIds,
                    })
                    .then($A.getCallback(function(component) {
                        c.set("v.body", [component]);
                    }))
                    .catch(function(reason) {
                        h.showErrorToast(c, h, reason + '(controller.valueInit)');
                    });         
                    break;
                case 'TAB':
                    h.navigateToComponent(c, h, 'c:RecordHunter_DataTable', {
                        objectName : c.get('v.objectName'),
                        fieldNames : c.get('v.fieldNames'),
                        recordId :  c.get('v.recordId'),
                        recordIds : recordIds,
                    });
                    break;
                case 'EVENT':
                    h.fireAppEvent(c, h, 'e.c:RecordHunterEvent', {
                        recordIds : recordIds,
                    });
                    break;
            }

        
        }))
        .catch(function(reason) {
            h.hideSpinner(c, h);
            h.showErrorToast(c, h, reason + '(controller.onSearch)');
        });   
    },
})