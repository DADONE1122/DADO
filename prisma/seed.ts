import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Default slot configs
  await prisma.slotConfig.upsert({
    where: { slot: 'MORNING' },
    update: {},
    create: {
      slot: 'MORNING',
      startTime: '11:00',
      endTime: '15:00',
      maxParties: 2,
    },
  })

  await prisma.slotConfig.upsert({
    where: { slot: 'AFTERNOON' },
    update: {},
    create: {
      slot: 'AFTERNOON',
      startTime: '15:30',
      endTime: '18:30',
      maxParties: 5,
    },
  })

  // Default packages (fictional data)
  const basePackage = await prisma.package.upsert({
    where: { id: 'pkg-base' },
    update: {},
    create: {
      id: 'pkg-base',
      name: 'Pacchetto Base',
      ferialePrice: 150.00,
      weekendPrice: 200.00,
      isActive: true,
    },
  })

  await prisma.package.upsert({
    where: { id: 'pkg-premium' },
    update: {},
    create: {
      id: 'pkg-premium',
      name: 'Pacchetto Premium',
      ferialePrice: 250.00,
      weekendPrice: 320.00,
      isActive: true,
    },
  })

  await prisma.package.upsert({
    where: { id: 'pkg-deluxe' },
    update: {},
    create: {
      id: 'pkg-deluxe',
      name: 'Pacchetto Deluxe',
      ferialePrice: 350.00,
      weekendPrice: 450.00,
      isActive: true,
    },
  })

  // Additional services
  await prisma.additionalService.upsert({
    where: { id: 'svc-animazione' },
    update: {},
    create: {
      id: 'svc-animazione',
      name: 'Animazione',
      price: 80.00,
      isActive: true,
    },
  })

  await prisma.additionalService.upsert({
    where: { id: 'svc-palloncini' },
    update: {},
    create: {
      id: 'svc-palloncini',
      name: 'Palloncini',
      price: 30.00,
      isActive: true,
    },
  })

  // Owner user (fictional)
  await prisma.user.upsert({
    where: { email: 'marco@pitopitu.it' },
    update: {},
    create: {
      email: 'marco@pitopitu.it',
      name: 'Marco Rossi',
      role: 'OWNER',
    },
  })

  await prisma.user.upsert({
    where: { email: 'laura@pitopitu.it' },
    update: {},
    create: {
      email: 'laura@pitopitu.it',
      name: 'Laura Bianchi',
      role: 'OWNER',
    },
  })

  // Fictional party example
  const futuroDate = new Date('2026-08-15')
  await prisma.party.upsert({
    where: { id: 'party-esempio' },
    update: {},
    create: {
      id: 'party-esempio',
      parentName: 'Giuseppe Verdi',
      parentPhone: '+39 333 1234567',
      celebrationName: 'Leonardo',
      age: 8,
      date: futuroDate,
      slot: 'AFTERNOON',
      packageId: 'pkg-premium',
      estimatedGuests: 15,
      depositReceived: true,
      depositAmount: 100.00,
      depositMethod: 'BANK_TRANSFER',
      status: 'PENDING_DETAILS',
      cake: 'Torta cioccolato',
      allergies: 'Allergia alle nocciole',
      decorationTheme: 'Supereroi',
      specialRequests: 'Vorrebbero un momento torta alle 17:00',
    },
  })

  console.log('✅ Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })