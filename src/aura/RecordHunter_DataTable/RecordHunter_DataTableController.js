({
    valueInit : function(c, e, h) {
        h.initFlows(c, h);
        h.initColumns(c, h);
    },
    onRecordHunterEvent : function(c, e, h) {
        c.set("v.recordIds", e.getParam('recordIds'));
    },
    onRecordIdsChanged : function(c, e, h) {
        c.set('v.data', []);
        c.find("dataTable").set("v.enableInfiniteLoading", true);
        c.set("v.offset", 0);

        h.loadData(c, h);
    },
    onLoadMoreData : function (c, e, h) {
        h.loadData(c, h); 
    },
        onSort: function (c, e, h) {
        const fieldName = e.getParam('fieldName');
        const sortDirection = e.getParam('sortDirection');
        c.set("v.sortedBy", fieldName);
        c.set("v.sortedDirection", sortDirection);
        const data = c.get("v.data");
        data.sort(function(a, b) {
            let val1 = a[fieldName], val2 = b[fieldName];
            val1 = typeof val1 === 'string' || val1 instanceof String ? val1.toUpperCase() : val1;
            val2 = typeof val2 === 'string' || val2 instanceof String ? val2.toUpperCase() : val2;
            const reverse = sortDirection === 'asc' ? 1 : -1;
            if(val1 === undefined) return -1 * reverse;
            if(val2 === undefined) return 1 * reverse;
            if(val1 < val2) return -1 * reverse;
            if(val1 > val2) return 1 * reverse;
            return 0;
        })
        c.set("v.data", data);
    },
    onRowAction : function (c, e, h) {
        const action = e.getParam('action');
        const row = e.getParam('row');
        const recordId = row[e.getParam('action').name + '.id'];
        h.navigateToSObject(c, h, recordId);
    },
    onFlowSelected : function (c, e, h) {
        const selectedIds = c.find('dataTable').getSelectedRows().reduce(function(prev, row) {
            prev.push(row[c.get('v.objectName') + '.Id' ]);
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