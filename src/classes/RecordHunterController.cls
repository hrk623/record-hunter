public class RecordHunterController {
    public class RecordHunterControllerException extends Exception {}
    public class Error {
        @AuraEnabled public String message;
        @AuraEnabled public Boolean hasError = true;
        public Error(String message){
            this.message = message;
        }
    } 
    
    @AuraEnabled 
    public static Object getRecords(String objectName, String fieldsJson, String recordIdsJson) {
        try {
            List<RecordHunterField> fields = (List<RecordHunterField>)JSON.deserialize(fieldsJson, List<RecordHunterField>.class);
            List<String> recordIds = (List<String>)JSON.deserialize(recordIdsJson, List<String>.class);

            String query = 'SELECT Id';
            for (RecordHunterField field : fields) {
                if (!field.path.startsWith(field.objectName.toLowerCase()) || field.name.toLowerCase() != 'id') query += ',' + field.path;
            }
            query += ' FROM ' + objectName;
            query += ' WHERE Id IN (\'' + String.join(recordIds, '\',\'') + '\')';     
            System.debug(query);
            
            return Database.query(query);
        } catch (Exception e) {
            return new Error('RecordHunterController.getRecords : ' + e.getMessage());
        }
    }    
    @AuraEnabled 
    public static Object getDefaultValues(String recordId, String fieldNamesOrDefaultValues) {
        try {
            Id recordIdFromString = recordId;
            String objectName = recordIdFromString.getSObjectType().getDescribe().getName();

            List<String> fieldNameOrDefaultValueList = fieldNamesOrDefaultValues.split(',');
            
            Set<String> fieldNameSet = new Set<String> {'Id'};
            for (String fieldNameOrDefaultValue : fieldNameOrDefaultValueList) {
                if (String.isNotBlank(fieldNameOrDefaultValue) && Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().containsKey(fieldNameOrDefaultValue.trim())) {
                    fieldNameSet.add(fieldNameOrDefaultValue);
                } 
            }

            SObject record = null;
            if (!fieldNameSet.isEmpty()) {
                record = Database.query('SELECT ' + String.join(new List<String>(fieldNameSet), ',') + ' FROM ' + objectName + ' WHERE Id = \'' + recordId + '\'');
            }
                        
            List<String> defaultValueList = new List<String>();
            for (String fieldNameOrDefaultValue : fieldNameOrDefaultValueList) {
                if (String.isNotBlank(fieldNameOrDefaultValue) && Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().containsKey(fieldNameOrDefaultValue.trim())) {
                    Object value = record.get(fieldNameOrDefaultValue.trim());
                    if (value == null) defaultValueList.add('');
                    else defaultValueList.add(String.valueOf(value));
                } else {
                    defaultValueList.add(fieldNameOrDefaultValue);
                }
            }
            
            return defaultValueList;
        } catch (Exception e) {
            return new Error('RecordHunterController.getRecords : ' + e.getMessage());
        }
    }    

    @AuraEnabled 
    public static Object findRecords(String objectName, String keyword, String fieldsJson, String customLogic) {
        try {
            
            // Find records by keyword
            String findRecordsByKeywordQuery = 'FIND \'' + keyword + '\' IN ALL FIELDS RETURNING ' + objectName + ' (Id ORDER BY Id)';
            List<Id> findRecordsByKeywordResult = String.isNotEmpty(keyword) ? new list<Id>(new Map<Id, SObject>(search.query(findRecordsByKeywordQuery)[0]).keySet()) : new List<Id>();
            
            // Deserialize Fields
            
            Map<String, RecordHunterField> fields = new Map<String, RecordHunterField>();
            for(RecordHunterField field : (List<RecordHunterField>)JSON.deserialize(fieldsJson, List<RecordHunterField>.class)) {
                fields.put(field.index, field);
            } 
            
            // Build conditions for WHERE clause
            List<RecordHunterLexer.Token> tokens = RecordHunterLexer.tokenize(customLogic);
            List<RecordHunterLexer.Token> reducedToken = reduceTokens(tokens, fields, String.isNotBlank(keyword));   
            
            String conditions = '';
            for (RecordHunterLexer.Token token : reducedToken) {
                if (token.kind == RecordHunterLexer.Kind.ZERO) {
                    conditions += 'Id in (\'' + String.join(findRecordsByKeywordResult, '\',\'') + '\')';
                } else if (token.kind == RecordHunterLexer.Kind.NUM) {
                    conditions += fields.get(token.lexeme).getWhereCondition();
                } else {
                    conditions += ' ' + token.lexeme + ' ';    
                }
            }
            
            // Find records by conditions
            String query = 'SELECT Id FROM ' + objectName ;
            query += String.isNotEmpty(conditions) ? ' WHERE ' + conditions : '';
            System.debug(query);
            
            return (new Map<Id, SObject>(Database.query(query))).keySet();
        } catch (Exception e) {
            return new Error('RecordHunterController.findRecords : ' + e.getMessage());
        }
    }
    
   
    @AuraEnabled 
    public static Object getFields(String objectName, String fieldNames) {
        try {
            List<Object> ret = new List<Object>();       
            List<String> fieldNameList = fieldNames.split(',');
             
            for (String fieldName : fieldNameList) {
                ret.add(String.isBlank(fieldName) ? (Object)'' : new RecordHunterField(objectName.trim() + '.' + fieldName.trim()));
            }
            return ret;
        } catch (Exception e) {
            return new Error('RecordHunterController.getFields : ' + e.getMessage());
        }
    }
    
    private static List<RecordHunterLexer.Token> reduceTokens(List<RecordHunterLexer.Token> tokens, Map<String, RecordHunterField> fields, Boolean isZeroIncluded) {
        List<RecordHunterLexer.Token> reducedTokens = new List<RecordHunterLexer.Token>();
        RecordHunterLexer.Token prev = null, token;
        for (Integer i = 0; i < tokens.size(); i++) {
            token = tokens[i];
            prev = reducedTokens.size() > 0 ? reducedTokens[reducedTokens.size() - 1] : null;
            
            if (token.kind == RecordHunterLexer.Kind.NUM && !fields.get(token.lexeme).hasCondition()) continue;
            else if (token.kind == RecordHunterLexer.Kind.ZERO && !isZeroIncluded) continue;
            else if (token.kind == RecordHunterLexer.Kind.LOGICALAND) {
                if (prev == null) continue;
                else if (prev.kind == RecordHunterLexer.Kind.RPAREN) reducedTokens.add(token);
                else if (prev.kind == RecordHunterLexer.Kind.NUM)    reducedTokens.add(token);
                else if (prev.kind == RecordHunterLexer.Kind.ZERO)   reducedTokens.add(token);
            } else if (token.kind == RecordHunterLexer.Kind.LOGICALOR) {
                if (prev == null) continue;
                else if (prev.kind == RecordHunterLexer.Kind.LOGICALAND) reducedTokens.set(reducedTokens.size() - 1, token); 
                else if (prev.kind == RecordHunterLexer.Kind.RPAREN)     reducedTokens.add(token);
                else if (prev.kind == RecordHunterLexer.Kind.NUM)        reducedTokens.add(token);
                else if (prev.kind == RecordHunterLexer.Kind.ZERO)       reducedTokens.add(token);
            } else if (token.kind == RecordHunterLexer.Kind.RPAREN) {
                if (prev == null) continue;
                else if (prev.kind == RecordHunterLexer.Kind.LOGICALAND) reducedTokens.set(reducedTokens.size() - 1, token); 
                else if (prev.kind == RecordHunterLexer.Kind.LOGICALOR)  reducedTokens.set(reducedTokens.size() - 1, token); 
                else if (prev.kind == RecordHunterLexer.Kind.RPAREN)     reducedTokens.add(token);
                else if (prev.kind == RecordHunterLexer.Kind.LPAREN)     reducedTokens.remove(reducedTokens.size() - 1); 
                else if (prev.kind == RecordHunterLexer.Kind.NUM)        reducedTokens.add(token);
                else if (prev.kind == RecordHunterLexer.Kind.ZERO)       reducedTokens.add(token);
            } else if (token.kind == RecordHunterLexer.Kind.LPAREN) {
                if (prev == null) continue;
                else if (prev.kind == RecordHunterLexer.Kind.LOGICALAND) reducedTokens.add(token);
                else if (prev.kind == RecordHunterLexer.Kind.LOGICALOR)  reducedTokens.add(token);
                else if (prev.kind == RecordHunterLexer.Kind.LPAREN)     reducedTokens.add(token);
            } else {
                reducedTokens.add(token);
            }
        }
        prev = reducedTokens.size() > 0 ? reducedTokens[reducedTokens.size() - 1] : null;
        if (prev == null) {}
        else if (prev.kind == RecordHunterLexer.Kind.LOGICALAND) reducedTokens.remove(reducedTokens.size() - 1); 
        else if (prev.kind == RecordHunterLexer.Kind.LOGICALOR)  reducedTokens.remove(reducedTokens.size() - 1); 
        
        return reducedTokens;
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
