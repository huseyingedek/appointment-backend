-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('Planned', 'Completed', 'Cancelled');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('Cash', 'CreditCard', 'Transfer', 'Other');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('Scheduled', 'Completed', 'Missed');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('EMPLOYEE', 'OWNER', 'ADMIN');

-- CreateTable
CREATE TABLE "Accounts" (
    "AccountID" SERIAL NOT NULL,
    "BusinessName" TEXT NOT NULL,
    "ContactPerson" TEXT,
    "Email" TEXT,
    "Phone" TEXT,
    "SubscriptionPlan" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Accounts_pkey" PRIMARY KEY ("AccountID")
);

-- CreateTable
CREATE TABLE "Appointments" (
    "AppointmentID" SERIAL NOT NULL,
    "AccountID" INTEGER NOT NULL,
    "CustomerName" TEXT NOT NULL,
    "Service" TEXT NOT NULL,
    "AppointmentDate" TIMESTAMP(3) NOT NULL,
    "Status" "AppointmentStatus" NOT NULL DEFAULT 'Planned',
    "Notes" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointments_pkey" PRIMARY KEY ("AppointmentID")
);

-- CreateTable
CREATE TABLE "Clients" (
    "ClientID" SERIAL NOT NULL,
    "AccountID" INTEGER NOT NULL,
    "FirstName" TEXT,
    "LastName" TEXT,
    "Phone" TEXT,
    "Email" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Clients_pkey" PRIMARY KEY ("ClientID")
);

-- CreateTable
CREATE TABLE "Sales" (
    "SaleID" SERIAL NOT NULL,
    "ClientID" INTEGER NOT NULL,
    "ServiceID" INTEGER NOT NULL,
    "SaleDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "RemainingSessions" INTEGER NOT NULL,

    CONSTRAINT "Sales_pkey" PRIMARY KEY ("SaleID")
);

-- CreateTable
CREATE TABLE "Payments" (
    "PaymentID" SERIAL NOT NULL,
    "SaleID" INTEGER NOT NULL,
    "PaymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "AmountPaid" DECIMAL(65,30) NOT NULL,
    "PaymentMethod" "PaymentMethod" NOT NULL DEFAULT 'Cash',
    "Notes" TEXT,

    CONSTRAINT "Payments_pkey" PRIMARY KEY ("PaymentID")
);

-- CreateTable
CREATE TABLE "Services" (
    "ServiceID" SERIAL NOT NULL,
    "AccountID" INTEGER NOT NULL,
    "ServiceName" TEXT NOT NULL,
    "Description" TEXT,
    "Price" DECIMAL(65,30) NOT NULL,
    "DurationMinutes" INTEGER,
    "SessionCount" INTEGER NOT NULL DEFAULT 1,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Services_pkey" PRIMARY KEY ("ServiceID")
);

-- CreateTable
CREATE TABLE "Sessions" (
    "SessionID" SERIAL NOT NULL,
    "SaleID" INTEGER NOT NULL,
    "StaffID" INTEGER,
    "SessionDate" TIMESTAMP(3) NOT NULL,
    "Status" "SessionStatus" NOT NULL DEFAULT 'Scheduled',
    "Notes" TEXT,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sessions_pkey" PRIMARY KEY ("SessionID")
);

-- CreateTable
CREATE TABLE "Staff" (
    "StaffID" SERIAL NOT NULL,
    "AccountID" INTEGER NOT NULL,
    "FullName" TEXT NOT NULL,
    "Role" TEXT,
    "Phone" TEXT,
    "Email" TEXT,
    "IsActive" BOOLEAN NOT NULL DEFAULT true,
    "CreatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("StaffID")
);

-- CreateTable
CREATE TABLE "Users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE',
    "accountId" INTEGER,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Accounts_Email_key" ON "Accounts"("Email");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_AccountID_fkey" FOREIGN KEY ("AccountID") REFERENCES "Accounts"("AccountID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clients" ADD CONSTRAINT "Clients_AccountID_fkey" FOREIGN KEY ("AccountID") REFERENCES "Accounts"("AccountID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sales" ADD CONSTRAINT "Sales_ClientID_fkey" FOREIGN KEY ("ClientID") REFERENCES "Clients"("ClientID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sales" ADD CONSTRAINT "Sales_ServiceID_fkey" FOREIGN KEY ("ServiceID") REFERENCES "Services"("ServiceID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payments" ADD CONSTRAINT "Payments_SaleID_fkey" FOREIGN KEY ("SaleID") REFERENCES "Sales"("SaleID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Services" ADD CONSTRAINT "Services_AccountID_fkey" FOREIGN KEY ("AccountID") REFERENCES "Accounts"("AccountID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sessions" ADD CONSTRAINT "Sessions_SaleID_fkey" FOREIGN KEY ("SaleID") REFERENCES "Sales"("SaleID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sessions" ADD CONSTRAINT "Sessions_StaffID_fkey" FOREIGN KEY ("StaffID") REFERENCES "Staff"("StaffID") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_AccountID_fkey" FOREIGN KEY ("AccountID") REFERENCES "Accounts"("AccountID") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Users" ADD CONSTRAINT "Users_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Accounts"("AccountID") ON DELETE SET NULL ON UPDATE CASCADE;

