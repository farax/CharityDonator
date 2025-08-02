import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { storage } from '../server/storage';
import { insertCaseSchema, type Case, type InsertCase } from '../shared/schema';

describe('Case Management Tests', () => {
  let testCase: Case;
  
  beforeEach(async () => {
    // Clean up any existing test cases
    const existingCases = await storage.getCases();
    for (const existingCase of existingCases) {
      if (existingCase.title.includes('Test Case')) {
        await storage.deleteCase(existingCase.id);
      }
    }
  });

  afterEach(async () => {
    // Clean up test data
    if (testCase?.id) {
      try {
        await storage.deleteCase(testCase.id);
      } catch (error) {
        // Case might already be deleted in some tests
      }
    }
  });

  describe('Case Creation', () => {
    it('should create a new case with valid data', async () => {
      const caseData: InsertCase = {
        title: 'Test Case - Medical Emergency',
        description: 'A test case for medical emergency fundraising to help a family in need.',
        imageUrl: 'https://example.com/test-image.jpg',
        amountRequired: 5000,
        active: true
      };

      // Validate data against schema
      const validatedData = insertCaseSchema.parse(caseData);
      expect(validatedData).toEqual(caseData);

      // Create case
      testCase = await storage.createCase(caseData);
      
      expect(testCase).toBeDefined();
      expect(testCase.id).toBeTypeOf('number');
      expect(testCase.title).toBe(caseData.title);
      expect(testCase.description).toBe(caseData.description);
      expect(testCase.imageUrl).toBe(caseData.imageUrl);
      expect(testCase.amountRequired).toBe(caseData.amountRequired);
      expect(testCase.amountCollected).toBe(0);
      expect(testCase.active).toBe(true);
      expect(testCase.createdAt).toBeDefined();
    });

    it('should reject case creation with invalid data', () => {
      const invalidCaseData = {
        title: '', // Empty title should fail
        description: 'Short', // Too short description
        imageUrl: 'not-a-url', // Invalid URL
        amountRequired: -100, // Negative amount
        active: true
      };

      expect(() => insertCaseSchema.parse(invalidCaseData)).toThrow();
    });

    it('should create case with default values', async () => {
      const minimalCaseData: InsertCase = {
        title: 'Test Case - Minimal Data',
        description: 'This is a test case with minimal required data for validation purposes.',
        imageUrl: 'https://example.com/minimal-image.jpg',
        amountRequired: 1000
      };

      testCase = await storage.createCase(minimalCaseData);
      
      expect(testCase.amountCollected).toBe(0);
      expect(testCase.active).toBe(true); // Should default to true
    });
  });

  describe('Case Retrieval', () => {
    beforeEach(async () => {
      const caseData: InsertCase = {
        title: 'Test Case - For Retrieval',
        description: 'A test case created specifically for testing retrieval functionality.',
        imageUrl: 'https://example.com/retrieval-test.jpg',
        amountRequired: 3000,
        active: true
      };
      testCase = await storage.createCase(caseData);
    });

    it('should retrieve all cases', async () => {
      const cases = await storage.getCases();
      
      expect(Array.isArray(cases)).toBe(true);
      expect(cases.length).toBeGreaterThan(0);
      
      const foundCase = cases.find(c => c.id === testCase.id);
      expect(foundCase).toBeDefined();
      expect(foundCase?.title).toBe(testCase.title);
    });

    it('should retrieve a specific case by ID', async () => {
      const retrievedCase = await storage.getCase(testCase.id);
      
      expect(retrievedCase).toBeDefined();
      expect(retrievedCase?.id).toBe(testCase.id);
      expect(retrievedCase?.title).toBe(testCase.title);
      expect(retrievedCase?.description).toBe(testCase.description);
    });

    it('should return undefined for non-existent case', async () => {
      const nonExistentCase = await storage.getCase(99999);
      expect(nonExistentCase).toBeUndefined();
    });

    it('should retrieve only active zakaat cases', async () => {
      // Create an inactive case
      const inactiveCaseData: InsertCase = {
        title: 'Test Case - Inactive Zakaat',
        description: 'An inactive test case for zakaat that should not appear in active zakaat cases.',
        imageUrl: 'https://example.com/inactive-zakaat.jpg',
        amountRequired: 2000,
        active: false
      };
      const inactiveCase = await storage.createCase(inactiveCaseData);

      try {
        const activeZakaatCases = await storage.getActiveZakaatCases();
        
        expect(Array.isArray(activeZakaatCases)).toBe(true);
        
        // Should include our active test case
        const foundActiveCase = activeZakaatCases.find(c => c.id === testCase.id);
        expect(foundActiveCase).toBeDefined();
        
        // Should not include the inactive case
        const foundInactiveCase = activeZakaatCases.find(c => c.id === inactiveCase.id);
        expect(foundInactiveCase).toBeUndefined();
        
        // All returned cases should be active
        for (const caseItem of activeZakaatCases) {
          expect(caseItem.active).toBe(true);
        }
      } finally {
        await storage.deleteCase(inactiveCase.id);
      }
    });
  });

  describe('Case Updates', () => {
    beforeEach(async () => {
      const caseData: InsertCase = {
        title: 'Test Case - For Updates',
        description: 'A test case created specifically for testing update functionality.',
        imageUrl: 'https://example.com/update-test.jpg',
        amountRequired: 4000,
        active: true
      };
      testCase = await storage.createCase(caseData);
    });

    it('should update case with partial data', async () => {
      const updateData = {
        title: 'Test Case - Updated Title',
        amountRequired: 6000
      };

      const updatedCase = await storage.updateCase(testCase.id, updateData);
      
      expect(updatedCase).toBeDefined();
      expect(updatedCase?.title).toBe(updateData.title);
      expect(updatedCase?.amountRequired).toBe(updateData.amountRequired);
      expect(updatedCase?.description).toBe(testCase.description); // Should remain unchanged
      expect(updatedCase?.imageUrl).toBe(testCase.imageUrl); // Should remain unchanged
    });

    it('should update case with complete data', async () => {
      const updateData: Partial<InsertCase> = {
        title: 'Test Case - Completely Updated',
        description: 'This case has been completely updated with new information for testing purposes.',
        imageUrl: 'https://example.com/updated-image.jpg',
        amountRequired: 7500,
        active: false
      };

      const updatedCase = await storage.updateCase(testCase.id, updateData);
      
      expect(updatedCase).toBeDefined();
      expect(updatedCase?.title).toBe(updateData.title);
      expect(updatedCase?.description).toBe(updateData.description);
      expect(updatedCase?.imageUrl).toBe(updateData.imageUrl);
      expect(updatedCase?.amountRequired).toBe(updateData.amountRequired);
      expect(updatedCase?.active).toBe(updateData.active);
    });

    it('should return undefined when updating non-existent case', async () => {
      const updateData = { title: 'Non-existent Case' };
      const result = await storage.updateCase(99999, updateData);
      expect(result).toBeUndefined();
    });

    it('should toggle case status', async () => {
      expect(testCase.active).toBe(true);

      // Toggle to inactive
      const toggledCase = await storage.toggleCaseStatus(testCase.id);
      expect(toggledCase).toBeDefined();
      expect(toggledCase?.active).toBe(false);

      // Toggle back to active
      const toggledBackCase = await storage.toggleCaseStatus(testCase.id);
      expect(toggledBackCase).toBeDefined();
      expect(toggledBackCase?.active).toBe(true);
    });

    it('should return undefined when toggling non-existent case', async () => {
      const result = await storage.toggleCaseStatus(99999);
      expect(result).toBeUndefined();
    });

    it('should update case amount collected', async () => {
      expect(testCase.amountCollected).toBe(0);

      // Add first donation
      const updatedCase1 = await storage.updateCaseAmountCollected(testCase.id, 1000);
      expect(updatedCase1).toBeDefined();
      expect(updatedCase1?.amountCollected).toBe(1000);

      // Add second donation
      const updatedCase2 = await storage.updateCaseAmountCollected(testCase.id, 500);
      expect(updatedCase2).toBeDefined();
      expect(updatedCase2?.amountCollected).toBe(1500);

      // Add third donation
      const updatedCase3 = await storage.updateCaseAmountCollected(testCase.id, 250);
      expect(updatedCase3).toBeDefined();
      expect(updatedCase3?.amountCollected).toBe(1750);
    });

    it('should return undefined when updating amount for non-existent case', async () => {
      const result = await storage.updateCaseAmountCollected(99999, 100);
      expect(result).toBeUndefined();
    });
  });

  describe('Case Deletion', () => {
    beforeEach(async () => {
      const caseData: InsertCase = {
        title: 'Test Case - For Deletion',
        description: 'A test case created specifically for testing deletion functionality.',
        imageUrl: 'https://example.com/deletion-test.jpg',
        amountRequired: 2500,
        active: true
      };
      testCase = await storage.createCase(caseData);
    });

    it('should delete an existing case', async () => {
      const deleteResult = await storage.deleteCase(testCase.id);
      expect(deleteResult).toBe(true);

      // Verify case is actually deleted
      const deletedCase = await storage.getCase(testCase.id);
      expect(deletedCase).toBeUndefined();

      // Clear testCase to prevent cleanup attempt
      testCase = null as any;
    });

    it('should return false when deleting non-existent case', async () => {
      const deleteResult = await storage.deleteCase(99999);
      expect(deleteResult).toBe(false);
    });

    it('should handle deletion of case that has received donations', async () => {
      // Add some donations to the case
      await storage.updateCaseAmountCollected(testCase.id, 500);
      const updatedCase = await storage.getCase(testCase.id);
      expect(updatedCase?.amountCollected).toBe(500);

      // Delete the case
      const deleteResult = await storage.deleteCase(testCase.id);
      expect(deleteResult).toBe(true);

      // Verify case is deleted
      const deletedCase = await storage.getCase(testCase.id);
      expect(deletedCase).toBeUndefined();

      testCase = null as any;
    });
  });

  describe('Case Progress Calculation', () => {
    beforeEach(async () => {
      const caseData: InsertCase = {
        title: 'Test Case - Progress Calculation',
        description: 'A test case for testing progress calculation functionality.',
        imageUrl: 'https://example.com/progress-test.jpg',
        amountRequired: 1000,
        active: true
      };
      testCase = await storage.createCase(caseData);
    });

    it('should calculate progress correctly', async () => {
      // 0% progress initially
      expect(testCase.amountCollected).toBe(0);
      let progress = (testCase.amountCollected / testCase.amountRequired) * 100;
      expect(progress).toBe(0);

      // 25% progress
      let updatedCase = await storage.updateCaseAmountCollected(testCase.id, 250);
      progress = (updatedCase!.amountCollected / updatedCase!.amountRequired) * 100;
      expect(progress).toBe(25);

      // 50% progress
      updatedCase = await storage.updateCaseAmountCollected(testCase.id, 250);
      progress = (updatedCase!.amountCollected / updatedCase!.amountRequired) * 100;
      expect(progress).toBe(50);

      // 100% progress
      updatedCase = await storage.updateCaseAmountCollected(testCase.id, 500);
      progress = (updatedCase!.amountCollected / updatedCase!.amountRequired) * 100;
      expect(progress).toBe(100);

      // Over 100% progress
      updatedCase = await storage.updateCaseAmountCollected(testCase.id, 200);
      progress = (updatedCase!.amountCollected / updatedCase!.amountRequired) * 100;
      expect(progress).toBe(120);
    });
  });

  describe('Case Data Validation', () => {
    it('should validate required fields', () => {
      expect(() => insertCaseSchema.parse({})).toThrow();
      expect(() => insertCaseSchema.parse({ title: 'Test' })).toThrow();
      expect(() => insertCaseSchema.parse({ 
        title: 'Test',
        description: 'Test description' 
      })).toThrow();
    });

    it('should validate field types and constraints', () => {
      // Invalid title (empty)
      expect(() => insertCaseSchema.parse({
        title: '',
        description: 'Valid description that meets minimum length requirements',
        imageUrl: 'https://example.com/image.jpg',
        amountRequired: 1000
      })).toThrow();

      // Invalid description (too short)
      expect(() => insertCaseSchema.parse({
        title: 'Valid Title',
        description: 'Short',
        imageUrl: 'https://example.com/image.jpg',
        amountRequired: 1000
      })).toThrow();

      // Invalid URL
      expect(() => insertCaseSchema.parse({
        title: 'Valid Title',
        description: 'Valid description that meets minimum length requirements',
        imageUrl: 'not-a-valid-url',
        amountRequired: 1000
      })).toThrow();

      // Invalid amount (negative)
      expect(() => insertCaseSchema.parse({
        title: 'Valid Title',
        description: 'Valid description that meets minimum length requirements',
        imageUrl: 'https://example.com/image.jpg',
        amountRequired: -100
      })).toThrow();

      // Invalid amount (zero)
      expect(() => insertCaseSchema.parse({
        title: 'Valid Title',
        description: 'Valid description that meets minimum length requirements',
        imageUrl: 'https://example.com/image.jpg',
        amountRequired: 0
      })).toThrow();
    });

    it('should accept valid data', () => {
      const validData = {
        title: 'Valid Case Title',
        description: 'This is a valid description that meets the minimum length requirements for case creation.',
        imageUrl: 'https://example.com/valid-image.jpg',
        amountRequired: 5000,
        active: true
      };

      expect(() => insertCaseSchema.parse(validData)).not.toThrow();
      const parsed = insertCaseSchema.parse(validData);
      expect(parsed).toEqual(validData);
    });
  });
});