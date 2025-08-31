const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function removeDemoTrades() {
  try {
    console.log('🧹 Removing demo trades...');
    
    // Find the demo user
    const demoUser = await prisma.user.findUnique({
      where: { email: 'demo@example.com' }
    });
    
    if (demoUser) {
      // Delete all trades for demo user
      const deletedTrades = await prisma.trade.deleteMany({
        where: {
          userId: demoUser.id
        }
      });
      
      console.log(`✅ Deleted ${deletedTrades.count} demo trades`);
      
      // Delete all watchlist items for demo user
      const deletedWatchlist = await prisma.watchlist.deleteMany({
        where: {
          userId: demoUser.id
        }
      });
      
      console.log(`✅ Deleted ${deletedWatchlist.count} demo watchlist items`);
      
      // Optionally delete the demo user entirely
      // await prisma.user.delete({
      //   where: { id: demoUser.id }
      // });
      // console.log('✅ Deleted demo user');
      
      // Reset demo user balance
      await prisma.user.update({
        where: { id: demoUser.id },
        data: {
          balance: 100000 // Reset to ₹1,00,000
        }
      });
      
      console.log('✅ Reset demo user balance to ₹1,00,000');
      
    } else {
      console.log('ℹ️  No demo user found');
    }
    
    // Also delete any other trades if you want to clear everything
    // Uncomment the lines below to delete ALL trades and watchlist items
    
    // const allTrades = await prisma.trade.deleteMany({});
    // console.log(`✅ Deleted ${allTrades.count} total trades`);
    
    // const allWatchlist = await prisma.watchlist.deleteMany({});
    // console.log(`✅ Deleted ${allWatchlist.count} total watchlist items`);
    
    console.log('🎉 Demo data cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error removing demo trades:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeDemoTrades();
