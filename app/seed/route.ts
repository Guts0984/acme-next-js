import postgres from "postgres";
import bcrypt from "bcryptjs";
import { invoices, customers, revenue, users } from "../lib/placeholder-data";

console.log("Initializing SQL client...");
const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });
console.log("SQL client initialized");

async function seedUsers() {
  console.log("Starting seedUsers...");
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `;

    const insertedUsers = [];
    for (const user of users) {
      console.log(`Hashing password for ${user.email}`);
      const hashedPassword = await bcrypt.hash(user.password, 10);
      console.log(`Inserting user: ${user.email}`);
      const result = await sql`
        INSERT INTO users (id, name, email, password)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
        ON CONFLICT (id) DO NOTHING;
      `;
      insertedUsers.push(result);
    }
    console.log("Finished seedUsers");
    return insertedUsers;
  } catch (error) {
    console.error("seedUsers error:", error);
    throw error;
  }
}

async function seedInvoices() {
  console.log("Starting seedInvoices...");
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    await sql`
      CREATE TABLE IF NOT EXISTS invoices (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        customer_id UUID NOT NULL,
        amount INT NOT NULL,
        status VARCHAR(255) NOT NULL,
        date DATE NOT NULL
      );
    `;

    const insertedInvoices = [];
    for (const invoice of invoices) {
      // Log customer_id since id isn’t in placeholder data
      console.log(`Inserting invoice for customer: ${invoice.customer_id}`);
      const result = await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
        ON CONFLICT (customer_id) DO NOTHING; -- Adjusted to customer_id if needed
      `;
      insertedInvoices.push(result);
    }
    console.log("Finished seedInvoices");
    return insertedInvoices;
  } catch (error) {
    console.error("seedInvoices error:", error);
    throw error;
  }
}

async function seedCustomers() {
  console.log("Starting seedCustomers...");
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    await sql`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        image_url VARCHAR(255) NOT NULL
      );
    `;

    const insertedCustomers = [];
    for (const customer of customers) {
      console.log(`Inserting customer: ${customer.email}`);
      const result = await sql`
        INSERT INTO customers (id, name, email, image_url)
        VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
        ON CONFLICT (id) DO NOTHING;
      `;
      insertedCustomers.push(result);
    }
    console.log("Finished seedCustomers");
    return insertedCustomers;
  } catch (error) {
    console.error("seedCustomers error:", error);
    throw error;
  }
}

async function seedRevenue() {
  console.log("Starting seedRevenue...");
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS revenue (
        month VARCHAR(4) NOT NULL UNIQUE,
        revenue INT NOT NULL
      );
    `;

    const insertedRevenue = [];
    for (const rev of revenue) {
      console.log(`Inserting revenue: ${rev.month}`);
      const result = await sql`
        INSERT INTO revenue (month, revenue)
        VALUES (${rev.month}, ${rev.revenue})
        ON CONFLICT (month) DO NOTHING;
      `;
      insertedRevenue.push(result);
    }
    console.log("Finished seedRevenue");
    return insertedRevenue;
  } catch (error) {
    console.error("seedRevenue error:", error);
    throw error;
  }
}

export async function GET() {
  console.log("GET /seed started");
  try {
    await seedUsers();
    await seedCustomers();
    await seedInvoices();
    await seedRevenue();
    console.log("GET /seed completed");
    return Response.json({ message: "Database seeded successfully" });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Seed error:", errorMessage);
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
