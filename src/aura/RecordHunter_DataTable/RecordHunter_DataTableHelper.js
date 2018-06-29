({
    initFlows : function(c, h, field) {
        const flowNames = c.get('v.flowNames') ? c.get('v.flowNames').split(',') : [];
        const flowLabels = c.get('v.flowLabels') ? c.get('v.flowLabels').split(',') : [];
        const flows = flowNames.reduce(function (prev, flowName, index) {
            const flow = {
                name: flowName.trim(),
                label: flowLabels.length > index && flowLabels[index] ? flowLabels[index].trim() : flowName.trim(),
            };
            prev.push(flow);
            return prev;
        }, []);
        c.set('v.flows', flows);
    },
    initColumns : function(c, h, field) {
        
        const fieldNames = [];
        c.get("v.fieldNames").split(",").forEach(function(fieldName) {
            fieldNames.push(fieldName.trim().toLowerCase());
        });
        
        h.getFields(c, h, c.get('v.objectName'), fieldNames.join(","))
        .then($A.getCallback(function(fields) {
            
            // First, we will pre-process the fields.
            // This step includes;
            // 1. invalidate Fields which are not supported or may cause a mlfunctioning for this component
            // 2. invalidate Fields which are not supported by this component
            fields = fields.reduce(function(prev, field) {
                if (!field) {
                } if (field.type === "ADDRESS" || field.type === "COMBOBOX" || field.type === "REFERENCE" || field.type === "ANYTYPE" 
                           || field.type === "BASE64" || field.type === "DATACATEGORYGROUPREFERENCE" || field.type === "ENCRYPTEDSTRING") {
                    h.showError(c, h, `The type '${field.type}' for '${field.name}' of '${field.objectName}' is unsupported.`);
                } else {
                    prev.push(field);
                }
                return prev;
            }, []);
            
           return fields;
        }))
        .then($A.getCallback(function(fields) {
            const columns = fields.reduce(function(prev, field){ 
                prev.push(h.createColumn(c, h, field));
                return prev;
            }, []);
            const actions = h.getRowActions.bind(this, c);
            columns.push({type:'action', typeAttributes:{rowActions: actions}});
            
             c.set('v.columns', columns);
             c.set('v.fields', fields);
            if (c.get('v.recordIds')) c.set('v.recordIds', c.get('v.recordIds'));
        }))
        .catch(function(reason) {
            h.showError(c, h, "controller.initColumns : " + reason);
        });        
    },
    loadData : function(c, h) {
        
        const recordIds = c.get("v.recordIds");
        const offset = c.get("v.offset");
        const loadSize = Math.min(c.get("v.pageSize"), recordIds.length - offset);

        c.find("dataTable").set("v.isLoading", true);
        
        h.getRecords(c, h, c.get('v.objectName'), JSON.stringify(c.get('v.fields')), JSON.stringify(recordIds.slice(offset, offset + loadSize)))
        .then($A.getCallback(function (records) {
            records.forEach(function(record, index){
                record = h.flatten(c, h, record, c.get('v.objectName'));
                record = h.setKeysToLowerCase(c, h, record);
                records[index] = record;
            });
            return records;
        }))
        .then($A.getCallback(function (records) {
            const types = c.get('v.fields').reduce(function(prev, field) {
                prev[field.path] = field.type;
                return prev;
            }, {});
            
            records.forEach(function(record){
                Object.keys(record).forEach(function(key) {
                    if (types[key] === "BOOLEAN") {
                        if (record[key] === true) record[key] = c.get('v.true');
                        if (record[key] === false) record[key] = c.get('v.false');
                    } else if (types[key] === "TIME") {
                        if (record[key]) record[key] = moment.utc(record[key]).format('hh:mm');
                    } else if (types[key] === "PERCENT") {
                        if (record[key]) record[key] = record[key]/100.0;
                    } 
                });
            });
            return records;
        }))
        .then($A.getCallback(function (records) {
            const data =  c.get("v.data").concat(records);
            c.set('v.data', data);

            c.set("v.offset", data.length);
            
            if (data.length === recordIds.length) {
               c.find("dataTable").set('v.enableInfiniteLoading', false);
            }
        }))
        .catch(function(reason) {
            h.showError(c, h, "controller.loadData : " + reason);
        })
        .then($A.getCallback(function () {
            c.find("dataTable").set("v.isLoading", false);
        }));
        
        
    },
    createColumn : function(c, h, field) {
        switch (field.type) {
            case 'STRING':
            case 'PICKLIST':
            case 'ID':
            case 'TEXTAREA':
            case 'BOOLEAN':
            case 'ADDRESS':
            case 'TIME':
                return {
                    label: field.label,
                    type: 'text',
                    fieldName: field.path,
                    sortable: true,
                };
            case 'INTEGER':
            case 'DOUBLE':
                return {
                    label: field.label,
                    type: 'number',
                    fieldName: field.path,
                    sortable: true,
                };
            case 'DATE':
            case 'DATETIME':
                return {
                    label: field.label,
                    type: 'date',
                    fieldName: field.path,
                    sortable: true,
                };
               case 'PERCENT':
                return {
                    label: field.label,
                    type: 'percent',
                    fieldName: field.path,
                    sortable: true,
                    typeAttributes: { maximumFractionDigits : field.scale }
                };   
            default:
                return {
                    label: field.label,
                    type: field.type ? field.type.toLowerCase() : '',
                    fieldName: field.path,
                    sortable: true,
                };
        }
    },
    navigateToSObject : function(c, h, recordId) {
        const event = $A.get("e.force:navigateToSObject");
        event.setParams({
            "recordId": recordId,
        });
        event.fire();
    },
    startFlow : function(c, h, flowName, inputVariables) {
        $A.createComponent(
            "lightning:flow", {
                'aura:id': 'flow',
                'onstatuschange': c.getReference('c.onFlowStatusChanged')
            }, function(flow, status, errorMessage){
                if (status === "SUCCESS") {
                    c.set('v.flowComponents', [flow]);
                    flow.startFlow(flowName, inputVariables);
                } else if (status === "INCOMPLETE") {
                    h.showError(c, h, 'controller.startFlow : No response from server or client is offline.');
                } else if (status === "ERROR") {
                    h.showError(c, h, 'controller.startFlow : ' + errorMessage);
                }
            }
        );
    },
    getRowActions: function (c, row, doneCallback) {
        const fields = c.get('v.fields');
        const actions = fields.reduce(function(prev, field) {
            if (field.isNameField && row[field.path]) {
                prev.push({
                    'label': row[field.path],
                    'iconName': 'utility:new_window',
                    'name':  field.path.substring(0, field.path.lastIndexOf('.')),
                });
            }
            return prev;
        }, []);
        doneCallback(actions);
    },
    flatten : function(c, h, data, objectName) {
        var result = {};
        function recurse (cur, prop) {
            if (Object(cur) !== cur) {
                result[prop] = cur;
            } else if (Array.isArray(cur)) {
                for(var i=0, l=cur.length; i<l; i++)
                    recurse(cur[i], prop + "[" + i + "]");
                if (l == 0)
                    result[prop] = [];
            } else {
                var isEmpty = true;
                for (var p in cur) {
                    isEmpty = false;
                    recurse(cur[p], prop ? prop+"."+p : p);
                }
                if (isEmpty && prop)
                    result[prop] = {};
            }
        }
        recurse(data, objectName);
        return result;
    },
    setKeysToLowerCase: function(c, h, obj) {
        var key, keys = Object.keys(obj);
        var n = keys.length;
        var result = {};
        while (n--) {
            key = keys[n];
            result[key.toLowerCase()] = obj[key];
        }
        return result;
    },
    
    getValue : function(c, h, field, record) {
        const path = field.path.split('.');
        path.shift();
        let value = record;
        path.forEach(function(key) {
            if (value) value = value[key];
        });
        return value;
    },
    getData : function(c, h, field, record) {
        const path = field.path.split('.');
        path.shift();
        const data = {
            value : record,
            id : record.Id,
            label : field.label,
            isNameField : field.isNameField
        };
        path.forEach(function(key) {
            if (data.value) {
                data.id = data.value.Id;
                data.value = data.value[key];
            }
        });
        return data;
    },
    initFlowComponent : function(c, h) {
        const name = 'lightning:flow';
        const attributes = {
            'aura:id': 'flow',
            'onstatuschange': c.getReference('c.onFlowStatusChanged')
        };
        return new Promise(function (resolve, reject) {            
            $A.createComponent(name, attributes, function(cmp, status, error) {
                if (status === "SUCCESS") resolve(cmp);
                else if (status === "INCOMPLETE") reject('No response from server or client is offline.');
                else if (status === "ERROR") reject(error);
            });
        });
    },
    getFields : function(c, h, objectName, fieldNames) {
        const action = c.get('c.getFields');
        action.setParams({
            objectName: objectName,
            fieldNames: fieldNames,
        });
        return new Promise(function (resolve, reject) {
            action.setCallback(this, function(response) {
                const ret = response.getReturnValue();
                if (response.getState() === 'SUCCESS') ret.hasError ? reject(ret.message) : resolve(ret);
                else if (response.getState() === 'ERROR') reject(ret.getError());
            });
            $A.enqueueAction(action);
        });
    },
    getRecords : function(c, h, objectName, fieldsJson, recordIdsJson) {
        const action = c.get('c.getRecords');
        action.setParams({
            objectName: objectName,
            fieldsJson: fieldsJson,
            recordIdsJson: recordIdsJson
        });
        return new Promise(function (resolve, reject) {
            action.setCallback(this, function(response) {
                const ret = response.getReturnValue();
                if (response.getState() === 'SUCCESS') ret.hasError ? reject(ret.message) : resolve(ret);
                else if (response.getState() === 'ERROR') reject(ret.getError());
            });
            $A.enqueueAction(action);
        });
    },
    showSuccessToast : function(c, h, message) {
        var toastEvent = $A.get("e.force:showToast");
        toastEvent.setParams({
            type: 'success',
            mode : 'pester',
            message: message,
            duration: 3000
        });
        toastEvent.fire();
    },
    showError : function(c, h, message) {
        const isOnAppBuilder = document.location.href.toLowerCase().indexOf('flexipageeditor') >= 0;
        if (isOnAppBuilder) {
            console.error(message);
            c.set('v.errorMessage', message);
        } else {    
            const toastEvent = $A.get("e.force:showToast");
            toastEvent.setParams({
                type: 'error',
                mode : 'sticky',
                message: message,
            });
            toastEvent.fire();
        }
    }
})