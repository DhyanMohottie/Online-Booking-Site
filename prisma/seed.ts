import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const today = new Date();
today.setUTCHours(0, 0, 0, 0);
const day = (offset: number) => new Date(today.getTime() + offset * DAY);

const img = (seed: string, n: number) =>
  Array.from({ length: n }, (_, i) => `https://picsum.photos/seed/${seed}-${i}/1000/700`);

// Optional exact locations [lat, lng]; "Pending Demo Lodge" intentionally has none (the field is optional).
const COORDS: Record<string, [number, number]> = {
  "Grand Meridian Paris": [48.8606, 2.3376],
  "Left Bank Boutique": [48.8534, 2.3339],
  "Shinjuku Skyline Hotel": [35.6896, 139.6921],
  "Asakusa Ryokan Sora": [35.7148, 139.7967],
  "Bondi Beachfront Resort": [-33.8908, 151.2743],
  "Harbour Bridge Inn": [-33.8587, 151.209],
  "Casa del Sol Barcelona": [41.3917, 2.1649],
  "Gothic Quarter Hostel & Suites": [41.3839, 2.1766],
  "Manhattan Park Tower": [40.7656, -73.9818],
  "Brooklyn Brownstone B&B": [40.6847, -73.9496],
  "Lagoon Palms Colombo": [6.9271, 79.8449],
};

type HotelSeed = {
  name: string;
  city: string;
  country: string;
  address: string;
  stars: number;
  amenities: string[];
  description: string;
  owner: 0 | 1;
  status?: string;
  rooms: { name: string; capacity: number; price: number; quantity: number; description: string }[];
};

