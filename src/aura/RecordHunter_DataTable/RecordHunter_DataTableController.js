({
    valueInit : function(c, e, h) {
        h.initFlows(c, h);
        h.initColumns(c, h);
    },
    onRecordHunterEvent : function(c, e, h) {
        console.log("onRecordHunterEvent");

        c.find("dataTable").set("v.enableInfiniteLoading", true);
        c.set("v.offset", 0);
        c.set("v.recordIds", e.getParam('recordIds'));
        c.set('v.data', []);
        h.loadData(c, h);
    },
    onLoadMoreData : function (c, e, h) {
        if (c.get("v.recordIds").length > c.get("v.data").length) h.loadData(c, h); 
    },
    onSort: function (c, e, h) {
        let fieldName = e.getParam('fieldName');
        const newRecordIds = new Array();
        const sortDirection = e.getParam('sortDirection');
        c.set("v.sortedBy", fieldName);
        c.set("v.sortedDirection", sortDirection);
        h.getSortIds(c, h)
        .then($A.getCallback(function(records) {
            records.forEach(function(record, index){
                newRecordIds.push(record['Id']);
            });
            $A.get("e.c:RecordHunterEvent").setParams({ recordIds : newRecordIds }).fire();
        }))
        .catch(function(reason) {
            h.showError(c, h, "controller.onSort : " + reason);
        });
    },
    onRowAction : function (c, e, h) {
        const action = e.getParam('action');
        const row = e.getParam('row');
        switch (action.name) {
            case 'showDetail':
                const key = action.label.fieldName;
                const pathForId = key.substring(0, key.lastIndexOf(".")) + ".id";
                h.navigateToSObject(c, h, row[pathForId]);
                break;
        }
    },
    onFlowSelected : function (c, e, h) {
        const selectedIds = c.find('dataTable').getSelectedRows().reduce(function(prev, row) {
            prev.push(row[c.get('v.objectName').toLowerCase() + '.id' ]);
            return prev;
        }, []); 
        h.initFlowComponent(c, h)
        .then($A.getCallback(function(flowComponent) {
            c.set('v.modalBody', [flowComponent]);
            flowComponent.startFlow(e.getParam('value'), [{ 
                name : 'contextId', 
                type : 'String',
                value: c.get('v.recordId') 
            }, { 
                name : 'selectedIds', 
                type : 'String', 
                value: selectedIds 
            }]);
        }))
        .catch(function(reason) {
            h.showError(c, h, "controller.onFlowSelected : " + reason);
        });   
    },
    onFlowStatusChanged : function (c, e, h) {
        switch(e.getParam('status')) {
            case 'FINISHED':
                c.set('v.modalBody', []);
                c.find("dataTable").set("v.enableInfiniteLoading", true);
                c.set("v.offset", 0);
                c.set('v.data', []);
                h.loadData(c, h);
                break;
            case 'FINISHED_SCREEN':
            case 'STARTED':
            case 'PAUSED':
            case 'ERROR':
                break;
        }
    },
    onFlowClosed : function (c, e, h) {
        c.set('v.modalBody', []);
    },    
})
