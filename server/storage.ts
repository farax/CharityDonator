import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { 
  users, type User, type InsertUser, 
  donations, type Donation, type InsertDonation,
  endorsements, type Endorsement, type InsertEndorsement,
  stats, type Stats, type InsertStats,
  cases, type Case, type InsertCase,
  contactMessages, type ContactMessage, type InsertContactMessage
} from "@shared/schema";
import { db, pool, isDatabaseAvailable } from './db';
import { eq, and, asc, desc, gt } from 'drizzle-orm';

// Define the storage interface with all necessary CRUD methods
export interface IStorage {
  // Session store for admin authentication
  sessionStore: session.Store;
  
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserPaymentInfo(id: number, stripeCustomerId?: string, paypalCustomerId?: string): Promise<User | undefined>;
  
  // Admin methods
  validateAdminCredentials(username: string, password: string): Promise<boolean>;
  
  // Donation methods
  createDonation(donation: InsertDonation): Promise<Donation>;
  getDonation(id: number): Promise<Donation | undefined>;
  getDonationByStripePaymentId(paymentId: string): Promise<Donation | undefined>;
  getDonationByStripeSubscriptionId(subscriptionId: string): Promise<Donation | undefined>;
  getDonationByPaypalSubscriptionId(subscriptionId: string): Promise<Donation | undefined>;
  updateDonationStatus(id: number, status: string, paymentId?: string): Promise<Donation | undefined>;
  updateDonationSubscription(
    id: number, 
    provider: 'stripe' | 'paypal', 
    subscriptionId: string, 
    subscriptionStatus: string, 
    nextPaymentDate?: Date | null
  ): Promise<Donation | undefined>;
  updateDonationDonor(id: number, name: string, email: string): Promise<Donation | undefined>;
  updateDonationAmount(id: number, amount: number): Promise<Donation | undefined>;
  getDonations(): Promise<Donation[]>;
  getDonationsByUserId(userId: number): Promise<Donation[]>;
  getActiveSubscriptions(): Promise<Donation[]>;
  
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
  
