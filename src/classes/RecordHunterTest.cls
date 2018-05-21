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
    static testMethod void runFieldTestSkipper() {
        Test.startTest();
        Field.testskipper();
        Test.stopTest();
    }
}