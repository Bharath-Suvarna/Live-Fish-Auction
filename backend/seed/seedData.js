/**
 * Seed Script for Malpe Fish Harbor Auction Dashboard
 * Generates ~15-20 boats, 40-60 auction lots, pre-populated users (Admin, Vendors, Viewer),
 * and 100-1500 randomized bids simulating an 8 AM morning peak traffic spike.
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../.env' });

const User = require('../src/models/User');
const Boat = require('../src/models/Boat');
const AuctionLot = require('../src/models/AuctionLot');
const Bid = require('../src/models/Bid');
const PriceTrend = require('../src/models/PriceTrend');

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/malpe_auction';

const FISH_TYPES = ['Mackerel', 'Sardine', 'Prawns', 'Tuna', 'Kingfish', 'Squid', 'Pomfret', 'Seerfish'];
const BOAT_NAMES = [
  'Sea Queen Malpe', 'Karamashree Trawler', 'Shree Padmavati', 'Ocean Warrior Udupi',
  'Matsya Gandha', 'Varuna Power', 'Blue Horizon', 'Jaladurga', 'Karnataka Pearl',
  'Kaup Light', 'St. Mary Deep Sea', 'Coastal Hunter', 'Malpe Sunrise', 'Gangadhara',
  'Samudra Ratna', 'Nethravathi', 'Sagar Kanya', 'Golden Wave', 'Sridevi Trawler'
];
const OWNER_NAMES = ['Santhosh Suvarna', 'Ganesh Karkera', 'Ramesh Kotian', 'Prashanth Mendon', 'Divakar Salian', 'Bhaskar Kanchan'];
const VENDOR_NAMES = ['Malpe Exporters Ltd', 'Mangalore Sea Foods', 'Udupi Fresh Fish Mart', 'Bangalore Cold Chain', 'Kerala Fish Co', 'Coastline Wholesalers', 'Canara Marine Products'];

async function seed() {
  try {
    console.log(`Connecting to DB at ${mongoURI}...`);
    await mongoose.connect(mongoURI);
    console.log('Clearing existing collection data...');

    await User.deleteMany({});
    await Boat.deleteMany({});
    await AuctionLot.deleteMany({});
    await Bid.deleteMany({});
    await PriceTrend.deleteMany({});

    console.log('Creating Seed Users...');
    const defaultPassword = await bcrypt.hash('password123', 10);

    const admin = await User.create({
      userId: 'usr_admin_01',
      name: 'Auctioneer Officer (Malpe)',
      email: 'admin@malpe.harbor',
      passwordHash: defaultPassword,
      role: 'Admin',
      phone: '+91 98450 11223'
    });

    const vendorUsers = [];
    for (let i = 0; i < VENDOR_NAMES.length; i++) {
      const vName = VENDOR_NAMES[i];
      const vendor = await User.create({
        userId: `usr_vendor_0${i + 1}`,
        name: vName + ' Rep',
        email: `vendor${i + 1}@malpe.com`,
        passwordHash: defaultPassword,
        role: 'Vendor',
        phone: `+91 98451 9900${i}`,
        businessName: vName
      });
      vendorUsers.push(vendor);
    }

    await User.create({
      userId: 'usr_viewer_01',
      name: 'Public Viewer / Analyst',
      email: 'viewer@malpe.harbor',
      passwordHash: defaultPassword,
      role: 'Viewer',
      phone: '+91 98452 00000'
    });

    console.log('Creating 18 Boat Arrivals...');
    const boats = [];
    const baseToday = new Date();
    baseToday.setHours(6, 0, 0, 0); // 6:00 AM Malpe harbor opening time

    for (let i = 0; i < 18; i++) {
      const arrivalOffsetMins = i * 12 + Math.floor(Math.random() * 8);
      const arrivalTime = new Date(baseToday.getTime() + arrivalOffsetMins * 60000);
      const catchType = FISH_TYPES[i % FISH_TYPES.length];
      const estimatedQuantityKg = Math.floor(Math.random() * 4000) + 1000;
      const status = i < 6 ? 'auctioning' : (i < 14 ? 'unloading' : 'arrived');

      const boat = await Boat.create({
        boatId: `boat_m${100 + i}`,
        boatName: BOAT_NAMES[i],
        ownerName: OWNER_NAMES[i % OWNER_NAMES.length],
        arrivalTime,
        catchType,
        estimatedQuantityKg,
        status
      });
      boats.push(boat);
    }

    console.log('Creating 48 Auction Lots & Simulated 8 AM Bidding Spike...');
    const lots = [];
    let totalBidsCount = 0;

    for (let i = 0; i < 48; i++) {
      const boat = boats[i % boats.length];
      const fishType = BOAT_NAMES[i % BOAT_NAMES.length] ? boat.catchType : FISH_TYPES[i % FISH_TYPES.length];
      const quantityKg = Math.floor(Math.random() * 800) + 200;
      const startingPrice = Math.floor(Math.random() * 150) + 80;
      let currentPrice = startingPrice;
      const isClosed = i < 20;
      const isOpen = !isClosed;

      const lotStartTime = new Date(baseToday.getTime() + (i * 5 + Math.floor(Math.random() * 3)) * 60000);

      const lot = await AuctionLot.create({
        lotId: `lot_mlp_${500 + i}`,
        boatId: boat.boatId,
        boatName: boat.boatName,
        fishType,
        quantityKg,
        startingPrice,
        currentPrice: startingPrice,
        status: isOpen ? 'open' : 'closed',
        startTime: lotStartTime,
        endTime: isClosed ? new Date(lotStartTime.getTime() + 15 * 60000) : null
      });

      // Simulate bids for this lot
      const bidCountForLot = Math.floor(Math.random() * 25) + 10;
      let lastBidTime = new Date(lotStartTime.getTime());
      let winningVendor = null;

      for (let b = 0; b < bidCountForLot; b++) {
        lastBidTime = new Date(lastBidTime.getTime() + (Math.floor(Math.random() * 45) + 5) * 1000);
        const increment = Math.floor(Math.random() * 20) + 5;
        currentPrice += increment;
        winningVendor = vendorUsers[b % vendorUsers.length];

        await Bid.create({
          bidId: `bid_${lot.lotId}_${b + 1}`,
          lotId: lot.lotId,
          vendorId: winningVendor.userId,
          vendorName: winningVendor.businessName || winningVendor.name,
          bidAmount: currentPrice,
          timestamp: lastBidTime
        });
        totalBidsCount++;
      }

      // Update lot with final price & winning bidder
      lot.currentPrice = currentPrice;
      lot.highestBidAmount = currentPrice;
      if (winningVendor) {
        lot.winningVendorId = winningVendor.userId;
        lot.winningVendorName = winningVendor.businessName;
      }
      await lot.save();
      lots.push(lot);
    }

    console.log('Generating Initial Price Trends data...');
    for (const fishType of FISH_TYPES) {
      let trendTime = new Date(baseToday.getTime());
      for (let t = 0; t < 12; t++) {
        trendTime = new Date(trendTime.getTime() + 20 * 60000);
        const basePrice = 100 + FISH_TYPES.indexOf(fishType) * 25;
        const variation = Math.floor(Math.random() * 40) - 20;
        const avgPrice = Math.max(50, basePrice + variation);

        await PriceTrend.create({
          fishType,
          timestamp: trendTime,
          avgPricePerKg: avgPrice,
          minPrice: avgPrice - 15,
          maxPrice: avgPrice + 20,
          sampleCount: Math.floor(Math.random() * 15) + 5
        });
      }
    }

    console.log(`====================================================`);
    console.log(`[SEED COMPLETE] Seeded successfully!`);
    console.log(`Users created : ${vendorUsers.length + 2}`);
    console.log(`Boats created : ${boats.length}`);
    console.log(`Lots created  : ${lots.length}`);
    console.log(`Total Bids    : ${totalBidsCount} (Simulated 8 AM load peak)`);
    console.log(`====================================================`);

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
