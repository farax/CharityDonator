import { 
  users, type User, type InsertUser, 
  donations, type Donation, type InsertDonation,
  endorsements, type Endorsement, type InsertEndorsement,
  stats, type Stats, type InsertStats,
  cases, type Case, type InsertCase
} from "@shared/schema";

// Define the storage interface with all necessary CRUD methods
import session from "express-session";

export interface IStorage {
  // Session store for admin authentication
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Admin methods
  validateAdminCredentials(username: string, password: string): Promise<boolean>;
  
  // Donation methods
  createDonation(donation: InsertDonation): Promise<Donation>;
  getDonation(id: number): Promise<Donation | undefined>;
  updateDonationStatus(id: number, status: string, paymentId?: string): Promise<Donation | undefined>;
  getDonations(): Promise<Donation[]>;
  
  // Endorsement methods
  getEndorsements(): Promise<Endorsement[]>;
  createEndorsement(endorsement: InsertEndorsement): Promise<Endorsement>;
  
  // Stats methods
  getStats(): Promise<Stats | undefined>;
  updateStats(statsData: Partial<InsertStats>): Promise<Stats | undefined>;
  
  // Case methods
  getCases(): Promise<Case[]>;
  getActiveZakaatCases(): Promise<Case[]>;
  getCase(id: number): Promise<Case | undefined>;
  createCase(caseData: InsertCase): Promise<Case>;
  updateCaseAmountCollected(id: number, additionalAmount: number): Promise<Case | undefined>;
}

