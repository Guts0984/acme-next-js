import postgres from "postgres";

import { invoices } from "../lib/placeholder-data";

console.log("Initializing SQL client...");
const sql = postgres(process.env.POSTGRES_URL!, { ssl: "require" });
console.log("SQL client initialized");

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

export async function GET() {
  console.log("GET /seed started");
  try {
    await sql`DROP TABLE IF EXISTS users, customers, invoices, revenue CASCADE`; // Full reset
    const invoicesResult = await seedInvoices();
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
