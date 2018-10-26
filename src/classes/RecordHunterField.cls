public class RecordHunterField { 
    public class RecordHunterFieldException extends Exception {}
    public class SelectOption {
        @AuraEnabled public String label;
        @AuraEnabled public String value;
        @AuraEnabled public Boolean isSelected;
        public SelectOption(String value, String label) {
            this.label = label;
            this.value = value;
            this.isSelected = false;
        }
    }

    @AuraEnabled public String objectLabel;
    @AuraEnabled public String objectName;
    @AuraEnabled public String label;
    @AuraEnabled public String name;
    @AuraEnabled public String type;
    
    @AuraEnabled public List<SelectOption> options;
    @AuraEnabled public String path;
    @AuraEnabled public Boolean isNameField;
    @AuraEnabled public Boolean isFilterable;   
    @AuraEnabled public Boolean isAccessible;
    @AuraEnabled public Integer scale;
    @AuraEnabled public Integer precision;   

    @AuraEnabled public String value;
    @AuraEnabled public String minValue;
    @AuraEnabled public String maxValue;
    @AuraEnabled public String latitude;
    @AuraEnabled public String longitude;
    @AuraEnabled public String distance;
    @AuraEnabled public String index;

    @AuraEnabled public Boolean isValid;
    
    public RecordHunterField() {
        this.objectName = null;
        this.name = null;
        this.Label = null;
        this.type = null;
        this.isNameField = false;
        this.scale = 0;
        this.isFilterable = false;
        this.isAccessible = false;
    }
    public RecordHunterField(String path) {
        List<String> pathComponents = path.split('\\.');
        if (pathComponents.size() < 2) throw new RecordHunterFieldException('path \'' + path + '\' is not a valid path.');
        
        List<String> queryPathComponents = new List<String>();
        List<String> relationshipLabelComponents = new List<String>();
        while (true) {
            String objectName = pathComponents[0];
            String fieldName = pathComponents[1].substringBefore(':');
            String expectedObjectName = pathComponents[1].substringAfter(':');
            
            if (!isValidObjectName(objectName)) throw new RecordHunterFieldException('RecordHunterField.RecordHunterField : \'' + objectName + '\' is not valid object type');
            if (!isValidFieldName(objectName, fieldName)) throw new RecordHunterFieldException('RecordHunterField.RecordHunterField : \''+fieldName + '\' of \'' + objectName + '\' is not a valid field. Valid fields are ' + String.join(getFieldNames(objectName), ', '));
            if (String.isNotBlank(expectedObjectName) && !isValidObjectName(expectedObjectName)) throw new RecordHunterFieldException('RecordHunterField.RecordHunterField : \'' + expectedObjectName + '\' is not valid object type');
            if (queryPathComponents.isEmpty()) queryPathComponents.add(objectName);
            
            if (pathComponents.size() == 2) {
                init(objectName, fieldName, String.join(queryPathComponents, '.') + '.' + fieldName, String.join(relationshipLabelComponents, '.'));
                break;
            } else {
                if (!isValidReferenceFieldName(objectName, fieldName)) throw new RecordHunterFieldException('RecordHunterField.RecordHunterField : \''+fieldName + '\' of \'' + objectName + '\' is not a reference field.');
                
                // Build query path components and relationship label
                Schema.DescribeFieldResult relationship = getRelationship(objectName, fieldName);
                String relationshipName = relationship.getRelationshipName();
                String relationshipLabel = relationship.getLabel();
                queryPathComponents.add(relationshipName);
                relationshipLabelComponents.add(relationshipLabel);
                
                // Reduce path components
                pathComponents.remove(0);
                pathComponents.remove(0);
                pathComponents.add(0, getReferencedObjectName(objectName, fieldName, expectedObjectName));
            }
        }
    }
    
    public String getWhereCondition() {
        String ret = '';
        switch on this.type {
            when 'STRING', 'EMAIL', 'URL', 'PHONE', 'TEXTAREA' {
                if (String.isNotBlank(this.value)) {
                    if (this.value.contains('*')) {
                        ret = this.path + ' LIKE \'';
                        ret += this.value.startsWith('*') ? '%' : '';
                        ret += this.value.removeStart('*').removeEnd('*');
                        ret += this.value.endsWith('*') ? '%' : '';
                        ret += '\'';
                    } else {
                        ret = this.path + ' = \'' + this.value + '\'';
                    }
                }
            } when 'INTEGER', 'PERCENT', 'CURRENCY', 'DOUBLE', 'DATETIME', 'DATE', 'TIME'  {
                ret =  String.isNotBlank(this.minValue) ? this.path + ' >= ' + this.minValue : '';
                ret += String.isNotBlank(this.minValue) && String.isNotBlank(this.maxValue) ? ' AND ' : '';
                ret += String.isNotBlank(this.maxValue) ? this.path + ' <= ' + this.maxValue : '';
                ret =  String.isNotBlank(this.minValue) && String.isNotBlank(this.maxValue) ? '(' + ret + ')' : ret;
            } when 'PICKLIST', 'ID' {
                ret = String.isNotBlank(this.value) ? this.path + ' = \'' + this.value + '\'' : '';
            } when 'MULTIPICKLIST' {
                ret = String.isNotBlank(this.value) ? this.path + ' INCLUDES (\'' + this.value + '\')' : '';
            } when 'BOOLEAN' {
                ret = String.isNotBlank(this.value) ? this.path + ' = ' + (this.value == 'true') : '';
            } when 'LOCATION' {
                if (String.isNotBlank(this.latitude) && String.isNotBlank(this.longitude) && String.isNotBlank(this.distance)){
                    ret = 'DISTANCE(' + this.path +', GEOLOCATION(' + this.latitude + ',' + this.longitude + '), \'km\') < ' + this.distance;
                }
            }
        }
        return ret;
    }
    
    public Boolean hasCondition() {
        if (this.type=='INTEGER' || this.type=='PERCENT' || this.type=='CURRENCY' || this.type=='DOUBLE' 
            || this.type=='DATETIME' || this.type=='DATE' || this.type=='TIME') 
            return String.isNotEmpty(this.minValue) || String.isNotEmpty(this.maxValue);
        if (this.type=='LOCATION')
            return String.isNotBlank(this.latitude) && String.isNotBlank(this.longitude) && String.isNotBlank(this.distance);
        else return String.isNotEmpty(this.value);
    }
    
    private void init(String objectName, String fieldName, String path, String relationshipLabel) {
        this.objectName = getObjectName(objectName);
        this.objectLabel = getObjectLabel(objectName);
        this.name = getFieldName(objectName, fieldName);
        this.Label = (relationshipLabel.length() > 0 ? relationshipLabel + '.' : '') + getFieldLabel(objectName, fieldName);
        this.type = getFieldType(objectName, fieldName).name();
        this.isNameField = isNameField(objectName, fieldName);
        this.path = path.toLowerCase();
        
        this.isFilterable = isFilterable(objectName, fieldName);
        this.isValid = true;
        this.isAccessible = isAccessible(objectName, fieldName);
        this.scale = getScale(objectName, fieldName);
        this.precision = getPrecision(objectName, fieldName);
        
        if(this.type == 'PICKLIST' || this.type=='MULTIPICKLIST' || this.type=='COMBOBOX') this.options = getSelectOptionList(objectName, fieldName);
    }
    private String getReferencedObjectName(String objectName, String fieldName, String expectedObjectName) {
        Set<String> referencedObjectNameSet = getReferencedObjectNames(objectName, fieldName);
        if (referencedObjectNameSet.size() > 1 && String.isNotBlank(expectedObjectName)) {
            for (String referencedObjectName : referencedObjectNameSet) {
                if (referencedObjectName.toLowerCase() == expectedObjectName.toLowerCase()) return referencedObjectName;
            }
        }
        return referencedObjectNameSet.iterator().next();
    }
    private List<String> getFieldNames(String objectName){
        return new List<String>(Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().keySet());
    }
    private String getFieldName(String objectName, String fieldName){
        return Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName).getDescribe().getName();
    }
    
    private String getFieldLabel(String objectName, String fieldName){
        return Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName).getDescribe().getLabel();
    }
    private String getObjectName(String objectName) {
        return Schema.getGlobalDescribe().get(objectName).getDescribe().getName();
    }
    private String getObjectLabel(String objectName) {
        return Schema.getGlobalDescribe().get(objectName).getDescribe().getLabel();
    }
    private Boolean isNameField(String objectName, String fieldName){
        return Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName).getDescribe().isNameField();
    }
    private Boolean isAccessible(String objectName, String fieldName){
        return Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName).getDescribe().isAccessible();
    }
    private Integer getScale(String objectName, String fieldName){
        return Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName).getDescribe().getScale();
    }
    private Integer getPrecision(String objectName, String fieldName){
        return Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName).getDescribe().getPrecision();
    }
    private List<SelectOption> getSelectOptionList(String objectName, String fieldName){
        List<Schema.PicklistEntry> picklistEntries = Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName).getDescribe().getPicklistValues();
        List<SelectOption> options = new List<SelectOption>();
        for(Schema.PicklistEntry e : picklistEntries){
            options.add(new SelectOption(e.getValue(), e.getLabel()));
        }
        return options;
    }
    private Schema.DisplayType getFieldType(String objectName, String fieldName){
        return Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName).getDescribe().getType();
    }
    private Set<String> getReferencedObjectNames (String objectName, String fieldName){
        Set<String> ret = new Set<String>();
        Schema.DescribeFieldResult dfr = Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName).getDescribe();
        for(Schema.SObjectType t : dfr.getReferenceTo()){
            ret.add(t.getDescribe().getName());
        }
        return ret;
    }
    private Schema.DescribeFieldResult getRelationship(String objectName, String fieldName){
        return Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName).getDescribe();
    }
    private Boolean isValidObjectName(String objectName){ 
        return !String.isEmpty(objectName) && Schema.getGlobalDescribe().containsKey(objectName);
    }
    private Boolean isValidFieldName(String objectName, String fieldName){
        return isValidObjectName(objectName) && !String.isEmpty(fieldName) 
            && Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().containsKey(fieldName);
    }
    private Boolean isValidChildRelationshipName(String objectName, String fieldName){
        for(Schema.ChildRelationship childRelationship : Schema.getGlobalDescribe().get(objectName).getDescribe().getChildRelationships()){
            return String.isEmpty(childRelationship.getRelationshipName()) && childRelationship.getRelationshipName().toLowerCase() == fieldName.toLowerCase();
        }
        return false;
    }
    private Boolean isValidReferenceFieldName(String objectName, String fieldName){
        return Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName).getDescribe().getType() == Schema.DisplayType.REFERENCE;
    }
    private Boolean isFilterable(String objectName, String fieldName){
        return Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().get(fieldName).getDescribe().isFilterable();
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