  // Contact message methods
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getContactMessages(): Promise<ContactMessage[]>;
  getContactMessage(id: number): Promise<ContactMessage | undefined>;
  markContactMessageAsRead(id: number): Promise<ContactMessage | undefined>;
}

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private donations: Map<number, Donation>;
  private endorsementsList: Map<number, Endorsement>;
  private casesList: Map<number, Case>;
  private contactMessagesList: Map<number, ContactMessage>;
  private statsData: Stats | undefined;
  
  // Session store for admin authentication
  public sessionStore: session.Store;
  
  private userCurrentId: number;
  private donationCurrentId: number;
  private endorsementCurrentId: number;
  private caseCurrentId: number;
  private contactMessageCurrentId: number;

  constructor() {
    this.users = new Map();
    this.donations = new Map();
    this.endorsementsList = new Map();
    this.casesList = new Map();
    this.contactMessagesList = new Map();
    
    this.userCurrentId = 1;
    this.donationCurrentId = 1;
    this.endorsementCurrentId = 1;
    this.caseCurrentId = 1;
    this.contactMessageCurrentId = 1;
    
    // Initialize memory store for session data
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
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
      { name: "Rahbar Foundation", type: "Medication supply partner", logoUrl: "rahbar-trust", url: "https://rahbartrust.org/" },
      { name: "Al-Ihsan Institute", type: "Religious rulings partner", logoUrl: "al-ihsan", url: "https://www.al-ihsan.com.au/" }
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
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { 
      ...insertUser, 
      id,
      email: insertUser.email || null,
      stripeCustomerId: null,
      paypalCustomerId: null
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUserPaymentInfo(id: number, stripeCustomerId?: string, paypalCustomerId?: string): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = {
      ...user,
      ...(stripeCustomerId && { stripeCustomerId }),
      ...(paypalCustomerId && { paypalCustomerId })
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
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
      stripeSubscriptionId: insertDonation.stripeSubscriptionId || null,
      paypalSubscriptionId: insertDonation.paypalSubscriptionId || null,
      subscriptionStatus: insertDonation.subscriptionStatus || null,
      nextPaymentDate: insertDonation.nextPaymentDate || null,
      userId: insertDonation.userId || null,
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
  
  async getDonationByStripePaymentId(paymentId: string): Promise<Donation | undefined> {
    return Array.from(this.donations.values()).find(
      (donation) => donation.stripePaymentId === paymentId
    );
  }
  
  async getDonationByStripeSubscriptionId(subscriptionId: string): Promise<Donation | undefined> {
    return Array.from(this.donations.values()).find(
      (donation) => donation.stripeSubscriptionId === subscriptionId
    );
  }
  
  async getDonationByPaypalSubscriptionId(subscriptionId: string): Promise<Donation | undefined> {
    return Array.from(this.donations.values()).find(
      (donation) => donation.paypalSubscriptionId === subscriptionId
    );
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
      ...(paymentId && { stripePaymentId: paymentId }),
      stripeSubscriptionId: donation.stripeSubscriptionId || null,
      paypalSubscriptionId: donation.paypalSubscriptionId || null,
      subscriptionStatus: donation.subscriptionStatus || null,
      nextPaymentDate: donation.nextPaymentDate || null,
      userId: donation.userId || null
    };
    
    // If this is a completed payment for a case, update the case amount
    if (status === 'completed' && donation.caseId && donation.status !== 'completed') {
      await this.updateCaseAmountCollected(donation.caseId, donation.amount);
    }
    
    this.donations.set(id, updatedDonation);
    return updatedDonation;
  }
  
  async updateDonationSubscription(
    id: number, 
    provider: 'stripe' | 'paypal', 
    subscriptionId: string, 
    subscriptionStatus: string, 
    nextPaymentDate?: Date | null
  ): Promise<Donation | undefined> {
    const donation = this.donations.get(id);
    if (!donation) return undefined;
    
    let status = donation.status;
    // If subscription is active, mark the donation as active-subscription
    if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
      status = 'active-subscription';
    } 
    // If subscription is cancelled or other terminal state, mark as subscription-cancelled
    else if (
      subscriptionStatus === 'cancelled' || 
      subscriptionStatus === 'canceled' || 
      subscriptionStatus === 'expired'
    ) {
      status = 'subscription-cancelled';
    }
    
    const updatedDonation: Donation = {
      ...donation,
      status,
      subscriptionStatus,
      nextPaymentDate: nextPaymentDate || null,
      ...(provider === 'stripe' ? { stripeSubscriptionId: subscriptionId } : { paypalSubscriptionId: subscriptionId }),
      stripeSubscriptionId: provider === 'stripe' ? subscriptionId : (donation.stripeSubscriptionId || null),
      paypalSubscriptionId: provider === 'paypal' ? subscriptionId : (donation.paypalSubscriptionId || null)
    };
    
    this.donations.set(id, updatedDonation);
    return updatedDonation;
  }
  
  async getDonations(): Promise<Donation[]> {
    return Array.from(this.donations.values());
  }
  
  async getDonationsByUserId(userId: number): Promise<Donation[]> {
    return Array.from(this.donations.values()).filter(
      (donation) => donation.userId === userId
    );
  }
  
  async getActiveSubscriptions(): Promise<Donation[]> {
    return Array.from(this.donations.values()).filter(
      (donation) => 
        donation.status === 'active-subscription' && 
        (donation.stripeSubscriptionId || donation.paypalSubscriptionId)
    );
  }
  
  async updateDonationDonor(id: number, name: string, email: string): Promise<Donation | undefined> {
    const donation = this.donations.get(id);
    if (!donation) return undefined;
    
    const updatedDonation: Donation = {
      ...donation,
      name,
      email
    };
    
    // Update the donation in the map
    this.donations.set(id, updatedDonation);
    
    return updatedDonation;
  }
  
  // Endorsement methods
  async getEndorsements(): Promise<Endorsement[]> {
    return Array.from(this.endorsementsList.values());
  }
  
  async createEndorsement(insertEndorsement: InsertEndorsement): Promise<Endorsement> {
    const id = this.endorsementCurrentId++;
    const endorsement: Endorsement = { 
      ...insertEndorsement, 
      id, 
      url: insertEndorsement.url || null 
    };
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
  
  // Contact message methods
  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const id = this.contactMessageCurrentId++;
    const contactMessage: ContactMessage = {
      ...message,
      id,
      createdAt: new Date(),
      isRead: false
    };
    this.contactMessagesList.set(id, contactMessage);
    return contactMessage;
  }
  
  async getContactMessages(): Promise<ContactMessage[]> {
    return Array.from(this.contactMessagesList.values());
  }
  
  async getContactMessage(id: number): Promise<ContactMessage | undefined> {
    return this.contactMessagesList.get(id);
  }
  
  async markContactMessageAsRead(id: number): Promise<ContactMessage | undefined> {
    const message = this.contactMessagesList.get(id);
    if (!message) return undefined;
    
    const updatedMessage: ContactMessage = {
      ...message,
      isRead: true
    };
    
    this.contactMessagesList.set(id, updatedMessage);
    return updatedMessage;
  }
}

