({
    onStartFlowWithRecordIds : function (c, e, h) {
        const args = e.getParam('arguments');
        const recordIds = args.recordIds;
        const recordId = args.recordId ;
        const flowName = args.flowName;

        h.initFlowComponent(c, h)
        .then($A.getCallback(function(flowComponent) {
            c.set('v.body', [flowComponent]);
            flowComponent.startFlow(flowName, [{ 
                name : 'contextId', 
                type : 'String',
                value: recordId
            }, { 
                name : 'selectedIds', 
                type : 'String', 
                value: recordIds
            }]);
        }))
        .catch($A.getCallback(function(reason) {
             h.showError(c, h, 'controller.onStartFlowWithRecordIds: ' + reason);
        }));
    },
    onStartFlowWithRecords : function (c, e, h) {
        const args = e.getParam('arguments');
        

        const recordIds = args.recordIds;
        const recordId = args.recordId;
        const flowName = args.flowName;

        console.log('flowName',flowName);

        const getRecordResult = recordId ? h.getRecord(c, h, recordId) : Promise.resolve({Id: ''});
        const getRecordsResult = recordIds && recordIds.length > 0 ? h.getRecords(c, h, recordIds) : Promise.resolve([]);
        
        Promise.all([getRecordResult, getRecordsResult])
        .then($A.getCallback(function([record, records]) {
        console.log('record',record);
        console.log('records',records);
            
            
            h.initFlowComponent(c, h)
            .then($A.getCallback(function(flowComponent) {
                c.set('v.body', [flowComponent]);
                

                flowComponent.startFlow(flowName, [{ 
                    name : 'contextRecord', 
                    type : 'SObject',
                    value: record
                }, { 
                    name : 'selectedRecords', 
                    type : 'SObject', 
                    value: records 
                }]);
            }))
            
        }))
        .catch($A.getCallback(function(reason) {
            h.showError(c, h, 'controller.onStartFlowWithRecords: ' + reason);
        }));
        
    },
    onFlowStatusChanged : function (c, e, h) {
        switch(e.getParam('status')) {
            case 'FINISHED':
                c.set('v.body', []);
                c.getEvent('finished').fire();
                break;
            case 'FINISHED_SCREEN':
            case 'STARTED':
            case 'PAUSED':
            case 'ERROR':
                break;
        }
    },
    onFlowClosed : function (c, e, h) {
        c.set('v.body', []);
    },  
})