const hotels: HotelSeed[] = [
  {
    name: "Grand Meridian Paris",
    city: "Paris",
    country: "France",
    address: "12 Rue de Rivoli",
    stars: 5,
    amenities: ["WiFi", "Spa", "Restaurant", "Gym", "Air conditioning"],
    description: "Elegant five-star hotel steps from the Louvre, with a rooftop restaurant and full-service spa.",
    owner: 0,
    rooms: [
      { name: "Deluxe Double", capacity: 2, price: 28000, quantity: 6, description: "Queen bed, city view, marble bath." },
      { name: "Executive Suite", capacity: 3, price: 52000, quantity: 2, description: "Separate lounge and panoramic windows." },
    ],
  },
  {
    name: "Left Bank Boutique",
    city: "Paris",
    country: "France",
    address: "48 Boulevard Saint-Germain",
    stars: 3,
    amenities: ["WiFi", "Breakfast", "Air conditioning"],
    description: "Cosy boutique stay in the heart of Saint-Germain, known for its award-winning breakfast.",
    owner: 1,
    rooms: [
      { name: "Standard Double", capacity: 2, price: 14500, quantity: 5, description: "Compact and quiet courtyard room." },
      { name: "Family Room", capacity: 4, price: 21000, quantity: 2, description: "Two double beds, sleeps four." },
    ],
  },
  {
    name: "Shinjuku Skyline Hotel",
    city: "Tokyo",
    country: "Japan",
    address: "3-1 Nishi-Shinjuku",
    stars: 4,
    amenities: ["WiFi", "Gym", "Restaurant", "Air conditioning"],
    description: "Modern high-rise with skyline views, minutes from Shinjuku Station.",
    owner: 0,
    rooms: [
      { name: "Twin Room", capacity: 2, price: 17500, quantity: 8, description: "Two single beds, 24th floor and above." },
      { name: "Skyline King", capacity: 2, price: 25500, quantity: 3, description: "King bed with floor-to-ceiling windows." },
    ],
  },
  {
    name: "Asakusa Ryokan Sora",
    city: "Tokyo",
    country: "Japan",
    address: "2-6 Asakusa, Taito",
    stars: 4,
    amenities: ["WiFi", "Breakfast", "Spa"],
    description: "Traditional ryokan with tatami rooms and an in-house onsen near Senso-ji temple.",
    owner: 1,
    rooms: [
      { name: "Tatami Room", capacity: 3, price: 19000, quantity: 4, description: "Futon bedding and a tea set." },
    ],
  },
  {
    name: "Bondi Beachfront Resort",
    city: "Sydney",
    country: "Australia",
    address: "100 Campbell Parade",
    stars: 4,
    amenities: ["WiFi", "Pool", "Beach access", "Restaurant", "Parking"],
    description: "Beachfront resort with an infinity pool and direct access to Bondi Beach.",
    owner: 0,
    rooms: [
      { name: "Ocean View Double", capacity: 2, price: 22000, quantity: 7, description: "Balcony facing the Pacific." },
      { name: "Beach Villa", capacity: 5, price: 48000, quantity: 2, description: "Two bedrooms and a private terrace." },
    ],
  },
  {
    name: "Harbour Bridge Inn",
    city: "Sydney",
    country: "Australia",
    address: "27 George Street, The Rocks",
    stars: 3,
    amenities: ["WiFi", "Breakfast", "Parking", "Pet friendly"],
    description: "Friendly inn in The Rocks, a short walk from the Opera House.",
    owner: 1,
    rooms: [
      { name: "Queen Room", capacity: 2, price: 13500, quantity: 6, description: "Comfortable queen with workspace." },
    ],
  },
  {
    name: "Casa del Sol Barcelona",
    city: "Barcelona",
    country: "Spain",
    address: "Passeig de Gràcia 55",
    stars: 4,
    amenities: ["WiFi", "Pool", "Breakfast", "Air conditioning", "Gym"],
    description: "Design hotel on Passeig de Gràcia with a rooftop pool overlooking the Sagrada Família.",
    owner: 0,
    rooms: [
      { name: "Superior Double", capacity: 2, price: 18500, quantity: 6, description: "Modernist styling, rain shower." },
      { name: "Terrace Suite", capacity: 3, price: 34000, quantity: 2, description: "Private terrace with city views." },
    ],
  },
  {
    name: "Gothic Quarter Hostel & Suites",
    city: "Barcelona",
    country: "Spain",
    address: "Carrer del Bisbe 8",
    stars: 2,
    amenities: ["WiFi", "Air conditioning"],
    description: "Budget-friendly rooms in a restored Gothic Quarter building.",
    owner: 1,
    rooms: [
      { name: "Private Double", capacity: 2, price: 7500, quantity: 8, description: "Simple private room, shared lounge." },
      { name: "Four-Bed Room", capacity: 4, price: 11000, quantity: 3, description: "Private room for a group of four." },
    ],
  },
  {
    name: "Manhattan Park Tower",
    city: "New York",
    country: "United States",
    address: "225 W 57th Street",
    stars: 5,
    amenities: ["WiFi", "Gym", "Spa", "Restaurant", "Air conditioning"],
    description: "Landmark tower hotel near Central Park and Carnegie Hall.",
    owner: 0,
    rooms: [
      { name: "Park View King", capacity: 2, price: 39000, quantity: 5, description: "High floor with Central Park views." },
      { name: "Penthouse Suite", capacity: 4, price: 120000, quantity: 1, description: "Two-bedroom penthouse with terrace." },
    ],
  },
  {
    name: "Brooklyn Brownstone B&B",
    city: "New York",
    country: "United States",
    address: "84 Hancock Street, Brooklyn",
    stars: 3,
    amenities: ["WiFi", "Breakfast", "Pet friendly"],
    description: "Charming brownstone bed-and-breakfast in Bed-Stuy.",
    owner: 1,
    rooms: [
      { name: "Garden Room", capacity: 2, price: 16000, quantity: 3, description: "Ground floor with garden access." },
    ],
  },
  {
    name: "Lagoon Palms Colombo",
    city: "Colombo",
    country: "Sri Lanka",
    address: "1 Galle Face Terrace",
    stars: 4,
    amenities: ["WiFi", "Pool", "Restaurant", "Beach access", "Air conditioning"],
    description: "Seafront hotel on Galle Face Green with a rooftop pool and Sri Lankan fine dining.",
    owner: 1,
    rooms: [
      { name: "Sea View Room", capacity: 2, price: 11000, quantity: 10, description: "Balcony overlooking the Indian Ocean." },
      { name: "Executive Suite", capacity: 4, price: 21000, quantity: 2, description: "Lounge, dining nook and two beds." },
    ],
  },
  {
    name: "Pending Demo Lodge",
    city: "Paris",
    country: "France",
    address: "5 Rue Pending",
    stars: 3,
    amenities: ["WiFi"],
    description: "Awaiting admin approval - used to demonstrate the approval workflow.",
    owner: 1,
    status: "PENDING",
    rooms: [{ name: "Single Room", capacity: 1, price: 9000, quantity: 2, description: "Small and simple." }],
  },
];

