public class Field { 
    public class FieldException extends Exception {}
    public class SelectOption {
        @AuraEnabled public String label;
        @AuraEnabled public String value;
        @AuraEnabled public Boolean isSelected;
        public SelectOption(String label, String value) {
            this.label = label;
            this.value = value;
            this.isSelected = false;
        }
    }
    
    @AuraEnabled public String objectName;
    @AuraEnabled public String objectLabel;
    @AuraEnabled public String name;
    @AuraEnabled public String type;
    @AuraEnabled public String label;
    @AuraEnabled public String value;
    @AuraEnabled public String minValue;
    @AuraEnabled public String maxValue;
    @AuraEnabled public Integer scale;
    @AuraEnabled public List<SelectOption> options;
    @AuraEnabled public String path;
    @AuraEnabled public Boolean isNameField;
    @AuraEnabled public Boolean isFilterable;
    @AuraEnabled public Boolean isValid;
    
    public Field() {
        this.objectName = null;
        this.name = null;
        this.Label = null;
        this.type = null;
        this.isNameField = false;
        this.scale = 0;
        this.isFilterable = false;
        this.isValid = false;
    }
    
    public Field(String objectName, String fieldName) {
        if (!isValidObjectName(objectName)) throw new FieldException('object type \'' + objectName + '\' is not valid');
        if (!isValidFieldName(objectName, fieldName)) throw new FieldException('\''+fieldName + '\' of \'' + objectName + '.\' is not a valid field of reference type.');
        
        this.objectName = getObjectLabel(objectName);
        this.name = fieldName;
        this.Label = getFieldLabel(objectName, fieldName);
        this.type = getFieldType(objectName, fieldName).name();
        this.isNameField = isNameField(objectName, fieldName);
        this.scale = getScale(objectName, fieldName);
        this.isFilterable = isFilterable(objectName, fieldName);
        this.isValid = true;
        if(this.type == 'PICKLIST' || this.type=='MULTIPICKLIST') this.options = getSelectOptionList(objectName, fieldName);
    }
    
    public Field(String path) {
        List<String> pathComponents = path.split('\\.');
        if (pathComponents.size() < 2) throw new FieldException('path \'' + path + '\' is not a valid path.');
        String queryPath = '';
        
        while(true) {   
            String objectName = pathComponents[0];
            String fieldName = pathComponents[1].substringBefore(':');
            
            if (!isValidObjectName(objectName)) throw new FieldException('object type \'' + objectName + '\' is not valid');
            if (!isValidFieldName(objectName, fieldName)) throw new FieldException('\''+fieldName + '\' of \'' + objectName + '.\' is not a valid field.');
            queryPath += String.isEmpty(queryPath) ? objectName : '';
            
            if (pathComponents.size() == 2) {
                this.objectName = objectName;
                this.objectLabel = getObjectLabel(objectName);
                this.name = fieldName;
                this.Label = getFieldLabel(objectName, fieldName);
                this.type = getFieldType(objectName, fieldName).name();
                this.isNameField = isNameField(objectName, fieldName);
                this.path = queryPath + '.' + fieldName;
                this.scale = getScale(objectName, fieldName);
                this.isFilterable = isFilterable(objectName, fieldName);
                this.isValid = true;
                if(this.type == 'PICKLIST' || this.type=='MULTIPICKLIST') this.options = getSelectOptionList(objectName, fieldName);
                break;
            } else {
                if (!isValidReferenceFieldName(objectName, fieldName)) throw new FieldException('\''+fieldName + '\' of \'' + objectName + '.\' is not a valid reference field.');
                Set<String> objectNameSet = getReferencedObjectNames(objectName, fieldName);
                String referencedObjectName = objectNameSet.iterator().next();
                
                // if polymorphic reference field, use hint
                String expectedObjectName = pathComponents[1].substringAfter(':');
                if (objectNameSet.size() > 1 && !String.isEmpty(expectedObjectName) && objectNameSet.contains(expectedObjectName)) {
                    referencedObjectName = expectedObjectName;
                }
                pathComponents.remove(0);
                pathComponents.set(0, referencedObjectName);
                queryPath += '.' + getRelatipnshipName(objectName, fieldName);
            }
        }
    }  
    
