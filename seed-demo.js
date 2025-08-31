const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedDemoTrades() {
  try {
    console.log('🌱 Seeding demo trades...');
    
    // First, let's create a demo user if it doesn't exist
    const demoUser = await prisma.user.upsert({
      where: { email: 'demo@example.com' },
      update: {},
      create: {
        email: 'demo@example.com',
        name: 'Demo User',
        password: 'demo123', // In real app, this would be hashed
        balance: 100000, // ₹1,00,000 initial balance
      }
    });
    
    console.log('✅ Demo user created/updated');
    
    // Create some demo trades
    const demoTrades = [
      {
        userId: demoUser.id,
        symbol: 'INFY',
        type: 'BUY',
        quantity: 10,
        price: 1650.50,
        total: 16505.00,
        status: 'COMPLETED',
        brokerOrderId: 'DEMO_001'
      },
      {
        userId: demoUser.id,
        symbol: 'TCS',
        type: 'BUY',
        quantity: 5,
        price: 3850.25,
        total: 19251.25,
        status: 'COMPLETED',
        brokerOrderId: 'DEMO_002'
      },
      {
        userId: demoUser.id,
        symbol: 'RELIANCE',
        type: 'BUY',
        quantity: 8,
        price: 2750.00,
        total: 22000.00,
        status: 'COMPLETED',
        brokerOrderId: 'DEMO_003'
      },
      {
        userId: demoUser.id,
        symbol: 'INFY',
        type: 'SELL',
        quantity: 2,
        price: 1675.00,
        total: 3350.00,
        status: 'COMPLETED',
        brokerOrderId: 'DEMO_004'
      }
    ];
    
    // Delete existing demo trades
    await prisma.trade.deleteMany({
      where: {
        userId: demoUser.id
      }
    });
    
    // Create new demo trades
    for (const trade of demoTrades) {
      await prisma.trade.create({
        data: trade
      });
    }
    
    console.log('✅ Demo trades created successfully!');
    console.log(`📊 Created ${demoTrades.length} demo trades for user: ${demoUser.email}`);
    
    // Add some demo watchlist items
    await prisma.watchlist.deleteMany({
      where: { userId: demoUser.id }
    });
    
    const watchlistItems = ['INFY', 'TCS', 'RELIANCE', 'HDFCBANK', 'ICICIBANK'];
    
    for (const symbol of watchlistItems) {
      await prisma.watchlist.create({
        data: {
          userId: demoUser.id,
          symbol
        }
      });
    }
    
    console.log('✅ Demo watchlist created!');
    
  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDemoTrades();