import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private donations: Map<number, Donation>;
  private endorsementsList: Map<number, Endorsement>;
  private casesList: Map<number, Case>;
  private statsData: Stats | undefined;
  
  // Add session store for admin authentication
  public sessionStore: session.Store;
  
  private userCurrentId: number;
  private donationCurrentId: number;
  private endorsementCurrentId: number;
  private caseCurrentId: number;

  constructor() {
    this.users = new Map();
    this.donations = new Map();
    this.endorsementsList = new Map();
    this.casesList = new Map();
    
    this.userCurrentId = 1;
    this.donationCurrentId = 1;
    this.endorsementCurrentId = 1;
    this.caseCurrentId = 1;
    
    // Initialize with sample data
    this.initializeData();
  }

  private initializeData() {
    // Initialize stats
    this.statsData = {
      id: 1,
      totalPatients: 124568,
      monthlyPatients: 3247,
      lastUpdated: new Date()
    };
    
    // Initialize endorsements
    const sampleEndorsements: InsertEndorsement[] = [
      { name: "World Health Organization", type: "Global Partner", logoUrl: "who" },
      { name: "Red Cross", type: "Emergency Response", logoUrl: "redcross" },
      { name: "UNICEF", type: "Children's Health", logoUrl: "unicef" },
      { name: "Doctors Without Borders", type: "Medical Services", logoUrl: "dwb" },
      { name: "Gates Foundation", type: "Strategic Partner", logoUrl: "gates" }
    ];
    
    sampleEndorsements.forEach(endorsement => {
      this.createEndorsement(endorsement);
    });
    
    // Initialize donation cases
    const sampleCases: InsertCase[] = [
      { 
        title: "Emergency Medical Supplies for Flood Victims",
        description: "Providing essential medical supplies to families affected by recent flooding in rural communities. Your donation will help us deliver critical medications, first aid kits, and clean water tablets.",
        imageUrl: "/images/cases/flood-victims.jpg",
        amountRequired: 5000,
        active: true
      },
      { 
        title: "Children's Immunization Program",
        description: "Funding immunization programs for children in underserved areas. These vaccinations protect against preventable diseases and save lives.",
        imageUrl: "/images/cases/immunization.jpg",
        amountRequired: 7500,
        active: true
      },
      { 
        title: "Mobile Medical Clinic",
        description: "Supporting our mobile medical clinic that provides healthcare to remote villages without access to medical facilities. The clinic offers basic health screenings, treatments, and health education.",
        imageUrl: "/images/cases/mobile-clinic.jpg",
        amountRequired: 12000,
        active: true
      },
      { 
        title: "Medical Equipment for Rural Clinic",
        description: "Purchasing essential medical equipment for our rural clinic that serves hundreds of patients weekly. This equipment will enhance diagnostic capabilities and treatment options.",
        imageUrl: "/images/cases/rural-clinic.jpg",
        amountRequired: 8500,
        active: true
      },
      { 
        title: "Maternal Health Services",
        description: "Funding prenatal and postnatal care for expectant mothers in underserved communities. Your donation helps provide safe deliveries and healthy starts for mothers and babies.",
        imageUrl: "/images/cases/maternal-health.jpg",
        amountRequired: 6000,
        active: true
      }
    ];
    
    sampleCases.forEach(caseData => {
      this.createCase(caseData);
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Admin methods
  async validateAdminCredentials(username: string, password: string): Promise<boolean> {
    // In a real app, you would use proper password hashing
    // This is a simplified version for demonstration purposes
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    return username === adminUsername && password === adminPassword;
  }
  
  // Donation methods
  async createDonation(insertDonation: InsertDonation): Promise<Donation> {
    const id = this.donationCurrentId++;
    const donation: Donation = { 
      ...insertDonation, 
      id, 
      createdAt: new Date(),
      name: insertDonation.name || null,
      email: insertDonation.email || null,
      status: insertDonation.status || 'pending',
      currency: insertDonation.currency || 'USD',
      frequency: insertDonation.frequency || 'one-off',
      stripePaymentId: insertDonation.stripePaymentId || null,
      paymentMethod: insertDonation.paymentMethod || null,
      caseId: insertDonation.caseId || null,
      destinationProject: insertDonation.destinationProject || null
    };
    this.donations.set(id, donation);
    return donation;
  }
  
  async getDonation(id: number): Promise<Donation | undefined> {
    return this.donations.get(id);
  }
  
  async updateDonationStatus(id: number, status: string, paymentId?: string): Promise<Donation | undefined> {
    const donation = this.donations.get(id);
    if (!donation) return undefined;
    
    // Extract payment method from the ID if not already set
    let paymentMethod = donation.paymentMethod;
    if (!paymentMethod && paymentId) {
      if (paymentId.startsWith('paypal-')) {
        paymentMethod = 'paypal';
      } else if (paymentId.startsWith('applepay-')) {
        paymentMethod = 'apple_pay';
      } else if (paymentId.startsWith('googlepay-')) {
        paymentMethod = 'google_pay';
      } else if (paymentId.startsWith('pi_')) {
        paymentMethod = 'stripe';
      }
    }
    
    const updatedDonation: Donation = {
      ...donation,
      status,
      ...(paymentMethod && { paymentMethod }),
      ...(paymentId && { stripePaymentId: paymentId })
    };
    
    // If this is a completed payment for a case, update the case amount
    if (status === 'completed' && donation.caseId && donation.status !== 'completed') {
      await this.updateCaseAmountCollected(donation.caseId, donation.amount);
    }
    
    this.donations.set(id, updatedDonation);
    return updatedDonation;
  }
  
  async getDonations(): Promise<Donation[]> {
    return Array.from(this.donations.values());
  }
  
  // Endorsement methods
  async getEndorsements(): Promise<Endorsement[]> {
    return Array.from(this.endorsementsList.values());
  }
  
  async createEndorsement(insertEndorsement: InsertEndorsement): Promise<Endorsement> {
    const id = this.endorsementCurrentId++;
    const endorsement: Endorsement = { ...insertEndorsement, id };
    this.endorsementsList.set(id, endorsement);
    return endorsement;
  }
  
  // Stats methods
  async getStats(): Promise<Stats | undefined> {
    return this.statsData;
  }
  
  async updateStats(statsData: Partial<InsertStats>): Promise<Stats | undefined> {
    if (!this.statsData) return undefined;
    
    this.statsData = {
      ...this.statsData,
      ...statsData,
      lastUpdated: new Date()
    };
    
    return this.statsData;
  }
  
  // Case methods
  async getCases(): Promise<Case[]> {
    return Array.from(this.casesList.values());
  }
  
  async getActiveZakaatCases(): Promise<Case[]> {
    return Array.from(this.casesList.values()).filter(
      (caseItem) => caseItem.active && caseItem.amountCollected < caseItem.amountRequired
    );
  }
  
  async getCase(id: number): Promise<Case | undefined> {
    return this.casesList.get(id);
  }
  
  async createCase(caseData: InsertCase): Promise<Case> {
    const id = this.caseCurrentId++;
    const newCase: Case = {
      ...caseData,
      id,
      amountCollected: 0,
      active: caseData.active !== undefined ? caseData.active : true,
      createdAt: new Date()
    };
    this.casesList.set(id, newCase);
    return newCase;
  }
  
  async updateCaseAmountCollected(id: number, additionalAmount: number): Promise<Case | undefined> {
    const caseItem = this.casesList.get(id);
    if (!caseItem) return undefined;
    
    const updatedCase: Case = {
      ...caseItem,
      amountCollected: caseItem.amountCollected + additionalAmount
    };
    
    this.casesList.set(id, updatedCase);
    return updatedCase;
  }
}

export const storage = new MemStorage();
