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
    await sql`DROP TABLE IF EXISTS users CASCADE`;
    await sql`
      CREATE TABLE users (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );
    `;

    const insertedUsers = [];
    for (const user of users) {
      console.log(`Inserting user: ${user.email}`);
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const result = await sql`
        INSERT INTO users (id, name, email, password)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
        ON CONFLICT (id) DO NOTHING
      `;
      if (result.count > 0) insertedUsers.push(result);
    }
    console.log("Finished seedUsers with", insertedUsers.length, "users");
    return insertedUsers;
  } catch (error) {
    console.error("seedUsers error:", error);
    throw error;
  }
}

async function seedCustomers() {
  console.log("Starting seedCustomers...");
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    await sql`DROP TABLE IF EXISTS customers CASCADE`;
    await sql`
      CREATE TABLE customers (
        id UUID PRIMARY KEY,
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
        ON CONFLICT (id) DO NOTHING
      `;
      if (result.count > 0) insertedCustomers.push(result);
    }
    console.log(
      "Finished seedCustomers with",
      insertedCustomers.length,
      "customers"
    );
    return insertedCustomers;
  } catch (error) {
    console.error("seedCustomers error:", error);
    throw error;
  }
}

async function seedInvoices() {
  console.log("Starting seedInvoices...");
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    await sql`DROP TABLE IF EXISTS invoices CASCADE`;
    await sql`
      CREATE TABLE invoices (
        id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
        customer_id UUID NOT NULL,
        amount INT NOT NULL,
        status VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        UNIQUE (customer_id, date, amount, status) -- Prevent duplicates
      );
    `;

    const insertedInvoices = [];
    for (const invoice of invoices) {
      console.log(
        `Inserting invoice: customer ${invoice.customer_id}, date ${invoice.date}, amount ${invoice.amount}, status ${invoice.status}`
      );
      const result = await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
        ON CONFLICT (customer_id, date, amount, status) DO NOTHING
      `;
      if (result.count > 0)
        insertedInvoices.push({ ...invoice, id: result[0]?.id || "unknown" });
    }
    console.log("Inserted invoices:", insertedInvoices);
    console.log(
      "Finished seedInvoices with",
      insertedInvoices.length,
      "invoices"
    );
    return insertedInvoices;
  } catch (error) {
    console.error("seedInvoices error:", error);
    throw error;
  }
}

async function seedRevenue() {
  console.log("Starting seedRevenue...");
  try {
    await sql`DROP TABLE IF EXISTS revenue CASCADE`;
    await sql`
      CREATE TABLE revenue (
        month VARCHAR(4) PRIMARY KEY,
        revenue INT NOT NULL
      );
    `;

    const insertedRevenue = [];
    for (const rev of revenue) {
      console.log(`Inserting revenue: ${rev.month}`);
      const result = await sql`
        INSERT INTO revenue (month, revenue)
        VALUES (${rev.month}, ${rev.revenue})
        ON CONFLICT (month) DO NOTHING
      `;
      if (result.count > 0) insertedRevenue.push(result);
    }
    console.log("Finished seedRevenue with", insertedRevenue.length, "months");
    return insertedRevenue;
  } catch (error) {
    console.error("seedRevenue error:", error);
    throw error;
  }
}

export async function GET() {
  console.log("GET /seed started");
  try {
    await sql`DROP TABLE IF EXISTS users, customers, invoices, revenue CASCADE`; // Full reset
    const usersResult = await seedUsers();
    const customersResult = await seedCustomers();
    const invoicesResult = await seedInvoices();
    const revenueResult = await seedRevenue();
    console.log("GET /seed completed with", invoicesResult.length, "invoices");
    return Response.json({
      message: "Database seeded successfully",
      invoices: invoicesResult,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Seed error:", errorMessage);
    return Response.json({ error: errorMessage }, { status: 500 });
  }
}
