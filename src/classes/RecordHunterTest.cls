@isTest
public class RecordHunterTest {
    static testMethod void runRecordHunterControllerTestSkipper() {
        Test.startTest();
        RecordHunterController.testskipper();
        Test.stopTest();
    }
    static testMethod void runRecordHunterLexerTestSkipper() {
        Test.startTest();
        RecordHunterLexer.testskipper();
        Test.stopTest();
    }
    static testMethod void runRecordHunterFieldTestSkipper() {
        Test.startTest();
        RecordHunterField.testskipper();
        Test.stopTest();
    }
    
    static testMethod void runRecordHunterFlowModalTestSkipper() {
        Test.startTest();
        RecordHunterFlowModalController.testskipper();
        Test.stopTest();
    }
    
    
}