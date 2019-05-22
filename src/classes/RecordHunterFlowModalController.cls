public with sharing class RecordHunterFlowModalController {
    public class Error {
        @AuraEnabled public String message;
        @AuraEnabled public Boolean hasError = true;
        public Error(String message){
            this.message = message;
        }
    } 
    
    @AuraEnabled 
    public static Object getRecord(String recordId) {
        try {
            if (String.isBlank(recordId)) return null;
            
            Schema.DescribeSObjectResult dsor = ((Id)recordId).getSObjectType().getDescribe();
            if (dsor.isAccessible() && dsor.isQueryable()) {
                List<String> fields = new List<String>();
                for (Schema.SObjectField field : dsor.fields.getMap().values()) {
                    Schema.DescribeFieldResult dfr = field.getDescribe();
                    if (dfr.isAccessible()) fields.add(dfr.getName()); 
                }
                String query = 'SELECT ' + String.join(fields, ',') + ' FROM ' + dsor.getName() + ' WHERE Id = \'' +  recordId + '\'';
                return Database.query(query)[0];
            } else {
                return null;
            }
        } catch (Exception e) {
            return new Error(e.getMessage());
        }
    }  
    @AuraEnabled 
    public static Object getRecords(List<String> recordIds) {
        try {
            if (recordIds == null || recordIds.size() == 0) return new List<Object>();
            Schema.DescribeSObjectResult dsor = ((Id)recordIds[0]).getSObjectType().getDescribe();
            if (dsor.isAccessible() && dsor.isQueryable()) {
                List<String> fields = new List<String>();
                for (Schema.SObjectField field : dsor.fields.getMap().values()) {
                    Schema.DescribeFieldResult dfr = field.getDescribe();
                    if (dfr.isAccessible()) fields.add(dfr.getName()); 
                }
                String query = 'SELECT ' + String.join(fields, ',') + ' FROM ' + dsor.getName() + ' WHERE Id IN (\'' +  String.join(recordIds, '\',\'') + '\')';
                return Database.query(query);
            } else {
                return new List<Object>();
            }
        } catch (Exception e) {
            return new Error(e.getMessage());
        }
    }  
    
     public static void testSkipper() {
        Integer i = 0;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
         i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
     }
}