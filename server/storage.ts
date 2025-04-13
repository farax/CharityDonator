import { 
  users, type User, type InsertUser, 
  donations, type Donation, type InsertDonation,
  endorsements, type Endorsement, type InsertEndorsement,
  stats, type Stats, type InsertStats 
} from "@shared/schema";

// Define the storage interface with all necessary CRUD methods
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Donation methods
  createDonation(donation: InsertDonation): Promise<Donation>;
  getDonation(id: number): Promise<Donation | undefined>;
  updateDonationStatus(id: number, status: string, stripePaymentId?: string): Promise<Donation | undefined>;
  getDonations(): Promise<Donation[]>;
  
  // Endorsement methods
  getEndorsements(): Promise<Endorsement[]>;
  createEndorsement(endorsement: InsertEndorsement): Promise<Endorsement>;
  
  // Stats methods
  getStats(): Promise<Stats | undefined>;
  updateStats(statsData: Partial<InsertStats>): Promise<Stats | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private donations: Map<number, Donation>;
  private endorsementsList: Map<number, Endorsement>;
  private statsData: Stats | undefined;
  
  private userCurrentId: number;
  private donationCurrentId: number;
  private endorsementCurrentId: number;

  constructor() {
    this.users = new Map();
    this.donations = new Map();
    this.endorsementsList = new Map();
    
    this.userCurrentId = 1;
    this.donationCurrentId = 1;
    this.endorsementCurrentId = 1;
    
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
  
  // Donation methods
  async createDonation(insertDonation: InsertDonation): Promise<Donation> {
    const id = this.donationCurrentId++;
    const donation: Donation = { 
      ...insertDonation, 
      id, 
      createdAt: new Date() 
    };
    this.donations.set(id, donation);
    return donation;
  }
  
  async getDonation(id: number): Promise<Donation | undefined> {
    return this.donations.get(id);
  }
  
  async updateDonationStatus(id: number, status: string, stripePaymentId?: string): Promise<Donation | undefined> {
    const donation = this.donations.get(id);
    if (!donation) return undefined;
    
    const updatedDonation: Donation = {
      ...donation,
      status,
      ...(stripePaymentId && { stripePaymentId })
    };
    
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
}

export const storage = new MemStorage();
