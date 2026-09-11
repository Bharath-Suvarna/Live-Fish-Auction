export interface User {
  userId: string;
  name: string;
  email: string;
  role: 'Admin' | 'Vendor' | 'Viewer';
  businessName?: string;
}

export interface Boat {
  boatId: string;
  boatName: string;
  ownerName: string;
  arrivalTime: string;
  catchType: string;
  estimatedQuantityKg: number;
  status: 'arrived' | 'unloading' | 'auctioning' | 'done';
}

export interface AuctionLot {
  lotId: string;
  boatId: string;
  boatName: string;
  fishType: string;
  quantityKg: number;
  startingPrice: number;
  currentPrice: number;
  status: 'open' | 'closed' | 'sold';
  startTime: string;
  endTime?: string;
  winningVendorId?: string;
  winningVendorName?: string;
  highestBidAmount?: number;
}

export interface Bid {
  bidId: string;
  lotId: string;
  vendorId: string;
  vendorName: string;
  bidAmount: number;
  timestamp: string;
}

export interface PriceTrend {
  fishType: string;
  timestamp: string;
  avgPricePerKg: number;
  minPrice?: number;
  maxPrice?: number;
  sampleCount?: number;
}
