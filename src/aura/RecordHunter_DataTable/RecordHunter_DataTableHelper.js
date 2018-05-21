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
        h.getFields(c, h, c.get('v.objectName'), c.get('v.fieldNames'))
        .then($A.getCallback(function(fields) {
            c.set('v.fields', fields);
            const columns = fields.reduce(function(prev, field){ 
                prev.push(h.createColumn(c, h, field));
                return prev;
            }, []);
            const actions = h.getRowActions.bind(this, c);
            columns.push({type:'action', typeAttributes:{rowActions: actions}});
            c.set('v.columns', columns);
            if (c.get('v.recordIds')) c.set('v.recordIds', c.get('v.recordIds'));
        }))
        .catch(function(reason) {
            h.showErrorToast(c, h, reason + '(controller.valueInit)');
        });        
    },
    initData : function(c, h, records) {
        const data = records.reduce(function (prev, record){
            const datum = h.flatten(c, h, record, c.get('v.objectName'));
            Object.keys(datum).forEach(function(key) {
                if (datum[key] === true) datum[key] = c.get('v.true');
                if (datum[key] === false) datum[key] = c.get('v.false');
            }) 
            prev.push(datum);
            return prev;
        }, []);
        c.set('v.data', data);
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
                    h.showErrorToast(c, h, 'No response from server or client is offline.');
                } else if (status === "ERROR") {
                    h.showErrorToast(c, h, 'Error: ' + errorMessage);
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
    showSpinner : function (c, h) {
        const spinner = c.find("spinner");
        $A.util.removeClass(spinner, "slds-hide");
    },
    hideSpinner : function (c, h) {
        const spinner = c.find("spinner");
        $A.util.addClass(spinner, "slds-hide");
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
    showErrorToast : function(c, h, message) {
        var toastEvent = $A.get("e.force:showToast");
        toastEvent.setParams({
            type: 'error',
            mode : 'sticky',
            message: c.get('v.title') + ': ' + message,
        });
        toastEvent.fire();
    }
})