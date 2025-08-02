import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { registerRoutes } from '../server/routes';
import { storage } from '../server/storage';
import { type Case, type InsertCase } from '../shared/schema';

describe('Case Management API Tests', () => {
  let app: Express;
  let server: any;
  let testCase: Case;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    server = registerRoutes(app);

    // Clean up any existing test cases
    const existingCases = await storage.getCases();
    for (const existingCase of existingCases) {
      if (existingCase.title.includes('API Test Case')) {
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
    
    if (server?.close) {
      server.close();
    }
  });

  describe('GET /api/cases', () => {
    it('should return all cases', async () => {
      // Create a test case first
      const caseData: InsertCase = {
        title: 'API Test Case - Get All',
        description: 'This is an API test case for testing the get all cases endpoint functionality.',
        imageUrl: 'https://example.com/api-test.jpg',
        amountRequired: 3000,
        active: true
      };
      testCase = await storage.createCase(caseData);

      const response = await request(app)
        .get('/api/cases')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      const foundCase = response.body.find((c: Case) => c.id === testCase.id);
      expect(foundCase).toBeDefined();
      expect(foundCase.title).toBe(testCase.title);
    });

    it('should return empty array when no cases exist', async () => {
      // Delete all existing cases
      const allCases = await storage.getCases();
      for (const caseItem of allCases) {
        await storage.deleteCase(caseItem.id);
      }

      const response = await request(app)
        .get('/api/cases')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/cases/:id', () => {
    beforeEach(async () => {
      const caseData: InsertCase = {
        title: 'API Test Case - Get Single',
        description: 'This is an API test case for testing the get single case endpoint functionality.',
        imageUrl: 'https://example.com/api-single-test.jpg',
        amountRequired: 2500,
        active: true
      };
      testCase = await storage.createCase(caseData);
    });

    it('should return a specific case by ID', async () => {
      const response = await request(app)
        .get(`/api/cases/${testCase.id}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBe(testCase.id);
      expect(response.body.title).toBe(testCase.title);
      expect(response.body.description).toBe(testCase.description);
    });

    it('should return 404 for non-existent case', async () => {
      const response = await request(app)
        .get('/api/cases/99999')
        .expect(404);

      expect(response.body.message).toBe('Case not found');
    });

    it('should return 404 for invalid case ID', async () => {
      await request(app)
        .get('/api/cases/invalid-id')
        .expect(404);
    });
  });

  describe('POST /api/cases', () => {
    it('should create a new case with valid data', async () => {
      const caseData: InsertCase = {
        title: 'API Test Case - Create',
        description: 'This is an API test case for testing the create case endpoint functionality.',
        imageUrl: 'https://example.com/api-create-test.jpg',
        amountRequired: 4000,
        active: true
      };

      const response = await request(app)
        .post('/api/cases')
        .send(caseData)
        .expect(201);

      testCase = response.body;
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

    it('should create case with minimal valid data', async () => {
      const caseData: InsertCase = {
        title: 'API Test Case - Minimal',
        description: 'This is an API test case with minimal data for testing endpoint functionality.',
        imageUrl: 'https://example.com/api-minimal-test.jpg',
        amountRequired: 1000
      };

      const response = await request(app)
        .post('/api/cases')
        .send(caseData)
        .expect(201);

      testCase = response.body;
      expect(testCase.active).toBe(true); // Should default to true
    });

    it('should return 400 for invalid data', async () => {
      const invalidData = {
        title: '', // Empty title
        description: 'Short', // Too short
        imageUrl: 'not-a-url', // Invalid URL
        amountRequired: -100 // Negative amount
      };

      const response = await request(app)
        .post('/api/cases')
        .send(invalidData)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        title: 'API Test Case - Incomplete'
        // Missing description, imageUrl, and amountRequired
      };

      const response = await request(app)
        .post('/api/cases')
        .send(incompleteData)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('PUT /api/cases/:id', () => {
    beforeEach(async () => {
      const caseData: InsertCase = {
        title: 'API Test Case - Update',
        description: 'This is an API test case for testing the update case endpoint functionality.',
        imageUrl: 'https://example.com/api-update-test.jpg',
        amountRequired: 3500,
        active: true
      };
      testCase = await storage.createCase(caseData);
    });

    it('should update case with partial data', async () => {
      const updateData = {
        title: 'API Test Case - Updated Title',
        amountRequired: 5000
      };

      const response = await request(app)
        .put(`/api/cases/${testCase.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.amountRequired).toBe(updateData.amountRequired);
      expect(response.body.description).toBe(testCase.description); // Unchanged
    });

    it('should update case with complete data', async () => {
      const updateData: Partial<InsertCase> = {
        title: 'API Test Case - Completely Updated',
        description: 'This case has been completely updated through the API for testing purposes.',
        imageUrl: 'https://example.com/api-updated-image.jpg',
        amountRequired: 7500,
        active: false
      };

      const response = await request(app)
        .put(`/api/cases/${testCase.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.description).toBe(updateData.description);
      expect(response.body.imageUrl).toBe(updateData.imageUrl);
      expect(response.body.amountRequired).toBe(updateData.amountRequired);
      expect(response.body.active).toBe(updateData.active);
    });

    it('should return 404 for non-existent case', async () => {
      const updateData = { title: 'Non-existent Case' };

      const response = await request(app)
        .put('/api/cases/99999')
        .send(updateData)
        .expect(404);

      expect(response.body.message).toBe('Case not found');
    });

    it('should return 400 for invalid update data', async () => {
      const invalidData = {
        title: '', // Empty title
        amountRequired: -500 // Negative amount
      };

      const response = await request(app)
        .put(`/api/cases/${testCase.id}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('DELETE /api/cases/:id', () => {
    beforeEach(async () => {
      const caseData: InsertCase = {
        title: 'API Test Case - Delete',
        description: 'This is an API test case for testing the delete case endpoint functionality.',
        imageUrl: 'https://example.com/api-delete-test.jpg',
        amountRequired: 2000,
        active: true
      };
      testCase = await storage.createCase(caseData);
    });

    it('should delete an existing case', async () => {
      const response = await request(app)
        .delete(`/api/cases/${testCase.id}`)
        .expect(200);

      expect(response.body.message).toBe('Case deleted successfully');

      // Verify case is deleted
      await request(app)
        .get(`/api/cases/${testCase.id}`)
        .expect(404);

      testCase = null as any; // Prevent cleanup attempt
    });

    it('should return 404 for non-existent case', async () => {
      const response = await request(app)
        .delete('/api/cases/99999')
        .expect(404);

      expect(response.body.message).toBe('Case not found');
    });
  });

  describe('PATCH /api/cases/:id/toggle-status', () => {
    beforeEach(async () => {
      const caseData: InsertCase = {
        title: 'API Test Case - Toggle Status',
        description: 'This is an API test case for testing the toggle status endpoint functionality.',
        imageUrl: 'https://example.com/api-toggle-test.jpg',
        amountRequired: 3000,
        active: true
      };
      testCase = await storage.createCase(caseData);
    });

    it('should toggle case status from active to inactive', async () => {
      expect(testCase.active).toBe(true);

      const response = await request(app)
        .patch(`/api/cases/${testCase.id}/toggle-status`)
        .expect(200);

      expect(response.body.active).toBe(false);
    });

    it('should toggle case status from inactive to active', async () => {
      // First, make the case inactive
      await request(app)
        .patch(`/api/cases/${testCase.id}/toggle-status`)
        .expect(200);

      // Then toggle it back to active
      const response = await request(app)
        .patch(`/api/cases/${testCase.id}/toggle-status`)
        .expect(200);

      expect(response.body.active).toBe(true);
    });

    it('should return 404 for non-existent case', async () => {
      const response = await request(app)
        .patch('/api/cases/99999/toggle-status')
        .expect(404);

      expect(response.body.message).toBe('Case not found');
    });
  });

  describe('PATCH /api/cases/:id/amount-collected', () => {
    beforeEach(async () => {
      const caseData: InsertCase = {
        title: 'API Test Case - Amount Update',
        description: 'This is an API test case for testing the amount update endpoint functionality.',
        imageUrl: 'https://example.com/api-amount-test.jpg',
        amountRequired: 5000,
        active: true
      };
      testCase = await storage.createCase(caseData);
    });

    it('should update case amount collected', async () => {
      expect(testCase.amountCollected).toBe(0);

      const response = await request(app)
        .patch(`/api/cases/${testCase.id}/amount-collected`)
        .send({ additionalAmount: 1500 })
        .expect(200);

      expect(response.body.amountCollected).toBe(1500);
    });

    it('should accumulate multiple amount updates', async () => {
      // First update
      await request(app)
        .patch(`/api/cases/${testCase.id}/amount-collected`)
        .send({ additionalAmount: 1000 })
        .expect(200);

      // Second update
      const response = await request(app)
        .patch(`/api/cases/${testCase.id}/amount-collected`)
        .send({ additionalAmount: 750 })
        .expect(200);

      expect(response.body.amountCollected).toBe(1750);
    });

    it('should return 400 for invalid amount', async () => {
      const response = await request(app)
        .patch(`/api/cases/${testCase.id}/amount-collected`)
        .send({ additionalAmount: -100 })
        .expect(400);

      expect(response.body.message).toBe('Additional amount must be a positive number');
    });

    it('should return 400 for missing amount', async () => {
      const response = await request(app)
        .patch(`/api/cases/${testCase.id}/amount-collected`)
        .send({})
        .expect(400);

      expect(response.body.message).toBe('Additional amount must be a positive number');
    });

    it('should return 404 for non-existent case', async () => {
      const response = await request(app)
        .patch('/api/cases/99999/amount-collected')
        .send({ additionalAmount: 100 })
        .expect(404);

      expect(response.body.message).toBe('Case not found');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete case lifecycle', async () => {
      // Create case
      const caseData: InsertCase = {
        title: 'API Test Case - Lifecycle',
        description: 'This is an API test case for testing the complete case lifecycle functionality.',
        imageUrl: 'https://example.com/api-lifecycle-test.jpg',
        amountRequired: 10000,
        active: true
      };

      let response = await request(app)
        .post('/api/cases')
        .send(caseData)
        .expect(201);

      testCase = response.body;
      expect(testCase.amountCollected).toBe(0);

      // Add some donations
      response = await request(app)
        .patch(`/api/cases/${testCase.id}/amount-collected`)
        .send({ additionalAmount: 2500 })
        .expect(200);

      expect(response.body.amountCollected).toBe(2500);

      // Update case details
      const updateData = {
        title: 'API Test Case - Lifecycle Updated',
        amountRequired: 12000
      };

      response = await request(app)
        .put(`/api/cases/${testCase.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe(updateData.title);
      expect(response.body.amountRequired).toBe(updateData.amountRequired);
      expect(response.body.amountCollected).toBe(2500); // Should be preserved

      // Toggle status
      response = await request(app)
        .patch(`/api/cases/${testCase.id}/toggle-status`)
        .expect(200);

      expect(response.body.active).toBe(false);

      // Verify in list
      response = await request(app)
        .get('/api/cases')
        .expect(200);

      const foundCase = response.body.find((c: Case) => c.id === testCase.id);
      expect(foundCase).toBeDefined();
      expect(foundCase.title).toBe(updateData.title);
      expect(foundCase.active).toBe(false);

      // Delete case
      await request(app)
        .delete(`/api/cases/${testCase.id}`)
        .expect(200);

      // Verify deletion
      await request(app)
        .get(`/api/cases/${testCase.id}`)
        .expect(404);

      testCase = null as any;
    });
  });
});