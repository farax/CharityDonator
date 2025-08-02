import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { registerRoutes } from '../server/routes';
import { storage } from '../server/storage';
import { type Case, type InsertCase } from '../shared/schema';

describe('Case Management Integration Tests', () => {
  let app: Express;
  let testCases: Case[] = [];

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    await registerRoutes(app);

    // Clean up any existing test cases
    const existingCases = await storage.getCases();
    for (const existingCase of existingCases) {
      if (existingCase.title.includes('Integration Test')) {
        await storage.deleteCase(existingCase.id);
      }
    }
  });

  afterEach(async () => {
    // Clean up test data
    for (const testCase of testCases) {
      try {
        await storage.deleteCase(testCase.id);
      } catch (error) {
        // Case might already be deleted
      }
    }
    testCases = [];
  });

  describe('Admin Dashboard Case Management Flow', () => {
    it('should complete full case management workflow', async () => {
      // 1. Create a new case via API (simulating admin form submission)
      const caseData: InsertCase = {
        title: 'Integration Test - Emergency Medical Case',
        description: 'This is an integration test case for emergency medical assistance that requires urgent funding.',
        imageUrl: 'https://example.com/integration-test-image.jpg',
        amountRequired: 15000,
        active: true
      };

      let response = await request(app)
        .post('/api/cases')
        .send(caseData)
        .expect(201);

      const createdCase: Case = response.body;
      testCases.push(createdCase);

      expect(createdCase.title).toBe(caseData.title);
      expect(createdCase.amountCollected).toBe(0);
      expect(createdCase.active).toBe(true);

      // 2. Retrieve the case to verify it's in the system
      response = await request(app)
        .get(`/api/cases/${createdCase.id}`)
        .expect(200);

      expect(response.body.id).toBe(createdCase.id);

      // 3. Update case details (simulating admin editing)
      const updateData = {
        title: 'Integration Test - Emergency Medical Case (Updated)',
        amountRequired: 20000,
        description: 'This case has been updated with new information about the medical emergency requiring more funding.'
      };

      response = await request(app)
        .put(`/api/cases/${createdCase.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.amountRequired).toBe(updateData.amountRequired);
      expect(response.body.description).toBe(updateData.description);

      // 4. Simulate donations being processed (webhook updating case amount)
      response = await request(app)
        .patch(`/api/cases/${createdCase.id}/amount-collected`)
        .send({ additionalAmount: 5000 })
        .expect(200);

      expect(response.body.amountCollected).toBe(5000);

      // 5. Add more donations
      response = await request(app)
        .patch(`/api/cases/${createdCase.id}/amount-collected`)
        .send({ additionalAmount: 2500 })
        .expect(200);

      expect(response.body.amountCollected).toBe(7500);

      // 6. Toggle case status (deactivate)
      response = await request(app)
        .patch(`/api/cases/${createdCase.id}/toggle-status`)
        .expect(200);

      expect(response.body.active).toBe(false);

      // 7. Verify case appears in all cases list with correct status
      response = await request(app)
        .get('/api/cases')
        .expect(200);

      const allCases = response.body as Case[];
      const foundCase = allCases.find(c => c.id === createdCase.id);
      expect(foundCase).toBeDefined();
      expect(foundCase?.active).toBe(false);
      expect(foundCase?.amountCollected).toBe(7500);

      // 8. Verify inactive case is NOT in active zakaat cases
      response = await request(app)
        .get('/api/active-zakaat-cases')
        .expect(200);

      const activeZakaatCases = response.body as Case[];
      const foundActiveCase = activeZakaatCases.find(c => c.id === createdCase.id);
      expect(foundActiveCase).toBeUndefined();

      // 9. Reactivate the case
      response = await request(app)
        .patch(`/api/cases/${createdCase.id}/toggle-status`)
        .expect(200);

      expect(response.body.active).toBe(true);

      // 10. Verify case now appears in active zakaat cases
      response = await request(app)
        .get('/api/active-zakaat-cases')
        .expect(200);

      const updatedActiveZakaatCases = response.body as Case[];
      const foundReactivatedCase = updatedActiveZakaatCases.find(c => c.id === createdCase.id);
      expect(foundReactivatedCase).toBeDefined();
      expect(foundReactivatedCase?.active).toBe(true);

      // 11. Final verification of case progress calculation
      const progress = (foundReactivatedCase!.amountCollected / foundReactivatedCase!.amountRequired) * 100;
      expect(progress).toBe(37.5); // 7500 / 20000 * 100
    });

    it('should handle multiple cases with different statuses', async () => {
      // Create multiple test cases
      const caseData1: InsertCase = {
        title: 'Integration Test - Case 1 Active',
        description: 'This is the first integration test case that should remain active for testing purposes.',
        imageUrl: 'https://example.com/test-case-1.jpg',
        amountRequired: 5000,
        active: true
      };

      const caseData2: InsertCase = {
        title: 'Integration Test - Case 2 Inactive',
        description: 'This is the second integration test case that will be deactivated for testing purposes.',
        imageUrl: 'https://example.com/test-case-2.jpg',
        amountRequired: 8000,
        active: true
      };

      // Create both cases
      let response1 = await request(app)
        .post('/api/cases')
        .send(caseData1)
        .expect(201);

      let response2 = await request(app)
        .post('/api/cases')
        .send(caseData2)
        .expect(201);

      const case1: Case = response1.body;
      const case2: Case = response2.body;
      testCases.push(case1, case2);

      // Deactivate case 2
      await request(app)
        .patch(`/api/cases/${case2.id}/toggle-status`)
        .expect(200);

      // Add donations to both cases
      await request(app)
        .patch(`/api/cases/${case1.id}/amount-collected`)
        .send({ additionalAmount: 1000 })
        .expect(200);

      await request(app)
        .patch(`/api/cases/${case2.id}/amount-collected`)
        .send({ additionalAmount: 2000 })
        .expect(200);

      // Verify all cases list includes both
      const allCasesResponse = await request(app)
        .get('/api/cases')
        .expect(200);

      const allCases = allCasesResponse.body as Case[];
      expect(allCases.length).toBeGreaterThanOrEqual(2);

      const foundCase1 = allCases.find(c => c.id === case1.id);
      const foundCase2 = allCases.find(c => c.id === case2.id);

      expect(foundCase1).toBeDefined();
      expect(foundCase2).toBeDefined();
      expect(foundCase1?.active).toBe(true);
      expect(foundCase2?.active).toBe(false);

      // Verify active zakaat cases only includes active case
      const activeResponse = await request(app)
        .get('/api/active-zakaat-cases')
        .expect(200);

      const activeCases = activeResponse.body as Case[];
      const foundActiveCase1 = activeCases.find(c => c.id === case1.id);
      const foundActiveCase2 = activeCases.find(c => c.id === case2.id);

      expect(foundActiveCase1).toBeDefined();
      expect(foundActiveCase2).toBeUndefined();
    });

    it('should validate case data on creation and updates', async () => {
      // Test invalid case creation
      const invalidCaseData = {
        title: '', // Empty title
        description: 'Short', // Too short description
        imageUrl: 'not-a-url', // Invalid URL
        amountRequired: -100 // Negative amount
      };

      await request(app)
        .post('/api/cases')
        .send(invalidCaseData)
        .expect(400);

      // Test valid case creation
      const validCaseData: InsertCase = {
        title: 'Integration Test - Valid Case',
        description: 'This is a valid integration test case with proper data for testing validation.',
        imageUrl: 'https://example.com/valid-test-case.jpg',
        amountRequired: 3000,
        active: true
      };

      const response = await request(app)
        .post('/api/cases')
        .send(validCaseData)
        .expect(201);

      const createdCase: Case = response.body;
      testCases.push(createdCase);

      // Test invalid update
      const invalidUpdateData = {
        title: '', // Empty title
        amountRequired: -500 // Negative amount
      };

      await request(app)
        .put(`/api/cases/${createdCase.id}`)
        .send(invalidUpdateData)
        .expect(400);

      // Test valid update
      const validUpdateData = {
        title: 'Integration Test - Updated Valid Case',
        amountRequired: 4500
      };

      await request(app)
        .put(`/api/cases/${createdCase.id}`)
        .send(validUpdateData)
        .expect(200);
    });
  });
});