// Implementation of the IStorage interface using PostgreSQL
export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;
  
  constructor() {
    if (!pool) {
      throw new Error('Cannot initialize DatabaseStorage without a database connection pool');
    }
    
    // Create a PostgreSQL session store
    const PostgresStore = connectPg(session);
    this.sessionStore = new PostgresStore({
      pool,
      tableName: 'session',
      createTableIfMissing: true
    });
    
    console.log('Using PostgreSQL for data storage and session management');
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    if (!db) return undefined;
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) return undefined;
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!db) return undefined;
    if (!email) return undefined;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!db) throw new Error('Database not available');
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  
  async updateUserPaymentInfo(id: number, stripeCustomerId?: string, paypalCustomerId?: string): Promise<User | undefined> {
    if (!db) return undefined;
    
    const updateData: Partial<User> = {};
    if (stripeCustomerId) updateData.stripeCustomerId = stripeCustomerId;
    if (paypalCustomerId) updateData.paypalCustomerId = paypalCustomerId;
    
    if (Object.keys(updateData).length === 0) return this.getUser(id);
    
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
      
    return updatedUser;
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
    if (!db) throw new Error('Database not available');
    const [donation] = await db.insert(donations).values(insertDonation).returning();
    
    // If this is a completed payment for a case, update the case amount
    if (donation.status === 'completed' && donation.caseId) {
      await this.updateCaseAmountCollected(donation.caseId, donation.amount);
    }
    
    return donation;
  }
  
  async getDonation(id: number): Promise<Donation | undefined> {
    if (!db) return undefined;
    const [donation] = await db.select().from(donations).where(eq(donations.id, id));
    return donation;
  }
  
  async getDonationByStripePaymentId(paymentId: string): Promise<Donation | undefined> {
    if (!db) return undefined;
    const [donation] = await db
      .select()
      .from(donations)
      .where(eq(donations.stripePaymentId, paymentId));
    return donation;
  }
  
  async getDonationByStripeSubscriptionId(subscriptionId: string): Promise<Donation | undefined> {
    if (!db) return undefined;
    const [donation] = await db
      .select()
      .from(donations)
      .where(eq(donations.stripeSubscriptionId, subscriptionId));
    return donation;
  }
  
  async getDonationByPaypalSubscriptionId(subscriptionId: string): Promise<Donation | undefined> {
    if (!db) return undefined;
    const [donation] = await db
      .select()
      .from(donations)
      .where(eq(donations.paypalSubscriptionId, subscriptionId));
    return donation;
  }
  
  async updateDonationStatus(id: number, status: string, paymentId?: string): Promise<Donation | undefined> {
    if (!db) return undefined;
    
    // First get the donation to determine if we need to update a case
    const donation = await this.getDonation(id);
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
    
    const updateData: Partial<Donation> = {
      status,
      ...(paymentMethod && { paymentMethod }),
      ...(paymentId && { stripePaymentId: paymentId })
    };
    
    const [updatedDonation] = await db
      .update(donations)
      .set(updateData)
      .where(eq(donations.id, id))
      .returning();
    
    // If this is a completed payment for a case, update the case amount
    if (status === 'completed' && donation.caseId && donation.status !== 'completed') {
      await this.updateCaseAmountCollected(donation.caseId, donation.amount);
    }
    
    return updatedDonation;
  }
  
  async updateDonationSubscription(
    id: number, 
    provider: 'stripe' | 'paypal', 
    subscriptionId: string, 
    subscriptionStatus: string, 
    nextPaymentDate?: Date | null
  ): Promise<Donation | undefined> {
    if (!db) return undefined;
    
    // First get the donation
    const donation = await this.getDonation(id);
    if (!donation) return undefined;
    
    let status = donation.status;
    // If subscription is active, mark the donation as active-subscription
    if (subscriptionStatus === 'active' || subscriptionStatus === 'trialing') {
      status = 'active-subscription';
    } 
    // If subscription is cancelled or other terminal state, mark as subscription-cancelled
    else if (
      subscriptionStatus === 'cancelled' || 
      subscriptionStatus === 'canceled' || 
      subscriptionStatus === 'expired'
    ) {
      status = 'subscription-cancelled';
    }
    
    const updateData: Partial<Donation> = {
      status,
      subscriptionStatus,
      nextPaymentDate: nextPaymentDate === null ? null : nextPaymentDate,
      ...(provider === 'stripe' 
        ? { stripeSubscriptionId: subscriptionId } 
        : { paypalSubscriptionId: subscriptionId })
    };
    
    const [updatedDonation] = await db
      .update(donations)
      .set(updateData)
      .where(eq(donations.id, id))
      .returning();
      
    return updatedDonation;
  }
  
  async getDonations(): Promise<Donation[]> {
    if (!db) return [];
    return await db.select().from(donations).orderBy(desc(donations.createdAt));
  }
  
  async getDonationsByUserId(userId: number): Promise<Donation[]> {
    if (!db) return [];
    return await db
      .select()
      .from(donations)
      .where(eq(donations.userId, userId))
      .orderBy(desc(donations.createdAt));
  }
  
  async getActiveSubscriptions(): Promise<Donation[]> {
    if (!db) return [];
    return await db
      .select()
      .from(donations)
      .where(eq(donations.status, 'active-subscription'))
      .orderBy(desc(donations.createdAt));
  }
  
  async updateDonationDonor(id: number, name: string, email: string): Promise<Donation | undefined> {
    if (!db) return undefined;
    
    const [updatedDonation] = await db
      .update(donations)
      .set({ name, email })
      .where(eq(donations.id, id))
      .returning();
      
    return updatedDonation;
  }
  
  // Endorsement methods
  async getEndorsements(): Promise<Endorsement[]> {
    if (!db) return [];
    return await db.select().from(endorsements);
  }
  
  async createEndorsement(insertEndorsement: InsertEndorsement): Promise<Endorsement> {
    if (!db) throw new Error('Database not available');
    const [endorsement] = await db.insert(endorsements).values(insertEndorsement).returning();
    return endorsement;
  }
  
  // Stats methods
  async getStats(): Promise<Stats | undefined> {
    if (!db) return undefined;
    const [statsData] = await db.select().from(stats).limit(1);
    return statsData;
  }
  
  async updateStats(statsData: Partial<InsertStats>): Promise<Stats | undefined> {
    if (!db) return undefined;
    
    // Check if stats exists
    const currentStats = await this.getStats();
    
    if (currentStats) {
      // Update existing stats
      const [updatedStats] = await db
        .update(stats)
        .set({
          ...statsData,
          lastUpdated: new Date()
        })
        .where(eq(stats.id, currentStats.id))
        .returning();
        
      return updatedStats;
    } else {
      // Create new stats
      const [newStats] = await db
        .insert(stats)
        .values({
          totalPatients: statsData.totalPatients || 0,
          monthlyPatients: statsData.monthlyPatients || 0
        })
        .returning();
        
      return newStats;
    }
  }
  
  // Case methods
  async getCases(): Promise<Case[]> {
    if (!db) return [];
    return await db.select().from(cases);
  }
  
  async getActiveZakaatCases(): Promise<Case[]> {
    if (!db) return [];
    return await db
      .select()
      .from(cases)
      .where(
        and(
          eq(cases.active, true),
          gt(cases.amountRequired, cases.amountCollected)
        )
      );
  }
  
  async getCase(id: number): Promise<Case | undefined> {
    if (!db) return undefined;
    const [caseItem] = await db.select().from(cases).where(eq(cases.id, id));
    return caseItem;
  }
  
  async createCase(insertCase: InsertCase): Promise<Case> {
    if (!db) throw new Error('Database not available');
    const [newCase] = await db.insert(cases).values({
      ...insertCase,
      amountCollected: 0
    }).returning();
    return newCase;
  }
  
  async updateCaseAmountCollected(id: number, additionalAmount: number): Promise<Case | undefined> {
    if (!db) return undefined;
    
    // First get the current case
    const caseItem = await this.getCase(id);
    if (!caseItem) return undefined;
    
    // Calculate new amount collected
    const newAmountCollected = caseItem.amountCollected + additionalAmount;
    
    // Update the case
    const [updatedCase] = await db
      .update(cases)
      .set({ amountCollected: newAmountCollected })
      .where(eq(cases.id, id))
      .returning();
      
    return updatedCase;
  }
  
  // Contact message methods
  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    if (!db) throw new Error('Database not available');
    const [contactMessage] = await db
      .insert(contactMessages)
      .values({
        ...message,
        isRead: false
      })
      .returning();
      
    return contactMessage;
  }
  
  async getContactMessages(): Promise<ContactMessage[]> {
    if (!db) return [];
    return await db
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAt));
  }
  
  async getContactMessage(id: number): Promise<ContactMessage | undefined> {
    if (!db) return undefined;
    const [message] = await db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.id, id));
      
    return message;
  }
  
  async markContactMessageAsRead(id: number): Promise<ContactMessage | undefined> {
    if (!db) return undefined;
    
    const [updatedMessage] = await db
      .update(contactMessages)
      .set({ isRead: true })
      .where(eq(contactMessages.id, id))
      .returning();
      
    return updatedMessage;
  }
}

// Choose the appropriate storage implementation based on database availability
export const storage = isDatabaseAvailable() 
  ? new DatabaseStorage() 
  : new MemStorage();
