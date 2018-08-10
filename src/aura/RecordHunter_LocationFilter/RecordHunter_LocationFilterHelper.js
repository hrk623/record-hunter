({
    onReady : function(c, h) {
        const defaultValues = c.get("v.defaultValues");
        if (defaultValues) {
            const numValues = defaultValues.length;
            const radiusFactor = numValues > 1 ? +defaultValues[numValues - 1] : null;
            const mode = c.get("v.mode");
            if (mode === "DISTANCE") c.set("v.distance", radiusFactor);
            if (mode === "TRANSPORTATION") c.set("v.time", radiusFactor);
            
            const location = numValues === 1 ? defaultValues[0] : defaultValues.splice(0, numValues - 1).join(",");
            c.set("v.location", location);

            if (location) {
                h.postMessage(c, h, {type:"GEOCODE", location: location});         
            } 
        }       
    },
   
    onGeocodeResult : function(c, h, latlng) {
        c.set("v.center", latlng);

        const location = c.get("v.location");
        const center = c.get("v.center");
        const distance = c.get("v.distance");
        if (location && center && distance) {
            c.set("v.circles", [{
                center: center, 
                radius: distance * 1000,
                clickable: false,
                 strokeColor: '#4bc076',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#4bc076',
                fillOpacity: 0.35,
                id: "CENTER"
            }]);
        } else {
            c.set("v.circles", []);
        }
    },
    loadRecords : function(c, h) {
        const recordIds = c.get("v.recordIds");
        h.getRecords(c, h, c.get('v.objectName'), JSON.stringify(c.get('v.fields')), JSON.stringify(recordIds))
        .then($A.getCallback(function (records) {
            records.forEach(function(record, index){
                record = h.flatten(c, h, record, c.get('v.objectName'));
                record = h.setKeysToLowerCase(c, h, record);
                records[index] = record;
            });
            return records;
        }))
        .then($A.getCallback(function (records) {
            const objectName = c.get("v.objectName");
            const geolocationFieldName = c.get("v.geolocationFieldName");
            const titleFieldName = c.get("v.titleFieldName");
            const descriptionFieldName = c.get("v.descriptionFieldName");
            const imageURLFieldName = c.get("v.imageURLFieldName");
            
            const markers = records.map(function(record) {
                const marker = {
                    id: record[objectName + ".id"],
                    position: {
                        lat: record[objectName + "." + geolocationFieldName + ".latitude"], 
                        lng: record[objectName + "." + geolocationFieldName + ".longitude"] 
                    },
                    content: {
                        imageUrl: record[objectName + "." + imageURLFieldName],
                        title: record[objectName + "." + titleFieldName],
                        description: record[objectName + "." + descriptionFieldName]
                    }
                };
                return marker;
            });
            
            c.set("v.markers", markers);
            h.updateMarkers(c, h);
        }))
        .catch(function(reason) {
            h.showError(c, h, "helper.loadRecords: " + reason);
        })
        
    },
    updateCenter : function(c, h) {
        h.postMessage(c, h, {
            type:"UPDATE",
            center: c.get("v.center"),
        });
    },
    updateMarkers : function(c, h) {
        h.postMessage(c, h, {
            type:"UPDATE",
            markers: c.get("v.markers"),
        });
    },
    updateCircles : function(c, h) {
        const location = c.get("v.location");
        const center = c.get("v.center");
        const distance = c.get("v.distance");
        if (location && center && distance) {
            c.set("v.circles", [{
                center: c.get("v.center"), 
                radius: c.get("v.distance") * 1000,
                clickable: false,
                strokeColor: '#4bc076',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#4bc076',
                fillOpacity: 0.35,
                id: "CENTER"
            }]);
        } else {
            c.set("v.circles", []);
        }
        h.postMessage(c, h, {
            type:"UPDATE",
            circles: c.get("v.circles"),
        });
    },
    
    postMessage : function(c, h, message) {
        const contentWindow = c.find("iframe").getElement().contentWindow;
        contentWindow.postMessage(JSON.stringify(message), "https://" + c.get("v.vfHost"));
    },
   
    recordSeleted: function (c, h, recordId) {
        // TODO: fire event to notify a record is selected.
    },
    recordDeseleted: function (c, h, recordId) {
        // TODO: fire event to notify a record is deselected.
    },  
    getCurrentPosition: function (c, h) {
        return new Promise(function(resolve, reject){
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(position) {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                }, function(error) {
                    reject(error.message);
                });
            } else {
                reject("This browser does not support geolocation service. Try other borowsers.");
            }            
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
                const ret = JSON.parse(response.getReturnValue());
                if (response.getState() === 'SUCCESS') ret.hasError ? reject(ret.message) : resolve(ret);
                else if (response.getState() === 'ERROR') reject(response.getError());
            });
            $A.enqueueAction(action);
        });
    },
    filterRecords : function(c, h, objectName, fieldsJson, recordIdsJson, customLogic) {
        const action = c.get('c.filterRecords');
        action.setParams({
            objectName: objectName,
            fieldsJson: fieldsJson,
            recordIdsJson: recordIdsJson,
            customLogic: customLogic
        });
        return new Promise(function (resolve, reject) {
            action.setCallback(this, function(response) {
                const ret = JSON.parse(response.getReturnValue());
                if (response.getState() === 'SUCCESS') ret.hasError ? reject(ret.message) : resolve(ret);
                else if (response.getState() === 'ERROR') reject(response.getError());
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
    fireAppEvent  : function(c, h, eventDef, evntAttributes) {
        var appEvent = $A.get(eventDef);
        appEvent.setParams(evntAttributes);
        appEvent.fire();
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
    navigateToSObject : function(c, h, recordId) {
        $A.get("e.force:navigateToSObject").setParams({
            recordId: recordId,
        }).fire();
    },
    showError : function(c, h, message) {
        const isOnAppBuilder = document.location.href.toLowerCase().indexOf('flexipageeditor') >= 0;
        if (isOnAppBuilder) {
            c.set('v.errorMessage', message);
        } else {    
            const toastEvent = $A.get("e.force:showToast");
            toastEvent.setParams({
                type: 'error',
                mode : 'sticky',
                message: "RecordHunter_LocationFilter: " + message,
            });
            toastEvent.fire();
        }
    }
})