async function main() {
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.roomType.deleteMany();
  await prisma.hotelImage.deleteMany();
  await prisma.hotel.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);
  const mk = (name: string, email: string, role: string) =>
    prisma.user.create({ data: { name, email, role, passwordHash } });

  const admin = await mk("Alex Admin", "admin@demo.com", "ADMIN");
  const owners = [await mk("Olivia Owner", "owner1@demo.com", "OWNER"), await mk("Omar Owner", "owner2@demo.com", "OWNER")];
  const customers = [
    await mk("Casey Customer", "customer1@demo.com", "CUSTOMER"),
    await mk("Chris Customer", "customer2@demo.com", "CUSTOMER"),
    await mk("Charlie Customer", "customer3@demo.com", "CUSTOMER"),
  ];

  const created: { id: string; rooms: { id: string; price: number }[] }[] = [];
  for (const h of hotels) {
    const hotel = await prisma.hotel.create({
      data: {
        ownerId: owners[h.owner].id,
        name: h.name,
        description: h.description,
        city: h.city,
        country: h.country,
        address: h.address,
        starRating: h.stars,
        latitude: COORDS[h.name]?.[0] ?? null,
        longitude: COORDS[h.name]?.[1] ?? null,
        amenities: h.amenities.join(","),
        status: h.status ?? "APPROVED",
        images: { create: img(h.name.replace(/\W+/g, "-").toLowerCase(), 4).map((url, i) => ({ url, sortOrder: i })) },
        roomTypes: {
          create: h.rooms.map((r) => ({
            name: r.name,
            description: r.description,
            capacity: r.capacity,
            pricePerNight: r.price,
            quantity: r.quantity,
            amenities: h.amenities.slice(0, 3).join(","),
          })),
        },
      },
      include: { roomTypes: true },
    });
    created.push({ id: hotel.id, rooms: hotel.roomTypes.map((r) => ({ id: r.id, price: r.pricePerNight })) });
  }

  // Bookings: past stays (reviewable), upcoming stays, and one cancelled.
  const book = async (
    userIdx: number,
    hotelIdx: number,
    from: number,
    to: number,
    status = "CONFIRMED",
    roomIdx = 0,
  ) => {
    const room = created[hotelIdx].rooms[roomIdx];
    return prisma.booking.create({
      data: {
        userId: customers[userIdx].id,
        roomTypeId: room.id,
        checkIn: day(from),
        checkOut: day(to),
        guests: 2,
        totalPrice: room.price * (to - from),
        status,
        paymentStatus: status === "CANCELLED" ? "REFUNDED" : "MOCK_PAID",
      },
    });
  };

  const past = [
    await book(0, 0, -30, -26),
    await book(1, 0, -20, -17),
    await book(2, 2, -15, -12),
    await book(0, 4, -40, -35),
    await book(1, 6, -10, -7),
    await book(2, 10, -25, -20),
  ];
  await book(2, 8, -9, -6); // past stay left unreviewed so the review flow can be demoed (customer3)
  await book(0, 2, 10, 14);
  await book(1, 8, 5, 8);
  await book(2, 4, 20, 25);
  await book(0, 6, 3, 6, "CANCELLED");

  const reviews: [number, number, string][] = [
    [0, 5, "Spectacular location and the spa was lovely. Staff went above and beyond."],
    [1, 4, "Great stay overall. Breakfast could have more variety, but the room was spotless."],
    [2, 5, "Perfect views and super convenient to the train. Would stay again."],
    [3, 4, "Wonderful pool and beach access. A little noisy on the weekend."],
    [4, 5, "Rooftop pool is a highlight. Design is gorgeous."],
    [5, 3, "Fine for the price, but the room was smaller than expected."],
  ];
  for (const [i, rating, comment] of reviews) {
    const b = past[i];
    const hotelIdx = created.findIndex((h) => h.rooms.some((r) => r.id === b.roomTypeId));
    await prisma.review.create({
      data: { bookingId: b.id, userId: b.userId, hotelId: created[hotelIdx].id, rating, comment },
    });
  }

  console.log("Seeded. Demo logins (password: password123):");
  console.log(`  admin    ${admin.email}`);
  owners.forEach((o) => console.log(`  owner    ${o.email}`));
  customers.forEach((c) => console.log(`  customer ${c.email}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