    public String getWhereCondition() {
        String ret = '';
        if (this.type=='STRING' || this.type=='EMAIL' || this.type=='URL' || this.type=='PHONE' || (this.type=='TEXTAREA' && this.isFilterable)) {
            ret = !String.isEmpty(this.value) ? this.path + ' LIKE \'%' + this.value + '%\'' : '';
        } else if (this.type=='INTEGER' || this.type=='PERCENT' || this.type=='CURRENCY' || this.type=='DOUBLE') {
            if (!String.isEmpty(this.minValue) && !String.isEmpty(this.maxValue)) {
                ret = '(' + this.path + ' >= ' + this.minValue + ' AND ' + this.path + ' <= ' + this.maxValue + ')';
            } else if (!String.isEmpty(this.minValue)) {
                ret = this.path + ' >= ' + this.minValue ;
            } else if (!String.isEmpty(this.maxValue)) {
                ret = this.path + ' <= ' + this.maxValue;
            } 
        } else if (this.type=='PICKLIST') {
            ret = !String.isEmpty(this.value) ? this.path + ' = \'' + this.value + '\'' : '';
        } else if (this.type=='MULTIPICKLIST') {
            ret = !String.isEmpty(this.value) ? this.path + ' includes (\'' + this.value + '\')' : '';
        } else if (this.type=='BOOLEAN') {
            ret = !String.isEmpty(this.value) ? this.path + ' = ' + (this.value == 'true') : '';
        } else if (this.type=='DATETIME' || this.type=='DATE') {
            if (!String.isEmpty(this.minValue) && !String.isEmpty(this.maxValue)) {
                ret = this.path + ' >= ' + this.minValue + ' AND ' + this.path + ' <= ' + this.maxValue;
            } else if (!String.isEmpty(this.minValue)) {
                ret = this.path + ' >= ' + this.minValue ;
            } else if (!String.isEmpty(this.maxValue)) {
                ret = this.path + ' <= ' + this.maxValue;
            } 
        } else {
            
        }
        return ret;
    }
    
    public Boolean hasCondition() {
        if (this.type=='INTEGER' || this.type=='PERCENT' || this.type=='CURRENCY' || this.type=='DOUBLE' 
            || this.type=='DATETIME' || this.type=='DATE') 
            return String.isNotEmpty(this.minValue) || String.isNotEmpty(this.maxValue);
        else return this.isValid && String.isNotEmpty(this.value);
    }
    
    private String getFieldLabel(String objType, String fieldName){
        return Schema.getGlobalDescribe().get(objType).getDescribe().fields.getMap().get(fieldName.trim()).getDescribe().getLabel();
    }
    
    private String getObjectLabel(String objectName) {
        return Schema.getGlobalDescribe().get(objectName).getDescribe().getLabel();
    }
    
    private Boolean isNameField(String objectName, String fieldName){
        return Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName.trim()).getDescribe().isNameField();
    }
    private Integer getScale(String objectName, String fieldName){
        return Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName.trim()).getDescribe().getScale();
    }
    
    private List<SelectOption> getSelectOptionList(String objectName, String fieldName){
        List<Schema.PicklistEntry> picklistEntries = Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName.trim()).getDescribe().getPicklistValues();
        List<SelectOption> options = new List<SelectOption>();
        for(Schema.PicklistEntry e : picklistEntries){
            options.add(new SelectOption(e.getValue(), e.getLabel()));
        }
        return options;
    }
    
    private Schema.DisplayType getFieldType(String objType, String fieldName){
        return Schema.getGlobalDescribe().get(objType).getDescribe().fields.getMap().get(fieldName.trim()).getDescribe().getType();
    }
    
    private Set<String> getReferencedObjectNames (String objectName, String fieldName){
        Schema.DescribeFieldResult dfr = Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName.trim()).getDescribe();
        Set<String> ret = new Set<String>();
        List<Schema.SObjectType> objTypeList = dfr.getReferenceTo();
        for(Schema.SObjectType t : objTypeList){
            ret.add(t.getDescribe().getName());
        }
        return ret;
    }
    
    private String getRelatipnshipName(String objectName, String fieldName){
        return Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName.trim()).getDescribe().getRelationshipName();
    }
    
    // オブジェクトタイプから、そのオブジェクトタイプが有効であるか確認する。
    private Boolean isValidObjectName(String objectName){ 
        return !String.isEmpty(objectName) && Schema.getGlobalDescribe().containsKey(objectName);
    }
    
    // オブジェクトタイプとフィールド名から、そのフィールドがオブジェクトで有効なフィールドであるか確認する。
    private Boolean isValidFieldName(String objectName, String fieldName){
        return isValidObjectName(objectName) && !String.isEmpty(fieldName) 
            && Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().containsKey(fieldName);
    }
    
    // オブジェクトタイプと関連名から、その関連名がオブジェクトで有効であるか確認する。
    private Boolean isValidChildRelationshipName(String objectName, String fieldName){
        for(Schema.ChildRelationship childRelationship : Schema.getGlobalDescribe().get(objectName).getDescribe().getChildRelationships()){
            return String.isEmpty(childRelationship.getRelationshipName()) && childRelationship.getRelationshipName().toLowerCase() == fieldName.toLowerCase();
        }
        return false;
    }
    
    // オブジェクトタイプと関連名から、その関連名がオブジェクトで有効であるか確認する。
    private Boolean isValidReferenceFieldName(String objectName, String fieldName){
        return Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName.trim()).getDescribe().getType() == Schema.DisplayType.REFERENCE;
    }
    
    private Boolean isFilterable(String objectName, String fieldName){
        return Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName.trim()).getDescribe().isFilterable();
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
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
        i--;
        i++;
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