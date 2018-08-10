({

    fireAppEvent  : function(c, h, eventDef, evntAttributes) {
        var appEvent = $A.get(eventDef);
        appEvent.setParams(evntAttributes);
        appEvent.fire();
    },
    navigateToComponent  : function(c, h, componentDef, componentAttributes) {
        var evt = $A.get("e.force:navigateToComponent");
        evt.setParams({
            componentDef : componentDef,
            componentAttributes: componentAttributes
        });
        evt.fire();
    },
     createComponent : function(c, h, componentDef, componentAttributes) {
         return new Promise(function (resolve, reject) {
             $A.createComponent(
                 componentDef,
                 componentAttributes,
                 function(newComponent, status, errorMessage){
                     if (status === "SUCCESS") resolve(newComponent);
                     else if (status === "INCOMPLETE") reject('No response from server or client is offline.');
                     else if (status === "ERROR") reject(errorMessage);
                 }
             );
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
    getObjectsNameFieldName : function(c, h, objectName) {
        const action = c.get('c.getObjectsNameFieldName');
        action.setParams({
            objectName: objectName
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
    findRecords : function(c, h, objectName, keyword, fieldsJson, customLogic) {
        const action = c.get('c.findRecords');
        action.setParams({
            objectName: objectName,
            keyword:    keyword,
            fieldsJson: fieldsJson,
            customLogic: customLogic
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
    getDefaultValues : function(c, h, recordId, fieldNamesOrDefaultValues) {
        const action = c.get('c.getDefaultValues');
        action.setParams({
            recordId:      recordId,
            fieldNamesOrDefaultValues: fieldNamesOrDefaultValues
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
                message: c.get('v.title') + ': ' + message,
            });
            toastEvent.fire();
        }
    }
})